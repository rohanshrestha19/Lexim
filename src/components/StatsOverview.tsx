import React from 'react';
import { DSRRecord, BrandMetric } from '../types';
import { PhoneCall, TrendingUp, CheckCircle2, ShoppingBag, Sparkles, Coins, DollarSign } from 'lucide-react';

interface StatsOverviewProps {
  records: DSRRecord[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-xs shadow-xs font-medium">
        No records match the selected filter.
      </div>
    );
  }

  const totalSales = records.reduce((sum, r) => sum + (Number(r.totalSalesValue) || 0), 0);
  const totalCalls = records.reduce((sum, r) => sum + (Number(r.totalCall) || 0), 0);
  const totalProdCalls = records.reduce((sum, r) => sum + (Number(r.totalProductiveCall) || 0), 0);

  const prodRatio = totalCalls > 0 ? ((totalProdCalls / totalCalls) * 100).toFixed(1) : '0';

  const uniqueDistributors = Array.from(
    new Set(records.map((r) => r.distributorName?.trim()).filter(Boolean))
  );

  // Helper to calculate total sales & productive calls for specific brand (case-insensitive substring match)
  const getBrandMetrics = (brandNamePattern: string) => {
    let salesValue = 0;
    let productiveCalls = 0;

    records.forEach((r) => {
      Object.entries(r.brands || {}).forEach(([bKey, bVal]) => {
        if (bKey.toLowerCase().includes(brandNamePattern.toLowerCase())) {
          if (typeof bVal === 'number') {
            salesValue += isNaN(bVal) ? 0 : bVal;
          } else if (bVal && typeof bVal === 'object') {
            salesValue += Number((bVal as any).salesValue) || 0;
            productiveCalls += Number((bVal as any).productiveCall) || 0;
          }
        }
      });
    });

    return { salesValue, productiveCalls };
  };

  const pandaData = getBrandMetrics('panda');
  const tulipData = getBrandMetrics('tulip');
  const bindhyaData = getBrandMetrics('bindhya');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);

  const pandaPct = totalSales > 0 ? ((pandaData.salesValue / totalSales) * 100).toFixed(1) : '0';
  const tulipPct = totalSales > 0 ? ((tulipData.salesValue / totalSales) * 100).toFixed(1) : '0';
  const bindhyaPct = totalSales > 0 ? ((bindhyaData.salesValue / totalSales) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Metric 1: Total Sales */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sales Value</span>
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalSales)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium truncate" title={uniqueDistributors.length === 1 ? uniqueDistributors[0] : undefined}>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              {uniqueDistributors.length === 1
                ? `${uniqueDistributors[0]} (${records.length} ${records.length === 1 ? 'report' : 'reports'})`
                : `Across ${uniqueDistributors.length} distributors (${records.length} ${records.length === 1 ? 'report' : 'reports'})`}
            </span>
          </div>
        </div>
      </div>

      {/* Metric 2: Panda Sales Value */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Panda Sales</span>
          <div className="p-2 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(pandaData.salesValue)}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-between">
            <span className="text-purple-700 font-semibold">{pandaPct}% of Total</span>
            <span className="text-slate-400">• {pandaData.productiveCalls} calls</span>
          </div>
        </div>
      </div>

      {/* Metric 4: Tulip Sales Value */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tulip Sales</span>
          <div className="p-2 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(tulipData.salesValue)}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-between">
            <span className="text-rose-700 font-semibold">{tulipPct}% of Total</span>
            <span className="text-slate-400">• {tulipData.productiveCalls} calls</span>
          </div>
        </div>
      </div>

      {/* Metric 5: Bindhya Sales Value */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bindhya Sales</span>
          <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(bindhyaData.salesValue)}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-between">
            <span className="text-amber-700 font-semibold">{bindhyaPct}% of Total</span>
            <span className="text-slate-400">• {bindhyaData.productiveCalls} calls</span>
          </div>
        </div>
      </div>
    </div>
  );
};


