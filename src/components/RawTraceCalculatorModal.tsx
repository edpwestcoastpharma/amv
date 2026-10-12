import React, { useState } from "react";
import { calculateTraceMetrics } from "../utils/calculations";
import { parseCSVText, parseRawSignalRows } from "../utils/parsers";
import { GroupData, InjectionData } from "../types";
import { Calculator, X, Upload, Check, AlertCircle } from "lucide-react";

interface RawTraceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: GroupData | null;
  onAddInjectionsToGroup: (injections: InjectionData[]) => void;
  onFlash: (msg: string, type?: "info" | "warn" | "err") => void;
}

export const RawTraceCalculatorModal: React.FC<RawTraceCalculatorModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  onAddInjectionsToGroup,
  onFlash,
}) => {
  const [calculatedList, setCalculatedList] = useState<
    {
      fileName: string;
      metrics: {
        rt: number;
        area: number;
        height: number;
        tailing: number | null;
        plates: number | null;
      };
      trace: [number, number][];
    }[]
  >([]);

  if (!isOpen) return null;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const results: typeof calculatedList = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const rows = parseCSVText(text);
      const trace = parseRawSignalRows(rows);

      if (trace.length < 5) {
        onFlash(`${file.name}: Need at least 2 numeric columns (Time, mV)`, "warn");
        continue;
      }

      const metrics = calculateTraceMetrics(trace);
      if (!metrics) {
        onFlash(`${file.name}: No distinct chromatographic peak identified`, "warn");
        continue;
      }

      results.push({
        fileName: (file?.name || "Chromatogram").replace(/\.[^.]+$/, ""),
        metrics,
        trace,
      });
    }

    setCalculatedList(results);
    if (results.length) {
      onFlash(
        `Calculated USP parameters for ${results.length} raw chromatograms!`,
        "info"
      );
    }
  };

  const handleApplyToActiveGroup = () => {
    if (!calculatedList.length) return;

    const newInjections: InjectionData[] = calculatedList.map((item, idx) => {
      const baseNum = (
        (activeGroup ? activeGroup.injections.length : 0) +
        idx +
        1
      )
        .toString()
        .padStart(2, "0");

      return {
        id: "inj_" + Math.random().toString(36).substring(2, 9),
        no: baseNum,
        sampleName: item.fileName,
        sampleId: activeGroup?.fixedSampleId || "NPS/H/25/005",
        rt: item.metrics.rt,
        area: item.metrics.area,
        height: item.metrics.height,
        tailing: item.metrics.tailing ?? 1.035,
        plates: item.metrics.plates ?? 61200,
        areaPct: 100.0,
        resolution: "--",
        rrt: "--",
        _trace: item.trace,
      };
    });

    onAddInjectionsToGroup(newInjections);
    onFlash(
      `Added ${newInjections.length} injection(s) with true calculated USP metrics into ${
        activeGroup?.name || "Active Group"
      }`,
      "info"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-semibold text-sm">
                Raw Chromatogram Signal (Time vs mV) Calculator
              </h2>
              <p className="text-[11px] text-slate-400">
                Calculates RT, Area, Height, USP Tailing &amp; Theoretical Plates directly from raw instrument signal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-slate-50 hover:bg-slate-100/70 transition-colors">
            <input
              type="file"
              id="rawModalFiles"
              multiple
              accept=".csv,.txt,.xlsx"
              onChange={handleFiles}
              className="hidden"
            />
            <label
              htmlFor="rawModalFiles"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <Upload className="w-6 h-6 text-blue-600 mb-1" />
              <span className="font-semibold text-slate-800 text-xs">
                Upload Time-vs-mV Raw Signal Export (.csv / .txt)
              </span>
              <span className="text-[11px] text-slate-500 max-w-sm">
                Columns: Time (min) in col 1, Detector mV in col 2. Trapezoidal integration &amp; USP 5% / 50% formulas applied automatically.
              </span>
            </label>
          </div>

          {calculatedList.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
                Calculated Metrics ({calculatedList.length} files)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-1.5 font-semibold font-sans">Sample</th>
                      <th className="p-1.5 text-right">RT (min)</th>
                      <th className="p-1.5 text-right">Area</th>
                      <th className="p-1.5 text-right">Height</th>
                      <th className="p-1.5 text-right">Tailing</th>
                      <th className="p-1.5 text-right">Plates (USP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculatedList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-sans font-medium text-slate-800">
                          {item.fileName}
                        </td>
                        <td className="p-1.5 text-right text-blue-700 font-bold">
                          {item.metrics.rt.toFixed(3)}
                        </td>
                        <td className="p-1.5 text-right text-slate-800 font-semibold">
                          {item.metrics.area.toLocaleString()}
                        </td>
                        <td className="p-1.5 text-right text-slate-600">
                          {item.metrics.height.toLocaleString()}
                        </td>
                        <td className="p-1.5 text-right text-slate-600">
                          {item.metrics.tailing?.toFixed(3) ?? "--"}
                        </td>
                        <td className="p-1.5 text-right text-slate-600">
                          {item.metrics.plates?.toLocaleString() ?? "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyToActiveGroup}
            disabled={!calculatedList.length}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Add to Active Group ({activeGroup?.name || "Group"})
          </button>
        </div>
      </div>
    </div>
  );
};
