import { DSRRecord, ParseResult } from '../types';

/**
 * Normalizes text lines by removing WhatsApp formatting markers (*, _, ~)
 * and trimming whitespace.
 */
function cleanLine(line: string): string {
  return line
    .replace(/[*_~`]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
    .trim();
}

/**
 * Standardizes brand name casing for consistency across messages.
 * e.g., "afc/afr" -> "AFC/AFR", "panda" -> "Panda", "TULIP" -> "Tulip"
 */
export function normalizeBrandName(rawBrand: string): string {
  const trimmed = rawBrand.trim();
  if (!trimmed) return 'Unknown Brand';

  // If it contains slashes or looks like an acronym (all 2-4 uppercase or slash-separated), keep uppercase
  if (trimmed.includes('/') || trimmed.length <= 4) {
    return trimmed.toUpperCase();
  }

  // Capitalize word by word
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extracts a numeric value from a string, handling currency symbols, commas, and formatting.
 */
function parseNumber(valueStr: string | undefined): number {
  if (!valueStr) return 0;
  // Remove non-digit characters except decimal point and minus
  const cleaned = valueStr.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extracts raw string value after key delimiter (e.g., "Date:- 24-07-2026" -> "24-07-2026")
 */
function extractValueAfterDelimiter(line: string): string {
  // Look for separators like :- , : , = , - , – , —
  const match = line.match(/^[^:=–—-]+?\s*[:=–—-]+\s*(.*)$/);
  if (match && match[1] !== undefined) {
    return match[1].trim();
  }
  return '';
}

/**
 * Splits raw pasted text into individual message blocks accurately.
 */
export function splitMessages(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // 1. Explicit divider lines: ---, ===, ***, ###
  const dividerRegex = /\n\s*(?:-{3,}|={3,}|\*{3,}|#{3,})\s*\n/g;
  const initialChunks = rawText.split(dividerRegex).map((c) => c.trim()).filter(Boolean);

  const finalChunks: string[] = [];

  initialChunks.forEach((chunk) => {
    const lines = chunk.split('\n');
    let currentMessageLines: string[] = [];

    // Helper to check if a line looks like the start of a new DSR report
    const isReportStartLine = (l: string) => {
      const cleaned = cleanLine(l).toLowerCase();
      // Matches "Date: ...", "Date - ...", "DSR Date: ...", "DSR", "Daily Sales Report", "Distributor Name: ...", "1. Date: ...", "1) DSR"
      return (
        /^(?:\d+[\.\)]\s*)?(?:date|dsr|daily sales report|sales report)\b/i.test(cleaned) ||
        /^(?:\d+[\.\)]\s*)?(?:distributor name|distributor|dealer name|party name)\b/i.test(cleaned)
      );
    };

    // Helper to check if buffer currently contains meaningful report data
    const bufferHasSubstantialData = (buf: string[]) => {
      const joined = buf.join('\n').toLowerCase();
      return (
        joined.includes('distributor') ||
        joined.includes('total') ||
        joined.includes('sales') ||
        joined.includes('call') ||
        joined.includes('outlet') ||
        buf.length >= 3
      );
    };

    lines.forEach((line) => {
      if (isReportStartLine(line) && bufferHasSubstantialData(currentMessageLines)) {
        // Hitting a new report header AND buffer already has a report -> push current buffer and reset
        finalChunks.push(currentMessageLines.join('\n'));
        currentMessageLines = [line];
      } else {
        currentMessageLines.push(line);
      }
    });

    if (currentMessageLines.length > 0) {
      finalChunks.push(currentMessageLines.join('\n'));
    }
  });

  return finalChunks.map((c) => c.trim()).filter((c) => c.length > 5);
}

/**
 * Parses a single message block into a DSRRecord object.
 */
export function parseSingleMessage(msgText: string, index: number): DSRRecord {
  const lines = msgText.split('\n').map(cleanLine).filter(Boolean);

  let date = '';
  let day = '';
  let dsrName = '';
  let distributorName = '';
  let beat = '';
  let totalOutlet = 0;
  let totalCall = 0;
  let totalProductiveCall = 0;
  let totalSalesValue = 0;

  const brandsMap: Record<string, { productiveCall: number; salesValue: number }> = {};
  const parseWarnings: string[] = [];

  // Temporary brand store to pair Productive Call & Sales Value lines
  const rawBrandEntries: Record<string, { productiveCall?: number; salesValue?: number }> = {};

  lines.forEach((line) => {
    const lower = line.toLowerCase();

    // Ignore header title lines without values
    if (/^(?:dsr|daily sales report|sales report)\b/i.test(line) && !line.includes(':') && !line.includes('-') && !line.includes('=')) {
      return;
    }

    // 1. DATE
    if (/^(?:date|dsr date|report date|dt)\b/i.test(lower) || lower.startsWith('date:') || lower.startsWith('date-') || lower.startsWith('date -')) {
      const val = extractValueAfterDelimiter(line);
      if (val) date = val;
      return;
    }

    // 2. DAY
    if (/^day\b/i.test(lower)) {
      const val = extractValueAfterDelimiter(line);
      if (val) day = val;
      return;
    }

    // 2.5 DSR NAME / SALES OFFICER / SALES REP / SO NAME / SR NAME
    if (
      /^(?:dsr name|dsr_name|sales rep|sales representative|sales officer|sales person|sales executive|so name|sr name|se name|executive name|staff name|officer name|dsr)\b/i.test(lower) ||
      (lower.includes('dsr name') || lower.includes('so name') || lower.includes('sr name') || lower.includes('sales person') || lower.includes('sales officer') || lower.includes('sales executive'))
    ) {
      const val = extractValueAfterDelimiter(line);
      // Ensure the extracted value is valid name text and not date/report header/numeric
      if (val && isNaN(Number(val)) && !/^(?:daily|report|sales report)/i.test(val) && !val.includes('/') && !/\d{2,4}[-\/]\d{2,4}/.test(val)) {
        dsrName = val;
        return;
      }
    }

    // 3. DISTRIBUTOR NAME (Strict key matching to prevent matching sales or brand total lines)
    if (
      /^(?:distributor name|distributor|dealer name|dealer|party name|party|agency name|agency|firm name|firm|stokist|stockist)\b/i.test(lower) ||
      (
        (lower.includes('distributor') || lower.includes('dealer') || lower.includes('party name')) &&
        !lower.includes('sales') && !lower.includes('value') && !lower.includes('amt') &&
        !lower.includes('total') && !lower.includes('call') && !lower.includes('outlet')
      )
    ) {
      const val = extractValueAfterDelimiter(line);
      if (val) distributorName = val;
      return;
    }

    // 4. BEAT / ROUTE / AREA
    if (/^(?:beat|beat name|route|route name|area|market)\b/i.test(lower)) {
      const val = extractValueAfterDelimiter(line);
      if (val) beat = val;
      return;
    }

    // 5. TOTAL OUTLETS
    if (
      /^(?:total outlet|total outlets|outlets|outlet count|no of outlet|no\. of outlets)\b/i.test(lower) ||
      (lower.includes('total outlet') || lower.includes('total outlets'))
    ) {
      totalOutlet = parseNumber(extractValueAfterDelimiter(line)) || totalOutlet;
      return;
    }

    // 6. TOTAL PRODUCTIVE CALL (Check before Total Call!)
    const isBrandPC = /^(?!total\b)[a-z0-9\/&#\s-]+\s+(?:pc|productive call|prod call)/i.test(lower);
    if (
      !isBrandPC && (
        /^(?:total productive call|total productive calls|total prod call|total prod calls|total pc|total proudctive call)\b/i.test(lower) ||
        lower.includes('total productive call') ||
        lower.includes('total prod call') ||
        lower.includes('total proudctive call')
      )
    ) {
      totalProductiveCall = parseNumber(extractValueAfterDelimiter(line)) || totalProductiveCall;
      return;
    }

    // 7. TOTAL CALL
    const isBrandCall = /^(?!total\b)[a-z0-9\/&#\s-]+\s+(?:call|calls)/i.test(lower);
    if (
      !isBrandCall && (
        /^(?:total call|total calls|calls|tc)\b/i.test(lower) ||
        lower.startsWith('total call') ||
        lower.startsWith('total calls')
      )
    ) {
      totalCall = parseNumber(extractValueAfterDelimiter(line)) || totalCall;
      return;
    }

    // 8. TOTAL SALES VALUE
    const isBrandSales = /^(?!total\b)[a-z0-9\/&#\s-]+\s+(?:sales|val|value|amt|amount)/i.test(lower);
    if (
      !isBrandSales && (
        /^(?:total sales value|total sales amt|total sales amount|total sales|total value|total amt|total amount|grand total)\b/i.test(lower) ||
        lower.includes('total sales value') ||
        lower.includes('total sales amt') ||
        lower.includes('total sales')
      )
    ) {
      totalSalesValue = parseNumber(extractValueAfterDelimiter(line)) || totalSalesValue;
      return;
    }

    // 9. DYNAMIC BRAND MATCHING
    // Pattern A: Brand Productive Call / PC (e.g., "Panda PC :- 10", "Panda Productive Call: 10", "AFC/AFR PC = 5")
    const prodCallMatch = line.match(/^(?:\d+[\.\)]\s*)?(.+?)\s+(?:productive\s+call[s]?|proudctive\s+call[s]?|productve\s+call[s]?|prod\s+call[s]?|pc)\s*[:=-]+\s*(.*)$/i);
    if (prodCallMatch) {
      const rawBrandCandidate = prodCallMatch[1].replace(/^total\s+/i, '').trim();
      if (rawBrandCandidate && !/^total$/i.test(rawBrandCandidate)) {
        const brandKey = normalizeBrandName(rawBrandCandidate);
        const val = parseNumber(prodCallMatch[2]);
        if (!rawBrandEntries[brandKey]) rawBrandEntries[brandKey] = {};
        rawBrandEntries[brandKey].productiveCall = val;
        return;
      }
    }

    // Pattern B: Brand Sales Value / Sales / Val / Amt (e.g., "Panda Sales Value :- 5000", "Panda Val: 5000", "Panda Sales: 5000")
    const salesValMatch = line.match(/^(?:\d+[\.\)]\s*)?(.+?)\s+(?:sales\s+value|sales\s+amt|sales\s+amount|sales|value|val|amt|amount)\s*[:=-]+\s*(.*)$/i);
    if (salesValMatch) {
      const rawBrandCandidate = salesValMatch[1].replace(/^total\s+/i, '').trim();
      if (rawBrandCandidate && !/^total$/i.test(rawBrandCandidate)) {
        const brandKey = normalizeBrandName(rawBrandCandidate);
        const val = parseNumber(salesValMatch[2]);
        if (!rawBrandEntries[brandKey]) rawBrandEntries[brandKey] = {};
        rawBrandEntries[brandKey].salesValue = val;
        return;
      }
    }

    // Pattern C: Plain Brand Name :- Value (e.g., "Panda :- 5000", "AFC/AFR : 2500", "1. Tulip: 3000", "Bindhya - 1500")
    const plainBrandMatch = line.match(/^(?:\d+[\.\)]\s*)?([A-Za-z0-9\/&#\s-]{2,25}?)\s*[:=-]+\s*([₹\d\s.,kK]+)$/i);
    if (plainBrandMatch) {
      const candidateName = plainBrandMatch[1].trim();
      const candidateLower = candidateName.toLowerCase();

      const reservedWords = [
        'date', 'day', 'dsr', 'dsr name', 'sales rep', 'sales officer', 'so name', 'sr name', 'sales person',
        'distributor', 'distributor name', 'dealer', 'party',
        'beat', 'route', 'area', 'total', 'total outlet', 'total call',
        'total productive call', 'total sales', 'total sales value', 'remarks', 'note'
      ];

      if (!reservedWords.includes(candidateLower) && !candidateLower.startsWith('total')) {
        const brandKey = normalizeBrandName(candidateName);
        const val = parseNumber(plainBrandMatch[2]);
        if (!rawBrandEntries[brandKey]) rawBrandEntries[brandKey] = {};
        if (rawBrandEntries[brandKey].salesValue === undefined) {
          rawBrandEntries[brandKey].salesValue = val;
        }
        return;
      }
    }
  });

  // Consolidate brand entries into final brands map
  Object.keys(rawBrandEntries).forEach((brand) => {
    brandsMap[brand] = {
      productiveCall: rawBrandEntries[brand].productiveCall ?? 0,
      salesValue: rawBrandEntries[brand].salesValue ?? 0,
    };
  });

  // Cross-calculate total sales value if missing or lower than brand sum
  const sumBrandSales = Object.values(brandsMap).reduce((acc, b) => acc + (Number(b.salesValue) || 0), 0);
  if (totalSalesValue === 0 && sumBrandSales > 0) {
    totalSalesValue = sumBrandSales;
  }

  // Cross-calculate total productive call if missing or lower than brand sum
  const sumBrandProdCalls = Object.values(brandsMap).reduce((acc, b) => acc + (Number(b.productiveCall) || 0), 0);
  if (totalProductiveCall === 0 && sumBrandProdCalls > 0) {
    totalProductiveCall = sumBrandProdCalls;
  }

  // Generate sanity checks / warnings
  if (!date) parseWarnings.push('Missing Date field');
  if (!distributorName) parseWarnings.push('Missing Distributor Name');
  
  if (totalSalesValue > 0 && sumBrandSales > 0 && Math.abs(totalSalesValue - sumBrandSales) > 1) {
    parseWarnings.push(`Total Sales Value (${totalSalesValue}) differs from sum of Brand Sales (${sumBrandSales})`);
  }

  return {
    id: `dsr-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
    date: date || new Date().toISOString().split('T')[0],
    day: day || '',
    dsrName: dsrName || '',
    distributorName: distributorName || `Distributor #${index + 1}`,
    beat: beat || '-',
    totalOutlet: totalOutlet,
    totalCall: totalCall,
    totalProductiveCall: totalProductiveCall,
    totalSalesValue: totalSalesValue,
    brands: brandsMap,
    rawText: msgText,
    parseWarnings,
    createdAt: Date.now(),
  };
}

/**
 * Parse bulk text containing 1 or more DSR messages.
 */
export function parseDSRText(rawText: string): ParseResult {
  const messages = splitMessages(rawText);
  const records: DSRRecord[] = [];
  const errors: string[] = [];

  if (messages.length === 0) {
    return { records: [], totalParsed: 0, errors: ['No valid text found to parse.'] };
  }

  messages.forEach((msg, idx) => {
    try {
      const rec = parseSingleMessage(msg, idx);
      records.push(rec);
    } catch (e: any) {
      errors.push(`Error parsing message #${idx + 1}: ${e?.message || 'Unknown parse error'}`);
    }
  });

  return {
    records,
    totalParsed: records.length,
    errors,
  };
}

/**
 * Returns a sorted list of all unique brands found across all records.
 * Excludes AFC/AFR from the data sheet columns.
 */
export function getAllUniqueBrands(records: DSRRecord[]): string[] {
  const brandSet = new Set<string>();
  records.forEach((r) => {
    Object.keys(r.brands || {}).forEach((b) => {
      const upper = b.trim().toUpperCase();
      if (upper !== 'AFC/AFR' && upper !== 'AFC / AFR' && upper !== 'AFC' && upper !== 'AFR') {
        brandSet.add(b);
      }
    });
  });
  return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
}
