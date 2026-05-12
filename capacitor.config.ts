import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // TODO: Update appId to your own unique reverse-domain ID before App Store submission
  // e.g. com.yourdomain.profitpath — must be globally unique
  appId: 'io.profitpath.app',
  appName: 'ProfitPath',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e'
    }
  }
};

export default config;
