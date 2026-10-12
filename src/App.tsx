import React, { useState, useRef } from "react";
import html2canvas from "html2canvas-pro";
import { GroupData, ReportHeader, InjectionData } from "./types";
import { Header } from "./components/Header";
import { ReportHeaderCard } from "./components/ReportHeaderCard";
import { AiExtractionCard } from "./components/AiExtractionCard";
import { GroupManager } from "./components/GroupManager";
import { GroupEditor } from "./components/GroupEditor";
import { LabSolutionsReport } from "./components/LabSolutionsReport";
import { AllValidationGraphsView } from "./components/AllValidationGraphsView";
import { RawTraceCalculatorModal } from "./components/RawTraceCalculatorModal";
import { PdfDownloadModal, PdfScopeOption } from "./components/PdfDownloadModal";
import { ExportConfirmationModal, ExportKind } from "./components/ExportConfirmationModal";
import {
  exportCSV,
  exportExcel,
  exportWord,
  generateDirectPDF,
} from "./utils/exporters";

import { processAmvSource, autoFillAllGroups } from "./utils/calculations";
import {
  DEFAULT_AMV_HEADER,
  DEFAULT_AMV_SOURCE,
  getDefaultGroups,
  TIBOLONE_ASSAY_HEADER,
  TIBOLONE_ASSAY_SOURCE,
  AMV_PRESET_LIST,
} from "./utils/defaultData";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Calculator,
  Sparkles,
  FileText,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"work" | "graphs" | "report">("work");
  const [activeGroupId, setActiveGroupId] = useState<string | null>("grp_sst");
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [confirmExportState, setConfirmExportState] = useState<{
    isOpen: boolean;
    kind: ExportKind;
    title?: string;
    action: () => void;
  }>({
    isOpen: false,
    kind: "pdf",
    action: () => {},
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    msg: string;
  }>({
    isOpen: false,
    current: 0,
    total: 0,
    msg: "",
  });

  // Flash notification state
  const [flash, setFlash] = useState<{
    msg: string;
    type: "info" | "warn" | "err";
  } | null>({
    msg: "✨ All 8 ICH Q2(R1) Validation Parameters loaded: System Suitability, Specificity, Linearity, Accuracy, Method Precision, Intermediate Precision, Robustness & Solution Stability with all chromatographic fields and graphs!",
    type: "info",
  });

  const showFlash = (msg: string, type: "info" | "warn" | "err" = "info") => {
    setFlash({ msg, type });
    if (type !== "err") {
      setTimeout(() => {
        setFlash((prev) => (prev?.msg === msg ? null : prev));
      }, 7000);
    }
  };

  // Report Header Details
  const [selectedPresetId, setSelectedPresetId] = useState<string>("tibolone_assay");
  const [header, setHeader] = useState<ReportHeader>(TIBOLONE_ASSAY_HEADER);

  // Validation Groups: Default to complete 8-parameter suite
  const [groups, setGroups] = useState<GroupData[]>(() => processAmvSource(TIBOLONE_ASSAY_SOURCE));
  const [amvSource, setAmvSource] = useState<any>(TIBOLONE_ASSAY_SOURCE);

  // Report View display toggles
  const [showSummaryGrid, setShowSummaryGrid] = useState(true);
  const [showChromEach, setShowChromEach] = useState(false);
  const [scannedLook, setScannedLook] = useState(false);

  // Preset Selector Handler
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = AMV_PRESET_LIST.find((p) => p.id === presetId);
    if (!found) return;
    setHeader(found.header);
    setAmvSource(found.source);
    const suite = processAmvSource(found.source);
    setGroups(suite);
    if (suite.length > 0) {
      setActiveGroupId(suite[0].id);
    }
    showFlash(`Loaded AMV report: ${found.name}`, "info");
  };

  // Group Handlers
  const handleAddGroup = (name?: string, kind?: string) => {
    const nextIdx = groups.length + 1;
    const groupName = name || `Validation Group ${nextIdx}`;
    
    // Check if we have pre-defined injections for this kind
    let defaultInjections: InjectionData[] = [];
    if (kind) {
      const match = false;
      if (match) {
        defaultInjections = [];
      }
    }

    const newGroup: GroupData = {
      id: "grp_" + Math.random().toString(36).substring(2, 9),
      name: groupName,
      kind: kind || undefined,
      fixedSampleId: "NPS/H/25/005",
      injections: defaultInjections,
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newGroup.id);
    showFlash(`Created new group "${newGroup.name}" with ${defaultInjections.length} injections`, "info");
  };

  const handleRemoveGroup = (id: string) => {
    const target = groups.find((g) => g.id === id);
    if (!target) return;
    if (
      window.confirm(
        `Are you sure you want to remove validation group "${target.name}"?`
      )
    ) {
      const filtered = groups.filter((g) => g.id !== id);
      setGroups(filtered);
      if (activeGroupId === id) {
        setActiveGroupId(filtered.length ? filtered[0].id : null);
      }
      showFlash(`Removed group "${target.name}"`, "info");
    }
  };

  const handleDuplicateGroup = (group: GroupData) => {
    const newGroup: GroupData = {
      ...group,
      id: "grp_" + Math.random().toString(36).substring(2, 9),
      name: `${group.name} (Copy)`,
      injections: group.injections.map((inj) => ({
        ...inj,
        id: "inj_" + Math.random().toString(36).substring(2, 9),
      })),
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newGroup.id);
    showFlash(`Duplicated group "${group.name}"`, "info");
  };

  const handleUpdateGroup = (updated: GroupData) => {
    setGroups(groups.map((g) => (g.id === updated.id ? updated : g)));
  };

  const handleAddInjectionsToActiveGroup = (injections: InjectionData[]) => {
    if (!activeGroupId) {
      const newGroup: GroupData = {
        id: "grp_" + Math.random().toString(36).substring(2, 9),
        name: "Calculated Injections",
        injections: injections,
      };
      setGroups([...groups, newGroup]);
      setActiveGroupId(newGroup.id);
    } else {
      setGroups(
        groups.map((g) =>
          g.id === activeGroupId
            ? { ...g, injections: [...g.injections, ...injections] }
            : g
        )
      );
    }
  };

  // Sample Data Loader: Loads Complete 8-Parameter AMV Suite
  const handleLoadExample = () => {
    setHeader(DEFAULT_AMV_HEADER);
    setAmvSource(DEFAULT_AMV_SOURCE);
    const suite = getDefaultGroups();
    setGroups(suite);
    if (suite.length > 0) {
      setActiveGroupId(suite[0].id);
    }
    showFlash(
      "✨ Full 8-Parameter AMV Validation Suite loaded with all data fields, statistical tables, and authentic chromatograms!",
      "info"
    );
  };

  // AI Data Extracted callback
  const handleExtractionSuccess = (extracted: any) => {
    setAmvSource(extracted);
    // Generate groups dynamically
    const newGroups = processAmvSource(extracted);
    setGroups(newGroups);
    if (newGroups.length > 0) {
      setActiveGroupId(newGroups[0].id);
    }
    
    setHeader((prev) => ({
      ...prev,
      company: extracted.headerInfo?.company || prev.company,
      reportNo: extracted.headerInfo?.reportNo || prev.reportNo,
      batchNo: extracted.headerInfo?.batchNo || prev.batchNo,
      date: extracted.headerInfo?.reportDate || prev.date,
      analyst: extracted.headerInfo?.analyst || prev.analyst,
      compound: extracted.product?.name || prev.compound,
      strength: extracted.product?.strength || prev.strength,
      detector: extracted.method?.wavelengthNm && extracted.method.wavelengthNm !== 205 ? `UV at ${extracted.method.wavelengthNm} nm` : "",
      baseName: `AMV_Report_${(extracted.product?.name || "Compound").replace(/[^a-zA-Z0-9]/g, "_")}_HPLC`,
    }));
    
    // Add validation output directly to the UI using a special top group if necessary
    // or just leave it in the report. For now just switch to report view.
    setActiveTab("report");
  };

  // Exporters
  const handleDirectPdfDownload = () => {
    setIsPdfModalOpen(true);
  };

  const handleStartDirectDownload = async (scope: PdfScopeOption) => {
    try {
      setIsGeneratingPdf(true);
      setActiveTab("report");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setPdfProgress({
        isOpen: true,
        current: 0,
        total: 1,
        msg: "Initializing report view...",
      });

      // Robust wait loop to ensure report pages are mounted and rendered in DOM
      let container: HTMLElement | null = null;
      let pages: HTMLElement[] = [];
      const startWait = Date.now();
      while (Date.now() - startWait < 4000) {
        if (abortController.signal.aborted) return;
        container = document.getElementById("reportPagesContainer");
        if (container) {
          pages = Array.from(container.querySelectorAll<HTMLElement>(".report-page"));
          if (pages.length > 0) {
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!container || !pages.length) {
        throw new Error(
          "Report pages are not ready. Please make sure you are on the 'Report View' tab and try again."
        );
      }

      // Filter pages by chosen scope
      let selectedIndices: number[] | undefined = undefined;
      if (scope === "summary") {
        const summaryIndices = pages
          .map((p, idx) => (p.getAttribute("data-page-type") === "summary" ? idx : -1))
          .filter((idx) => idx !== -1);
        selectedIndices = summaryIndices.length > 0 ? summaryIndices : [0];
      } else if (scope === "current_group") {
        const groupIndices = pages
          .map((p, idx) => (p.getAttribute("data-group-id") === activeGroupId ? idx : -1))
          .filter((idx) => idx !== -1);
        selectedIndices = groupIndices.length > 0 ? groupIndices : [0, 1];
      }

      const pagesToRenderCount = selectedIndices ? selectedIndices.length : pages.length;

      setPdfProgress({
        isOpen: true,
        current: 0,
        total: pagesToRenderCount,
        msg: `Fast-rendering ${pagesToRenderCount} pages...`,
      });

      const safeCompoundName = (header?.compound || "Sample").replace(/[\s/\\-]+/g, "_");
      const currentGroupName = groups.find((g) => g.id === activeGroupId)?.name || "Section";
      const scopeSuffix =
        scope === "summary"
          ? "_Summary"
          : scope === "current_group"
          ? `_${currentGroupName.slice(0, 15).replace(/[\s/\\-]+/g, "_")}`
          : "_Full";
      const filename = `AMV_Report_${safeCompoundName}${scopeSuffix}_HPLC.pdf`;

      await generateDirectPDF(
        container,
        filename,
        (msg, current, total) => {
          setPdfProgress((prev) => ({
            isOpen: true,
            current: current ?? prev.current,
            total: total ?? prev.total,
            msg,
          }));
        },
        {
          pageIndices: selectedIndices,
          scale: 1.0,
          concurrency: 5,
          signal: abortController.signal,
        }
      );

      showFlash(`✅ Fast PDF downloaded successfully: ${filename}`, "info");
      setIsPdfModalOpen(false);
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        showFlash("PDF generation cancelled.", "warn");
      } else {
        console.error("PDF generation failed:", err);
        showFlash(`PDF generation error: ${err.message || "Failed to export PDF"}`, "err");
      }
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => {
        setPdfProgress({ isOpen: false, current: 0, total: 0, msg: "" });
      }, 300);
    }
  };

  const handleCancelPdfGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGeneratingPdf(false);
    setPdfProgress({ isOpen: false, current: 0, total: 0, msg: "" });
  };

  const executePrint = () => {
    setActiveTab("report");
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrint = () => {
    setConfirmExportState({
      isOpen: true,
      kind: "print",
      title: "Print / Save as PDF (Instant)",
      action: executePrint,
    });
  };

  const executeExportExcel = () => {
    exportExcel(groups, header);
    showFlash("Excel (.xlsx) workbook downloaded with all validation tables & stats.", "info");
  };

  const handleExportExcel = () => {
    setConfirmExportState({
      isOpen: true,
      kind: "excel",
      title: "Export to Microsoft Excel (.xlsx)",
      action: executeExportExcel,
    });
  };

  const executeExportWord = async () => {
    setIsExportingWord(true);
    try {
      showFlash("Preparing Word document... Converting graphs to images, please wait.", "info");
      setActiveTab("report");

      let container = document.getElementById("reportPagesContainer");
      if (!container) {
        const startWait = Date.now();
        while (Date.now() - startWait < 4000) {
          container = document.getElementById("reportPagesContainer");
          if (container && container.innerHTML.trim().length > 0) {
            break;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (!container) {
        showFlash("Error: Report pages are not ready.", "err");
        setIsExportingWord(false);
        return;
      }

      // Allow DOM/images to settle before canvas rendering
      await new Promise((r) => setTimeout(r, 500));

      const clone = container.cloneNode(true) as HTMLElement;
      
      // Convert remaining individual SVGs (like chromatograms in the classic report pages)
      
      const originalSvgs = Array.from(container.querySelectorAll("svg"));
      const clonedSvgs = Array.from(clone.querySelectorAll("svg"));

      for (let i = 0; i < originalSvgs.length; i++) {
        const origSvg = originalSvgs[i];
        const cloneSvg = clonedSvgs[i];
        
        // Skip SVGs that were inside the dashboards we already removed
        if (!clone.contains(cloneSvg)) continue;
        
        try {
            // Use native SVG to PNG via XMLSerializer and HTML5 Canvas (faster, no iframe issues)
            const svgString = new XMLSerializer().serializeToString(origSvg);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            
            const imgData = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                const scale = 2; // High-res retina scale
                const w = origSvg.clientWidth || origSvg.getBoundingClientRect().width || 600;
                const h = origSvg.clientHeight || origSvg.getBoundingClientRect().height || 300;
                
                canvas.width = w * scale;
                canvas.height = h * scale;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.scale(scale, scale);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
                }
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/png"));
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load SVG for conversion"));
              };
              img.src = url;
            });
            
            const newImg = document.createElement("img");
            newImg.src = imgData;
            newImg.width = origSvg.clientWidth || origSvg.getBoundingClientRect().width || 600;
            newImg.height = origSvg.clientHeight || origSvg.getBoundingClientRect().height || 300;
            newImg.style.maxWidth = "100%";
            newImg.style.display = "inline-block";
            newImg.style.verticalAlign = "middle";
            
            if (cloneSvg && cloneSvg.parentNode) {
                cloneSvg.parentNode.replaceChild(newImg, cloneSvg);
            }
        } catch (e) {
          console.warn("Failed to convert SVG to image for Word export", e);
        }
      }

      const html = clone.innerHTML;
      exportWord(html, header.compound);
      showFlash("Word (.doc) document downloaded — fully editable in Microsoft Word with all graphs included.", "info");
    } catch (err) {
      console.error(err);
      showFlash("Failed to generate Word document.", "err");
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleExportWord = () => {
    setConfirmExportState({
      isOpen: true,
      kind: "word",
      title: "Export to Microsoft Word (.doc)",
      action: executeExportWord,
    });
  };

  const handleAutoFillAll = () => {
    const filled = autoFillAllGroups(groups);
    setGroups(filled);
    showFlash(
      "✨ AI & Chromatographic Engine successfully filled all missing fields (RT, Area, Height, Tailing, Plates, Area%, Resolution, RRT) across all validation groups!",
      "info"
    );
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;
  const totalInjections = groups.reduce(
    (acc, g) => acc + g.injections.length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLoadExample={handleLoadExample}
        onAutoFillAll={handleAutoFillAll}
        onOpenUpload={() => {
          setActiveTab("work");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenRawTrace={() => setIsRawModalOpen(true)}
        onPrint={handlePrint}
        onExportExcel={handleExportExcel}
        onExportWord={handleExportWord}
        onDirectPdfDownload={handleDirectPdfDownload}
        isGeneratingPdf={isGeneratingPdf}
        totalInjections={totalInjections}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
      />

      {/* Global Notification Banner */}
      {flash && (
        <div
          className={`no-print px-4 py-2 text-xs flex items-center justify-between transition-all ${
            flash.type === "err"
              ? "bg-red-50 text-red-800 border-b border-red-200"
              : flash.type === "warn"
              ? "bg-amber-50 text-amber-800 border-b border-amber-200"
              : "bg-blue-50 text-blue-900 border-b border-blue-200"
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            {flash.type === "err" ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : flash.type === "warn" ? (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <span className="font-medium">{flash.msg}</span>
          </div>
          <button
            onClick={() => setFlash(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main App Content */}
      <main className="flex-1">
        {activeTab === "work" ? (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Top Row: AI Auto Extractor Banner */}
            <AiExtractionCard
              onExtractionSuccess={handleExtractionSuccess}
              onFlash={showFlash}
              onDirectPdfDownload={handleDirectPdfDownload}
            />

            {/* 2-Column Work Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Batch Metadata & Group Manager */}
              <div className="lg:col-span-4 space-y-4">
                <ReportHeaderCard header={header} onChange={setHeader} />

                <GroupManager
                  groups={groups}
                  activeGroupId={activeGroupId}
                  onSelectGroup={setActiveGroupId}
                  onAddGroup={handleAddGroup}
                  onRemoveGroup={handleRemoveGroup}
                  onDuplicateGroup={handleDuplicateGroup}
                  onLoadFullSuite={handleLoadExample}
                />

                {/* Raw Trace Modal Trigger */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Raw Signal Calculator
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Calculate RT, Area, Height from Time vs mV
                    </span>
                  </div>
                  <button
                    onClick={() => setIsRawModalOpen(true)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 font-medium flex items-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    Open Tool
                  </button>
                </div>
              </div>

              {/* Right Column: Spreadsheet Group Editor */}
              <div className="lg:col-span-8">
                <GroupEditor
                  group={activeGroup}
                  compound={header.compound}
                  detector={header.detector}
                  runTimeMin={amvSource?.method?.runTimeMin || 30}
                  onUpdateGroup={handleUpdateGroup}
                  onFlash={showFlash}
                />
              </div>
            </div>
          </div>
        ) : activeTab === "graphs" ? (
          /* All 8 Validation Parameters Graphs & Multi-Chromatograms View */
          <AllValidationGraphsView
            groups={groups}
            header={header}
            amvSource={amvSource}
            onSelectGroup={(groupId) => {
              setActiveGroupId(groupId);
              setActiveTab("work");
            }}
            onNavigateToReport={() => setActiveTab("report")}
            onPrint={handlePrint}
          />
        ) : (
          /* Report View Tab: Authentic Multi-page LabSolutions Layout */
          <LabSolutionsReport amvSource={amvSource}
            groups={groups}
            header={header}
            showSummaryGrid={showSummaryGrid}
            setShowSummaryGrid={setShowSummaryGrid}
            showChromEach={showChromEach}
            setShowChromEach={setShowChromEach}
            scannedLook={scannedLook}
            setScannedLook={setScannedLook}
            onDirectPdfDownload={handleDirectPdfDownload}
            onPrint={handlePrint}
            onExportExcel={handleExportExcel}
            onExportWord={handleExportWord}
            isGeneratingPdf={isGeneratingPdf}
          />
        )}
      </main>

      {/* Raw Trace Signal Calculator Modal */}
      <RawTraceCalculatorModal
        isOpen={isRawModalOpen}
        onClose={() => setIsRawModalOpen(false)}
        activeGroup={activeGroup}
        onAddInjectionsToGroup={handleAddInjectionsToActiveGroup}
        onFlash={showFlash}
      />

      {/* PDF Export Options & Fast Progress Modal */}
      <PdfDownloadModal
        isOpen={isPdfModalOpen || pdfProgress.isOpen}
        onClose={() => {
          if (!isGeneratingPdf) setIsPdfModalOpen(false);
        }}
        onInstantPrint={executePrint}
        onStartDirectDownload={handleStartDirectDownload}
        onCancelGeneration={handleCancelPdfGeneration}
        isGenerating={isGeneratingPdf}
        progress={pdfProgress}
        groups={groups}
        header={header}
        activeGroupId={activeGroupId}
        totalPagesEstimate={groups.reduce((acc, g) => {
          if (!g.injections.length) return acc;
          const singlePages = showChromEach ? g.injections.length : 0;
          const gridPages = showSummaryGrid ? Math.ceil(g.injections.length / 6) : 0;
          const tablePages = 1;
          return acc + singlePages + gridPages + tablePages;
        }, 1)}
      />

      {/* Universal Pre-Export Compliance Confirmation Modal (Standard Software Clean Micro Modal) */}
      <ExportConfirmationModal
        isOpen={confirmExportState.isOpen}
        onClose={() =>
          setConfirmExportState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={() => {
          const act = confirmExportState.action;
          setConfirmExportState((prev) => ({ ...prev, isOpen: false }));
          act();
        }}
        exportKind={confirmExportState.kind}
        targetTitle={confirmExportState.title}
      />

      {/* Word Document Generation Overlay */}
      {isExportingWord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Generating Word Document</h3>
            <p className="text-sm text-slate-500 mb-4">
              Converting graphs to high-resolution images and formatting tables...
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full w-full animate-[pulse_1.5s_ease-in-out_infinite] origin-left"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
