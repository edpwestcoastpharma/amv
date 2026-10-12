import React, { useRef, useState } from "react";
import { GroupData, ReportHeader, InjectionData } from "../types";
import { fmt, stats, num } from "../utils/calculations";
import { ChromatogramSvg } from "./ChromatogramSvg";
import { ValidationExecutiveSummary } from "./ValidationExecutiveSummary";
import { AllValidationGraphsView } from "./AllValidationGraphsView";
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Sliders,
  Check,
  Award,
  Zap,
} from "lucide-react";

import { ValidationChecklist } from "./ValidationChecklist";
import { ConflictsDetected, MissingData, TraceabilityTable } from "./DataBlocks";
import { SingleLabSolutionsPage } from "./SingleLabSolutionsPage";
import { SummaryCompoundPage } from "./SummaryCompoundPage";

interface LabSolutionsReportProps {
  amvSource?: any;
  groups: GroupData[];
  header: ReportHeader;
  showSummaryGrid: boolean;
  setShowSummaryGrid: (v: boolean) => void;
  showChromEach: boolean;
  setShowChromEach: (v: boolean) => void;
  scannedLook: boolean;
  setScannedLook: (v: boolean) => void;
  onDirectPdfDownload: () => void;
  onPrint: () => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  isGeneratingPdf: boolean;
}


const SingleInjectionTable: React.FC<{ inj: any, compoundName: string }> = ({ inj, compoundName }) => (
  <div className="mt-2 text-[10px] font-sans px-1">
    <div className="font-bold mb-0.5 tracking-tight">&lt;&lt; Detector A &gt;&gt;</div>
    <table className="ls-table w-full border-collapse text-[9.5px] font-sans">
      <thead>
        <tr className="bg-slate-50">
          <th className="border border-black font-normal text-left px-1 py-0.5">Peak#</th>
          <th className="border border-black font-normal text-right px-1 py-0.5">Ret. Time</th>
          <th className="border border-black font-normal text-right px-1 py-0.5">Area</th>
          <th className="border border-black font-normal text-right px-1 py-0.5">Height</th>
          <th className="border border-black font-normal text-right px-1 py-0.5">Tailing Factor</th>
          <th className="border border-black font-normal text-right px-1 py-0.5">Theoretical Plate</th>
          <th className="border border-black font-normal text-left px-1 py-0.5">Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-black text-left px-1 py-0.5">1</td>
          <td className="border border-black text-right px-1 py-0.5 font-mono">{inj.rt ? inj.rt.toFixed(3) : "--"}</td>
          <td className="border border-black text-right px-1 py-0.5 font-mono">{inj.area}</td>
          <td className="border border-black text-right px-1 py-0.5 font-mono">{inj.height}</td>
          <td className="border border-black text-right px-1 py-0.5 font-mono">{inj.tailing ? inj.tailing.toFixed(3) : "--"}</td>
          <td className="border border-black text-right px-1 py-0.5 font-mono">{inj.plates}</td>
          <td className="border border-black text-left px-1 py-0.5">{compoundName}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// Helper functions for Shimadzu LabSolutions single injection report
const getInjectionTimestamps = (dateBase?: string, injIndex: number = 0) => {
  const baseDate =
    dateBase && dateBase !== "0" && dateBase.trim() !== ""
      ? dateBase.trim()
      : "15/05/2024";

  let datePart = baseDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const [y, m, d] = baseDate.split("-");
    datePart = `${d}/${m}/${y}`;
  }

  // Realistic sequential acquisition (~25-30 min per run)
  const startHour = 9;
  const startMin = 15;
  const totalMin = startHour * 60 + startMin + injIndex * 26;
  const hour = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const sec = 12 + ((injIndex * 17) % 45);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const acquired = `${datePart} ${pad(hour)}:${pad(min)}:${pad(sec)}`;

  const procMinTotal = totalMin + 18;
  const procHour = Math.floor(procMinTotal / 60) % 24;
  const procMin = procMinTotal % 60;
  const procSec = (sec + 34) % 60;
  const processed = `${datePart} ${pad(procHour)}:${pad(procMin)}:${pad(procSec)}`;

  return { acquired, processed };
};

const getSampleType = (name?: string) => {
  const n = (name || "").toLowerCase();
  if (n.includes("blank") || n.includes("diluent")) return "Blank";
  if (n.includes("placebo")) return "Placebo";
  if (n.includes("std") || n.includes("standard")) return "Standard";
  return "Unknown";
};

const checkIsDegradation = (name?: string) => {
  const n = (name || "").toLowerCase();
  return (
    n.includes("degrad") ||
    n.includes("acid") ||
    n.includes("base") ||
    n.includes("peroxide") ||
    n.includes("thermal") ||
    n.includes("photolytic") ||
    n.includes("hydrolysis")
  );
};

export const LabSolutionsReport: React.FC<LabSolutionsReportProps> = ({
  amvSource,
  groups,
  header,
  showSummaryGrid,
  setShowSummaryGrid,
  showChromEach,
  setShowChromEach,
  scannedLook,
  setScannedLook,
  onDirectPdfDownload,
  onPrint,
  onExportExcel,
  onExportWord,
  isGeneratingPdf,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTablePages, setShowTablePages] = useState(false);

  // Group pages generation logic
  interface ReportPageData {
    type: "single-chrom-report" | "combined-2up" | "summary-grid" | "chrom-large" | "data-table";
    group: GroupData;
    injection?: InjectionData;
    injectionIndex?: number;
    injectionsChunk?: any[];
    title: string;
  }

  const pagesList: ReportPageData[] = [];

  groups.forEach((g) => {
    if (!g.injections.length) return;

    // 1. Single Graph Per Page (Authentic LabSolutions Chromatogram Report format matching uploaded image)
    if (showChromEach) {
      g.injections.forEach((inj, injIdx) => {
        pagesList.push({
          type: "single-chrom-report",
          group: g,
          injection: inj,
          injectionIndex: injIdx,
          title: `Analysis Report — ${inj.sampleName}`,
        });
      });
    }

    // 2. Summary Grid (up to 6 chromatograms per page) - optional overview
    if (showSummaryGrid) {
      for (let s = 0; s < g.injections.length; s += 6) {
        const chunk = g.injections.slice(s, s + 6);
        pagesList.push({
          type: "summary-grid",
          group: g,
          injectionsChunk: chunk,
          title: `Summary(Compound) — ${g.name}`,
        });
      }
    }

    // 3. Official LabSolutions << Detector A >> Table Page
    if (showTablePages) {
      pagesList.push({
        type: "data-table",
        group: g,
        title: `<< Detector A >> — ${g.name}`,
      });
    }
  });

  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const totalPages = Math.max(1, pagesList.length + (showValidationSummary ? 1 : 0));

  const renderDetectorATables = (g: GroupData, compact = false) => {
    const rtS = stats(g.injections.map((i) => i.rt));
    const arS = stats(g.injections.map((i) => i.area));
    const htS = stats(g.injections.map((i) => i.height));
    const tfS = stats(g.injections.map((i) => i.tailing));
    const plS = stats(g.injections.map((i) => i.plates));
    const apS = stats(g.injections.map((i) => i.areaPct));
    const resS = stats(g.injections.map((i) => num(i.resolution)));
    const rrtS = stats(g.injections.map((i) => num(i.rrt)));

    return (
      <div className={compact ? "space-y-1 mt-2" : "space-y-1.5"}>
        <div className="text-[11px] font-sans font-bold text-black mt-1">
          &lt;&lt; Detector A &gt;&gt;
        </div>
        <div className="text-[10px] font-sans text-black mb-1">
          ID#1 Compound Name: {header.compound}
        </div>

        {/* Section 1: Title Sequence Table */}
        <table className="ls-table w-full border-collapse text-[9.5px] font-sans">
          <thead>
            <tr>
              <th className="border border-black px-1.5 py-0.5 font-normal text-left">
                Title
              </th>
            </tr>
          </thead>
          <tbody>
            {g.injections.map((inj, idx) => (
              <tr key={`t-${inj.id}-${idx}`}>
                <td className="border border-black px-1.5 py-0.5 text-left font-mono">
                  {header.baseName} {inj.no}.lcd
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Average
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5 text-left font-semibold">
                %RSD
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Maximum
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Minimum
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5 text-left font-semibold">
                Standard Deviation
              </td>
            </tr>
          </tbody>
        </table>

        <div className="h-0.5" />

        {/* Section 2: Sample Name / Ret. Time (NO Sample ID!) */}
        <table className="ls-table w-full border-collapse text-[9.5px] font-sans">
          <thead>
            <tr>
              <th className="border border-black px-1.5 py-0.5 font-normal text-left">
                Sample Name
              </th>
              <th width="112" className="border border-black px-1.5 py-0.5 font-normal text-right w-28">
                Ret. Time
              </th>
            </tr>
          </thead>
          <tbody>
            {g.injections.map((inj, idx) => (
              <tr key={`sn-${inj.id}-${idx}`}>
                <td className="border border-black px-1.5 py-0.5 text-left font-sans">
                  {inj.sampleName}
                </td>
                <td className="border border-black px-1.5 py-0.5 text-right font-mono font-medium">
                  {fmt(inj.rt, 3)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5 text-right font-mono font-semibold">
                {fmt(rtS.avg, 3)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5 text-right font-mono font-semibold">
                {fmt(rtS.rsd, 3)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5 text-right font-mono font-semibold">
                {fmt(rtS.max, 3)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5 text-right font-mono font-semibold">
                {fmt(rtS.min, 3)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5 text-right font-mono font-semibold">
                {fmt(rtS.sd, 3)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="h-0.5" />

        {/* Section 3 & 4: Main Chromatographic Parameters Table + Relative Retention Time Sub-table */}
        <table className="border-0" style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
          <tbody className="border-0">
            <tr className="border-0">
              <td className="border-0" style={{ padding: "0 8px 0 0", border: "none", verticalAlign: "top" }}>
                <table className="ls-table w-full border-collapse text-[9.5px] font-sans">
                  <thead>
                    <tr>
                      <th className="border border-black px-1 py-0.5 font-normal text-right">
                        Area
                      </th>
                      <th className="border border-black px-1 py-0.5 font-normal text-right">
                        Height
                      </th>
                      <th className="border border-black px-1 py-0.5 font-normal text-right">
                        Tailing Factor
                      </th>
                      <th className="border border-black px-1 py-0.5 font-normal text-right">
                        Theoretical Plate(USP)
                      </th>
                      <th className="border border-black px-1 py-0.5 font-normal text-right">
                        Area%
                      </th>
                      <th className="border border-black px-1 py-0.5 font-normal text-center">
                        Resolution(USP)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {g.injections.map((inj, idx) => (
                      <tr key={`m-${inj.id}-${idx}`}>
                        <td className="border border-black px-1 py-0.5 text-right">
                          {inj.area !== null ? fmt(inj.area, 0) : ""}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-right">
                          {inj.height !== null ? fmt(inj.height, 0) : ""}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-right">
                          {inj.tailing !== null ? fmt(inj.tailing, 3) : ""}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-right">
                          {inj.plates !== null ? fmt(inj.plates, 0) : ""}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-right">
                          {inj.areaPct !== null ? fmt(inj.areaPct, 3) : "100.000"}
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {inj.resolution || "--"}
                        </td>
                      </tr>
                    ))}
                    {/* 1. Average */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(arS.avg, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(htS.avg, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(tfS.avg, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(plS.avg, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {apS.avg !== null ? fmt(apS.avg, 3) : "100.000"}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center">
                        {resS.avg !== null && resS.avg > 0 ? fmt(resS.avg, 3) : "0.000"}
                      </td>
                    </tr>
                    {/* 2. %RSD */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(arS.rsd, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(htS.rsd, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(tfS.rsd, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(plS.rsd, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {apS.rsd !== null ? fmt(apS.rsd, 3) : "0.000"}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center">
                        {resS.rsd !== null && resS.rsd > 0 ? fmt(resS.rsd, 3) : "--"}
                      </td>
                    </tr>
                    {/* 3. Maximum */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(arS.max, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(htS.max, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(tfS.max, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(plS.max, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {apS.max !== null ? fmt(apS.max, 3) : "100.000"}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center">
                        {resS.max !== null && resS.max > 0 ? fmt(resS.max, 3) : "--"}
                      </td>
                    </tr>
                    {/* 4. Minimum */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(arS.min, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(htS.min, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(tfS.min, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(plS.min, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {apS.min !== null ? fmt(apS.min, 3) : "100.000"}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center">
                        {resS.min !== null && resS.min > 0 ? fmt(resS.min, 3) : "--"}
                      </td>
                    </tr>
                    {/* 5. Standard Deviation */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(arS.sd, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(htS.sd, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(tfS.sd, 3)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {fmt(plS.sd, 0)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {apS.sd !== null ? fmt(apS.sd, 3) : "0.000"}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center">
                        {resS.sd !== null && resS.sd > 0 ? fmt(resS.sd, 3) : "--"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td width="160" style={{ padding: "0 0 0 0", border: "none", verticalAlign: "top" }}>
                {/* Relative Retention Time Sub-table */}
                <table className="ls-table w-full border-collapse text-[9.5px] font-sans">
                  <thead>
                    <tr>
                      <th className="border border-black px-1 py-0.5 font-normal text-center">
                        Relative Retention Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {g.injections.map((inj, idx) => (
                      <tr key={`rrt-${inj.id}-${idx}`}>
                        <td className="border border-black px-1 py-0.5 text-center">
                          {inj.rrt || "--"}
                        </td>
                      </tr>
                    ))}
                    {/* 1. Average */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-center">
                        {rrtS.avg !== null && rrtS.avg > 0 ? fmt(rrtS.avg, 3) : "--"}
                      </td>
                    </tr>
                    {/* 2. %RSD */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-center">
                        {rrtS.rsd !== null && rrtS.rsd > 0 ? fmt(rrtS.rsd, 3) : "--"}
                      </td>
                    </tr>
                    {/* 3. Maximum */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-center">
                        {rrtS.max !== null && rrtS.max > 0 ? fmt(rrtS.max, 3) : "--"}
                      </td>
                    </tr>
                    {/* 4. Minimum */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-center">
                        {rrtS.min !== null && rrtS.min > 0 ? fmt(rrtS.min, 3) : "--"}
                      </td>
                    </tr>
                    {/* 5. Standard Deviation */}
                    <tr className="font-semibold">
                      <td className="border border-black px-1 py-0.5 text-center">
                        {rrtS.sd !== null && rrtS.sd > 0 ? fmt(rrtS.sd, 3) : "--"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Multi-Component / Degradant Integration Table (Removed per user request) */}
      </div>
    );
  };

  return (
    <div className="py-6 px-2 sm:px-4 max-w-5xl mx-auto space-y-6">
      {/* Control Toolbar */}
      <div className="no-print bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-4 text-slate-700">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showValidationSummary}
              onChange={(e) => setShowValidationSummary(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span className="font-semibold text-blue-900">ICH Q2 AMV Matrix & Graphs</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showChromEach}
              onChange={(e) => setShowChromEach(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span className="font-semibold text-blue-900">1 Graph Per Page (Format)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTablePages}
              onChange={(e) => setShowTablePages(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>Group Summary Tables</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSummaryGrid}
              onChange={(e) => setShowSummaryGrid(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>Summary(Compound) Grid</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={scannedLook}
              onChange={(e) => setScannedLook(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>Scanned Paper Look</span>
          </label>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onExportWord}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 flex items-center gap-1 font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-blue-700" />
            <span>Word (.doc)</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 flex items-center gap-1 font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={onPrint}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-300 flex items-center gap-1.5 font-bold shadow-xs transition-colors cursor-pointer"
            title="Instant 0-second vector PDF via Browser Print (Save as PDF)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>⚡ Instant PDF (0s)</span>
          </button>

          <button
            onClick={onDirectPdfDownload}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded flex items-center gap-1.5 font-semibold shadow-sm transition-colors cursor-pointer"
            title="Open PDF Export options & direct download"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Pages Container */}
      <div ref={containerRef} id="reportPagesContainer" className="space-y-6">
        {/* Render Executive Summary Page if enabled */}
        {showValidationSummary && (
          <div
            data-page-type="summary"
            className={`report-page w-full max-w-[210mm] mx-auto p-[8mm_10mm] bg-white text-black shadow-md border border-slate-300 relative select-none ${
              scannedLook ? "scanned-paper" : ""
            }`}
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              pageBreakAfter: "always",
            }}
          >
            {/* Top LabSolutions Tag */}
            <table className="w-full text-[10px] font-sans text-black mb-1 border-0" style={{ border: "none" }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", border: "none", padding: 0 }}>Method Validation Summary</td>
                  <td style={{ textAlign: "right", border: "none", padding: 0 }}></td>
                </tr>
              </tbody>
            </table>

            <div id="word-executive-summary">
              <ValidationExecutiveSummary groups={groups} header={header} />
            </div>

            {/* Page Footer */}
            <div className="absolute bottom-[6mm] left-[10mm] right-[10mm] flex justify-between items-center text-[10px] font-sans text-slate-700 border-t border-slate-300 pt-1">
              <span className="font-mono text-[9px] text-slate-500">Method Validation Summary</span>
            </div>
          </div>
        )}
        {!pagesList.length ? (
          <div
            data-page-type="empty"
            className="report-page bg-white w-full max-w-[210mm] min-h-[296mm] mx-auto p-[8mm_10mm] shadow-md border border-slate-300 font-serif relative"
          >
            <div className="text-[10px] font-sans text-slate-700">
              
            </div>
            <div className="text-center border-b-[1.5px] border-black pb-2 mb-3 mt-1">
              <div className="text-[15px] font-bold">{header.company}</div>
              {header.address && header.address.trim() !== "" && !header.address.includes("GOTA, Ahmedabad") && (
                <div className="text-[13px] font-normal">{header.address}</div>
              )}
              {(header.date && header.date !== "0" && header.date.trim() !== "") && (
                <div className="flex flex-wrap items-center justify-between text-[10.5px] font-sans text-black mt-2 pt-1 border-t border-dotted border-black px-2">
                  <div><span className="font-semibold">Date:</span> <span className="font-mono">{header.date}</span></div>
                </div>
              )}
            </div>
            <div className="py-20 text-center text-slate-400 font-sans text-xs">
              No validation groups or injections entered. Please add data in Data Entry tab or upload an AMV report.
            </div>
          </div>
        ) : (
          pagesList.map((pageData, pageIdx) => {
            const pageNum = pageIdx + 1;
            const g = pageData.group;

            if (pageData.type === "single-chrom-report" && pageData.injection) {
              return (
                <SingleLabSolutionsPage
                  key={`page-${pageIdx}`}
                  injection={pageData.injection}
                  injectionIndex={pageData.injectionIndex || 0}
                  groupName={g.name}
                  fixedSampleId={g.fixedSampleId}
                  header={header}
                  runTimeMin={amvSource?.method?.runTimeMin}
                  pageNum={pageNum}
                  totalPages={totalPages}
                  scannedLook={scannedLook}
                />
              );
            }

            if (pageData.type === "summary-grid") {
              return (
                <SummaryCompoundPage
                  key={`page-${pageIdx}`}
                  group={g}
                  header={header}
                  injections={pageData.injectionsChunk}
                  runTimeMin={amvSource?.method?.runTimeMin}
                  scannedLook={scannedLook}
                />
              );
            }

            return (
              <div
                key={`page-${pageIdx}`}
                data-page-type={pageData.type}
                data-group-id={g.id}
                className={`report-page w-full max-w-[210mm] min-h-[296mm] mx-auto p-[8mm_10mm] bg-white text-black shadow-md border border-slate-300 relative select-none ${
                  scannedLook ? "scanned-paper" : ""
                }`}
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  pageBreakAfter: "always",
                }}
              >
                {/* Company Name Header - ONLY WESTCOAST PHARMACEUTICAL WORKS .LTD */}
                <div className="text-center border-b-[1.5px] border-black pb-2 mb-3 mt-0.5">
                  <div className="text-[15.5px] font-bold tracking-tight uppercase font-serif">
                    {header.company || "WESTCOAST PHARMACEUTICAL WORKS .LTD"}
                  </div>
                </div>

                {/* PAGE TYPE 0: Combined 2-up (Top 2 Chromatograms + Bottom Detector A Tables on same page) */}
                {pageData.type === "combined-2up" && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-center font-serif text-[12.5px] font-bold mb-2">
                        Summary(Compound) — {g.name}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {(pageData.injectionsChunk || []).map((inj, injIdx) => (
                          <div key={`${inj.id}-${injIdx}`} className="bg-white">
                            <ChromatogramSvg runTimeMin={amvSource?.method?.runTimeMin}
                              injection={inj}
                              compound={header.compound}
                              detector={header.detector}
                              width={340}
                              height={165}
                              small={true}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {renderDetectorATables(g, true)}
                  </div>
                )}

                {/* PAGE TYPE 2: Large Chromatograms (3-up) */}
                {pageData.type === "chrom-large" && (
                  <div>
                    <div className="text-center font-serif text-[12.5px] font-bold mb-3">
                      Chromatogram — {g.name}
                    </div>
                    <div className="space-y-4">
                      {(pageData.injectionsChunk || []).map((inj, injIdx) => (
                        <div key={`${inj.id}-${injIdx}`} className="bg-white">
                          <ChromatogramSvg runTimeMin={amvSource?.method?.runTimeMin}
                            injection={inj}
                            compound={header.compound}
                            detector={header.detector}
                            width={640}
                            height={195}
                          />
                          <SingleInjectionTable inj={inj} compoundName={header.compound} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PAGE TYPE 3: LabSolutions << Detector A >> Table */}
                {pageData.type === "data-table" && renderDetectorATables(g, false)}

                {/* Page Footer */}
                <div className="absolute bottom-[6mm] left-[10mm] right-[10mm] flex justify-start items-center border-t border-slate-300 pt-1">
                  <span className="font-mono text-[7.5px] text-slate-500 tracking-wider">
                    DRAFT, not instrument raw data
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Traceability Page (After all) */}
        {showValidationSummary && amvSource && (
          <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-sm print:shadow-none print:m-0 relative box-border overflow-hidden p-[10mm]">
            <TraceabilityTable groups={groups} />
            <div className="absolute bottom-[6mm] left-[10mm] right-[10mm] flex justify-between items-center text-[10px] font-sans text-slate-700 border-t border-slate-300 pt-1">
              <span className="font-mono text-[9px] text-slate-500">Traceability Matrix</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
