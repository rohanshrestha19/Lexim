import React, { useState, useMemo, useEffect } from 'react';
import { DSRRecord, BrandMetric } from '../types';
import { parseDateString } from '../utils/dateUtils';
import {
  Trophy,
  Building2,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coins,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  CheckCircle2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  CalendarDays,
  Layers,
  Table as TableIcon,
} from 'lucide-react';

interface DistributorDashboardProps {
  records: DSRRecord[];
  onSelectDistributor?: (distributorName: string) => void;
}

interface DistributorBreakdown {
  name: string;
  reportCount: number;
  totalSalesValue: number; // in current filtered timeframe
  allTimeSales: number;
  dailySales: number;     // latest or selected date
  weeklySales: number;    // latest or selected week
  monthlySales: number;   // latest or selected month
  yearlySales: number;    // latest or selected year
  totalCall: number;
  totalProductiveCall: number;
  totalOutlet: number;
  strikeRate: number;
  pandaSales: number;
  tulipSales: number;
  bindhyaSales: number;
  otherSales: number;
  topBrand: { name: string; value: number } | null;
}

export const DistributorDashboard: React.FC<DistributorDashboardProps> = ({
  records,
  onSelectDistributor,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLeaderboardCollapsed, setIsLeaderboardCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'sales' | 'strike' | 'outlets' | 'panda' | 'tulip' | 'bindhya'>('sales');

  // Timeframe Filter Controls
  const [timeframe, setTimeframe] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [selectedYearKey, setSelectedYearKey] = useState<string>('');

  // Table Mode: 'standard' or 'breakdown' (Daily, Weekly, Monthly, Yearly side-by-side)
  const [tableMode, setTableMode] = useState<'standard' | 'breakdown'>('standard');

  // Pre-process records with date details
  const recordsWithDate = useMemo(() => {
    return records.map((r) => ({
      record: r,
      dateDetails: parseDateString(r.date),
    }));
  }, [records]);

  // Extract unique date options
  const dateOptions = useMemo(() => {
    const datesMap = new Map<string, string>();   // dateKey -> displayDate
    const weeksMap = new Map<string, string>();   // weekKey -> displayWeek
    const monthsMap = new Map<string, string>();  // monthKey -> displayMonth
    const yearsSet = new Set<string>();

    recordsWithDate.forEach(({ dateDetails }) => {
      if (dateDetails) {
        datesMap.set(dateDetails.dateKey, dateDetails.displayDate);
        weeksMap.set(dateDetails.weekKey, dateDetails.displayWeek);
        monthsMap.set(dateDetails.monthKey, dateDetails.displayMonth);
        yearsSet.add(dateDetails.yearKey);
      }
    });

    const sortedDates = Array.from(datesMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

    return {
      dates: sortedDates,
      weeks: sortedWeeks,
      months: sortedMonths,
      years: sortedYears,
    };
  }, [recordsWithDate]);

  // Sync default selected keys
  useEffect(() => {
    if (dateOptions.dates.length > 0 && (!selectedDateKey || !dateOptions.dates.some(d => d[0] === selectedDateKey))) {
      setSelectedDateKey(dateOptions.dates[0][0]);
    }
    if (dateOptions.weeks.length > 0 && (!selectedWeekKey || !dateOptions.weeks.some(w => w[0] === selectedWeekKey))) {
      setSelectedWeekKey(dateOptions.weeks[0][0]);
    }
    if (dateOptions.months.length > 0 && (!selectedMonthKey || !dateOptions.months.some(m => m[0] === selectedMonthKey))) {
      setSelectedMonthKey(dateOptions.months[0][0]);
    }
    if (dateOptions.years.length > 0 && (!selectedYearKey || !dateOptions.years.includes(selectedYearKey))) {
      setSelectedYearKey(dateOptions.years[0]);
    }
  }, [dateOptions]);

  // Active Keys
  const activeDateKey = selectedDateKey || (dateOptions.dates[0]?.[0] || '');
  const activeWeekKey = selectedWeekKey || (dateOptions.weeks[0]?.[0] || '');
  const activeMonthKey = selectedMonthKey || (dateOptions.months[0]?.[0] || '');
  const activeYearKey = selectedYearKey || (dateOptions.years[0] || '');

  // Filter records based on timeframe
  const filteredRecords = useMemo(() => {
    if (timeframe === 'all') return recordsWithDate;
    if (timeframe === 'daily') {
      return recordsWithDate.filter(({ dateDetails }) => dateDetails?.dateKey === activeDateKey);
    }
    if (timeframe === 'weekly') {
      return recordsWithDate.filter(({ dateDetails }) => dateDetails?.weekKey === activeWeekKey);
    }
    if (timeframe === 'monthly') {
      return recordsWithDate.filter(({ dateDetails }) => dateDetails?.monthKey === activeMonthKey);
    }
    if (timeframe === 'yearly') {
      return recordsWithDate.filter(({ dateDetails }) => dateDetails?.yearKey === activeYearKey);
    }
    return recordsWithDate;
  }, [recordsWithDate, timeframe, activeDateKey, activeWeekKey, activeMonthKey, activeYearKey]);

  // Aggregate stats by Distributor Name
  const distributorMap = new Map<string, DistributorBreakdown>();
  let overallSales = 0;

  // Step 1: Calculate daily, weekly, monthly, yearly, and all-time maps for ALL records
  const globalDistributorMaps = new Map<string, {
    allTimeSales: number;
    dailySalesMap: Record<string, number>;
    weeklySalesMap: Record<string, number>;
    monthlySalesMap: Record<string, number>;
    yearlySalesMap: Record<string, number>;
  }>();

  recordsWithDate.forEach(({ record: r, dateDetails }) => {
    const name = r.distributorName?.trim() || 'Unspecified Distributor';
    const sales = Number(r.totalSalesValue) || 0;

    if (!globalDistributorMaps.has(name)) {
      globalDistributorMaps.set(name, {
        allTimeSales: 0,
        dailySalesMap: {},
        weeklySalesMap: {},
        monthlySalesMap: {},
        yearlySalesMap: {},
      });
    }

    const gItem = globalDistributorMaps.get(name)!;
    gItem.allTimeSales += sales;

    if (dateDetails) {
      gItem.dailySalesMap[dateDetails.dateKey] = (gItem.dailySalesMap[dateDetails.dateKey] || 0) + sales;
      gItem.weeklySalesMap[dateDetails.weekKey] = (gItem.weeklySalesMap[dateDetails.weekKey] || 0) + sales;
      gItem.monthlySalesMap[dateDetails.monthKey] = (gItem.monthlySalesMap[dateDetails.monthKey] || 0) + sales;
      gItem.yearlySalesMap[dateDetails.yearKey] = (gItem.yearlySalesMap[dateDetails.yearKey] || 0) + sales;
    }
  });

  // Step 2: Calculate active timeframe metrics
  filteredRecords.forEach(({ record: r }) => {
    const name = r.distributorName?.trim() || 'Unspecified Distributor';
    const sales = Number(r.totalSalesValue) || 0;
    const calls = Number(r.totalCall) || 0;
    const prodCalls = Number(r.totalProductiveCall) || 0;
    const outlets = Number(r.totalOutlet) || 0;

    overallSales += sales;

    if (!distributorMap.has(name)) {
      const gItem = globalDistributorMaps.get(name);
      distributorMap.set(name, {
        name,
        reportCount: 0,
        totalSalesValue: 0,
        allTimeSales: gItem?.allTimeSales || 0,
        dailySales: gItem?.dailySalesMap[activeDateKey] || 0,
        weeklySales: gItem?.weeklySalesMap[activeWeekKey] || 0,
        monthlySales: gItem?.monthlySalesMap[activeMonthKey] || 0,
        yearlySales: gItem?.yearlySalesMap[activeYearKey] || 0,
        totalCall: 0,
        totalProductiveCall: 0,
        totalOutlet: 0,
        strikeRate: 0,
        pandaSales: 0,
        tulipSales: 0,
        bindhyaSales: 0,
        otherSales: 0,
        topBrand: null,
      });
    }

    const item = distributorMap.get(name)!;
    item.reportCount += 1;
    item.totalSalesValue += sales;
    item.totalCall += calls;
    item.totalProductiveCall += prodCalls;
    item.totalOutlet += outlets;

    // Calculate brand sales
    const brandSalesMap: Record<string, number> = {};
    Object.entries(r.brands || {}).forEach(([bKey, bVal]) => {
      let bSales = 0;
      if (typeof bVal === 'number') {
        bSales = isNaN(bVal) ? 0 : bVal;
      } else if (bVal && typeof bVal === 'object') {
        bSales = Number((bVal as any).salesValue) || 0;
      }

      const lowerKey = bKey.toLowerCase();

      if (lowerKey.includes('panda')) {
        item.pandaSales += bSales;
      } else if (lowerKey.includes('tulip')) {
        item.tulipSales += bSales;
      } else if (lowerKey.includes('bindhya')) {
        item.bindhyaSales += bSales;
      } else {
        item.otherSales += bSales;
      }

      brandSalesMap[bKey] = (brandSalesMap[bKey] || 0) + bSales;
    });

    let topBName = item.topBrand?.name || '';
    let topBVal = item.topBrand?.value || 0;
    Object.entries(brandSalesMap).forEach(([bName, bVal]) => {
      if (bVal > topBVal) {
        topBName = bName;
        topBVal = bVal;
      }
    });
    if (topBVal > 0) {
      item.topBrand = { name: topBName, value: topBVal };
    }
  });

  const aggregates = Array.from(distributorMap.values()).map((item) => {
    item.strikeRate = item.totalCall > 0 ? (item.totalProductiveCall / item.totalCall) * 100 : 0;
    return item;
  });

  if (aggregates.length === 0 && records.length > 0) {
    // If filtered timeframe has 0 records, fall back or render standard empty state
  }

  // Key Performers
  const topSalesDistributor = [...aggregates].sort((a, b) => b.totalSalesValue - a.totalSalesValue)[0];
  const topStrikeDistributor = [...aggregates].sort((a, b) => b.strikeRate - a.strikeRate)[0];
  const topPandaDistributor = [...aggregates].sort((a, b) => b.pandaSales - a.pandaSales)[0];
  const topTulipDistributor = [...aggregates].sort((a, b) => b.tulipSales - a.tulipSales)[0];
  const topBindhyaDistributor = [...aggregates].sort((a, b) => b.bindhyaSales - a.bindhyaSales)[0];

  const maxSales = Math.max(...aggregates.map((a) => a.totalSalesValue), 1);

  // Sorting
  const sortedAggregates = [...aggregates]
    .filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'sales') return b.totalSalesValue - a.totalSalesValue;
      if (sortBy === 'strike') return b.strikeRate - a.strikeRate;
      if (sortBy === 'outlets') return b.totalOutlet - a.totalOutlet;
      if (sortBy === 'panda') return b.pandaSales - a.pandaSales;
      if (sortBy === 'tulip') return b.tulipSales - a.tulipSales;
      if (sortBy === 'bindhya') return b.bindhyaSales - a.bindhyaSales;
      return 0;
    });

  const formatRupee = (val: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);

  const getActiveLabel = () => {
    if (timeframe === 'all') return 'All Time';
    if (timeframe === 'daily') return dateOptions.dates.find(d => d[0] === activeDateKey)?.[1] || activeDateKey;
    if (timeframe === 'weekly') return dateOptions.weeks.find(w => w[0] === activeWeekKey)?.[1] || activeWeekKey;
    if (timeframe === 'monthly') return dateOptions.months.find(m => m[0] === activeMonthKey)?.[1] || activeMonthKey;
    if (timeframe === 'yearly') return activeYearKey;
    return 'All Time';
  };

  if (records.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden my-6">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              Distributor Performance Dashboard
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                {aggregates.length} {aggregates.length === 1 ? 'Distributor' : 'Distributors'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Daily, Weekly (Sun-Fri), Monthly, & Yearly sales analysis by distributor
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="self-end md:self-auto p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
        >
          {isCollapsed ? (
            <>
              <span>Expand Dashboard</span>
              <ChevronDown className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-6">
          {/* TIMEFRAME FILTER BAR */}
          <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Sales Timeframe:
              </span>

              {/* Timeframe Mode Buttons */}
              <button
                onClick={() => setTimeframe('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeframe === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                All Time
              </button>

              <button
                onClick={() => setTimeframe('daily')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  timeframe === 'daily'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Clock className="w-3 h-3" /> Daily
              </button>

              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  timeframe === 'weekly'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <CalendarDays className="w-3 h-3" /> Weekly (Sun-Fri)
              </button>

              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  timeframe === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3 h-3" /> Monthly
              </button>

              <button
                onClick={() => setTimeframe('yearly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  timeframe === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <TrendingUp className="w-3 h-3" /> Yearly
              </button>
            </div>

            {/* Dynamic Period Selectors */}
            <div className="flex items-center gap-2">
              {timeframe === 'daily' && dateOptions.dates.length > 0 && (
                <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-semibold">Select Date:</span>
                  <select
                    value={activeDateKey}
                    onChange={(e) => setSelectedDateKey(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    {dateOptions.dates.map(([key, label], idx) => (
                      <option key={key} value={key}>
                        {label} {idx === 0 ? '(Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {timeframe === 'weekly' && dateOptions.weeks.length > 0 && (
                <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-semibold">Select Week (Sun-Fri):</span>
                  <select
                    value={activeWeekKey}
                    onChange={(e) => setSelectedWeekKey(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    {dateOptions.weeks.map(([key, label], idx) => (
                      <option key={key} value={key}>
                        {label} {idx === 0 ? '(Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {timeframe === 'monthly' && dateOptions.months.length > 0 && (
                <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-semibold">Select Month:</span>
                  <select
                    value={activeMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    {dateOptions.months.map(([key, label], idx) => (
                      <option key={key} value={key}>
                        {label} {idx === 0 ? '(Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {timeframe === 'yearly' && dateOptions.years.length > 0 && (
                <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-semibold">Select Year:</span>
                  <select
                    value={activeYearKey}
                    onChange={(e) => setSelectedYearKey(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    {dateOptions.years.map((y, idx) => (
                      <option key={y} value={y}>
                        {y} {idx === 0 ? '(Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                Viewing: <strong className="text-slate-800">{getActiveLabel()}</strong>
              </span>
            </div>
          </div>

          {/* Spotlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Top Sales Leader */}
            {topSalesDistributor ? (
              <div
                onClick={() => onSelectDistributor?.(topSalesDistributor.name)}
                className="p-4 bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200 rounded-xl shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Sales Leader
                  </span>
                  <span className="text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-bold">
                    {overallSales > 0
                      ? ((topSalesDistributor.totalSalesValue / overallSales) * 100).toFixed(1)
                      : '0'}
                    % Share
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                  {topSalesDistributor.name}
                </div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {formatRupee(topSalesDistributor.totalSalesValue)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{topSalesDistributor.reportCount} reports</span>
                  <span>{topSalesDistributor.strikeRate.toFixed(1)}% strike rate</span>
                </div>
              </div>
            ) : null}

            {/* Highest Strike Rate */}
            {topStrikeDistributor ? (
              <div
                onClick={() => onSelectDistributor?.(topStrikeDistributor.name)}
                className="p-4 bg-gradient-to-br from-sky-50/80 to-white border border-sky-200 rounded-xl shadow-2xs hover:border-sky-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-sky-800 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" /> Top Strike Rate
                  </span>
                  <span className="text-[11px] bg-sky-100 px-1.5 py-0.5 rounded text-sky-800 font-bold">
                    {topStrikeDistributor.totalProductiveCall}/{topStrikeDistributor.totalCall} calls
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                  {topStrikeDistributor.name}
                </div>
                <div className="text-xl font-extrabold text-sky-700 mt-1">
                  {topStrikeDistributor.strikeRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{formatRupee(topStrikeDistributor.totalSalesValue)} sales</span>
                  <span>{topStrikeDistributor.totalOutlet} outlets</span>
                </div>
              </div>
            ) : null}

            {/* Top Panda Brand Seller */}
            {topPandaDistributor && topPandaDistributor.pandaSales > 0 ? (
              <div
                onClick={() => onSelectDistributor?.(topPandaDistributor.name)}
                className="p-4 bg-gradient-to-br from-purple-50/80 to-white border border-purple-200 rounded-xl shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-purple-800 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> Panda Leader
                  </span>
                  <span className="text-[11px] bg-purple-100 px-1.5 py-0.5 rounded text-purple-800 font-bold">
                    Panda
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                  {topPandaDistributor.name}
                </div>
                <div className="text-xl font-extrabold text-purple-700 mt-1">
                  {formatRupee(topPandaDistributor.pandaSales)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Top Panda distributor in region
                </div>
              </div>
            ) : null}

            {/* Top Tulip/Bindhya Leader */}
            {topTulipDistributor && topTulipDistributor.tulipSales > 0 ? (
              <div
                onClick={() => onSelectDistributor?.(topTulipDistributor.name)}
                className="p-4 bg-gradient-to-br from-rose-50/80 to-white border border-rose-200 rounded-xl shadow-2xs hover:border-rose-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" /> Tulip Leader
                  </span>
                  <span className="text-[11px] bg-rose-100 px-1.5 py-0.5 rounded text-rose-800 font-bold">
                    Tulip
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition-colors truncate">
                  {topTulipDistributor.name}
                </div>
                <div className="text-xl font-extrabold text-rose-700 mt-1">
                  {formatRupee(topTulipDistributor.tulipSales)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Top Tulip distributor in region
                </div>
              </div>
            ) : topBindhyaDistributor && topBindhyaDistributor.bindhyaSales > 0 ? (
              <div
                onClick={() => onSelectDistributor?.(topBindhyaDistributor.name)}
                className="p-4 bg-gradient-to-br from-amber-50/80 to-white border border-amber-200 rounded-xl shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" /> Bindhya Leader
                  </span>
                  <span className="text-[11px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-bold">
                    Bindhya
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                  {topBindhyaDistributor.name}
                </div>
                <div className="text-xl font-extrabold text-amber-700 mt-1">
                  {formatRupee(topBindhyaDistributor.bindhyaSales)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Top Bindhya distributor in region
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Multi-Brand Insights
                </div>
                <div className="text-xs text-slate-600">
                  Select or parse additional reports to view brand leaderboards.
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Bar Chart Visualizer */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" /> Distributor Sales Leaderboard ({getActiveLabel()})
              </h3>
              <div className="flex items-center gap-2 text-xs">
                {!isLeaderboardCollapsed && (
                  <>
                    <span className="text-slate-500 font-medium">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-800 font-semibold cursor-pointer outline-none"
                    >
                      <option value="sales">Sales Value (High → Low)</option>
                      <option value="strike">Strike Rate (%)</option>
                      <option value="outlets">Outlets Covered</option>
                      <option value="panda">Panda Sales</option>
                      <option value="tulip">Tulip Sales</option>
                      <option value="bindhya">Bindhya Sales</option>
                    </select>
                  </>
                )}
                <button
                  onClick={() => setIsLeaderboardCollapsed(!isLeaderboardCollapsed)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isLeaderboardCollapsed ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Show Visualizer</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hide Leaderboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isLeaderboardCollapsed && (
              <div className="space-y-2.5 pt-1">
                {sortedAggregates.map((dist) => {
                  const percent = maxSales > 0 ? (dist.totalSalesValue / maxSales) * 100 : 0;
                  const shareOfTotal = overallSales > 0 ? ((dist.totalSalesValue / overallSales) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={dist.name}
                      onClick={() => onSelectDistributor?.(dist.name)}
                      className="p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-emerald-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {dist.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({dist.reportCount} {dist.reportCount === 1 ? 'report' : 'reports'})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="font-bold text-slate-900">
                            {formatRupee(dist.totalSalesValue)}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {shareOfTotal}% share
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percent, 3)}%` }}
                        />
                      </div>

                      {/* Brand Pill Badges */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <CheckCircle2 className="w-3 h-3 text-sky-600" /> {dist.totalProductiveCall}/{dist.totalCall} calls ({dist.strikeRate.toFixed(0)}%)
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{dist.totalOutlet} outlets</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {dist.pandaSales > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 font-semibold border border-purple-100">
                              Panda: {formatRupee(dist.pandaSales)}
                            </span>
                          )}
                          {dist.tulipSales > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-100">
                              Tulip: {formatRupee(dist.tulipSales)}
                            </span>
                          )}
                          {dist.bindhyaSales > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-100">
                              Bindhya: {formatRupee(dist.bindhyaSales)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Performance Matrix / Timeframe Breakdown Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-emerald-600" /> Distributor Performance Table
                </h3>
              </div>

              {/* View Switcher: Standard Overview vs Daily/Weekly/Monthly/Yearly Sales Breakdown */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  onClick={() => setTableMode('standard')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableMode === 'standard'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Performance Overview
                </button>
                <button
                  onClick={() => setTableMode('breakdown')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableMode === 'breakdown'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-blue-600" /> Daily / Weekly / Monthly / Yearly Sales
                </button>
              </div>
            </div>

            {tableMode === 'standard' ? (
              /* STANDARD PERFORMANCE TABLE */
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Distributor</th>
                      <th className="py-2.5 px-3 text-center">Reports</th>
                      <th className="py-2.5 px-3 text-center">Outlets</th>
                      <th className="py-2.5 px-3 text-center">Calls (Strike Rate)</th>
                      <th className="py-2.5 px-3 text-right">Panda</th>
                      <th className="py-2.5 px-3 text-right">Tulip</th>
                      <th className="py-2.5 px-3 text-right">Bindhya</th>
                      <th className="py-2.5 px-3 text-right">Sales ({getActiveLabel()})</th>
                      <th className="py-2.5 px-3 text-center">Filter Table</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {sortedAggregates.map((dist) => (
                      <tr key={dist.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{dist.name}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">{dist.reportCount}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">{dist.totalOutlet}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-semibold text-slate-800">
                            {dist.totalProductiveCall}/{dist.totalCall}
                          </span>{' '}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              dist.strikeRate >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : dist.strikeRate >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {dist.strikeRate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-purple-700">
                          {dist.pandaSales > 0 ? `${formatRupee(dist.pandaSales)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-700">
                          {dist.tulipSales > 0 ? `${formatRupee(dist.tulipSales)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-700">
                          {dist.bindhyaSales > 0 ? `${formatRupee(dist.bindhyaSales)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800 text-sm">
                          {formatRupee(dist.totalSalesValue)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onSelectDistributor?.(dist.name)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Filter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* DAILY / WEEKLY / MONTHLY / YEARLY SALES BREAKDOWN TABLE */
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 min-w-[160px]">Distributor Name</th>
                      <th className="py-3 px-3 text-right text-blue-800 bg-blue-50/50">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Daily Sales</span>
                        </div>
                        <span className="text-[9px] font-normal text-slate-500 block normal-case font-mono">
                          ({dateOptions.dates.find(d => d[0] === activeDateKey)?.[1] || 'Selected Day'})
                        </span>
                      </th>
                      <th className="py-3 px-3 text-right text-purple-800 bg-purple-50/50">
                        <div className="flex items-center justify-end gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Weekly Sales (Sun-Fri)</span>
                        </div>
                        <span className="text-[9px] font-normal text-slate-500 block normal-case font-mono">
                          ({dateOptions.weeks.find(w => w[0] === activeWeekKey)?.[1] || 'Selected Week'})
                        </span>
                      </th>
                      <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/50">
                        <div className="flex items-center justify-end gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Monthly Sales</span>
                        </div>
                        <span className="text-[9px] font-normal text-slate-500 block normal-case font-mono">
                          ({dateOptions.months.find(m => m[0] === activeMonthKey)?.[1] || 'Selected Month'})
                        </span>
                      </th>
                      <th className="py-3 px-3 text-right text-amber-800 bg-amber-50/50">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Yearly Sales</span>
                        </div>
                        <span className="text-[9px] font-normal text-slate-500 block normal-case font-mono">
                          ({activeYearKey || 'Selected Year'})
                        </span>
                      </th>
                      <th className="py-3 px-3 text-right font-extrabold text-slate-900 bg-slate-200/50">
                        All-Time Total
                      </th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {sortedAggregates.map((dist) => (
                      <tr key={dist.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{dist.name}</td>

                        {/* Daily Sales */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-blue-700 bg-blue-50/20">
                          {dist.dailySales > 0 ? formatRupee(dist.dailySales) : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* Weekly Sales */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-purple-700 bg-purple-50/20">
                          {dist.weeklySales > 0 ? formatRupee(dist.weeklySales) : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* Monthly Sales */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                          {dist.monthlySales > 0 ? formatRupee(dist.monthlySales) : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* Yearly Sales */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 bg-amber-50/20">
                          {dist.yearlySales > 0 ? formatRupee(dist.yearlySales) : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* All-Time Sales */}
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 bg-slate-100/40 text-sm">
                          {formatRupee(dist.allTimeSales)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onSelectDistributor?.(dist.name)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Filter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
