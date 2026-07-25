import React, { useState, useEffect } from 'react';
import { DSRRecord } from './types';
import { parseDSRText, getAllUniqueBrands } from './utils/dsrParser';
import { exportToExcel } from './utils/excelExporter';
import { loadStoredRecords, saveStoredRecords, clearStoredRecords } from './utils/localStorage';
import { AlertTriangle, Trash2, X } from 'lucide-react';

import { Header } from './components/Header';
import { TextPasteArea } from './components/TextPasteArea';
import { StatsOverview } from './components/StatsOverview';
import { DistributorDashboard } from './components/DistributorDashboard';
import { DSRTable } from './components/DSRTable';
import { EditRowModal } from './components/EditRowModal';
import { RawTextModal } from './components/RawTextModal';
import { HelpModal } from './components/HelpModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';

export default function App() {
  const [records, setRecords] = useState<DSRRecord[]>(() => loadStoredRecords());
  const [filteredRecords, setFilteredRecords] = useState<DSRRecord[]>(records);
  const [selectedDistributorFilter, setSelectedDistributorFilter] = useState<string>('ALL');
  const [editingRecord, setEditingRecord] = useState<DSRRecord | null>(null);
  const [viewingRawTextRecord, setViewingRawTextRecord] = useState<DSRRecord | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);

  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Sync to localStorage whenever records state updates
  useEffect(() => {
    saveStoredRecords(records);
    setFilteredRecords(records);
  }, [records]);

  // Handle adding new records from pasted WhatsApp text
  const handleAddRecords = (pastedText: string) => {
    const parseResult = parseDSRText(pastedText);
    if (parseResult.records.length > 0) {
      setRecords((prev) => [...prev, ...parseResult.records]);
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
    };
    setEditingRecord(newRecord);
  };

  // Save updated record from Edit Modal
  const handleSaveRecord = (updatedRecord: DSRRecord) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === updatedRecord.id);
      if (exists) {
        return prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
      } else {
        return [...prev, updatedRecord];
      }
    });
    setEditingRecord(null);
  };

  // Trigger Delete confirmation modal
  const handleDeleteRecord = (id: string) => {
    setDeletingRecordId(id);
  };

  // Confirm delete action
  const confirmDeleteRecord = () => {
    if (deletingRecordId) {
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecordId));
      setDeletingRecordId(null);
    }
  };

  // Clear all sheet data with modal confirmation
  const handleConfirmClearSheet = () => {
    setRecords([]);
    clearStoredRecords();
    setShowClearModal(false);
  };

  // Handle Google Sheets Import callback
  const handleImportGoogleSheetsRecords = (importedRecords: DSRRecord[], replaceExisting: boolean) => {
    if (replaceExisting) {
      setRecords(importedRecords);
    } else {
      setRecords((prev) => [...prev, ...importedRecords]);
    }
    setShowGoogleSheetsModal(false);
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
        onDownloadExcel={handleDownloadExcel}
        onClearSheet={() => setShowClearModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenGoogleSheets={() => setShowGoogleSheetsModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Section: Text Paste Area */}
        <section>
          <TextPasteArea onAddRecords={handleAddRecords} />
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
            onViewRawText={(record) => setViewingRawTextRecord(record)}
            onAddManualRecord={handleAddManualRecord}
            onDownloadExcel={handleDownloadExcel}
            onFilteredRecordsChange={(filtered) => setFilteredRecords(filtered)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">WhatsApp DSR → Excel Converter • Dynamic Brand Parsing Engine</p>
          <p className="text-slate-400">Session data preserved in browser storage</p>
        </div>
      </footer>

      {/* Edit Row Modal */}
      {editingRecord && (
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

      {/* Delete Confirmation Modal */}
      {deletingRecordId && (
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
      {showClearModal && (
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
