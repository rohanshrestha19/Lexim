import React, { useState, useMemo, useEffect } from 'react';
import { DSRRecord } from '../types';
import { getAllUniqueBrands } from '../utils/dsrParser';
import {
  Search,
  Filter,
  Building2,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  ArrowUpDown,
  Download,
  AlertCircle,
  Plus,
  Sparkles,
  FileSpreadsheet,
  X,
  User,
} from 'lucide-react';

/**
 * Safely parses various date formats (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.) into epoch timestamp
 */
function parseDateStringToMs(dateStr: string): number | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Try DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Fallback Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) return parsed;

  return null;
}

interface DSRTableProps {
  records: DSRRecord[];
  onEditRecord: (record: DSRRecord) => void;
  onDeleteRecord: (id: string) => void;
  onBulkDeleteRecords?: (ids: string[]) => void;
  onViewRawText: (record: DSRRecord) => void;
  onAddManualRecord: () => void;
  onDownloadExcel: () => void;
  onClearSheet?: () => void;
  onFilteredRecordsChange?: (filtered: DSRRecord[]) => void;
  selectedDistributorFilter?: string;
  onDistributorFilterChange?: (distributor: string) => void;
  isClientViewMode?: boolean;
}

export const DSRTable: React.FC<DSRTableProps> = ({
  records,
  onEditRecord,
  onDeleteRecord,
  onBulkDeleteRecords,
  onViewRawText,
  onAddManualRecord,
  onDownloadExcel,
  onClearSheet,
  onFilteredRecordsChange,
  selectedDistributorFilter: controlledDistributorFilter,
  onDistributorFilterChange,
  isClientViewMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [selectedDsrFilter, setSelectedDsrFilter] = useState<string>('ALL');
  const [internalDistributorFilter, setInternalDistributorFilter] = useState<string>('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);

  const selectedDistributorFilter = controlledDistributorFilter !== undefined ? controlledDistributorFilter : internalDistributorFilter;

  const handleDistributorFilterChange = (val: string) => {
    if (onDistributorFilterChange) {
      onDistributorFilterChange(val);
    } else {
      setInternalDistributorFilter(val);
    }
  };
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dynamic list of unique brand names present across all records
  const uniqueBrands = useMemo(() => getAllUniqueBrands(records), [records]);

  // Dynamic list of unique DSR / Sales Officer names across all records
  const uniqueDSRs = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.dsrName && r.dsrName.trim()) {
        set.add(r.dsrName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Dynamic list of unique distributor names across all records
  const uniqueDistributors = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.distributorName && r.distributorName.trim()) {
        set.add(r.distributorName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Pre-calculate start and end timestamps if dates selected
  const startMs = useMemo(() => {
    if (!startDate) return null;
    const d = new Date(startDate + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d.getTime();
  }, [startDate]);

  const endMs = useMemo(() => {
    if (!endDate) return null;
    const d = new Date(endDate + 'T23:59:59.999');
    return isNaN(d.getTime()) ? null : d.getTime();
  }, [endDate]);

  // Filtering & Sorting
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          r.distributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.dsrName && r.dsrName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          r.beat.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.date.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedDistributorFilter !== 'ALL') {
          if (r.distributorName.trim().toLowerCase() !== selectedDistributorFilter.trim().toLowerCase()) {
            return false;
          }
        }

        if (selectedDsrFilter !== 'ALL') {
          if ((r.dsrName || '').trim().toLowerCase() !== selectedDsrFilter.trim().toLowerCase()) {
            return false;
          }
        }

        if (selectedBrandFilter !== 'ALL') {
          const filterLower = selectedBrandFilter.trim().toLowerCase();
          const hasBrand = Object.keys(r.brands || {}).some(
            (b) => b.trim().toLowerCase() === filterLower
          );
          if (!hasBrand) {
            return false;
          }
        }

        // Date range filtering
        if (startMs !== null || endMs !== null) {
          const recordMs = parseDateStringToMs(r.date) ?? r.createdAt;
          if (startMs !== null && recordMs < startMs) return false;
          if (endMs !== null && recordMs > endMs) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let aVal: any = a[sortField as keyof DSRRecord];
        let bVal: any = b[sortField as keyof DSRRecord];

        if (sortField === 'totalSalesValue' || sortField === 'totalProductiveCall' || sortField === 'totalCall') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [records, searchTerm, selectedDistributorFilter, selectedDsrFilter, selectedBrandFilter, startMs, endMs, sortField, sortOrder]);

  // Notify parent of filtered records changes so overview stats update synchronously
  useEffect(() => {
    if (onFilteredRecordsChange) {
      onFilteredRecordsChange(filteredRecords);
    }
  }, [filteredRecords, onFilteredRecordsChange]);

  // Column Totals Calculation
  const totals = useMemo(() => {
    const fixedTotals = {
      outlet: 0,
      call: 0,
      productiveCall: 0,
      salesValue: 0,
    };

    const brandTotals: Record<string, { productiveCall: number; salesValue: number }> = {};
    uniqueBrands.forEach((b) => {
      brandTotals[b] = { productiveCall: 0, salesValue: 0 };
    });

    filteredRecords.forEach((r) => {
      fixedTotals.outlet += Number(r.totalOutlet) || 0;
      fixedTotals.call += Number(r.totalCall) || 0;
      fixedTotals.productiveCall += Number(r.totalProductiveCall) || 0;
      fixedTotals.salesValue += Number(r.totalSalesValue) || 0;

      uniqueBrands.forEach((b) => {
        if (r.brands[b]) {
          brandTotals[b].productiveCall += Number(r.brands[b].productiveCall) || 0;
          brandTotals[b].salesValue += Number(r.brands[b].salesValue) || 0;
        }
      });
    });

    return { fixedTotals, brandTotals };
  }, [filteredRecords, uniqueBrands]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Checkbox Selection Logic
  const filteredRecordIds = useMemo(() => filteredRecords.map((r) => r.id), [filteredRecords]);

  const isAllSelected = useMemo(() => {
    if (filteredRecordIds.length === 0) return false;
    return filteredRecordIds.every((id) => selectedIds.has(id));
  }, [filteredRecordIds, selectedIds]);

  const isSomeSelected = useMemo(() => {
    if (isAllSelected || filteredRecordIds.length === 0) return false;
    return filteredRecordIds.some((id) => selectedIds.has(id));
  }, [filteredRecordIds, selectedIds, isAllSelected]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecordIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecordIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmBulkDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    if (onBulkDeleteRecords) {
      onBulkDeleteRecords(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteRecord(id));
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center my-6 shadow-xs">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-4 border border-emerald-100">
          <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Your Running Excel Sheet is Empty</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Paste distributor WhatsApp Daily Sales Reports above and click "Append to Sheet". They will immediately populate rows here with dynamic brand columns!
        </p>
        {!isClientViewMode && (
          <button
            onClick={onAddManualRecord}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            Add Row Manually
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden my-6">
      {/* Table Toolbar / Controls */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search distributor, beat, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Right: Date Range Picker + Distributor Filter + Brand Filter + Add Manual + Download */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Bulk Delete Button when items selected */}
          {selectedIds.size > 0 && !isClientViewMode && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl animate-fadeIn shadow-2xs">
              <span className="text-xs font-bold text-rose-800">
                {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Delete all selected records"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bulk Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-rose-500 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Date Range Picker UI */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px] hidden sm:inline">Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none text-xs cursor-pointer focus:text-slate-900"
              title="Start Date"
            />
            <span className="text-slate-400 font-light text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium outline-none text-xs cursor-pointer focus:text-slate-900"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* DSR Name Filter */}
          {uniqueDSRs.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-500 font-medium text-[11px]">DSR Name:</span>
              <select
                value={selectedDsrFilter}
                onChange={(e) => setSelectedDsrFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer text-xs max-w-[140px] truncate"
              >
                <option value="ALL">All ({uniqueDSRs.length})</option>
                {uniqueDSRs.map((dsr) => (
                  <option key={dsr} value={dsr}>
                    {dsr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Distributor Filter */}
          {uniqueDistributors.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-500 font-medium text-[11px]">Distributor:</span>
              <select
                value={selectedDistributorFilter}
                onChange={(e) => handleDistributorFilterChange(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer text-xs max-w-[140px] truncate"
              >
                <option value="ALL">All ({uniqueDistributors.length})</option>
                {uniqueDistributors.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Brand Filter */}
          {uniqueBrands.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-slate-500 font-medium text-[11px]">Brand:</span>
              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer text-xs max-w-[120px] truncate"
              >
                <option value="ALL">All ({uniqueBrands.length})</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters button if any active */}
          {(selectedDistributorFilter !== 'ALL' || selectedDsrFilter !== 'ALL' || selectedBrandFilter !== 'ALL' || startDate !== '' || endDate !== '' || searchTerm.trim() !== '') && (
            <button
              onClick={() => {
                handleDistributorFilterChange('ALL');
                setSelectedDsrFilter('ALL');
                setSelectedBrandFilter('ALL');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              Reset
            </button>
          )}

          {/* Add Manual Row & All Clear (Admin Only) */}
          {!isClientViewMode && (
            <>
              <button
                onClick={onAddManualRecord}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Add Row
              </button>

              {onClearSheet && (
                <button
                  onClick={onClearSheet}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Clear all records from data table"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  All Clear
                </button>
              )}
            </>
          )}

          {/* Download Excel */}
          <button
            onClick={onDownloadExcel}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>
      </div>

      {/* Dynamic Columns Info Bar */}
      {uniqueBrands.length > 0 && (
        <div className="px-4 py-2 bg-emerald-50/50 border-b border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Dynamic Brand Columns ({uniqueBrands.length}):</strong> Auto-extracted Productive Call & Sales Value columns for:
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {uniqueBrands.map((b) => (
              <span key={b} className="px-2 py-0.5 rounded bg-white text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] sticky top-0 z-20 shadow-xs">
            <tr>
              {!isClientViewMode && (
                <th className="py-3 px-3 border-b border-slate-200 w-10 text-center">
                  <input
                    type="checkbox"
                    ref={headerCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    title={isAllSelected ? 'Deselect All' : 'Select All'}
                  />
                </th>
              )}
              <th className="py-3 px-3 border-b border-slate-200 w-10 text-center">#</th>
              
              {/* Fixed Columns */}
              <th
                onClick={() => handleSort('date')}
                className="py-3 px-3 border-b border-slate-200 cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 border-b border-slate-200 whitespace-nowrap">Day</th>

              <th
                onClick={() => handleSort('dsrName')}
                className="py-3 px-3 border-b border-slate-200 cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap min-w-[130px]"
              >
                <div className="flex items-center gap-1">
                  DSR Name
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('distributorName')}
                className="py-3 px-3 border-b border-slate-200 cursor-pointer hover:text-slate-900 transition-colors min-w-[160px]"
              >
                <div className="flex items-center gap-1">
                  Distributor Name
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 border-b border-slate-200 whitespace-nowrap min-w-[120px]">Beat</th>
              <th className="py-3 px-3 border-b border-slate-200 text-right whitespace-nowrap">Outlet</th>
              <th className="py-3 px-3 border-b border-slate-200 text-right whitespace-nowrap">Call</th>
              <th className="py-3 px-3 border-b border-slate-200 text-right whitespace-nowrap">Prod. Call</th>

              <th
                onClick={() => handleSort('totalSalesValue')}
                className="py-3 px-3 border-b border-slate-200 text-right cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 text-emerald-700">
                  Total Sales
                  <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                </div>
              </th>

              {/* Dynamic Brand Columns */}
              {uniqueBrands.map((brand, idx) => {
                const isEven = idx % 2 === 0;
                const headerBg = isEven ? 'bg-emerald-50/40 text-emerald-800' : 'bg-blue-50/40 text-blue-800';
                
                return (
                  <th key={brand} className={`py-3 px-3 border-b border-slate-200 text-right ${headerBg} border-x border-slate-200 whitespace-nowrap`}>
                    {brand} Val
                  </th>
                );
              })}

              {!isClientViewMode ? (
                <th className="py-3 px-3 border-b border-slate-200 text-center min-w-[100px]">Actions</th>
              ) : (
                <th className="py-3 px-3 border-b border-slate-200 text-center min-w-[60px]">Text</th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={(isClientViewMode ? 10 : 11) + uniqueBrands.length} className="py-8 text-center text-slate-400 italic">
                  No records match your search criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const hasWarnings = record.parseWarnings && record.parseWarnings.length > 0;
                const isSelected = selectedIds.has(record.id);

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-slate-50 transition-colors group ${
                      isSelected ? 'bg-emerald-50/60 font-medium' : ''
                    }`}
                  >
                    {!isClientViewMode && (
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(record.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 text-slate-400 text-center font-mono text-[11px]">{index + 1}</td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-600">{record.date}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">{record.day || '-'}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">{record.dsrName || '-'}</td>
                    
                    {/* Distributor Name with Warning Icon if applicable */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{record.distributorName}</span>
                        {hasWarnings && (
                          <span
                            className="p-0.5 text-amber-500 hover:text-amber-600 cursor-help"
                            title={record.parseWarnings.join(', ')}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{record.beat || '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{record.totalOutlet || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{record.totalCall || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-sky-700 font-semibold">{record.totalProductiveCall || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      {Number(record.totalSalesValue || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Dynamic Brand Values */}
                    {uniqueBrands.map((brand, idx) => {
                      let brandData: any = record.brands ? record.brands[brand] : undefined;
                      if (brandData === undefined && record.brands) {
                        const lowerB = brand.trim().toLowerCase();
                        const foundKey = Object.keys(record.brands).find((k) => k.trim().toLowerCase() === lowerB);
                        if (foundKey) brandData = record.brands[foundKey];
                      }
                      
                      let salesVal: number | string = '-';
                      if (typeof brandData === 'number') {
                        salesVal = brandData;
                      } else if (brandData && typeof brandData === 'object') {
                        salesVal = brandData.salesValue ?? '-';
                      }

                      const isEven = idx % 2 === 0;
                      const cellBg = isEven ? 'bg-emerald-50/20' : 'bg-blue-50/20';

                      return (
                        <td key={brand} className={`py-3 px-3 text-right border-x border-slate-100 font-mono ${cellBg} text-slate-900 font-semibold`}>
                          {salesVal !== '-' && salesVal !== undefined && !isNaN(Number(salesVal)) ? (
                            Number(salesVal).toLocaleString('en-IN')
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onViewRawText(record)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-sky-600 rounded-lg transition-colors cursor-pointer"
                          title="View Original Text"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isClientViewMode && (
                          <>
                            <button
                              onClick={() => onEditRecord(record)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Row"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRecord(record.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Totals / Summary Footer Row */}
          {filteredRecords.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-emerald-500 font-bold text-xs sticky bottom-0 z-20 shadow-md text-slate-900">
              <tr>
                {!isClientViewMode && <td className="py-3.5 px-3"></td>}
                <td className="py-3.5 px-3 text-center text-emerald-700 font-sans">Σ</td>
                <td className="py-3.5 px-3 text-slate-900 font-sans uppercase tracking-wider text-[11px]" colSpan={4}>
                  TOTALS ({filteredRecords.length} Rows)
                </td>
                <td className="py-3.5 px-3"></td>
                <td className="py-3.5 px-3 text-right font-mono">{totals.fixedTotals.outlet}</td>
                <td className="py-3.5 px-3 text-right font-mono">{totals.fixedTotals.call}</td>
                <td className="py-3.5 px-3 text-right font-mono text-sky-800">{totals.fixedTotals.productiveCall}</td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-800 text-sm font-extrabold">
                  {totals.fixedTotals.salesValue.toLocaleString('en-IN')}
                </td>

                {/* Brand Column Totals */}
                {uniqueBrands.map((brand) => (
                  <td key={brand} className="py-3.5 px-3 text-right border-x border-slate-200 font-mono text-emerald-800 font-extrabold">
                    {(totals.brandTotals[brand]?.salesValue || 0).toLocaleString('en-IN')}
                  </td>
                ))}

                <td className="py-3.5 px-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedIds.size} Selected Record{selectedIds.size > 1 ? 's' : ''}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete these {selectedIds.size} selected DSR records? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-rose-200 cursor-pointer"
              >
                Yes, Delete ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

