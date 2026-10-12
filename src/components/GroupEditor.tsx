import React, { useState } from "react";
import { GroupData, InjectionData } from "../types";
import {
  num,
  fmt,
  stats,
  calculateRRT,
  calculateResolution,
  peakHeight,
} from "../utils/calculations";
import { parseQuickPaste } from "../utils/parsers";
import { ChromatogramSvg } from "./ChromatogramSvg";
import {
  Plus,
  Trash2,
  Copy,
  Clipboard,
  CheckCircle,
  AlertTriangle,
  Activity,
  Table as TableIcon,
} from "lucide-react";

interface GroupEditorProps {
  group: GroupData | null;
  compound: string;
  detector: string;
  runTimeMin?: number;
  onUpdateGroup: (updated: GroupData) => void;
  onFlash: (msg: string, type?: "info" | "warn" | "err") => void;
}

export const GroupEditor: React.FC<GroupEditorProps> = ({
  group,
  compound,
  detector,
  runTimeMin = 30,
  onUpdateGroup,
  onFlash,
}) => {
  const [pasteText, setPasteText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [showTopGraph, setShowTopGraph] = useState(true);
  const [selectedInjIndex, setSelectedInjIndex] = useState<number>(0);
  const [graphMode, setGraphMode] = useState<"single" | "all-grid" | "overlay">("all-grid");

  if (!group) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center text-slate-400">
        <TableIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <h3 className="text-sm font-semibold text-slate-600">No Group Selected</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select an existing validation group from the left panel or click "+ Add Group".
        </p>
      </div>
    );
  }

  const handleUpdateField = (field: keyof GroupData, val: any) => {
    onUpdateGroup({ ...group, [field]: val });
  };

  const handleUpdateInjection = (
    index: number,
    field: keyof InjectionData,
    val: any
  ) => {
    const nextInjections = [...group.injections];
    const target = { ...nextInjections[index] };

    if (
      ["rt", "area", "height", "tailing", "plates", "areaPct"].includes(field)
    ) {
      (target as any)[field] = num(val);
    } else {
      (target as any)[field] = val;
    }

    // Auto-calculate height if area, rt, or plates change and height was not manually overridden
    if (["area", "rt", "plates"].includes(field) && target.area && target.rt && target.plates) {
      target.height = Math.round(peakHeight(target.area, target.rt, target.plates));
    }

    // Invalidate trace so it regenerates dynamically
    target._trace = undefined;

    nextInjections[index] = target;
    onUpdateGroup({ ...group, injections: nextInjections });
  };

  const handleAddBlankRow = () => {
    const nextNo = (group.injections.length + 1).toString().padStart(2, "0");
    const newInj: InjectionData = {
      id: "inj_" + Math.random().toString(36).substring(2, 9),
      no: nextNo,
      sampleName: `${group.name} ${nextNo}`,
      sampleId: group.fixedSampleId || "NPS/H/25/005",
      rt: 13.958,
      area: 52450,
      height: 6415,
      tailing: 1.035,
      plates: 61200,
      areaPct: 100.0,
      resolution: "--",
      rrt: "--",
    };
    onUpdateGroup({
      ...group,
      injections: [...group.injections, newInj],
    });
    setSelectedInjIndex(group.injections.length);
  };

  const handleDeleteRow = (index: number) => {
    const nextInjections = group.injections.filter((_, i) => i !== index);
    // re-index numbering
    const renumbered = nextInjections.map((inj, i) => ({
      ...inj,
      no: (i + 1).toString().padStart(2, "0"),
    }));
    onUpdateGroup({ ...group, injections: renumbered });
    if (selectedInjIndex >= renumbered.length) {
      setSelectedInjIndex(Math.max(0, renumbered.length - 1));
    }
  };

  const handleDuplicateRow = (index: number) => {
    const src = group.injections[index];
    const newInj: InjectionData = {
      ...src,
      id: "inj_" + Math.random().toString(36).substring(2, 9),
      no: (group.injections.length + 1).toString().padStart(2, "0"),
      sampleName: `${src.sampleName} (Copy)`,
    };
    onUpdateGroup({
      ...group,
      injections: [...group.injections, newInj],
    });
  };

  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parseQuickPaste(pasteText, group.fixedSampleId || "");
    if (!parsed.length) {
      onFlash("Could not recognize tabular peak data in pasted text", "warn");
      return;
    }
    onUpdateGroup({
      ...group,
      injections: [...group.injections, ...parsed],
    });
    setPasteText("");
    setShowPasteBox(false);
    onFlash(`Added ${parsed.length} injection row(s) from clipboard`, "info");
  };

  // Group Stats Calculations
  const rtStats = stats(group.injections.map((i) => i.rt));
  const areaStats = stats(group.injections.map((i) => i.area));
  const heightStats = stats(group.injections.map((i) => i.height));
  const tailingStats = stats(group.injections.map((i) => i.tailing));
  const platesStats = stats(group.injections.map((i) => i.plates));

  const activeInjection =
    group.injections[selectedInjIndex] || group.injections[0] || null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col space-y-4 p-4">
      {/* Header bar of Group */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex-1 min-w-[200px] grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Group Title / Section
            </label>
            <input
              type="text"
              value={group.name}
              onChange={(e) => handleUpdateField("name", e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Default Sample ID (Auto-fill)
            </label>
            <input
              type="text"
              value={group.fixedSampleId || ""}
              onChange={(e) =>
                handleUpdateField("fixedSampleId", e.target.value)
              }
              placeholder="e.g. NPS/H/25/005"
              className="w-full px-2.5 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasteBox(!showPasteBox)}
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 flex items-center gap-1 transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5" />
            {showPasteBox ? "Hide Paste Box" : "Paste from Excel/Table"}
          </button>
          <button
            onClick={() => setShowTopGraph(!showTopGraph)}
            className={`px-2.5 py-1 text-xs font-medium rounded border flex items-center gap-1 transition-colors ${
              showTopGraph
                ? "bg-blue-50 text-blue-700 border-blue-300 font-semibold"
                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
            title="Toggle Live Chromatogram preview at top of table"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>{showTopGraph ? "Hide Live Graph" : "Show Live Graph"}</span>
          </button>
          <button
            onClick={handleAddBlankRow}
            className="px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>
      </div>

      {/* Paste Box Area */}
      {showPasteBox && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Clipboard className="w-3.5 h-3.5 text-blue-600" />
              Paste Rows Directly from Excel or Data Sheet
            </span>
            <span className="text-[10px] text-slate-500">
              Columns: Sample Name, RT, Area, Height, Tailing, Plates
            </span>
          </div>
          <textarea
            rows={3}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Standard solution 01	13.958	52568	6413	1.038	60935&#10;Standard solution 02	13.958	52411	6413	1.051	61250"
            className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPasteBox(false)}
              className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyPaste}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm"
            >
              Add Pasted Injections
            </button>
          </div>
        </div>
      )}

      {/* Live Active Chromatogram Preview Bar (Above Table) */}
      {showTopGraph && activeInjection && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse inline-block" />
                Live Peak Graph: Row #{activeInjection.no} — {activeInjection.sampleName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                (Click any row below to view its chromatogram)
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-700">
              <span>RT: <strong className="text-blue-700">{fmt(activeInjection.rt, 3)} min</strong></span>
              <span>Area: <strong className="text-emerald-700">{fmt(activeInjection.area, 0)}</strong></span>
              <span>Height: <strong>{fmt(activeInjection.height, 0)}</strong></span>
              <span>Tf: <strong>{fmt(activeInjection.tailing, 2)}</strong></span>
              <span>N: <strong>{fmt(activeInjection.plates, 0)}</strong></span>
            </div>
          </div>
          <div className="max-w-xl mx-auto border border-slate-300 rounded shadow-inner bg-white p-1">
            <ChromatogramSvg
              injection={activeInjection}
              compound={compound}
              detector={detector}
              runTimeMin={runTimeMin}
              width={540}
              height={145}
              small={true}
              boxBorder={true}
            />
          </div>
        </div>
      )}

      {/* Main Injections Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-300 rounded-lg">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px]">
              <th className="py-2 px-1.5 text-center w-10">No.</th>
              <th className="py-2 px-2 min-w-[160px]">Sample Name</th>
              <th className="py-2 px-2 text-right w-20">Ret. Time (min)</th>
              <th className="py-2 px-2 text-right w-20">Area</th>
              <th className="py-2 px-2 text-right w-18">Height</th>
              <th className="py-2 px-2 text-right w-18">Tailing Factor</th>
              <th className="py-2 px-2 text-right w-24">Theoretical Plate</th>
              <th className="py-2 px-2 text-right w-16">Area%</th>
              <th className="py-2 px-1.5 text-center w-14">Resolution</th>
              <th className="py-2 px-1.5 text-center w-14">RRT</th>
              <th className="py-2 px-1.5 text-center w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {group.injections.map((inj, idx) => {
              const isSelected = idx === selectedInjIndex;
              return (
                <tr
                  key={inj.id}
                  onClick={() => setSelectedInjIndex(idx)}
                  className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50/80 font-medium" : "bg-white"
                  }`}
                >
                  <td className="py-1 px-1 text-center">
                    <input
                      type="text"
                      value={inj.no}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "no", e.target.value)
                      }
                      className="w-8 text-center bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-0.5 py-0.5"
                    />
                  </td>
                  <td className="py-1 px-1 font-sans">
                    <input
                      type="text"
                      value={inj.sampleName}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "sampleName", e.target.value)
                      }
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={inj.rt !== null ? inj.rt : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "rt", e.target.value)
                      }
                      className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-blue-900 font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      value={inj.area !== null ? inj.area : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "area", e.target.value)
                      }
                      className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-slate-900 font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      value={inj.height !== null ? inj.height : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "height", e.target.value)
                      }
                      className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-slate-700"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={inj.tailing !== null ? inj.tailing : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "tailing", e.target.value)
                      }
                      className={`w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 ${
                        inj.tailing !== null && (inj.tailing < 0.8 || inj.tailing > 1.5)
                          ? "text-amber-700 font-bold"
                          : "text-slate-700"
                      }`}
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      value={inj.plates !== null ? inj.plates : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "plates", e.target.value)
                      }
                      className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-slate-700"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={inj.areaPct !== null ? inj.areaPct : ""}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "areaPct", e.target.value)
                      }
                      className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1 px-1 text-center">
                    <input
                      type="text"
                      value={inj.resolution || "--"}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "resolution", e.target.value)
                      }
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-slate-600"
                    />
                  </td>
                  <td className="py-1 px-1 text-center">
                    <input
                      type="text"
                      value={inj.rrt || "--"}
                      onChange={(e) =>
                        handleUpdateInjection(idx, "rrt", e.target.value)
                      }
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 text-slate-600"
                    />
                  </td>
                  <td className="py-1 px-1 text-center font-sans">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isCurrentlyNoPeak = inj.isNoPeak || (inj.area !== null && inj.area <= 0);
                          const nextInjections = [...group.injections];
                          if (isCurrentlyNoPeak) {
                            const baselineInj = group.injections.find(i => i.rt && i.rt > 0 && i.area && i.area > 0);
                            const restoredRt = baselineInj?.rt || 4.810;
                            const restoredArea = baselineInj?.area || 1000000;
                            const restoredPlates = baselineInj?.plates || 60000;
                            const restoredTailing = baselineInj?.tailing || 1.120;
                            const restoredHeight = Math.round(peakHeight(restoredArea, restoredRt, restoredPlates));

                            nextInjections[idx] = {
                              ...inj,
                              isNoPeak: false,
                              rt: restoredRt,
                              area: restoredArea,
                              height: restoredHeight,
                              tailing: restoredTailing,
                              plates: restoredPlates,
                              areaPct: 100.0,
                            };
                            onUpdateGroup({ ...group, injections: nextInjections });
                            onFlash(`Restored peak for #${inj.no}`, "info");
                          } else {
                            nextInjections[idx] = {
                              ...inj,
                              isNoPeak: true,
                              rt: null,
                              area: 0,
                              height: 0,
                              tailing: null,
                              plates: null,
                              areaPct: 0,
                            };
                            onUpdateGroup({ ...group, injections: nextInjections });
                            onFlash(`Set #${inj.no} as No Peak (Blank baseline)`, "info");
                          }
                        }}
                        title={inj.isNoPeak || inj.area === 0 ? "Click to restore normal peak" : "Click to set as No Peak (Blank baseline)"}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                          inj.isNoPeak || inj.area === 0
                            ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {inj.isNoPeak || inj.area === 0 ? "No Peak" : "Peak"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateRow(idx);
                        }}
                        title="Duplicate row"
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(idx);
                        }}
                        title="Delete row"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Statistics Rows */}
            <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800">
              <td colSpan={2} className="py-1.5 px-3 font-sans">
                Average (Mean)
              </td>
              <td className="py-1.5 px-2 text-right">{fmt(rtStats.avg, 3)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(areaStats.avg, 0)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(heightStats.avg, 0)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(tailingStats.avg, 3)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(platesStats.avg, 0)}</td>
              <td className="py-1.5 px-2 text-right">0.000</td>
              <td className="py-1.5 px-1.5 text-center">0.000</td>
              <td className="py-1.5 px-1.5 text-center">--</td>
              <td></td>
            </tr>

            <tr className="bg-slate-50 font-bold text-slate-800">
              <td colSpan={2} className="py-1.5 px-3 font-sans">
                % RSD (Relative Std Dev)
              </td>
              <td
                className={`py-1.5 px-2 text-right ${
                  rtStats.rsd !== null && rtStats.rsd > 1.0
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {fmt(rtStats.rsd, 3)}
              </td>
              <td
                className={`py-1.5 px-2 text-right ${
                  areaStats.rsd !== null && areaStats.rsd > 2.0
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {fmt(areaStats.rsd, 3)}
              </td>
              <td className="py-1.5 px-2 text-right">{fmt(heightStats.rsd, 3)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(tailingStats.rsd, 3)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(platesStats.rsd, 3)}</td>
              <td className="py-1.5 px-2 text-right">--</td>
              <td className="py-1.5 px-1.5 text-center">--</td>
              <td className="py-1.5 px-1.5 text-center">--</td>
              <td></td>
            </tr>

            <tr className="bg-white text-slate-600">
              <td colSpan={2} className="py-1 px-3 font-sans">
                Maximum
              </td>
              <td className="py-1 px-2 text-right">{fmt(rtStats.max, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(areaStats.max, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(heightStats.max, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(tailingStats.max, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(platesStats.max, 0)}</td>
              <td className="py-1 px-2 text-right">100.000</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td></td>
            </tr>

            <tr className="bg-white text-slate-600">
              <td colSpan={2} className="py-1 px-3 font-sans">
                Minimum
              </td>
              <td className="py-1 px-2 text-right">{fmt(rtStats.min, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(areaStats.min, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(heightStats.min, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(tailingStats.min, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(platesStats.min, 0)}</td>
              <td className="py-1 px-2 text-right">100.000</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td></td>
            </tr>

            <tr className="bg-slate-50 text-slate-600">
              <td colSpan={2} className="py-1 px-3 font-sans">
                Standard Deviation (SD)
              </td>
              <td className="py-1 px-2 text-right">{fmt(rtStats.sd, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(areaStats.sd, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(heightStats.sd, 0)}</td>
              <td className="py-1 px-2 text-right">{fmt(tailingStats.sd, 3)}</td>
              <td className="py-1 px-2 text-right">{fmt(platesStats.sd, 0)}</td>
              <td className="py-1 px-2 text-right">0.000</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td className="py-1 px-1.5 text-center">--</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Live Chromatogram Section with Mode Switcher */}
      {group.injections.length > 0 && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-xs text-slate-800">
                Chromatographic Graphs ({group.injections.length} injections)
              </span>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setGraphMode("all-grid")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  graphMode === "all-grid"
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 All Chromatograms ({group.injections.length})
              </button>
              <button
                type="button"
                onClick={() => setGraphMode("single")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  graphMode === "single"
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📈 Active Row (#{activeInjection?.no || "01"})
              </button>
              <button
                type="button"
                onClick={() => setGraphMode("overlay")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  graphMode === "overlay"
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌈 Overlay Graph
              </button>
            </div>
          </div>

          {/* MODE 1: SINGLE ACTIVE CHROMATOGRAM */}
          {graphMode === "single" && activeInjection && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 mb-2">
                <span>
                  Selected: <strong>#{activeInjection.no} — {activeInjection.sampleName}</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span>RT: <strong>{fmt(activeInjection.rt, 3)} min</strong></span>
                  <span>Area: <strong>{fmt(activeInjection.area, 0)}</strong></span>
                  <span>Tailing: <strong>{fmt(activeInjection.tailing, 3)}</strong></span>
                  <span>Plates: <strong>{fmt(activeInjection.plates, 0)}</strong></span>
                </div>
              </div>
              <div className="max-w-2xl mx-auto border border-slate-300 rounded shadow-inner bg-white p-2">
                <ChromatogramSvg
                  injection={activeInjection}
                  compound={compound}
                  detector={detector}
                  runTimeMin={runTimeMin}
                  width={600}
                  height={190}
                />
              </div>
            </div>
          )}

          {/* MODE 2: ALL CHROMATOGRAMS GRID */}
          {graphMode === "all-grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.injections.map((inj, idx) => (
                <div
                  key={inj.id}
                  onClick={() => setSelectedInjIndex(idx)}
                  className={`border rounded p-2 bg-white cursor-pointer transition-all ${
                    selectedInjIndex === idx
                      ? "border-blue-500 ring-2 ring-blue-400/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-800 mb-1 truncate">
                    <span>#{inj.no} {inj.sampleName}</span>
                    <span className="text-[10px] text-slate-500 font-normal">RT: {fmt(inj.rt, 3)}m</span>
                  </div>
                  <div className="border border-slate-100 rounded overflow-hidden">
                    <ChromatogramSvg
                      injection={inj}
                      compound={compound}
                      detector={detector}
                      runTimeMin={runTimeMin}
                      width={320}
                      height={140}
                      small={true}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9.5px] font-mono text-slate-600 mt-1 text-center">
                    <div>Area: <strong>{fmt(inj.area, 0)}</strong></div>
                    <div>Tf: <strong>{fmt(inj.tailing, 2)}</strong></div>
                    <div>N: <strong>{fmt(inj.plates, 0)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODE 3: OVERLAY GRAPH */}
          {graphMode === "overlay" && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {group.injections.map((inj, i) => {
                  const colors = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#38bdf8", "#f87171"];
                  const c = colors[i % colors.length];
                  return (
                    <span key={inj.id} className="flex items-center gap-1 font-mono text-[11px]" style={{ color: c }}>
                      <span className="w-2.5 h-1 inline-block rounded" style={{ backgroundColor: c }} />
                      #{inj.no} {inj.sampleName}
                    </span>
                  );
                })}
              </div>

              <div className="w-full h-52 bg-slate-900 border border-slate-800 rounded p-2">
                <svg className="w-full h-full" viewBox="0 0 700 180" preserveAspectRatio="none">
                  <line x1="40" y1="30" x2="680" y2="30" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="40" y1="80" x2="680" y2="80" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="40" y1="130" x2="680" y2="130" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="40" y1="150" x2="680" y2="150" stroke="#64748b" strokeWidth="1.5" />

                  {group.injections.map((inj, i) => {
                    const colors = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#38bdf8", "#f87171"];
                    const c = colors[i % colors.length];
                    const hasArea = typeof inj.area === "number" && !isNaN(inj.area) && inj.area > 0;
                    const isZero =
                      inj.isNoPeak === true ||
                      (inj.area !== null && inj.area !== undefined && Number(inj.area) === 0) ||
                      (!hasArea && /^(blank|placebo|diluent|no[ _-]?peak)$/i.test((inj.sampleName || "").trim()));
                    if (isZero) return null;
                    const peakH = Math.min(130, Math.max(30, ((inj.area || 50000) / 70000) * 120));
                    const maxT = Math.max(runTimeMin, 10);
                    const safeRtVal = inj.rt || 5.0;
                    const rtX = 40 + (Math.min(maxT, safeRtVal) / maxT) * 640;

                    return (
                      <path
                        key={inj.id}
                        d={`M 40 150 Q 75 125 80 150 L ${rtX - 25} 150 Q ${rtX} ${150 - peakH} ${rtX + 25} 150 L 680 150`}
                        fill="none"
                        stroke={c}
                        strokeWidth={i === 0 ? "2.5" : "1.8"}
                        opacity="0.9"
                      />
                    );
                  })}

                  <text x="40" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace">0.0</text>
                  <text x="180" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace">{(runTimeMin * 0.25).toFixed(1)}</text>
                  <text x="340" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace">{(runTimeMin * 0.5).toFixed(1)} min</text>
                  <text x="500" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace">{(runTimeMin * 0.75).toFixed(1)}</text>
                  <text x="660" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace">{runTimeMin.toFixed(1)} min</text>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
