import React from "react";
import { AmvSource, GroupData } from "../types";

export const ConflictsDetected: React.FC<{ amvSource: AmvSource }> = ({ amvSource }) => {
  const conflicts = amvSource?.conflicts || [];
  return (
    <div className="bg-white border border-slate-300 text-xs mb-4">
      <div className="bg-slate-100 font-bold p-1 border-b border-slate-300">CONFLICTS DETECTED</div>
      {conflicts.length === 0 ? (
        <div className="p-1">None</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="p-1 border-r border-slate-200">Field</th>
              <th className="p-1 border-r border-slate-200">Found Values</th>
              <th className="p-1">Value Used (Table)</th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="p-1 border-r border-slate-200">{c.field}</td>
                <td className="p-1 border-r border-slate-200">{c.values.join(" vs ")}</td>
                <td className="p-1">{c.used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export const MissingData: React.FC<{ amvSource: AmvSource }> = ({ amvSource }) => {
  const missing = amvSource?.missing || [];
  return (
    <div className="bg-white border border-slate-300 text-xs mb-4">
      <div className="bg-slate-100 font-bold p-1 border-b border-slate-300">MISSING DATA</div>
      {missing.length === 0 ? (
        <div className="p-1">None</div>
      ) : (
        <ul className="list-disc ml-5 p-1">
          {missing.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}
    </div>
  );
};

export const TraceabilityTable: React.FC<{ groups: GroupData[] }> = ({ groups }) => {
  return (
    <div className="bg-white border border-slate-300 text-xs mt-4">
      <div className="bg-slate-100 font-bold p-1 border-b border-slate-300">AREA TRACEABILITY TABLE</div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="p-1 border-r border-slate-200">Group</th>
            <th className="p-1 border-r border-slate-200">Sample Name</th>
            <th className="p-1 border-r border-slate-200">Ladder Rule</th>
            <th className="p-1">Source Section</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap(g => 
            g.injections.map(inj => (
              <tr key={inj.id} className="border-b border-slate-200">
                <td className="p-1 border-r border-slate-200">{g.name}</td>
                <td className="p-1 border-r border-slate-200">{inj.sampleName}</td>
                <td className="p-1 border-r border-slate-200">{inj._traceability?.rule || "Unresolved"}</td>
                <td className="p-1">{inj._traceability?.sourceSection || "Unknown"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
