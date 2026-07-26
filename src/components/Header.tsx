import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, Sparkles, RefreshCw, HelpCircle, Layers, Eye, ShieldCheck, Database, Link, Check, Share2 } from 'lucide-react';
import { ShareClientLinkModal } from './ShareClientLinkModal';

interface HeaderProps {
  recordCount: number;
  brandCount: number;
  isClientViewMode: boolean;
  isDbConnected: boolean;
  onToggleClientViewMode: () => void;
  onDownloadExcel: () => void;
  onOpenExcelImport: () => void;
  onClearSheet: () => void;
  onOpenHelp: () => void;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  recordCount,
  brandCount,
  isClientViewMode,
  isDbConnected,
  onToggleClientViewMode,
  onDownloadExcel,
  onOpenExcelImport,
  onClearSheet,
  onOpenHelp,
  onOpenGoogleSheets,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleCopyLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const clientShareUrl = `${baseUrl}?mode=client`;
    
    navigator.clipboard.writeText(clientShareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(console.error);

    setShowShareModal(true);
  };
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
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold uppercase rounded tracking-wider hidden sm:inline-block">
                v2.5 Live
              </span>
              {isDbConnected && (
                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-bold rounded-full flex items-center gap-1" title="Real-time Cloud Firestore Database Connected">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  <Database className="w-3 h-3 text-sky-600" />
                  <span className="hidden md:inline">Cloud DB</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">WhatsApp Daily Sales Report → Excel & Analytics</p>
          </div>
        </div>

        {/* Action Controls & Access Mode Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active stats pills */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <strong className="text-slate-900">{recordCount}</strong> {recordCount === 1 ? 'Row' : 'Rows'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <strong className="text-slate-900">{brandCount}</strong> {brandCount === 1 ? 'Brand' : 'Brands'}
            </span>
          </div>

          {/* Access Mode Switcher Button */}
          <button
            onClick={onToggleClientViewMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              isClientViewMode
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
            title={isClientViewMode ? 'Unlock Admin Access Mode (Passcode Required)' : 'Switch to Client Read-Only Visualization View'}
          >
            {isClientViewMode ? (
              <>
                <Eye className="w-4 h-4 text-sky-600" />
                <span>Client View</span>
                <span className="text-[10px] bg-sky-200/80 text-sky-900 px-1.5 py-0.2 rounded font-mono uppercase">Read-Only</span>
                <span className="text-[11px] text-amber-700 font-semibold ml-1 flex items-center gap-0.5 bg-amber-100/80 px-1.5 py-0.5 rounded-md hover:bg-amber-200/80 transition-colors">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span>Admin</span>
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Admin Access</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-mono uppercase">Full Edit</span>
              </>
            )}
          </button>

          {/* Copy Share URL Link Button */}
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Get Custom Team Client View Link (?mode=client)"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold hidden sm:inline">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Share Team Link</span>
              </>
            )}
          </button>

          {/* Quick Help */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Format Guide & Instructions"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Clear Sheet (Only in Admin / Full Edit Access Mode) */}
          {!isClientViewMode && recordCount > 0 && (
            <button
              onClick={onClearSheet}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Clear all records from database and session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Upload Excel Sheet */}
          {!isClientViewMode && (
            <button
              onClick={onOpenExcelImport}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Upload Excel (.xlsx/.csv) Data Sheet"
            >
              <Upload className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Upload Excel</span>
            </button>
          )}

          {/* Google Sheets Sync (Admin Only) */}
          {!isClientViewMode && (
            <button
              onClick={onOpenGoogleSheets}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Export to or Import from Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>
          )}

          {/* Download Excel */}
          <button
            onClick={onDownloadExcel}
            disabled={recordCount === 0}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              recordCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Excel</span>
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareClientLinkModal
          onClose={() => setShowShareModal(false)}
          isClientViewMode={isClientViewMode}
          onSwitchToAdmin={onToggleClientViewMode}
        />
      )}
    </header>
  );
};


