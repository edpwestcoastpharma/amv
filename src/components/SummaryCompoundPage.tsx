import React from "react";
import { GroupData, InjectionData, ReportHeader } from "../types";
import { ChromatogramSvg } from "./ChromatogramSvg";

interface SummaryCompoundPageProps {
  group: GroupData;
  header: ReportHeader;
  injections?: InjectionData[];
  runTimeMin?: number;
  scannedLook?: boolean;
  pageIndex?: number;
  totalPagesForGroup?: number;
  showDetectorATable?: boolean;
}

export const SummaryCompoundPage: React.FC<SummaryCompoundPageProps> = ({
  group,
  header,
  injections,
  runTimeMin = 30,
  scannedLook = false,
  pageIndex = 1,
  totalPagesForGroup = 1,
}) => {
  const displayInjections = injections || group.injections || [];

  return (
    <div
      data-page-type="summary-compound-page"
      data-group-id={group.id}
      className={`report-page w-full max-w-[210mm] min-h-[296mm] mx-auto p-[10mm_14mm] bg-white text-black shadow-md border border-slate-300 relative select-none font-serif ${
        scannedLook ? "scanned-paper" : ""
      }`}
      style={{
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      {/* HEADER: Company name and divider */}
      <div className="text-center pt-2">
        <div className="text-[16px] font-bold tracking-tight text-black font-serif uppercase">
          {header.company || "WESTCOAST PHARMACEUTICAL WORKS LTD."}
        </div>
        
        {/* Full-width Divider Line */}
        <div className="border-b border-black mt-2 mb-3 w-full"></div>

        {/* Title: Summary(Compound) — <Section Name> */}
        <div className="text-center font-bold text-[14px] mb-3 text-black font-serif">
          Summary(Compound) — {group.name}
          {totalPagesForGroup > 1 && (
            <span className="text-xs font-normal text-slate-600 ml-2">
              (Page {pageIndex} of {totalPagesForGroup})
            </span>
          )}
        </div>
      </div>

      {/* 2-COLUMN CHROMATOGRAM GRID: Exactly matching uploaded image.png */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {displayInjections.map((inj, idx) => (
          <div
            key={`${inj.id}-${idx}`}
            className="w-full bg-white flex flex-col items-center"
          >
            <ChromatogramSvg
              injection={inj}
              compound={header.compound}
              detector={header.detector}
              runTimeMin={runTimeMin}
              width={340}
              height={168}
              small={true}
              boxBorder={true}
            />
          </div>
        ))}
      </div>

      {/* Page Footer */}
      <div className="absolute bottom-[8mm] left-[14mm] right-[14mm] flex justify-start items-center border-t border-black pt-1.5">
        <span className="text-[7.5px] font-mono text-slate-500 tracking-wider">
          DRAFT, not instrument raw data
        </span>
      </div>
    </div>
  );
};

