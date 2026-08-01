import React, { useState, useEffect } from 'react';
import { DSRRecord } from './types';
import { parseDSRText, getAllUniqueBrands } from './utils/dsrParser';
import { exportToExcel } from './utils/excelExporter';
import { loadStoredRecords, saveStoredRecords, clearStoredRecords, SAMPLE_DSR_MESSAGES } from './utils/localStorage';
import {
  subscribeDSRRecords,
  saveDSRRecordToDB,
  batchSaveDSRRecordsToDB,
  deleteDSRRecordFromDB,
  bulkDeleteDSRRecordsFromDB,
  clearAllDSRRecordsInDB,
} from './lib/firestoreService';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Header } from './components/Header';
import { TextPasteArea } from './components/TextPasteArea';
import { StatsOverview } from './components/StatsOverview';
import { DistributorDashboard } from './components/DistributorDashboard';
import { DSRTable } from './components/DSRTable';
import { EditRowModal } from './components/EditRowModal';
import { RawTextModal } from './components/RawTextModal';
import { HelpModal } from './components/HelpModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';

export default function App() {
  const [records, setRecords] = useState<DSRRecord[]>(() => {
    const local = loadStoredRecords();
    if (local.length > 0) return local;
    return parseDSRText(SAMPLE_DSR_MESSAGES.join('\n\n-----\n\n')).records;
  });
  const [filteredRecords, setFilteredRecords] = useState<DSRRecord[]>(records);
  const [selectedDistributorFilter, setSelectedDistributorFilter] = useState<string>('ALL');
  const [editingRecord, setEditingRecord] = useState<DSRRecord | null>(null);
  const [viewingRawTextRecord, setViewingRawTextRecord] = useState<DSRRecord | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);

  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Client-Side Only View vs Admin Access state (Reads ?mode=client or ?view=client from URL)
  const [isClientViewMode, setIsClientViewMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || params.get('view') || params.get('role');
    return mode === 'client';
  });
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // Switch mode with admin passcode protection
  const handleToggleClientViewMode = () => {
    if (isClientViewMode) {
      // Require Admin PIN to switch from Client mode to Admin mode
      setShowAdminPasswordModal(true);
    } else {
      // Switch back to Client Read-Only mode
      setIsClientViewMode(true);
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'client');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleAdminUnlockSuccess = () => {
    setIsClientViewMode(false);
    setShowAdminPasswordModal(false);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'admin');
    window.history.replaceState({}, '', url.toString());
  };

  // Firestore Subscription & Auto Seed to Cloud DB
  useEffect(() => {
    let initialSyncDone = false;

    const unsubscribe = subscribeDSRRecords(
      (dbRecords) => {
        setIsDbConnected(true);
        if (dbRecords.length > 0) {
          setRecords(dbRecords);
        } else {
          if (!initialSyncDone) {
            initialSyncDone = true;
            // Check if local cache has stored records first
            const localRecords = loadStoredRecords();
            if (localRecords.length > 0) {
              setRecords(localRecords);
              batchSaveDSRRecordsToDB(localRecords).catch(console.error);
            } else {
              // Parse default sample Lexim Nepal DSR records & seed directly to Cloud Firestore
              const sampleParsed = parseDSRText(SAMPLE_DSR_MESSAGES.join('\n\n-----\n\n'));
              if (sampleParsed.records.length > 0) {
                setRecords(sampleParsed.records);
                batchSaveDSRRecordsToDB(sampleParsed.records).catch(console.error);
              } else {
                setRecords([]);
              }
            }
          } else {
            setRecords([]);
          }
        }
      },
      (err) => {
        console.warn('Firestore offline fallback:', err);
        setIsDbConnected(false);
        const localRecords = loadStoredRecords();
        if (localRecords.length > 0) {
          setRecords(localRecords);
        } else {
          const sampleParsed = parseDSRText(SAMPLE_DSR_MESSAGES.join('\n\n-----\n\n'));
          setRecords(sampleParsed.records);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Sync to localStorage as offline secondary backup
  useEffect(() => {
    saveStoredRecords(records);
    setFilteredRecords(records);
  }, [records]);

  // Handle adding new records from pasted WhatsApp text
  const handleAddRecords = async (pastedText: string) => {
    const parseResult = parseDSRText(pastedText);
    if (parseResult.records.length > 0) {
      // Optimistic update
      setRecords((prev) => [...prev, ...parseResult.records]);
      // Persist to Cloud Database
      await batchSaveDSRRecordsToDB(parseResult.records).catch(console.error);
    }
  };

  // Add a manual record directly
  const handleAddManualRecord = () => {
    const newRecord: DSRRecord = {
      id: `dsr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString().split('T')[0],
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      distributorName: 'New Distributor',
      beat: 'Central Beat',
      totalOutlet: 0,
      totalCall: 0,
      totalProductiveCall: 0,
      totalSalesValue: 0,
      brands: {},
      rawText: 'Manually added record',
      parseWarnings: [],
      createdAt: Date.now(),
      isEdited: true,
    };
    setEditingRecord(newRecord);
  };

  // Save updated record from Edit Modal
  const handleSaveRecord = async (updatedRecord: DSRRecord) => {
    const recordToSave: DSRRecord = {
      ...updatedRecord,
      isEdited: true,
    };

    setRecords((prev) => {
      const exists = prev.some((r) => r.id === recordToSave.id);
      if (exists) {
        return prev.map((r) => (r.id === recordToSave.id ? recordToSave : r));
      } else {
        return [recordToSave, ...prev];
      }
    });
    setEditingRecord(null);
    await saveDSRRecordToDB(recordToSave).catch(console.error);
  };

  // Trigger Delete confirmation modal
  const handleDeleteRecord = (id: string) => {
    setDeletingRecordId(id);
  };

  // Confirm delete action
  const confirmDeleteRecord = async () => {
    if (deletingRecordId) {
      const targetId = deletingRecordId;
      setRecords((prev) => prev.filter((r) => r.id !== targetId));
      setDeletingRecordId(null);
      await deleteDSRRecordFromDB(targetId).catch(console.error);
    }
  };

  // Bulk delete records action
  const handleBulkDeleteRecords = async (ids: string[]) => {
    const idSet = new Set(ids);
    setRecords((prev) => prev.filter((r) => !idSet.has(r.id)));
    await bulkDeleteDSRRecordsFromDB(ids).catch(console.error);
  };

  // Clear all sheet data with modal confirmation
  const handleConfirmClearSheet = async () => {
    setRecords([]);
    clearStoredRecords();
    setShowClearModal(false);
    await clearAllDSRRecordsInDB().catch(console.error);
  };

  // Handle Google Sheets Import callback
  const handleImportGoogleSheetsRecords = async (importedRecords: DSRRecord[], replaceExisting: boolean) => {
    if (replaceExisting) {
      await clearAllDSRRecordsInDB().catch(console.error);
      setRecords(importedRecords);
      await batchSaveDSRRecordsToDB(importedRecords).catch(console.error);
    } else {
      setRecords((prev) => [...prev, ...importedRecords]);
      await batchSaveDSRRecordsToDB(importedRecords).catch(console.error);
    }
    setShowGoogleSheetsModal(false);
  };

  // Handle Excel Sheet Import callback
  const handleImportExcelRecords = async (importedRecords: DSRRecord[], replaceExisting: boolean) => {
    if (replaceExisting) {
      await clearAllDSRRecordsInDB().catch(console.error);
      setRecords(importedRecords);
      await batchSaveDSRRecordsToDB(importedRecords).catch(console.error);
    } else {
      setRecords((prev) => [...prev, ...importedRecords]);
      await batchSaveDSRRecordsToDB(importedRecords).catch(console.error);
    }
    setShowExcelImportModal(false);
  };

  // Trigger Excel Export for active filtered records
  const handleDownloadExcel = () => {
    const dataToExport = records.length > 0 && filteredRecords.length === 0 ? records : filteredRecords;
    exportToExcel(dataToExport, 'WhatsApp_DSR_Report');
  };

  const uniqueBrands = getAllUniqueBrands(records);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Header Bar */}
      <Header
        recordCount={records.length}
        brandCount={uniqueBrands.length}
        isClientViewMode={isClientViewMode}
        isDbConnected={isDbConnected}
        onToggleClientViewMode={handleToggleClientViewMode}
        onDownloadExcel={handleDownloadExcel}
        onOpenExcelImport={() => setShowExcelImportModal(true)}
        onClearSheet={() => setShowClearModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenGoogleSheets={() => setShowGoogleSheetsModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Section: Text Paste Area / Read-Only Client Banner */}
        <section>
          <TextPasteArea
            onAddRecords={handleAddRecords}
            isClientViewMode={isClientViewMode}
            onSwitchToAdmin={() => setShowAdminPasswordModal(true)}
            onOpenExcelImport={() => setShowExcelImportModal(true)}
          />
        </section>

        {/* Middle Section: High-level Stats Overview (Synchronized with active filters) */}
        {records.length > 0 && (
          <section className="animate-fadeIn">
            <StatsOverview records={filteredRecords} />
          </section>
        )}

        {/* Distributor Performance Dashboard */}
        {records.length > 0 && (
          <section className="animate-fadeIn">
            <DistributorDashboard
              records={records}
              onSelectDistributor={(name) => setSelectedDistributorFilter(name)}
            />
          </section>
        )}

        {/* Bottom Section: Main Running Data Table */}
        <section className="animate-fadeIn">
          <DSRTable
            records={records}
            selectedDistributorFilter={selectedDistributorFilter}
            onDistributorFilterChange={(dist) => setSelectedDistributorFilter(dist)}
            onEditRecord={(record) => setEditingRecord(record)}
            onDeleteRecord={handleDeleteRecord}
            onBulkDeleteRecords={handleBulkDeleteRecords}
            onViewRawText={(record) => setViewingRawTextRecord(record)}
            onAddManualRecord={handleAddManualRecord}
            onDownloadExcel={handleDownloadExcel}
            onClearSheet={() => setShowClearModal(true)}
            onFilteredRecordsChange={(filtered) => setFilteredRecords(filtered)}
            isClientViewMode={isClientViewMode}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">WhatsApp DSR → Excel Converter • Dynamic Brand Parsing Engine</p>
          <p className="text-slate-400">
            {isDbConnected ? 'Synced with Cloud Firestore Database' : 'Session data preserved in browser storage'}
          </p>
        </div>
      </footer>

      {/* Edit Row Modal */}
      {editingRecord && !isClientViewMode && (
        <EditRowModal
          record={editingRecord}
          allRecords={records}
          onSave={handleSaveRecord}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {/* Raw Text View Modal */}
      {viewingRawTextRecord && (
        <RawTextModal
          distributorName={viewingRawTextRecord.distributorName}
          rawText={viewingRawTextRecord.rawText}
          onClose={() => setViewingRawTextRecord(null)}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {/* Google Sheets Modal */}
      {showGoogleSheetsModal && (
        <GoogleSheetsModal
          records={records}
          onImportRecords={handleImportGoogleSheetsRecords}
          onClose={() => setShowGoogleSheetsModal(false)}
        />
      )}

      {/* Excel Import Modal */}
      {showExcelImportModal && (
        <ExcelImportModal
          existingCount={records.length}
          onImportRecords={handleImportExcelRecords}
          onClose={() => setShowExcelImportModal(false)}
        />
      )}

      {/* Admin Security Authentication PIN Modal */}
      {showAdminPasswordModal && (
        <AdminPasswordModal
          onClose={() => setShowAdminPasswordModal(false)}
          onSuccess={handleAdminUnlockSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecordId && !isClientViewMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete DSR Report</h3>
                <p className="text-xs text-slate-500 font-medium">This report row will be removed from the table.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Are you sure you want to delete this row? This action will immediately update the overview stats and calculations.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingRecordId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRecord}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Sheet Confirmation Modal */}
      {showClearModal && !isClientViewMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear Entire Sheet</h3>
                <p className="text-xs text-slate-500 font-medium">Reset all records and session memory.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Are you sure you want to clear all <strong>{records.length}</strong> reports? This will remove all parsed distributor records from this session.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearSheet}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

