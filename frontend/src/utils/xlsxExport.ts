/**
 * Build a real Office Open XML (.xlsx) workbook from rows.
 * Uses minimal ZIP (STORE) — opens correctly in Excel / LibreOffice / Google Sheets.
 */
import { buildZip, downloadZipBlob } from './minimalZip';

function xmlEscape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(n: number): string {
  let s = '';
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode((x % 26) + 65) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
}

/** rows: first row typically headers */
export function buildXlsxBlob(sheetName: string, rows: string[][]): Blob {
  const safeName = (sheetName || 'Sheet1').replace(/[\\/*?:[\]]/g, '_').slice(0, 31) || 'Sheet1';
  const shared: string[] = [];
  const indexOf = (v: string) => {
    let i = shared.indexOf(v);
    if (i < 0) {
      shared.push(v);
      i = shared.length - 1;
    }
    return i;
  };

  const sheetRows = rows.map((row, rIdx) => {
    const cells = row.map((cell, cIdx) => {
      const text = cell == null ? '' : String(cell);
      const ref = `${colName(cIdx)}${rIdx + 1}`;
      // Prefer shared strings for all text (simpler, valid)
      const si = indexOf(text);
      return `<c r="${ref}" t="s"><v>${si}</v></c>`;
    }).join('');
    return `<row r="${rIdx + 1}">${cells}</row>`;
  }).join('');

  const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">
${shared.map(s => `<si><t>${xmlEscape(s)}</t></si>`).join('')}
</sst>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(safeName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf xfId="0"/></cellXfs>
</styleSheet>`;

  return buildZip([
    { path: '[Content_Types].xml', data: contentTypes },
    { path: '_rels/.rels', data: rootRels },
    { path: 'xl/workbook.xml', data: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { path: 'xl/worksheets/sheet1.xml', data: sheetXml },
    { path: 'xl/sharedStrings.xml', data: sharedXml },
    { path: 'xl/styles.xml', data: stylesXml },
  ]);
}

export function downloadXlsx(filename: string, sheetName: string, rows: string[][]) {
  const blob = buildXlsxBlob(sheetName, rows);
  downloadZipBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function financeMetricsRows(data: unknown): string[][] {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const provMap = rec.metricProvenance && typeof rec.metricProvenance === 'object'
    ? (rec.metricProvenance as Record<string, unknown>)
    : {};
  const keys = [
    'initialInvestment', 'operatingExpenses', 'revenue', 'expenses', 'totalExpenses', 'costs',
    'grossProfit', 'netProfit', 'grossMargin', 'burnRate', 'runway', 'cac', 'ltv', 'breakEven', 'roi',
  ];
  const rows: string[][] = [['Metric', 'Value', 'Provenance', 'Note']];
  keys.forEach((k) => {
    if (rec[k] != null && rec[k] !== '') {
      rows.push([
        k,
        String(rec[k]),
        String(provMap[k] || 'estimate/unlabeled'),
        'From agent output — verify before financial decisions',
      ]);
    }
  });
  if (Array.isArray(rec.monthlyProjections)) {
    rows.push([]);
    rows.push(['Monthly projections', '', '', 'AI estimate / scenario unless labeled']);
    rows.push(['Period', 'Revenue', 'Expenses', 'Net']);
    (rec.monthlyProjections as unknown[]).slice(0, 36).forEach((row, i) => {
      const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      rows.push([
        String(o.period || o.month || o.label || `M${i + 1}`),
        String(o.revenue ?? o.inflow ?? ''),
        String(o.expenses ?? o.outflow ?? ''),
        String(o.net ?? o.cashFlow ?? o.value ?? ''),
      ]);
    });
  }
  return rows;
}
