import React, { useState, useMemo } from 'react';
import { PlusCircle, Clipboard, Trash2, HelpCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { splitMessages } from '../utils/dsrParser';
import { SAMPLE_DSR_MESSAGES } from '../utils/localStorage';

interface TextPasteAreaProps {
  onAddRecords: (pastedText: string) => void;
}

export const TextPasteArea: React.FC<TextPasteAreaProps> = ({ onAddRecords }) => {
  const [inputText, setInputText] = useState('');
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Compute how many messages are detected in live textarea
  const detectedCount = useMemo(() => {
    if (!inputText.trim()) return 0;
    return splitMessages(inputText).length;
  }, [inputText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const count = detectedCount || 1;
    onAddRecords(inputText);
    setAddedCount(count);
    setInputText('');
    setShowSuccessToast(true);

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

  const handleLoadSample = (sampleIndex: number) => {
    if (sampleIndex === 99) {
      // Paste all 3 samples separated by divider
      setInputText(SAMPLE_DSR_MESSAGES.join('\n\n-----\n\n'));
    } else if (SAMPLE_DSR_MESSAGES[sampleIndex]) {
      setInputText(SAMPLE_DSR_MESSAGES[sampleIndex]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-emerald-600" />
            Paste WhatsApp DSR Text
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supports single or multiple reports pasted together (separated by blank lines or <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-medium">----</code>).
          </p>
        </div>

        {/* Action Controls for Samples & Format */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Load Sample DSR
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-20 hidden group-hover:block transition-all">
              <button
                type="button"
                onClick={() => handleLoadSample(0)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                1. Single DSR (ABC Traders)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample(1)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                2. Single DSR (Himalayan / AFC/AFR)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample(99)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border-t border-slate-100 mt-1 pt-2"
              >
                ⚡ Load Batch (3 Reports together)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFormatGuide(!showFormatGuide)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            Format Guide
            {showFormatGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Format Guide Expandable Section */}
      {showFormatGuide && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2 animate-fadeIn">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Expected Text Format & Dynamic Brand Column Rules
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <span className="text-slate-500 font-medium block mb-1">Fixed Fields (Always Extracted):</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                <li><code className="text-emerald-700 font-semibold">Date:- DD-MM-YYYY</code></li>
                <li><code className="text-emerald-700 font-semibold">Day:- Friday</code></li>
                <li><code className="text-emerald-700 font-semibold">DSR Name:- Ramesh Kumar</code></li>
                <li><code className="text-emerald-700 font-semibold">Distributor Name:- ABC Enterprise</code></li>
                <li><code className="text-emerald-700 font-semibold">Beat:- Route A</code></li>
                <li><code className="text-emerald-700 font-semibold">Total Outlet:- 50</code></li>
                <li><code className="text-emerald-700 font-semibold">Total Call:- 30</code></li>
                <li><code className="text-emerald-700 font-semibold">Total Productive Call:- 22</code></li>
                <li><code className="text-emerald-700 font-semibold">Total Sales Value:- 125000</code></li>
              </ul>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-1">Dynamic Brand Fields (Automatic Columns):</span>
              <p className="text-slate-600 mb-1">
                Any brand name followed by <code className="text-amber-700 font-semibold">Productive Call:- &lt;num&gt;</code> and <code className="text-amber-700 font-semibold">Sales Value:- &lt;num&gt;</code> will automatically create pair columns!
              </p>
              <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                Panda Productive Call:- 10<br />
                Panda Sales Value:- 35000<br />
                AFC/AFR Productive Call:- 12<br />
                AFC/AFR Sales Value:- 50000
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Textarea Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={7}
            placeholder="Paste your WhatsApp Daily Sales Report text here...&#10;&#10;Example:&#10;Date:- 24-07-2026&#10;Distributor Name:- ABC Traders&#10;Total Sales Value:- 145000&#10;Panda Productive Call:- 10&#10;Panda Sales Value:- 40000"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono leading-relaxed transition-all resize-y"
          />

          {inputText && (
            <button
              type="button"
              onClick={() => setInputText('')}
              className="absolute right-3 top-3 p-1.5 bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors"
              title="Clear text"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Submit & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 flex items-center gap-2 w-full sm:w-auto">
            {detectedCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {detectedCount} {detectedCount === 1 ? 'Message' : 'Messages'} detected in paste
              </span>
            ) : (
              <span className="text-slate-400">Ready for input</span>
            )}

            {showSuccessToast && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium animate-fadeIn border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Appended {addedCount} {addedCount === 1 ? 'row' : 'rows'} to sheet!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                inputText.trim()
                  ? 'bg-slate-900 hover:bg-black text-white active:scale-95 cursor-pointer shadow-slate-300'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              Append to Sheet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

