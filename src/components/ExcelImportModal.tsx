import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Check, AlertCircle, X, ArrowRight, Table } from 'lucide-react';
import { parseExcelFile } from '../utils/excelImporter';
import { DSRRecord } from '../types';

interface ExcelImportModalProps {
  onClose: () => void;
  onImportRecords: (importedRecords: DSRRecord[], replaceExisting: boolean) => void;
  existingCount: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  onClose,
  onImportRecords,
  existingCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRecords, setParsedRecords] = useState<DSRRecord[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorMessages([]);

    try {
      const buffer = await file.arrayBuffer();
      const { records, errors } = parseExcelFile(buffer);
      if (errors.length > 0) {
        setErrorMessages(errors);
      }
      setParsedRecords(records);
    } catch (err: any) {
      setErrorMessages([`Error reading file: ${err?.message || String(err)}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorMessages([]);

    try {
      const buffer = await file.arrayBuffer();
      const { records, errors } = parseExcelFile(buffer);
      if (errors.length > 0) {
        setErrorMessages(errors);
      }
      setParsedRecords(records);
    } catch (err: any) {
      setErrorMessages([`Error reading file: ${err?.message || String(err)}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRecords.length === 0) return;
    onImportRecords(parsedRecords, replaceExisting);
  };

  const totalImportSales = parsedRecords.reduce((sum, r) => sum + (Number(r.totalSalesValue) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Excel Data Sheet</h3>
              <p className="text-xs text-slate-500">Import .xlsx, .xls, or .csv DSR sheets directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 p-6 rounded-2xl text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {fileName ? fileName : 'Click or drag & drop Excel (.xlsx / .csv) file here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports exported DSR Excel workbooks and custom distributor reports</p>
          </div>

          {/* Error display if any */}
          {errorMessages.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Import Notice:</span>
              </div>
              {errorMessages.map((msg, i) => (
                <p key={i}>• {msg}</p>
              ))}
            </div>
          )}

          {/* Parsed Summary Preview */}
          {parsedRecords.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-600" />
                  File Preview Extracted
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {parsedRecords.length} Rows Found
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block">Total Revenue</span>
                  <strong className="text-emerald-700 text-sm">
                    NPR {totalImportSales.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block">Unique Distributors</span>
                  <strong className="text-slate-800 text-sm">
                    {new Set(parsedRecords.map((r) => r.distributorName)).size}
                  </strong>
                </div>
              </div>

              {/* Import Options: Append or Replace */}
              {existingCount > 0 && (
                <div className="pt-2 border-t border-slate-200/70">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Import Mode
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={!replaceExisting}
                        onChange={() => setReplaceExisting(false)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Append to existing ({existingCount} rows)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={replaceExisting}
                        onChange={() => setReplaceExisting(true)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-rose-600 font-medium">Replace current data</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedRecords.length === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              parsedRecords.length > 0 && !isProcessing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Import Data into Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
