import React from 'react';
import { X, CheckCircle2, FileText, Sparkles, Layers, Download, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">How to Use WhatsApp DSR Converter</h3>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-200/60 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto leading-relaxed">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
              1
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Paste WhatsApp Messages</h4>
              <p className="text-slate-600">
                Copy WhatsApp Daily Sales Report messages directly from distributor chats and paste them into the input area. You can paste a single report or multiple reports separated by blank lines or dividers like <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">----</code>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 border border-amber-200">
              2
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Automatic Dynamic Brand Columns</h4>
              <p className="text-slate-600 mb-2">
                Brands vary by distributor. Any brand reported using the format:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                &lt;Brand Name&gt; Productive Call:- &lt;number&gt;<br />
                &lt;Brand Name&gt; Sales Value:- &lt;number&gt;
              </div>
              <p className="text-slate-600 mt-2">
                will automatically create a new pair of columns (<code className="text-amber-800 font-semibold">[Brand] Productive Call</code> and <code className="text-amber-800 font-semibold">[Brand] Sales Value</code>) in the running sheet! Older rows without that brand leave those cells empty or 0.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 border border-sky-200">
              3
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Edit, Verify & Clean</h4>
              <p className="text-slate-600">
                View all rows in the running on-page table. Click the <strong>Edit</strong> button on any row to adjust numbers or add missed brands. Click <strong>Eye</strong> to compare with the original WhatsApp message.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 border border-purple-200">
              4
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Download Excel (.xlsx) Anytime</h4>
              <p className="text-slate-600">
                Click <strong>"Download Excel"</strong> to generate a formatted <code className="text-purple-800 font-semibold">.xlsx</code> spreadsheet with all fixed fields first, followed by grouped brand columns, and a summary TOTALS row at the bottom.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

