import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Upload,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  Loader2,
  ListFilter,
  PlusCircle,
} from 'lucide-react';
import { DSRRecord } from '../types';
import { googleSignIn, logout, initAuth } from '../lib/googleAuth';
import {
  exportToNewGoogleSheet,
  appendToExistingGoogleSheet,
  importFromGoogleSheet,
  listUserSpreadsheets,
  SpreadsheetFile,
  GoogleSheetsExportResult,
} from '../lib/googleSheets';

interface GoogleSheetsModalProps {
  records: DSRRecord[];
  onImportRecords: (newRecords: DSRRecord[], replaceExisting: boolean) => void;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  records,
  onImportRecords,
  onClose,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Export State
  const [exportMode, setExportMode] = useState<'new' | 'existing'>('new');
  const [sheetTitle, setSheetTitle] = useState(
    `DSR Sales Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  );
  const [selectedExistingSheetId, setSelectedExistingSheetId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<GoogleSheetsExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import State
  const [sheetInputId, setSheetInputId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importReplace, setImportReplace] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Drive Files
  const [userSheets, setUserSheets] = useState<SpreadsheetFile[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        fetchUserSheets(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchUserSheets = async (token: string) => {
    setIsLoadingSheets(true);
    try {
      const files = await listUserSpreadsheets(token);
      setUserSheets(files);
      if (files.length > 0) {
        setSelectedExistingSheetId(files[0].id);
        setSheetInputId(files[0].id);
      }
    } catch (err: any) {
      console.warn('Could not list user drive sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        fetchUserSheets(res.accessToken);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setExportResult(null);
  };

  const handleExport = async () => {
    if (!accessToken) {
      setExportError('Please sign in with Google first.');
      return;
    }
    if (records.length === 0) {
      setExportError('No records to export. Please add or parse DSR text first.');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportResult(null);

    try {
      if (exportMode === 'new') {
        const result = await exportToNewGoogleSheet(accessToken, sheetTitle, records);
        setExportResult(result);
      } else {
        if (!selectedExistingSheetId) {
          throw new Error('Please select an existing Google Sheet.');
        }
        const result = await appendToExistingGoogleSheet(accessToken, selectedExistingSheetId, records);
        setExportResult(result);
      }
    } catch (err: any) {
      setExportError(err?.message || 'Export failed. Please check permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!accessToken) {
      setImportError('Please sign in with Google first.');
      return;
    }

    // Extract spreadsheet ID if full URL pasted
    let targetId = sheetInputId.trim();
    if (targetId.includes('/spreadsheets/d/')) {
      const match = targetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetId = match[1];
      }
    }

    if (!targetId) {
      setImportError('Please enter a Google Sheet URL or select one from your files.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccessCount(null);

    try {
      const importedRecords = await importFromGoogleSheet(accessToken, targetId);
      if (importedRecords.length === 0) {
        throw new Error('No valid DSR records found in the selected sheet.');
      }
      onImportRecords(importedRecords, importReplace);
      setImportSuccessCount(importedRecords.length);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to import data from Google Sheet.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Google Sheets Integration</h3>
              <p className="text-xs text-slate-400">Export & sync live DSR reports with Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* User Account / Sign In Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="w-9 h-9 rounded-full border border-slate-300" />
                  ) : (
                    <div className="w-9 h-9 bg-emerald-600 text-white font-bold rounded-full flex items-center justify-center text-sm">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900">{currentUser.displayName || 'Google User'}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Sign in with Google</h4>
                  <p className="text-[11px] text-slate-500">Connect your Google Account to export or import spreadsheets.</p>
                </div>
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="gsi-material-button shrink-0 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isAuthenticating ? 'Signing in...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            )}
            {authError && <p className="text-xs text-rose-600 mt-2 font-medium">{authError}</p>}
          </div>

          {/* Action Tabs: Export vs Import */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('export')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'export'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" /> Export to Google Sheets ({records.length} Rows)
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'import'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Download className="w-4 h-4" /> Import from Google Sheets
            </button>
          </div>

          {/* Tab 1: Export Content */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setExportMode('new')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    exportMode === 'new' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> Create New Sheet
                </button>
                <button
                  onClick={() => setExportMode('existing')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    exportMode === 'existing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5 text-emerald-600" /> Append to Existing Sheet
                </button>
              </div>

              {exportMode === 'new' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Spreadsheet Title</label>
                  <input
                    type="text"
                    value={sheetTitle}
                    onChange={(e) => setSheetTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                    placeholder="e.g. DSR Weekly Report"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Recent Google Sheet</label>
                  {isLoadingSheets ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Fetching your Google Drive sheets...
                    </div>
                  ) : userSheets.length > 0 ? (
                    <select
                      value={selectedExistingSheetId}
                      onChange={(e) => setSelectedExistingSheetId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold bg-white"
                    >
                      {userSheets.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({new Date(file.modifiedTime || '').toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={selectedExistingSheetId}
                        onChange={(e) => setSelectedExistingSheetId(e.target.value)}
                        placeholder="Paste Spreadsheet ID or URL"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Paste the Google Sheet ID or share link.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleExport}
                disabled={isExporting || !currentUser || records.length === 0}
                className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isExporting || !currentUser || records.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-98'
                }`}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Exporting {records.length} records to Google Sheets...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {exportMode === 'new' ? 'Export to Google Sheets' : 'Append to Google Sheet'}
                  </>
                )}
              </button>

              {/* Export Errors */}
              {exportError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Export Success Result */}
              {exportResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Successfully exported {exportResult.rowsExported} rows to Google Sheets!</span>
                  </div>
                  <a
                    href={exportResult.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Spreadsheet in Google Sheets <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Import Content */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select or Paste Google Sheet URL / ID
                </label>
                {userSheets.length > 0 && (
                  <div className="mb-2">
                    <select
                      onChange={(e) => setSheetInputId(e.target.value)}
                      value={sheetInputId}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold bg-white mb-2"
                    >
                      <option value="">-- Choose from your Google Drive files --</option>
                      {userSheets.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <input
                  type="text"
                  value={sheetInputId}
                  onChange={(e) => setSheetInputId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              {/* Replace vs Append toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="importReplaceCheck"
                  checked={importReplace}
                  onChange={(e) => setImportReplace(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="importReplaceCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Replace all existing table records with imported records
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handleImport}
                disabled={isImporting || !currentUser || !sheetInputId}
                className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isImporting || !currentUser || !sheetInputId
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-98'
                }`}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching data from Google Sheet...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Import Records into App
                  </>
                )}
              </button>

              {/* Import Errors */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Success */}
              {importSuccessCount !== null && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-fadeIn">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>Successfully imported {importSuccessCount} records from Google Sheets!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Google Sheets API v4 Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
