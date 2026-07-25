import { DSRRecord } from '../types';

const STORAGE_KEY = 'dsr_converter_records_v2';

export function loadStoredRecords(): DSRRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load records from localStorage', err);
    return [];
  }
}

export function saveStoredRecords(records: DSRRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save records to localStorage', err);
  }
}

export function clearStoredRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear records from localStorage', err);
  }
}

// Pre-packaged realistic sample WhatsApp DSR templates for 1-click test
export const SAMPLE_DSR_MESSAGES = [
  `*DAILY SALES REPORT (DSR)*
Date:- 24-07-2026
Day:- Friday
DSR Name:- Ramesh Kumar
Distributor Name:- ABC Traders & Sons
Beat:- Main Road / Central Market
Total Outlet:- 50
Total Call:- 38
Total Productive Call:- 29
Total Sales Value:- 145800

Panda Productive Call:- 12
Panda Sales Value:- 42000
Tulip Productive Call:- 10
Tulip Sales Value:- 38500
Bindhya Productive Call:- 7
Bindhya Sales Value:- 65300`,

  `*DSR - 24-07-2026*
Date: 24/07/2026
Day: Friday
DSR Name: Suresh Sharma
Distributor Name: Himalayan Suppliers
Beat: North Sector B
Total Outlet: 40
Total Call: 32
Total Productive Call: 24
Total Sales Value: 112000

Panda Productive Call: 8
Panda Sales Value: 24000
Bindhya Productive Call: 6
Bindhya Sales Value: 30000
AFC/AFR Productive Call: 10
AFC/AFR Sales Value: 58000`,

  `*DAILY SALES REPORT*
Date:- 25-07-2026
Day:- Saturday
DSR Name:- Binod Thapa
Distributor Name:- Metro Agencies
Beat:- Highway Hub
Total Outlet:- 60
Total Call:- 45
Total Productive Call:- 35
Total Sales Value:- 189500

Panda Productive Call:- 15
Panda Sales Value:- 52000
Tulip Productive Call:- 12
Tulip Sales Value:- 48500
Golden Krunch Proudctive Call:- 8
Golden Krunch Sales Value:- 89000`,
];
