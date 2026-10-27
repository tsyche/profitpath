/**
 * Minimal XLSX writer/reader (roadmap 33 — Excel export parity).
 *
 * The "Excel" export used to ship a CSV blob under a .csv name while the menu
 * called it a workbook. A real workbook needs no new dependency: an .xlsx file
 * is a ZIP of XML parts, and fflate (already used to compress share URLs) does
 * the ZIP. Cells are inline strings or numbers — no styles, no shared-strings
 * table, no formulas — which every spreadsheet app opens fine.
 *
 * readXLSX exists so tests can assert against the artifact a user actually
 * downloads. App code never imports it, so it stays out of the bundle.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type XlsxValue = string | number | boolean | null | undefined;

export interface XlsxSheet {
  name: string;
  rows: XlsxValue[][];
}

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const WORKBOOK_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
const WORKSHEET_CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
const WORKBOOK_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';
const WORKSHEET_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const unesc = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&');

/** 0 -> A, 25 -> Z, 26 -> AA */
function colName(i: number): string {
  let n = i + 1;
  let out = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel sheet names: max 31 chars, no []:*?/\ and unique case-insensitively. */
function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let out = base;
  let n = 2;
  while (used.has(out.toLowerCase())) out = (base.slice(0, 28) + ' ' + n++).slice(0, 31);
  used.add(out.toLowerCase());
  return out;
}

function sheetXml(rows: XlsxValue[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => {
          const ref = colName(c) + (r + 1);
          if (v === null || v === undefined || v === '') return '';
          if (typeof v === 'number') return Number.isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : '';
          if (typeof v === 'boolean') return `<c r="${ref}" t="inlineStr"><is><t>${v ? 'TRUE' : 'FALSE'}</t></is></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
        })
        .join('');
      return cells ? `<row r="${r + 1}">${cells}</row>` : '';
    })
    .join('');
  return `${XML_HEADER}<worksheet xmlns="${MAIN_NS}"><sheetData>${body}</sheetData></worksheet>`;
}

/** A real multi-sheet .xlsx workbook. Empty sheets are still valid (Excel shows a blank grid). */
export function buildXLSX(sheets: XlsxSheet[]): Uint8Array {
  const used = new Set<string>();
  const named = sheets.map((s, i) => ({ name: safeSheetName(s.name, used), rows: s.rows, id: i + 1 }));

  const contentTypes =
    XML_HEADER +
    `<Types xmlns="${CT_NS}">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="${WORKBOOK_CT}"/>` +
    named.map((s) => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="${WORKSHEET_CT}"/>`).join('') +
    '</Types>';

  const rootRels =
    XML_HEADER +
    `<Relationships xmlns="${PKG_REL_NS}">` +
    `<Relationship Id="rId1" Type="${WORKBOOK_REL}" Target="xl/workbook.xml"/>` +
    '</Relationships>';

  const workbook =
    XML_HEADER +
    `<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets>` +
    named.map((s) => `<sheet name="${esc(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join('') +
    '</sheets></workbook>';

  const workbookRels =
    XML_HEADER +
    `<Relationships xmlns="${PKG_REL_NS}">` +
    named.map((s) => `<Relationship Id="rId${s.id}" Type="${WORKSHEET_REL}" Target="worksheets/sheet${s.id}.xml"/>`).join('') +
    '</Relationships>';

  const files: Record<string, Uint8Array> = {
    // [Content_Types].xml first: some readers assume the package manifest opens the archive
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRels)
  };
  for (const s of named) files[`xl/worksheets/sheet${s.id}.xml`] = strToU8(sheetXml(s.rows));

  return zipSync(files, { level: 9 });
}

function parseSheetXml(xml: string): XlsxValue[][] {
  const rows: XlsxValue[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: XlsxValue[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] ?? cellMatch[2] ?? '';
      const inner = cellMatch[3] ?? '';
      const ref = /r="([A-Z]+)\d+"/.exec(attrs);
      const col = ref ? colIndex(ref[1]) : cells.length;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value: XlsxValue = '';
      if (type === 'inlineStr') {
        value = Array.from(inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g), (m) => unesc(m[1])).join('');
      } else if (type !== 's') {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (raw !== undefined) {
          const n = Number(raw);
          value = raw.trim() !== '' && Number.isFinite(n) ? n : raw;
        }
      }
      cells[col] = value;
    }
    rows.push(cells);
  }
  return rows;
}

/** Reads back a workbook this module produced, in sheet order. */
export function readXLSX(bytes: Uint8Array): XlsxSheet[] {
  const files = unzipSync(bytes);
  const workbook = strFromU8(files['xl/workbook.xml']);
  const rels = strFromU8(files['xl/_rels/workbook.xml.rels']);

  const targetOf = new Map<string, string>();
  for (const tag of rels.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const id = /Id="([^"]+)"/.exec(tag[0])?.[1];
    const target = /Target="([^"]+)"/.exec(tag[0])?.[1];
    if (id && target) targetOf.set(id, target);
  }

  const sheets: XlsxSheet[] = [];
  for (const tag of workbook.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const name = unesc(/name="([^"]*)"/.exec(tag[0])?.[1] ?? '');
    const rid = /r:id="([^"]+)"/.exec(tag[0])?.[1] ?? '';
    const target = targetOf.get(rid);
    const part = files['xl/' + (target || '')];
    if (!part) continue;
    sheets.push({ name, rows: parseSheetXml(strFromU8(part)) });
  }
  return sheets;
}
