import React, { useState } from 'react';
import { DSRRecord } from '../types';
import { getAllUniqueBrands } from '../utils/dsrParser';
import { X, Save, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface EditRowModalProps {
  record: DSRRecord;
  allRecords: DSRRecord[];
  onSave: (updatedRecord: DSRRecord) => void;
  onClose: () => void;
}

export const EditRowModal: React.FC<EditRowModalProps> = ({
  record,
  allRecords,
  onSave,
  onClose,
}) => {
  const [date, setDate] = useState(record.date);
  const [day, setDay] = useState(record.day);
  const [dsrName, setDsrName] = useState(record.dsrName || '');
  const [distributorName, setDistributorName] = useState(record.distributorName);
  const [beat, setBeat] = useState(record.beat);
  const [totalOutlet, setTotalOutlet] = useState<number | string>(record.totalOutlet);
  const [totalCall, setTotalCall] = useState<number | string>(record.totalCall);
  const [totalProductiveCall, setTotalProductiveCall] = useState<number | string>(record.totalProductiveCall);
  const [totalSalesValue, setTotalSalesValue] = useState<number | string>(record.totalSalesValue);

  // Brands local state
  const [brands, setBrands] = useState<Record<string, { productiveCall: number; salesValue: number }>>({
    ...record.brands,
  });

  const [newBrandName, setNewBrandName] = useState('');

  // Combine brands from this record and all records to show available brand inputs
  const knownBrands = Array.from(new Set([...getAllUniqueBrands(allRecords), ...Object.keys(brands)])).sort();

  const handleBrandChange = (brand: string, field: 'productiveCall' | 'salesValue', val: string) => {
    const num = parseFloat(val) || 0;
    setBrands((prev) => ({
      ...prev,
      [brand]: {
        productiveCall: field === 'productiveCall' ? num : prev[brand]?.productiveCall || 0,
        salesValue: field === 'salesValue' ? num : prev[brand]?.salesValue || 0,
      },
    }));
  };

  const handleAddCustomBrand = () => {
    if (!newBrandName.trim()) return;
    const clean = newBrandName.trim();
    if (!brands[clean]) {
      setBrands((prev) => ({
        ...prev,
        [clean]: { productiveCall: 0, salesValue: 0 },
      }));
    }
    setNewBrandName('');
  };

  const handleRemoveBrand = (brand: string) => {
    setBrands((prev) => {
      const next = { ...prev };
      delete next[brand];
      return next;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: DSRRecord = {
      ...record,
      date,
      day,
      dsrName,
      distributorName,
      beat,
      totalOutlet: Number(totalOutlet) || 0,
      totalCall: Number(totalCall) || 0,
      totalProductiveCall: Number(totalProductiveCall) || 0,
      totalSalesValue: Number(totalSalesValue) || 0,
      brands,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Edit DSR Record</h3>
            <p className="text-xs text-slate-500">Modify distributor details, call counts, or brand values</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-200/60 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Warnings Banner if any */}
          {record.parseWarnings && record.parseWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Original Parser Warnings:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                {record.parseWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: Fixed Fields */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">Fixed Report Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Day</label>
                <input
                  type="text"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">DSR Name / Sales Officer</label>
                <input
                  type="text"
                  value={dsrName}
                  onChange={(e) => setDsrName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Distributor Name</label>
                <input
                  type="text"
                  value={distributorName}
                  onChange={(e) => setDistributorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-semibold"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Beat / Route</label>
                <input
                  type="text"
                  value={beat}
                  onChange={(e) => setBeat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Outlet</label>
                <input
                  type="number"
                  value={totalOutlet}
                  onChange={(e) => setTotalOutlet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Call</label>
                <input
                  type="number"
                  value={totalCall}
                  onChange={(e) => setTotalCall(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Productive Call</label>
                <input
                  type="number"
                  value={totalProductiveCall}
                  onChange={(e) => setTotalProductiveCall(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Sales Value</label>
                <input
                  type="number"
                  value={totalSalesValue}
                  onChange={(e) => setTotalSalesValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-emerald-700 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Brand Breakdown */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">Dynamic Brand Metrics</h4>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New Brand Name..."
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomBrand}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {knownBrands.length === 0 ? (
                <p className="text-slate-400 italic text-center py-2">No dynamic brands added yet.</p>
              ) : (
                knownBrands.map((brand) => {
                  const data = brands[brand] || { productiveCall: 0, salesValue: 0 };
                  const isPresent = brands[brand] !== undefined;

                  return (
                    <div
                      key={brand}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isPresent ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/40 border-slate-200/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-[140px]">
                        <span className="font-semibold text-slate-800">{brand}</span>
                        {isPresent && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBrand(brand)}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove brand from this row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Prod Call</label>
                          <input
                            type="number"
                            value={data.productiveCall}
                            onChange={(e) => handleBrandChange(brand, 'productiveCall', e.target.value)}
                            className="w-28 bg-white border border-slate-200 rounded-lg p-1.5 text-slate-900 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Sales Value</label>
                          <input
                            type="number"
                            value={data.salesValue}
                            onChange={(e) => handleBrandChange(brand, 'salesValue', e.target.value)}
                            className="w-32 bg-white border border-slate-200 rounded-lg p-1.5 text-amber-800 font-bold outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-slate-200 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

