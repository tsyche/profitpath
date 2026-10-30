package io.profitpath.app;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/** Android-only file sharing and printing for reports generated on the device. */
@CapacitorPlugin(name = "NativeExport")
public class ExportPlugin extends Plugin {
    private static final int MAX_FILE_BYTES = 16 * 1024 * 1024;
    private static final int MAX_BASE64_CHARS = 4 * ((MAX_FILE_BYTES + 2) / 3);
    private static final long CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000L;
    private static final Pattern SAFE_FILENAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._ -]{0,179}");
    private static final Pattern BASE64_DATA = Pattern.compile("[A-Za-z0-9+/]*={0,2}");
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WebView printWebView;
    private PluginCall pendingPrintCall;
    private Runnable printTimeout;

    @PluginMethod
    public void shareFile(PluginCall call) {
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType");
        String data = call.getString("data");
        String extension = fileExtension(mimeType);
        if (filename == null || !SAFE_FILENAME.matcher(filename).matches()
            || extension == null || !filename.endsWith(extension)) {
            call.reject("Unsupported export filename or type");
            return;
        }
        if (data == null || data.length() > MAX_BASE64_CHARS || data.length() % 4 != 0
            || !BASE64_DATA.matcher(data).matches()) {
            call.reject("Invalid export data or file exceeds 16 MiB");
            return;
        }

        final File exportedFile;
        final Uri uri;
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (bytes.length > MAX_FILE_BYTES) {
                call.reject("Export file exceeds 16 MiB");
                return;
            }
            File directory = new File(getContext().getCacheDir(), "profitpath-exports");
            if (!directory.isDirectory() && !directory.mkdirs()) {
                throw new IOException("Could not create export cache");
            }
            cleanOldExports(directory);
            exportedFile = new File(directory, UUID.randomUUID() + "-" + filename);
            try (FileOutputStream output = new FileOutputStream(exportedFile)) {
                output.write(bytes);
            }
            uri = FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", exportedFile
            );
        } catch (IOException | IllegalArgumentException exception) {
            call.reject("Could not prepare exported file", exception);
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mimeType);
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_TITLE, filename);
                send.setClipData(ClipData.newUri(getContext().getContentResolver(), filename, uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(Intent.createChooser(send, "Share report"));
                // The chooser opened; the user still chooses whether and where to send.
                resolveHandoff(call);
            } catch (RuntimeException exception) {
                exportedFile.delete();
                call.reject("Could not open file sharing", exception);
            }
        });
    }

    private static String fileExtension(String mimeType) {
        if ("text/csv".equals(mimeType)) return ".csv";
        if ("text/html".equals(mimeType)) return ".html";
        if ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".equals(mimeType)) return ".xlsx";
        return null;
    }

    private static void cleanOldExports(File directory) throws IOException {
        File[] files = directory.listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - CACHE_MAX_AGE_MS;
        String parent = directory.getCanonicalPath();
        for (File file : files) {
            if (file.isFile() && file.lastModified() < cutoff
                && parent.equals(file.getCanonicalFile().getParent())) {
                file.delete();
            }
        }
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String requestedName = call.getString("jobName", "ProfitPath report");
        if (html == null || html.isEmpty() || html.length() > MAX_FILE_BYTES
            || requestedName == null || requestedName.length() > 120
            || hasControlCharacters(requestedName)) {
            call.reject("Invalid report content or job name");
            return;
        }
        final String jobName = requestedName.trim().isEmpty() ? "ProfitPath report" : requestedName;
        getActivity().runOnUiThread(() -> {
            if (printWebView != null) {
                call.reject("Finish the current print job first");
                return;
            }
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) {
                    call.reject("Android printing is unavailable");
                    return;
                }
                WebView view = new WebView(getActivity());
                printWebView = view;
                pendingPrintCall = call;
                view.getSettings().setJavaScriptEnabled(false);
                view.getSettings().setAllowFileAccess(false);
                view.getSettings().setAllowContentAccess(false);
                view.getSettings().setBlockNetworkLoads(true);
                view.setWebViewClient(new WebViewClient() {
                    private boolean started;

                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebView webView, WebResourceRequest request) {
                        // Reports are self-contained: no local files, external resources, or tracking.
                        return new WebResourceResponse(
                            "text/plain", "UTF-8", new ByteArrayInputStream(new byte[0])
                        );
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                        return true;
                    }

                    @Override
                    public void onReceivedError(WebView webView, WebResourceRequest request, WebResourceError error) {
                        if (request.isForMainFrame()) failPrint(view, "Could not load the report for printing");
                    }

                    @Override
                    public void onPageFinished(WebView webView, String url) {
                        if (started || printWebView != view || pendingPrintCall == null) return;
                        started = true;
                        try {
                            PrintDocumentAdapter adapter = retainUntilFinished(
                                view, view.createPrintDocumentAdapter(jobName)
                            );
                            if (manager.print(jobName, adapter, new PrintAttributes.Builder().build()) == null) {
                                failPrint(view, "Could not start Android printing");
                                return;
                            }
                            clearPrintTimeout();
                            pendingPrintCall = null;
                            resolveHandoff(call);
                        } catch (RuntimeException exception) {
                            failPrint(view, "Could not start Android printing");
                        }
                    }
                });
                printTimeout = () -> failPrint(view, "Timed out preparing the report for printing");
                mainHandler.postDelayed(printTimeout, 15000);
                view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (RuntimeException exception) {
                if (printWebView != null) failPrint(printWebView, "Could not prepare Android printing");
                else call.reject("Could not prepare Android printing", exception);
            }
        });
    }

    private static boolean hasControlCharacters(String value) {
        for (int index = 0; index < value.length(); index++) {
            if (Character.isISOControl(value.charAt(index))) return true;
        }
        return false;
    }

    private PrintDocumentAdapter retainUntilFinished(WebView view, PrintDocumentAdapter delegate) {
        return new PrintDocumentAdapter() {
            @Override
            public void onStart() {
                delegate.onStart();
            }

            @Override
            public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
                delegate.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
            }

            @Override
            public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                CancellationSignal cancellationSignal, WriteResultCallback callback) {
                delegate.onWrite(pages, destination, cancellationSignal, callback);
            }

            @Override
            public void onFinish() {
                try {
                    delegate.onFinish();
                } finally {
                    releasePrintView(view);
                }
            }
        };
    }

    private void failPrint(WebView view, String message) {
        if (printWebView != view) return;
        PluginCall call = pendingPrintCall;
        pendingPrintCall = null;
        releasePrintView(view);
        if (call != null) call.reject(message);
    }

    private void clearPrintTimeout() {
        if (printTimeout != null) mainHandler.removeCallbacks(printTimeout);
        printTimeout = null;
    }

    private void releasePrintView(WebView view) {
        if (printWebView != view) return;
        clearPrintTimeout();
        printWebView = null;
        pendingPrintCall = null;
        view.stopLoading();
        view.destroy();
    }

    private static void resolveHandoff(PluginCall call) {
        JSObject result = new JSObject();
        result.put("handedOff", true);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            if (printWebView != null) failPrint(printWebView, "Printing closed with the app");
        });
    }
}
