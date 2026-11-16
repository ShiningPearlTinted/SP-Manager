// Shared "Export to Excel": writes a real .xlsx workbook so every value lands in its own column,
// whatever list separator the computer's Excel uses (a ";" CSV opened in one column on Malaysian/English
// Windows). Codes, barcodes and phone numbers stay text, so long barcodes and leading zeros are kept.
let loader;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = (import.meta.env.BASE_URL || '/') + 'vendor/xlsx.full.min.js';
    script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel library did not load.'));
    script.onerror = () => { script.remove(); loader = null; reject(new Error('Excel library could not be loaded.')); };
    document.head.appendChild(script);
  });
  return loader;
}

const TEXT_HEADER = /\b(code|sku|barcode|phone|tel|ic|passport|postcode|postal|tax number|account|reference|number|no\.?|plate|vehicle|card)\b/i;
const MONEY_HEADER = /\b(price|cost|value|amount|total|paid|balance|salary|allowance|deductions?|net|gross|rm|spend|cash|card sales)\b/i;

/**
 * Save a table as an .xlsx file.
 * @param {string} fileName  e.g. "sp-manager-products" (".xlsx" is added)
 * @param {string[]} head    column titles
 * @param {Array<Array>} rows table rows
 * @param {{sheet?:string,text?:number[],money?:number[]}} [opts] column indexes forced to text / money
 */
export async function saveExcelTable(fileName, head, rows, opts = {}) {
  const textCols = new Set(opts.text ?? head.map((h, i) => TEXT_HEADER.test(String(h)) ? i : -1).filter(i => i >= 0));
  const moneyCols = new Set(opts.money ?? head.map((h, i) => !textCols.has(i) && MONEY_HEADER.test(String(h)) ? i : -1).filter(i => i >= 0));
  const cellValue = (v, c) => {
    if (v === null || v === undefined) return '';
    if (textCols.has(c)) return String(v);
    if (typeof v === 'number') return Number.isFinite(v) ? v : '';
    const s = String(v).trim();
    // Plain numbers become real numbers; anything with a leading zero or 12+ digits stays text.
    if (/^-?\d+(\.\d+)?$/.test(s) && !/^-?0\d/.test(s) && s.replace(/\D/g, '').length < 12) return Number(s);
    return String(v);
  };
  const values = [head.map(String), ...rows.map(r => head.map((_, c) => cellValue(r[c], c)))];
  let XLSX;
  try { XLSX = await loadXlsx(); }
  catch (e) { downloadCsv(fileName, values); return 'csv'; }
  const sheet = XLSX.utils.aoa_to_sheet(values);
  sheet['!cols'] = head.map((h, c) => ({ wch: Math.min(48, Math.max(String(h).length + 2, ...values.slice(1, 400).map(r => String(r[c] ?? '').length + 2), 8)) }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, values.length - 1), c: head.length - 1 } }) };
  for (let r = 1; r < values.length; r++) head.forEach((_, c) => {
    const ref = XLSX.utils.encode_cell({ r, c }); const cell = sheet[ref];
    if (!cell) return;
    if (textCols.has(c)) { cell.t = 's'; cell.v = String(cell.v ?? ''); cell.z = '@'; }
    else if (moneyCols.has(c) && cell.t === 'n') cell.z = '#,##0.00';
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, String(opts.sheet || 'Data').slice(0, 31));
  XLSX.writeFile(book, fileName.replace(/\.(csv|xlsx)$/i, '') + '.xlsx');
  return 'xlsx';
}

// Fallback when the Excel library is unavailable: comma separated, UTF-8 with BOM, opens in columns.
function downloadCsv(fileName, values) {
  const csv = values.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = fileName.replace(/\.(csv|xlsx)$/i, '') + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
