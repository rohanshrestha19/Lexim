import * as XLSX from 'xlsx';
import { DSRRecord, BrandMetric } from '../types';

/**
 * Parses an Excel file (.xlsx, .xls, .csv) ArrayBuffer into structured DSRRecord objects.
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): { records: DSRRecord[]; errors: string[] } {
  const errors: string[] = [];
  const records: DSRRecord[] = [];

  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { records: [], errors: ['Excel file contains no readable sheets.'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convert worksheet to array of objects with header row
    const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!jsonRows || jsonRows.length === 0) {
      return { records: [], errors: ['No data found in the uploaded Excel sheet.'] };
    }

    // Inspect row keys to identify standard headers vs brand columns
    const sampleRow = jsonRows[0] || {};
    const keys = Object.keys(sampleRow);

    // Standard key aliases
    const findKey = (row: Record<string, any>, candidates: string[]): any => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        for (const cand of candidates) {
          if (cleanKey === cand.toLowerCase() || cleanKey.includes(cand.toLowerCase())) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    jsonRows.forEach((row, index) => {
      // Skip summary / TOTAL rows
      const firstColStr = String(row[keys[0]] || '').trim().toUpperCase();
      if (firstColStr === 'TOTAL' || firstColStr.startsWith('TOTALS')) {
        return;
      }

      const dateVal = findKey(row, ['Date', 'DSR Date']);
      const distributorNameVal = findKey(row, ['Distributor Name', 'Distributor', 'Distributor_Name']);
      const salesValueVal = findKey(row, ['Total Sales Value', 'Sales Value', 'Total Sales', 'Revenue']);

      // Require at least a distributor or a date or sales value to treat as a valid record
      if (!distributorNameVal && !dateVal && !salesValueVal) {
        return;
      }

      const dayVal = findKey(row, ['Day']);
      const dsrNameVal = findKey(row, ['DSR Name', 'DSR', 'Sales Rep', 'SR Name']);
      const beatVal = findKey(row, ['Beat', 'Route', 'Area']);
      const totalOutletVal = findKey(row, ['Total Outlet', 'Outlets', 'Outlet Count']);
      const totalCallVal = findKey(row, ['Total Call', 'Calls', 'Call Count']);
      const totalProductiveCallVal = findKey(row, ['Total Productive Call', 'Productive Call', 'Productive Calls']);

      // Parse brand columns
      const brands: Record<string, BrandMetric> = {};

      Object.keys(row).forEach((k) => {
        const cleanK = k.trim();
        const lowerK = cleanK.toLowerCase();

        // Check if key is a brand column (e.g. "BRAND_NAME Sales Value", or non-standard brand header)
        const isStandardCol = [
          'date', 'day', 'dsr name', 'dsr', 'distributor name', 'distributor',
          'beat', 'route', 'total outlet', 'total call', 'total productive call',
          'total sales value', 'total sales', 'sr name', '#'
        ].some((std) => lowerK === std || lowerK.startsWith(std));

        if (!isStandardCol && row[k] !== undefined && row[k] !== '') {
          // Format brand name (e.g. remove " Sales Value" or " Sales" suffix)
          let brandName = cleanK
            .replace(/\s*Sales\s*Value/i, '')
            .replace(/\s*Sales/i, '')
            .trim();

          if (brandName) {
            const numVal = parseFloat(String(row[k]).replace(/,/g, '')) || 0;
            if (numVal > 0) {
              brands[brandName] = { salesValue: numVal, productiveCall: 0 };
            }
          }
        }
      });

      const recordId = `rec_excel_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
      const cleanDate = dateVal ? String(dateVal).trim() : new Date().toISOString().split('T')[0];

      records.push({
        id: recordId,
        date: cleanDate,
        day: dayVal ? String(dayVal).trim() : '',
        dsrName: dsrNameVal ? String(dsrNameVal).trim() : undefined,
        distributorName: distributorNameVal ? String(distributorNameVal).trim() : 'Unassigned Distributor',
        beat: beatVal ? String(beatVal).trim() : 'General Beat',
        totalOutlet: parseFloat(String(totalOutletVal || 0).replace(/,/g, '')) || 0,
        totalCall: parseFloat(String(totalCallVal || 0).replace(/,/g, '')) || 0,
        totalProductiveCall: parseFloat(String(totalProductiveCallVal || 0).replace(/,/g, '')) || 0,
        totalSalesValue: parseFloat(String(salesValueVal || 0).replace(/,/g, '')) || 0,
        brands,
        rawText: `Imported from Excel File (Row ${index + 2})`,
        parseWarnings: [],
        createdAt: Date.now() + index,
      });
    });

    if (records.length === 0) {
      errors.push('Could not parse valid DSR rows from the Excel file. Please check column headers.');
    }
  } catch (err: any) {
    errors.push(`Failed to process Excel file: ${err?.message || String(err)}`);
  }

  return { records, errors };
}
