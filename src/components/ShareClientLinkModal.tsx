import React, { useState } from 'react';
import { Share2, Copy, Check, Eye, ExternalLink, X, Shield, MessageSquare, Edit3, Lock, ShieldCheck, Link } from 'lucide-react';

interface ShareClientLinkModalProps {
  onClose: () => void;
  isClientViewMode?: boolean;
  onSwitchToAdmin?: () => void;
}

export const ShareClientLinkModal: React.FC<ShareClientLinkModalProps> = ({
  onClose,
  isClientViewMode = false,
  onSwitchToAdmin,
}) => {
  const [copiedType, setCopiedType] = useState<'vanity' | 'direct' | null>(null);
  const [customTeamTag, setCustomTeamTag] = useState('lexim-nepal-dsr');
  const [vanityUrl, setVanityUrl] = useState('https://leximnepaldsrview');

  const getClientUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const cleanTag = customTeamTag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    const tagQuery = cleanTag ? `&team=${cleanTag}` : '';
    return `${origin}${pathname}?mode=client${tagQuery}`;
  };

  const clientUrl = getClientUrl();

  const handleCopy = (type: 'vanity' | 'direct', textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }).catch(console.error);
  };

  const handleShareWhatsApp = (urlToShare: string) => {
    const text = encodeURIComponent(`📊 DSR Daily Sales Report (Lexim Nepal Client View):\n${urlToShare}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-sky-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-800 rounded-xl">
              <Share2 className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Share Team Client View Link</h3>
              <p className="text-xs text-slate-500">Provide read-only dashboard access to your team & stakeholders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Key Info Banner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Eye className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Read-Only Team Access</span>
              </div>
              {isClientViewMode ? (
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  Admin Edit Locked
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  Admin Link Customizer Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anyone opening this link will enter directly into <strong className="text-slate-800">Client View Mode</strong> to see live reports & dynamic analytics, but <strong className="text-slate-800">cannot edit or delete data</strong>.
            </p>
          </div>

          {/* Short Custom Vanity Link Box (https://leximnepaldsrview) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Link className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Custom Short Vanity Link
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                Branded Link
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={isClientViewMode}
                value={vanityUrl}
                onChange={(e) => setVanityUrl(e.target.value)}
                placeholder="https://leximnepaldsrview"
                className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs font-mono font-semibold transition-all ${
                  isClientViewMode
                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-50/50 border-emerald-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              <button
                type="button"
                onClick={() => handleCopy('vanity', vanityUrl)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
                  copiedType === 'vanity'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300/80'
                }`}
              >
                {copiedType === 'vanity' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-700" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom Team Parameter / Tag Editor (Admin Only) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                Custom Client Team Identifier
              </span>
              {isClientViewMode && (
                <span className="text-[11px] text-amber-700 font-semibold">Admin Access Required</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={isClientViewMode}
                value={customTeamTag}
                onChange={(e) => setCustomTeamTag(e.target.value)}
                placeholder="e.g. lexim-nepal-dsr, sales-team"
                className={`flex-1 px-3.5 py-2 border rounded-xl text-xs font-mono transition-all ${
                  isClientViewMode
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'
                }`}
              />
              {isClientViewMode && onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToAdmin();
                  }}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unlock Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Full Custom Client Link Output Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Full Custom Client View URL</span>
              <span className="text-[11px] font-mono text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded">
                ?mode=client
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={clientUrl}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden selection:bg-sky-200"
                />
              </div>
              <button
                onClick={() => handleCopy('direct', clientUrl)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ${
                  copiedType === 'direct'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200'
                }`}
              >
                {copiedType === 'direct' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Options */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={() => handleShareWhatsApp(vanityUrl || clientUrl)}
              className="flex-1 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Share on WhatsApp</span>
            </button>

            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>Open Client View</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin capabilities require passcode authentication</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

