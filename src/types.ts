export interface FixedFields {
  date: string;
  day: string;
  dsrName?: string;
  distributorName: string;
  beat: string;
  totalOutlet: number | string;
  totalCall: number | string;
  totalProductiveCall: number | string;
  totalSalesValue: number | string;
}

export interface BrandMetric {
  productiveCall: number | string;
  salesValue: number | string;
}

export interface DSRRecord {
  id: string;
  date: string;
  day: string;
  dsrName?: string;
  distributorName: string;
  beat: string;
  totalOutlet: number;
  totalCall: number;
  totalProductiveCall: number;
  totalSalesValue: number;
  brands: Record<string, BrandMetric>;
  rawText: string;
  parseWarnings: string[];
  createdAt: number;
}

export interface ParseResult {
  records: DSRRecord[];
  totalParsed: number;
  errors: string[];
}

export const FIXED_COLUMN_HEADERS: { key: keyof DSRRecord | string; label: string; type: 'text' | 'number' }[] = [
  { key: 'date', label: 'Date', type: 'text' },
  { key: 'day', label: 'Day', type: 'text' },
  { key: 'dsrName', label: 'DSR Name', type: 'text' },
  { key: 'distributorName', label: 'Distributor Name', type: 'text' },
  { key: 'beat', label: 'Beat', type: 'text' },
  { key: 'totalOutlet', label: 'Total Outlet', type: 'number' },
  { key: 'totalCall', label: 'Total Call', type: 'number' },
  { key: 'totalProductiveCall', label: 'Total Productive Call', type: 'number' },
  { key: 'totalSalesValue', label: 'Total Sales Value', type: 'number' },
];
