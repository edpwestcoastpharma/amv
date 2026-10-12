import React from "react";
import { GroupData } from "../types";
import { stats, fmt } from "../utils/calculations";
import { Layers, Plus, Trash2, Copy, FilePlus } from "lucide-react";

interface GroupManagerProps {
  groups: GroupData[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onAddGroup: (name?: string, kind?: string) => void;
  onRemoveGroup: (id: string) => void;
  onDuplicateGroup: (group: GroupData) => void;
  onLoadFullSuite?: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  activeGroupId,
  onSelectGroup,
  onAddGroup,
  onRemoveGroup,
  onDuplicateGroup,
  onLoadFullSuite,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Validation Groups / Tables ({groups.length})
        </h2>
        <button
          onClick={() => onAddGroup()}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Group
        </button>
      </div>

      <div className="p-2 space-y-1 max-h-[340px] overflow-y-auto">
        {!groups.length ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No validation groups yet. Click "+ Add Group" or "Sample Data".
          </div>
        ) : (
          groups.map((group) => {
            const isActive = group.id === activeGroupId;
            const arStats = stats(group.injections.map((i) => i.area));
            const rtStats = stats(group.injections.map((i) => i.rt));

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`p-2 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isActive
                    ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/50"
                    : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-800 truncate">
                      {group.name}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-mono">
                      n={group.injections.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5 font-mono">
                    <span>RT: {fmt(rtStats.avg, 3)} min</span>
                    <span>
                      %RSD:{" "}
                      <strong
                        className={
                          arStats.rsd !== null && arStats.rsd > 2.0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        {fmt(arStats.rsd, 2)}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateGroup(group);
                    }}
                    title="Duplicate group"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveGroup(group.id);
                    }}
                    title="Delete group"
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Validation Presets */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Quick Add ICH Q2 Parameter:
          </span>
          {onLoadFullSuite && (
            <button
              onClick={onLoadFullSuite}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1"
            >
              <span>Load Full 8-Param Suite</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <button
            onClick={() => onAddGroup("System Suitability (Standard)", "System Suitability")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + System Suitability
          </button>
          <button
            onClick={() => onAddGroup("Specificity & Selectivity", "Specificity")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Specificity
          </button>
          <button
            onClick={() => onAddGroup("Linearity & Range (50%-150%)", "Linearity")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Linearity (R²)
          </button>
          <button
            onClick={() => onAddGroup("Accuracy & Recovery (3 Levels)", "Accuracy")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Accuracy (Recovery)
          </button>
          <button
            onClick={() => onAddGroup("Method Precision (Repeatability)", "Precision")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Method Precision
          </button>
          <button
            onClick={() => onAddGroup("Intermediate Precision (Ruggedness)", "Intermediate Precision")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Interm. Precision
          </button>
          <button
            onClick={() => onAddGroup("Robustness (Flow, Temp, MP)", "Robustness")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Robustness
          </button>
          <button
            onClick={() => onAddGroup("Solution Stability (48 Hours)", "Solution Stability")}
            className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-left truncate"
          >
            + Solution Stability
          </button>
        </div>
      </div>
    </div>
  );
};
