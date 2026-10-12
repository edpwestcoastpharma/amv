import React from "react";
import { ReportHeader } from "../types";
import { Building2 } from "lucide-react";

interface ReportHeaderCardProps {
  header: ReportHeader;
  onChange: (header: ReportHeader) => void;
}

export const ReportHeaderCard: React.FC<ReportHeaderCardProps> = ({
  header,
  onChange,
}) => {
  const updateField = (key: keyof ReportHeader, value: string) => {
    onChange({ ...header, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          Report &amp; Batch Header
        </h2>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={header.company}
            onChange={(e) => updateField("company", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif"
            placeholder="e.g. West-Coast Pharmaceutical Works Limited"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Address Line
          </label>
          <input
            type="text"
            value={header.address}
            onChange={(e) => updateField("address", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif"
            placeholder="e.g. Chattral- Vadaswami Road, Village: Vadaswami, Dist.:Kalol, Gujarat 382740"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Compound / Analyte
            </label>
            <div className="relative">
              <input
                type="text"
                value={header.compound}
                onChange={(e) => updateField("compound", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                placeholder="e.g. Tibolone Tablets BP 8.0 mg"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Detector &amp; Wavelength
            </label>
            <input
              type="text"
              value={header.detector}
              onChange={(e) => updateField("detector", e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
              placeholder="e.g. Detector A"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Date (Leave blank or empty)
            </label>
            <input
              type="text"
              value={header.date === "0" ? "" : header.date || ""}
              onChange={(e) => {
                const val = e.target.value.trim() === "0" ? "" : e.target.value;
                updateField("date", val);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              placeholder="Date (no '0')"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Report No.
            </label>
            <input
              type="text"
              value={header.reportNo || ""}
              onChange={(e) => updateField("reportNo", e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
              placeholder="e.g. AMV-ASSAY-CU-TIB-2604-6211/R"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Batch No.
            </label>
            <input
              type="text"
              value={header.batchNo || ""}
              onChange={(e) => updateField("batchNo", e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
              placeholder="e.g. VAL-TIB-6211"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Analyst
            </label>
            <input
              type="text"
              value={header.analyst || ""}
              onChange={(e) => updateField("analyst", e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              placeholder="e.g. Sahil Panchal / Smit Patel"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Batch File Base Name (Title column)
          </label>
          <input
            type="text"
            value={header.baseName}
            onChange={(e) => updateField("baseName", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
            placeholder="e.g. AMV_Report_Mycophenolate_Mofetil_500mg_HPLC"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Row title formatted as: <span className="font-mono text-slate-600">{header.baseName} 01.lcd</span>
          </p>
        </div>
      </div>
    </div>
  );
};
