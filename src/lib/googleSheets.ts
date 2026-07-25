import { DSRRecord, BrandMetric } from '../types';
import { getAllUniqueBrands } from '../utils/dsrParser';

export interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleSheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsExported: number;
}

/**
 * Lists user's recently modified Google Sheets from Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<SpreadsheetFile[]> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&orderBy=modifiedTime%20desc&pageSize=15&fields=files(id,name,modifiedTime,webViewLink)",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to list Google Sheets');
    }
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing spreadsheets:', error);
    throw error;
  }
}

/**
 * Helper to build 2D array of rows from DSRRecords
 */
export function buildSheetDataMatrix(records: DSRRecord[]): { headers: string[]; rows: (string | number)[][] } {
  const uniqueBrands = getAllUniqueBrands(records);

  const headers = [
    'Date',
    'Day',
    'DSR Name',
    'Distributor Name',
    'Beat',
    'Total Outlet',
    'Total Call',
    'Total Productive Call',
    'Total Sales Value',
    ...uniqueBrands.map((b) => `${b} Sales Value`),
  ];

  const rows = records.map((record) => {
    const brandValues = uniqueBrands.map((brandName) => {
      const brandData = record.brands[brandName];
      return brandData ? Number(brandData.salesValue) || 0 : 0;
    });

    return [
      record.date || '',
      record.day || '',
      record.dsrName || '',
      record.distributorName || '',
      record.beat || '',
      Number(record.totalOutlet) || 0,
      Number(record.totalCall) || 0,
      Number(record.totalProductiveCall) || 0,
      Number(record.totalSalesValue) || 0,
      ...brandValues,
    ];
  });

  return { headers, rows };
}

/**
 * Create a brand new Google Spreadsheet and write records into it
 */
export async function exportToNewGoogleSheet(
  accessToken: string,
  title: string,
  records: DSRRecord[]
): Promise<GoogleSheetsExportResult> {
  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || `DSR Report - ${new Date().toLocaleDateString('en-US')}`,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create new Google Sheet');
  }

  const sheetObj = await createRes.json();
  const spreadsheetId = sheetObj.spreadsheetId;
  const spreadsheetUrl = sheetObj.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Data
  const { headers, rows } = buildSheetDataMatrix(records);
  const fullValues = [headers, ...rows];

  // 3. Write Data
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: fullValues,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json();
    throw new Error(err.error?.message || 'Failed to write data into Google Sheet');
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    rowsExported: records.length,
  };
}

/**
 * Append records to an existing Google Spreadsheet
 */
export async function appendToExistingGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  records: DSRRecord[]
): Promise<GoogleSheetsExportResult> {
  const { rows } = buildSheetDataMatrix(records);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Failed to append data to existing Google Sheet');
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    rowsExported: records.length,
  };
}

/**
 * Import records from a Google Spreadsheet
 */
export async function importFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<DSRRecord[]> {
  const fetchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ1000`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!fetchRes.ok) {
    const err = await fetchRes.json();
    throw new Error(err.error?.message || 'Failed to read data from Google Sheet');
  }

  const data = await fetchRes.json();
  const values: string[][] = data.values || [];

  if (values.length < 2) {
    return [];
  }

  const rawHeaders = values[0].map((h) => h.trim().toLowerCase());
  const rows = values.slice(1);

  // Map Header Indices
  const dateIdx = rawHeaders.findIndex((h) => h.includes('date'));
  const dayIdx = rawHeaders.findIndex((h) => h === 'day');
  const dsrIdx = rawHeaders.findIndex((h) => h.includes('dsr'));
  const distIdx = rawHeaders.findIndex((h) => h.includes('distributor') || h.includes('name'));
  const beatIdx = rawHeaders.findIndex((h) => h.includes('beat'));
  const outletIdx = rawHeaders.findIndex((h) => h.includes('outlet'));
  const callIdx = rawHeaders.findIndex((h) => h.includes('total call') || h === 'calls');
  const prodIdx = rawHeaders.findIndex((h) => h.includes('productive') || h.includes('prod'));
  const salesIdx = rawHeaders.findIndex((h) => h.includes('sales') || h.includes('value'));

  // Brand columns (any header not matching standard fields)
  const standardIndices = new Set([dateIdx, dayIdx, dsrIdx, distIdx, beatIdx, outletIdx, callIdx, prodIdx, salesIdx]);
  const brandCols: { name: string; idx: number }[] = [];

  rawHeaders.forEach((h, idx) => {
    if (!standardIndices.has(idx) && h !== '') {
      let brandName = values[0][idx];
      brandName = brandName.replace(/sales value/i, '').trim();
      if (brandName) {
        brandCols.push({ name: brandName, idx });
      }
    }
  });

  const importedRecords: DSRRecord[] = [];

  rows.forEach((row, rowIndex) => {
    if (!row || row.length === 0 || !row.some((cell) => cell.trim() !== '')) return;

    const recordDate = dateIdx >= 0 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split('T')[0];
    const recordDay = dayIdx >= 0 && row[dayIdx] ? row[dayIdx].trim() : '';
    const dsrName = dsrIdx >= 0 && row[dsrIdx] ? row[dsrIdx].trim() : undefined;
    const distributorName = distIdx >= 0 && row[distIdx] ? row[distIdx].trim() : 'Imported Distributor';
    const beat = beatIdx >= 0 && row[beatIdx] ? row[beatIdx].trim() : 'Default Beat';

    const parseNum = (val?: string) => {
      if (!val) return 0;
      const cleaned = val.replace(/[^0-9.]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const totalOutlet = outletIdx >= 0 ? parseNum(row[outletIdx]) : 0;
    const totalCall = callIdx >= 0 ? parseNum(row[callIdx]) : 0;
    const totalProductiveCall = prodIdx >= 0 ? parseNum(row[prodIdx]) : 0;
    const totalSalesValue = salesIdx >= 0 ? parseNum(row[salesIdx]) : 0;

    const brands: Record<string, BrandMetric> = {};
    brandCols.forEach(({ name, idx }) => {
      const val = parseNum(row[idx]);
      if (val > 0) {
        brands[name] = {
          productiveCall: 0,
          salesValue: val,
        };
      }
    });

    const record: DSRRecord = {
      id: `dsr-gsheet-${Date.now()}-${rowIndex}-${Math.random().toString(36).substr(2, 4)}`,
      date: recordDate,
      day: recordDay,
      dsrName,
      distributorName,
      beat,
      totalOutlet,
      totalCall,
      totalProductiveCall,
      totalSalesValue,
      brands,
      rawText: `Imported from Google Sheet row ${rowIndex + 2}`,
      parseWarnings: [],
      createdAt: Date.now(),
    };

    importedRecords.push(record);
  });

  return importedRecords;
}
