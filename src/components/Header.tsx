import React from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Sparkles,
  Printer,
  Plus,
  RefreshCw,
  BarChart3,
  Activity,
  Zap,
} from "lucide-react";

interface HeaderProps {
  activeTab: "work" | "graphs" | "report";
  onTabChange: (tab: "work" | "graphs" | "report") => void;
  onLoadExample: () => void;
  onAutoFillAll?: () => void;
  onOpenUpload: () => void;
  onOpenRawTrace: () => void;
  onPrint: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  onDirectPdfDownload: () => void;
  isGeneratingPdf: boolean;
  totalInjections: number;
  selectedPresetId?: string;
  onSelectPreset?: (presetId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onLoadExample,
  onAutoFillAll,
  onOpenUpload,
  onOpenRawTrace,
  onPrint,
  onExportExcel,
  onExportWord,
  onDirectPdfDownload,
  isGeneratingPdf,
  totalInjections,
  selectedPresetId = "tibolone_assay",
  onSelectPreset,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-semibold text-sm tracking-wide text-slate-100 uppercase">
                HPLC AMV Report Generator
              </h1>
              <span className="bg-indigo-950/90 text-indigo-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-indigo-700/60 shadow-xs">
                HPLC AMV Report Assistant (Demo)
              </span>
              <span className="bg-blue-950 text-blue-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-800">
                Format
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Area, Height, Tailing, Plates, Area%, Resolution, RRT, RT &amp; Auto PDF
            </p>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => onTabChange("work")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "work"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Data Entry ({totalInjections})</span>
          </button>
          <button
            onClick={() => onTabChange("graphs")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "graphs"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Validation Graphs</span>
          </button>
          <button
            onClick={() => onTabChange("report")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "report"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Draft Report</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* AMV Preset Selector */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
            <span className="text-[11px] text-slate-400 hidden lg:inline font-mono">AMV:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => onSelectPreset?.(e.target.value)}
              className="bg-transparent text-slate-200 text-xs py-1 focus:outline-none font-medium cursor-pointer"
              title="Select loaded AMV method & dataset"
            >
              <option value="tibolone_assay" className="bg-slate-900 text-white">
                Tibolone Assay &amp; CU HPLC (AMV-ASSAY-CU)
              </option>
              <option value="tibolone_disso" className="bg-slate-900 text-white">
                Tibolone Dissolution HPLC (AMV-DIS)
              </option>
              <option value="tibolone_rs" className="bg-slate-900 text-white">
                Tibolone Related Substances HPLC (AMV-RS)
              </option>
              <option value="cetirizine_std" className="bg-slate-900 text-white">
                Cetirizine Standard AMV
              </option>
            </select>
          </div>

          <button
            onClick={onOpenUpload}
            className="px-2.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm"
            title="Auto-extract data from AMV PDF or image"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Upload Any AMV</span>
          </button>

          <button
            onClick={onLoadExample}
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors flex items-center gap-1"
            title="Load standard Mycophenolate Mofetil validation template"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sample Data</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            onClick={onPrint}
            className="px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Instant 0-second vector PDF via Browser Print (Save as PDF)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden md:inline">Instant PDF (0s)</span>
            <span className="md:hidden">PDF (0s)</span>
          </button>

          <button
            onClick={onDirectPdfDownload}
            disabled={isGeneratingPdf}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Configure PDF Scope & Direct Download"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? "Compiling..." : "Export PDF"}</span>
          </button>

          <button
            onClick={onExportWord}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Export Report to Microsoft Word"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Word</span>
          </button>
        </div>
      </div>
    </header>
  );
};
