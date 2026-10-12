import React, { useState, useEffect } from "react";
import {
  Zap,
  Printer,
  Download,
  FileText,
  Clock,
  Layers,
  X,
  Sparkles,
  CheckCircle2,
  StopCircle,
} from "lucide-react";
import { GroupData, ReportHeader } from "../types";

export type PdfScopeOption = "full" | "summary" | "current_group";

interface PdfDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstantPrint: () => void;
  onStartDirectDownload: (scope: PdfScopeOption) => Promise<void>;
  onCancelGeneration: () => void;
  isGenerating: boolean;
  progress: {
    current: number;
    total: number;
    msg: string;
  };
  groups: GroupData[];
  header: ReportHeader;
  activeGroupId: string | null;
  totalPagesEstimate: number;
}

export const PdfDownloadModal: React.FC<PdfDownloadModalProps> = ({
  isOpen,
  onClose,
  onInstantPrint,
  onStartDirectDownload,
  onCancelGeneration,
  isGenerating,
  progress,
  groups,
  header,
  activeGroupId,
  totalPagesEstimate,
}) => {
  const [scope, setScope] = useState<PdfScopeOption>("full");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  // Reset confirmation whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  if (!isOpen) return null;

  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div
      id="pdf-download-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                AMV Report PDF Export
              </h3>
              <p className="text-[11px] text-slate-300">
                {header.compound || "Tibolone"} Validation Dossier
              </p>
            </div>
          </div>
          {!isGenerating && (
            <button
              id="btn-close-pdf-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {isGenerating ? (
            /* ACTIVE GENERATION PROGRESS VIEW */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Generating Direct PDF...
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {elapsedSeconds}s
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {progress.msg || "Processing page elements..."}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${percent > 0 ? percent : 8}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-600">
                  <span>
                    {progress.total > 0
                      ? `Page ${progress.current} of ${progress.total}`
                      : "Initializing..."}
                  </span>
                  <span className="font-bold text-blue-700">{percent}%</span>
                </div>
              </div>

              {/* Fast switch hint */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                <div className="flex items-start gap-2 text-amber-900 font-medium">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>Time bachane ke liye Instant Print use karein:</span>
                    <p className="text-[11px] text-amber-800 font-normal mt-0.5">
                      Browser ka native print <strong>0 seconds (instant)</strong> me open hota he aur 100% crisp vector quality deta he.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    id="btn-switch-instant-print"
                    type="button"
                    onClick={() => {
                      onCancelGeneration();
                      onInstantPrint();
                    }}
                    className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Switch to Instant PDF (0s Wait)</span>
                  </button>
                  <button
                    id="btn-cancel-pdf-gen"
                    type="button"
                    onClick={onCancelGeneration}
                    className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURATION & OPTIONS VIEW */
            <>
              {/* Compliance & DRAFT Disclaimer Checkbox */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-lg">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="modal-draft-disclaimer-checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-0 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[11px] leading-relaxed text-slate-700 select-none">
                    I confirm that this tool generates a DRAFT only and is not a validated system. I have verified all values against the original data and reports, and I accept responsibility for the review, approval and any onward use or submission of the generated document.
                  </span>
                </label>
              </div>

              {/* RECOMMENDED OPTION: INSTANT PRINT TO PDF */}
              <div className="p-3.5 rounded-lg border-2 border-emerald-600 bg-emerald-50/60 relative space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Method 1: ⚡ Instant Save as PDF
                        </span>
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          RECOMMENDED (0 SEC)
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900 mt-0.5">
                        Sabse fast aur 100% original quality. Browser print dialog me <strong>"Save as PDF"</strong> select karein.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10.5px] text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Instant (0 sec wait)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>100% Vector Text</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>All {totalPagesEstimate} Pages</span>
                  </div>
                </div>

                <button
                  id="btn-trigger-instant-pdf"
                  type="button"
                  disabled={!isConfirmed}
                  onClick={() => {
                    if (!isConfirmed) return;
                    onClose();
                    onInstantPrint();
                  }}
                  className={`w-full py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${
                    isConfirmed
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>⚡ Open Instant Print / Save as PDF (0 sec)</span>
                </button>
              </div>

              {/* SECOND OPTION: DIRECT COMPILED PDF DOWNLOAD */}
              <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Method 2: Direct File Download (.pdf)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Direct .pdf file download hoti he. Zyada pages hone par 10-20 seconds lag sakte hain. Fast download ke liye chota scope chunein:
                </p>

                {/* Scope selector radio options */}
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer hover:border-blue-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pdf-scope"
                        checked={scope === "summary"}
                        onChange={() => setScope("summary")}
                        className="text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-semibold text-slate-800">
                          Executive Summary & Compliance Matrix
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Pages 1-2 • Key validation results, regression & tables
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Super Fast (~2s)
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer hover:border-blue-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pdf-scope"
                        checked={scope === "current_group"}
                        onChange={() => setScope("current_group")}
                        className="text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-semibold text-slate-800">
                          Current Parameter ({activeGroup?.name?.slice(0, 25) || "Active"}...)
                        </span>
                        <p className="text-[10px] text-slate-500">
                          ~2-3 Pages • Chromatograms & Detector A table
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Fast (~3s)
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer hover:border-blue-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pdf-scope"
                        checked={scope === "full"}
                        onChange={() => setScope("full")}
                        className="text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-semibold text-slate-800">
                          Complete Dossier (All Pages)
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {totalPagesEstimate} Pages • All 8 validation parameters
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ~10-25s
                    </span>
                  </label>
                </div>

                {/* Speed Toggle */}
                
                <button
                  id="btn-start-direct-download"
                  type="button"
                  disabled={!isConfirmed}
                  onClick={() => {
                    if (!isConfirmed) return;
                    onStartDirectDownload(scope);
                  }}
                  className={`w-full py-2 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${
                    isConfirmed
                      ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download Selected Scope as .PDF
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tip: Chrome/Edge me <strong>Ctrl+P</strong> dabakar "Save as PDF" karein for 0-second export</span>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
