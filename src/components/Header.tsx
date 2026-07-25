import React from 'react';
import { FileSpreadsheet, Download, Sparkles, RefreshCw, HelpCircle, Layers } from 'lucide-react';

interface HeaderProps {
  recordCount: number;
  brandCount: number;
  onDownloadExcel: () => void;
  onClearSheet: () => void;
  onOpenHelp: () => void;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  recordCount,
  brandCount,
  onDownloadExcel,
  onClearSheet,
  onOpenHelp,
  onOpenGoogleSheets,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Title and Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-emerald-200">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                DSR<span className="text-emerald-600 italic font-medium">Converter</span>
              </h1>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold uppercase rounded tracking-wider">
                v2.4 Active
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">WhatsApp Daily Sales Report → Excel Sheet</p>
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center space-x-3">
          {/* Active stats pills */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <strong className="text-slate-900">{recordCount}</strong> {recordCount === 1 ? 'Row' : 'Rows'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <strong className="text-slate-900">{brandCount}</strong> {brandCount === 1 ? 'Brand' : 'Brands'}
            </span>
          </div>

          {/* Quick Help */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Format Guide & Instructions"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Clear Sheet */}
          {recordCount > 0 && (
            <button
              onClick={onClearSheet}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Clear all records in session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* Google Sheets Sync */}
          <button
            onClick={onOpenGoogleSheets}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Export to or Import from Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Google Sheets</span>
          </button>

          {/* Download Excel */}
          <button
            onClick={onDownloadExcel}
            disabled={recordCount === 0}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              recordCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            <Download className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>
    </header>
  );
};

