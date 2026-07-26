import * as XLSX from 'xlsx';
import { DSRRecord } from '../types';
import { getAllUniqueBrands } from './dsrParser';

export function exportToExcel(records: DSRRecord[], filenamePrefix: string = 'WhatsApp_DSR_Report'): void {
  if (!records || records.length === 0) {
    alert('No data available to export.');
    return;
  }

  // 1. Gather all unique brands dynamically
  const uniqueBrands = getAllUniqueBrands(records);

  // 2. Build headers list matching UI table & Google Sheets
  const headers: string[] = [
    'Date',
    'Day',
    'DSR Name',
    'Distributor Name',
    'Beat',
    'Total Outlet',
    'Total Call',
    'Total Productive Call',
    'Total Sales Value',
  ];

  // Append brand column headers
  uniqueBrands.forEach((brand) => {
    headers.push(`${brand} Sales Value`);
  });

  // 3. Build data rows
  const rows: (string | number)[][] = [headers];

  // Track totals for numeric columns
  const columnTotals: Record<number, number> = {};

  records.forEach((rec) => {
    const row: (string | number)[] = [
      rec.date || '',
      rec.day || '',
      rec.dsrName || '',
      rec.distributorName || '',
      rec.beat || '',
      Number(rec.totalOutlet) || 0,
      Number(rec.totalCall) || 0,
      Number(rec.totalProductiveCall) || 0,
      Number(rec.totalSalesValue) || 0,
    ];

    // Add brand values
    uniqueBrands.forEach((brand) => {
      const brandData = rec.brands[brand];
      const salesVal = brandData ? Number(brandData.salesValue) || 0 : 0;
      row.push(salesVal);
    });

    // Accumulate numeric totals (indices 5 to row.length - 1)
    for (let colIdx = 5; colIdx < row.length; colIdx++) {
      const val = typeof row[colIdx] === 'number' ? (row[colIdx] as number) : 0;
      columnTotals[colIdx] = (columnTotals[colIdx] || 0) + val;
    }

    rows.push(row);
  });

  // 4. Create Totals Row
  const totalsRow: (string | number)[] = ['TOTAL', '', '', `${records.length} Reports`, '', '', '', '', ''];

  // Fill in column totals
  for (let colIdx = 5; colIdx < headers.length; colIdx++) {
    totalsRow[colIdx] = columnTotals[colIdx] || 0;
  }

  rows.push(totalsRow);

  // 5. Generate worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Apply number formatting (#,##0) to numeric cells for clean Excel formatting
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = 5; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = '#,##0';
        }
      }
    }
  }

  // Auto-size columns nicely
  const colWidths = headers.map((header, colIndex) => {
    let maxLen = header.length;
    rows.forEach((r) => {
      const rawVal = r[colIndex];
      const valStr = typeof rawVal === 'number'
        ? rawVal.toLocaleString('en-IN')
        : String(rawVal ?? '');
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });

  worksheet['!cols'] = colWidths;

  // 6. Generate workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DSR Sheet');

  // Format date stamp for filename
  const nowStr = new Date().toISOString().split('T')[0];
  const fullFilename = `${filenamePrefix}_${nowStr}.xlsx`;

  // Write and download file
  XLSX.writeFile(workbook, fullFilename);
}

