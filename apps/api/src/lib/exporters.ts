import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { ReportColumnType, ReportDTO } from '@vero/types';
import { formatDate, formatNumber, TASHKENT_OFFSET_MINUTES } from '@vero/utils';
import type { Language } from '@vero/config';

const here = dirname(fileURLToPath(import.meta.url));

/** Locates bundled assets both from src/ (dev) and dist/ (production bundle). */
export function assetPath(...parts: string[]): string {
  const candidates = [resolve(here, '../../assets', ...parts), resolve(here, '../assets', ...parts), resolve(process.cwd(), 'assets', ...parts)];
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!;
}

function cell(value: string | number | null, type: ReportColumnType, lang: Language): string {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'money' || type === 'number') return typeof value === 'number' ? formatNumber(value) : String(value);
  if (type === 'percent') return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value);
  if (type === 'date') return formatDate(String(value), lang, 'numeric');
  if (type === 'datetime') return `${formatDate(String(value), lang, 'numeric')} ${formatDate(String(value), lang, 'time')}`;
  return String(value);
}

const OFFSET_MS = TASHKENT_OFFSET_MINUTES * 60_000;
const isDateType = (t: ReportColumnType) => t === 'date' || t === 'datetime';

/** ISO timestamp → Tashkent wall-clock "YYYY-MM-DD" / "YYYY-MM-DD HH:mm" (spreadsheet friendly, unambiguous). */
function localTimestamp(value: string | number | null | undefined, withTime: boolean): string {
  if (value === null || value === undefined || value === '') return '';
  const t = Date.parse(String(value));
  if (Number.isNaN(t)) return String(value);
  const s = new Date(t + OFFSET_MS).toISOString();
  return withTime ? s.slice(0, 16).replace('T', ' ') : s.slice(0, 10);
}

/** CSV with UTF-8 BOM (opens correctly in Excel with Cyrillic / Uzbek text). */
export function toCsv(report: ReportDTO): Buffer {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [report.columns.map((c) => esc(c.label)).join(',')];
  for (const row of report.rows) {
    lines.push(report.columns.map((c) => esc(isDateType(c.type) ? localTimestamp(row[c.key], c.type === 'datetime') : row[c.key])).join(','));
  }
  if (report.summary.length) {
    lines.push('');
    for (const s of report.summary) lines.push([esc(s.label), esc(s.value)].join(','));
  }
  return Buffer.concat([Buffer.from('﻿', 'utf8'), Buffer.from(lines.join('\r\n'), 'utf8')]);
}

export async function toXlsx(report: ReportDTO, lang: Language): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OCKEAN';
  wb.created = new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31));
  ws.addRow([report.title]).font = { bold: true, size: 14 };
  ws.addRow([`${formatDate(report.range.from, lang, 'numeric')} — ${formatDate(new Date(new Date(report.range.to).getTime() - 1), lang, 'numeric')}`]);
  ws.addRow([]);
  const header = ws.addRow(report.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFD8902' } };
    c.alignment = { vertical: 'middle' };
  });
  for (const row of report.rows) {
    // Excel dates carry no timezone: write the Tashkent wall-clock time so the shown date is the local one.
    const values = report.columns.map((c) => {
      const v = row[c.key];
      if (!isDateType(c.type) || v === null || v === undefined || v === '') return v;
      const t = Date.parse(String(v));
      return Number.isNaN(t) ? v : new Date(t + OFFSET_MS);
    });
    const r = ws.addRow(values);
    report.columns.forEach((c, i) => {
      const cellRef = r.getCell(i + 1);
      if (c.type === 'money' || c.type === 'number') cellRef.numFmt = '#,##0';
      if (c.type === 'percent') cellRef.numFmt = '0.0"%"';
      if (c.type === 'date') cellRef.numFmt = 'dd.mm.yyyy';
      if (c.type === 'datetime') cellRef.numFmt = 'dd.mm.yyyy hh:mm';
    });
  }
  if (report.summary.length) {
    ws.addRow([]);
    for (const s of report.summary) {
      const r = ws.addRow([s.label, s.value]);
      r.font = { bold: true };
      if (s.type === 'money' || s.type === 'number') r.getCell(2).numFmt = '#,##0';
    }
  }
  ws.columns.forEach((col, i) => {
    const c = report.columns[i];
    col.width = c ? Math.min(48, Math.max(12, c.label.length + 4, c.type === 'text' ? 28 : 14)) : 14;
  });
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toPdf(report: ReportDTO, lang: Language): Promise<Buffer> {
  return new Promise((resolvePdf, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: report.columns.length > 6 ? 'landscape' : 'portrait', margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolvePdf(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('regular', assetPath('fonts', 'DejaVuSans.ttf'));
    doc.registerFont('bold', assetPath('fonts', 'DejaVuSans-Bold.ttf'));

    const logo = assetPath('logo.png');
    if (existsSync(logo)) doc.image(logo, 36, 30, { width: 34 });
    doc.font('bold').fontSize(15).fillColor('#141416').text(report.title, 80, 34);
    doc
      .font('regular')
      .fontSize(9)
      .fillColor('#65656F')
      .text(
        `${formatDate(report.range.from, lang, 'numeric')} — ${formatDate(new Date(new Date(report.range.to).getTime() - 1), lang, 'numeric')}   ·   OCKEAN`,
        80,
        54,
      );
    doc.moveDown(2);

    const width = doc.page.width - 72;
    const cols = report.columns;
    const fontSize = cols.length > 10 ? 7 : 8;
    const rowH = fontSize + 10;
    const headH = fontSize * 2 + 12;
    const texts = report.rows.map((row) => cols.map((c) => cell(row[c.key] ?? null, c.type, lang)));

    // column widths from the content (sampled), then fitted to the page: text columns give way first
    doc.font('regular').fontSize(fontSize);
    const widths = cols.map((c, i) => {
      let w = 0;
      for (const r of texts.slice(0, 400)) w = Math.max(w, doc.widthOfString(r[i]!));
      doc.font('bold');
      const label = Math.min(doc.widthOfString(c.label), c.type === 'text' ? 110 : 60);
      doc.font('regular');
      return Math.min(c.type === 'text' ? 170 : 95, Math.max(w, label, 24)) + 10;
    });
    const sum = () => widths.reduce((a, b) => a + b, 0);
    // identifiers (order number, phone, SKU) keep their natural width; descriptive text columns give way
    const FIXED = new Set(['number', 'phone', 'sku', 'currency']);
    const textCols = cols.map((c, i) => (c.type === 'text' && !FIXED.has(c.key) ? i : -1)).filter((i) => i >= 0);
    if (sum() > width) {
      const excess = sum() - width;
      const room = textCols.reduce((a, i) => a + Math.max(0, widths[i]! - 56), 0);
      if (room > 0) for (const i of textCols) widths[i] = widths[i]! - (excess * Math.max(0, widths[i]! - 56)) / room * Math.min(1, room / excess);
      if (sum() > width) {
        const k = width / sum();
        widths.forEach((w, i) => (widths[i] = w * k));
      }
    } else {
      const extra = width - sum();
      const targets = textCols.length ? textCols : cols.map((_, i) => i);
      for (const i of targets) widths[i] = widths[i]! + extra / targets.length;
    }

    /** single-line cell: truncated with an ellipsis, never wrapped */
    const fit = (text: string, max: number) => {
      if (doc.widthOfString(text) <= max) return text;
      let t = text;
      while (t.length > 1 && doc.widthOfString(`${t}…`) > max) t = t.slice(0, -1);
      return `${t.trimEnd()}…`;
    };
    const drawCell = (text: string, x: number, w: number, right: boolean, top: number) => {
      const t = fit(text, w - 8);
      doc.text(t, right ? x + w - 4 - doc.widthOfString(t) : x + 4, top, { lineBreak: false });
    };

    let y = 86;
    const drawHeader = () => {
      doc.rect(36, y, width, headH).fill('#FD8902');
      let x = 36;
      doc.font('bold').fontSize(fontSize).fillColor('#FFFFFF');
      cols.forEach((c, i) => {
        doc.text(c.label, x + 4, y + 5, { width: widths[i]! - 8, height: headH - 6, align: c.type === 'text' ? 'left' : 'right' });
        x += widths[i]!;
      });
      y += headH;
      doc.font('regular').fontSize(fontSize);
    };
    drawHeader();
    texts.forEach((r, idx) => {
      if (y + rowH > doc.page.height - 50) {
        doc.addPage();
        y = 40;
        drawHeader();
      }
      if (idx % 2 === 1) doc.rect(36, y, width, rowH).fill('#F6F6F7');
      let x = 36;
      doc.fillColor('#141416');
      cols.forEach((c, i) => {
        drawCell(r[i]!, x, widths[i]!, c.type !== 'text', y + 5);
        x += widths[i]!;
      });
      y += rowH;
    });
    if (report.summary.length) {
      y += 12;
      if (y + report.summary.length * 16 > doc.page.height - 50) {
        doc.addPage();
        y = 40;
      }
      for (const s of report.summary) {
        doc.font('bold').fontSize(9).fillColor('#141416').text(`${s.label}: `, 36, y, { continued: true });
        doc.font('regular').text(cell(s.value as never, s.type, lang));
        y += 16;
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.font('regular').fontSize(7).fillColor('#A0A0AA').text(`${i + 1} / ${range.count}`, 36, doc.page.height - 30, { width, align: 'right' });
    }
    doc.end();
  });
}
