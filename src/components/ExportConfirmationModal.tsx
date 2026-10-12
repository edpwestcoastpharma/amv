import React, { useState, useEffect } from "react";
import { ShieldAlert, X, Download, FileText, FileSpreadsheet, Printer } from "lucide-react";

export type ExportKind = "pdf" | "word" | "excel" | "print";

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exportKind?: ExportKind;
  targetTitle?: string;
}

export const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  exportKind = "pdf",
  targetTitle,
}) => {
  const [confirmed, setConfirmed] = useState(false);

  // Always reset checkbox whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getExportDetails = () => {
    switch (exportKind) {
      case "word":
        return {
          icon: <FileText className="w-4 h-4 text-blue-600" />,
          label: "Export to Microsoft Word (.doc)",
          badge: "Word Report",
        };
      case "excel":
        return {
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
          label: "Export to Microsoft Excel (.xlsx)",
          badge: "Excel Workbook",
        };
      case "print":
        return {
          icon: <Printer className="w-4 h-4 text-emerald-600" />,
          label: "Print / Save as PDF via Browser",
          badge: "Instant PDF",
        };
      default:
        return {
          icon: <Download className="w-4 h-4 text-blue-600" />,
          label: "Export Document as PDF",
          badge: "PDF Dossier",
        };
    }
  };

  const details = getExportDetails();

  return (
    <div
      id="export-confirmation-modal-backdrop"
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <h3 className="text-xs font-bold tracking-wide uppercase">
              Export Confirmation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Target format info pill */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              {details.icon}
              <span>{targetTitle || details.label}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-slate-200">
              {details.badge}
            </span>
          </div>

          {/* Compliance Checkbox */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="export-draft-disclaimer-checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-0 cursor-pointer flex-shrink-0"
              />
              <span className="text-[11px] leading-relaxed text-slate-700 select-none">
                I confirm that this tool generates a DRAFT only and is not a validated system. I have verified all values against the original data and reports, and I accept responsibility for the review, approval and any onward use or submission of the generated document.
              </span>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-export"
            disabled={!confirmed}
            onClick={() => {
              if (confirmed) {
                onClose();
                onConfirm();
              }
            }}
            className={`px-3.5 py-1.5 rounded font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              confirmed
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Confirm &amp; Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
