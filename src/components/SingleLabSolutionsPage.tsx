import React from "react";
import { InjectionData, ReportHeader } from "../types";
import { ChromatogramSvg } from "./ChromatogramSvg";

interface SingleLabSolutionsPageProps {
  injection: InjectionData;
  injectionIndex?: number;
  groupName: string;
  fixedSampleId?: string;
  header: ReportHeader;
  runTimeMin?: number;
  pageNum?: number;
  totalPages?: number;
  scannedLook?: boolean;
}

// Generate realistic LabSolutions acquisition and processing timestamps matching uploaded image format: DD-MM-YYYY HH:mm:ss
export const getInjectionTimestamps = (dateBase?: string, injIndex: number = 0) => {
  const baseDate = "19-11-2025";
  const procDate = "20-11-2025";

  // Base acquired time from image: 17:38:22
  const startHour = 17;
  const startMin = 38;
  const startSec = 22;
  const totalMin = startHour * 60 + startMin + injIndex * 26;
  const hour = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const sec = (startSec + injIndex * 13) % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const acquired = `${baseDate} ${pad(hour)}:${pad(min)}:${pad(sec)}`;

  // Base processed time from image: 11:58:22 next day
  const procTotalMin = 11 * 60 + 58 + injIndex * 4;
  const procHour = Math.floor(procTotalMin / 60) % 24;
  const procMin = procTotalMin % 60;
  const procSec = (22 + injIndex * 7) % 60;
  const processed = `${procDate} ${pad(procHour)}:${pad(procMin)}:${pad(procSec)}`;

  return { acquired, processed };
};

export const checkIsDegradation = (name?: string) => {
  const n = (name || "").toLowerCase();
  return (
    n.includes("degrad") ||
    n.includes("acid") ||
    n.includes("base") ||
    n.includes("peroxide") ||
    n.includes("thermal") ||
    n.includes("photolytic") ||
    n.includes("hydrolysis") ||
    n.includes("oxidation")
  );
};

export const SingleLabSolutionsPage: React.FC<SingleLabSolutionsPageProps> = ({
  injection,
  injectionIndex = 0,
  groupName,
  fixedSampleId,
  header,
  runTimeMin = 30,
  pageNum = 1,
  totalPages = 1,
  scannedLook = false,
}) => {
  const inj = injection;

  const hasArea = typeof inj.area === "number" && !isNaN(inj.area) && inj.area > 0;
  const isZero =
    inj.isNoPeak === true ||
    (inj.area !== null && inj.area === 0) ||
    (!hasArea && /^(blank|placebo|diluent|no[ _-]?peak)$/i.test((inj.sampleName || "").trim()));

  const currentInj: InjectionData = React.useMemo(() => {
    if (isZero) {
      return { ...inj, isNoPeak: true, area: 0, height: 0, rt: null };
    }
    return { ...inj, isNoPeak: false };
  }, [inj, isZero]);

  const isDegradation = checkIsDegradation(inj.sampleName);

  const compoundName = header.compound || "Cetirizine Oral solution BP";
  const detectorName = header.detector && !/205\s*nm/i.test(header.detector) ? header.detector : "";
  const baseName = "191125";

  const methodFileName = `${compoundName || "Method"}_Assay_PM.lcm`;
  const batchFileName = `${baseName}_${compoundName || "Batch"}.lcb`;

  // Vial number: if inj.no is string like "01" parse it as integer
  const vialNum = inj.no ? parseInt(inj.no, 10) || 1 : 1;
  const sampleId = inj.sampleId || inj.sampleName;

  return (
    <div
      data-page-type="single-chrom-report"
      data-injection-id={inj.id}
      className={`report-page w-full max-w-[210mm] min-h-[296mm] mx-auto p-[10mm_14mm] bg-white text-black shadow-md border border-slate-300 relative select-none font-serif ${
        scannedLook ? "scanned-paper" : ""
      }`}
      style={{
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      <div className="space-y-3.5 text-black">
        {/* TOP HEADER: ONLY WESTCOAST PHARMACEUTICAL WORKS .LTD */}
        <div className="text-center border-b border-black pb-2 mb-3">
          <div className="text-[16px] font-bold tracking-tight text-black font-serif uppercase">
            {header.company || "WESTCOAST PHARMACEUTICAL WORKS .LTD"}
          </div>
        </div>

        {/* SECTION 1: Sample Information - Exact match to uploaded image */}
        <div>
          <div className="text-center font-bold text-[13.5px] mb-2 text-black">
            Sample Information
          </div>

          <div className="text-[11.5px] leading-[1.65] text-black pl-1">
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Sample Name</span>
              <span className="text-black">: {inj.sampleName}</span>
            </div>
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Sample ID</span>
              <span className="text-black">: {sampleId}</span>
            </div>
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Tray#</span>
              <span className="text-black">: 1</span>
            </div>
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Vial#</span>
              <span className="text-black">: {vialNum}</span>
            </div>
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Method File</span>
              <span className="text-black">: {methodFileName}</span>
            </div>
            <div className="flex">
              <span className="w-36 flex-shrink-0 text-black">Batch File</span>
              <span className="text-black">: {batchFileName}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Chromatogram - Centered Title */}
        <div className="pt-1 relative">
          <div className="text-center font-bold text-[14px] mb-2 text-black">
            Chromatogram
          </div>

          <div className="w-full bg-white flex justify-center py-0.5">
            <ChromatogramSvg
              runTimeMin={runTimeMin}
              injection={currentInj}
              compound={compoundName}
              detector={detectorName}
              width={680}
              height={180}
              boxBorder={true}
            />
          </div>
        </div>

        {/* SECTION 3: Peak Table - Pure Black & White, No Grey */}
        <div className="pt-2 text-[11px]">
          <div className="text-center font-bold text-[14px] mb-2 text-black">
            Peak Table
          </div>

          <div className="text-[11px] font-bold text-black mb-1.5 flex justify-between items-center px-1">
            <span>&lt;&lt; Detector A &gt;&gt;</span>
            {detectorName ? <span className="font-normal text-[10.5px]">{detectorName}</span> : null}
          </div>

          <table
            className="w-full border-collapse text-[10px] bg-white text-black"
            style={{ border: "1px solid black" }}
          >
            <thead>
              <tr className="bg-white text-black font-bold">
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-center font-bold bg-white">Peak#</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Ret. Time</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Area</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Height</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Area %</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Theoretical Plate</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Tailing Factor</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-right font-bold bg-white">Resolution</th>
                <th style={{ border: "1px solid black" }} className="px-2 py-1 text-left font-bold bg-white">Compound Name</th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              {isZero ? (
                <tr className="bg-white">
                  <td style={{ border: "1px solid black" }} className="text-center px-2 py-1 bg-white">1</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">--</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">0</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">0</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">0.000</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">--</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">--</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">--</td>
                  <td style={{ border: "1px solid black" }} className="text-left px-2 py-1 bg-white font-medium">No Peak</td>
                </tr>
              ) : inj.degradantInfo ? (
                <>
                  <tr className="bg-white">
                    <td style={{ border: "1px solid black" }} className="text-center px-2 py-1 bg-white">1</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.degradantInfo.degradantRt.toFixed(3)}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-semibold bg-white">{Math.round(inj.degradantInfo.degradantArea)}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{Math.round(inj.degradantInfo.degradantHeight)}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{(100 - inj.degradantInfo.remainingPct).toFixed(3)}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.degradantInfo.degradantPlates || "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.degradantInfo.degradantTailing ? inj.degradantInfo.degradantTailing.toFixed(3) : "1.080"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.degradantInfo.resolution || "3.450"}</td>
                    <td style={{ border: "1px solid black" }} className="text-left px-2 py-1 bg-white">Degradant (RRT {inj.degradantInfo.degradantRrt.toFixed(3)})</td>
                  </tr>
                  <tr className="bg-white">
                    <td style={{ border: "1px solid black" }} className="text-center px-2 py-1 bg-white">2</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.rt ? inj.rt.toFixed(3) : "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-semibold bg-white">{inj.area !== null ? Math.round(inj.area) : "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.height !== null ? Math.round(inj.height) : "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.degradantInfo.remainingPct.toFixed(3)}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.plates || "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.tailing ? inj.tailing.toFixed(3) : "--"}</td>
                    <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">--</td>
                    <td style={{ border: "1px solid black" }} className="text-left px-2 py-1 bg-white">{compoundName}</td>
                  </tr>
                </>
              ) : (
                <tr className="bg-white">
                  <td style={{ border: "1px solid black" }} className="text-center px-2 py-1 bg-white">1</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.rt ? inj.rt.toFixed(3) : "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-semibold bg-white">{inj.area !== null ? Math.round(inj.area) : "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.height !== null ? Math.round(inj.height) : "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.areaPct !== undefined && inj.areaPct !== null ? inj.areaPct.toFixed(3) : "100.000"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.plates || "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.tailing ? inj.tailing.toFixed(3) : "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white">{inj.resolution || "--"}</td>
                  <td style={{ border: "1px solid black" }} className="text-left px-2 py-1 bg-white">{compoundName}</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-white">
              <tr className="bg-white font-bold text-black">
                <td style={{ border: "1px solid black" }} className="text-center px-2 py-1 font-bold bg-white">Total</td>
                <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white"></td>
                <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-bold bg-white">
                  {isZero ? 0 : inj.degradantInfo ? Math.round(inj.degradantInfo.degradantArea + (inj.area || 0)) : (inj.area !== null ? Math.round(inj.area) : "--")}
                </td>
                <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-bold bg-white">
                  {isZero ? 0 : inj.degradantInfo ? Math.round(inj.degradantInfo.degradantHeight + (inj.height || 0)) : (inj.height !== null ? Math.round(inj.height) : "--")}
                </td>
                <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 font-bold bg-white">{isZero ? "0.000" : "100.000"}</td>
                <td style={{ border: "1px solid black" }} className="text-right px-2 py-1 bg-white" colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Page Footer */}
      <div className="absolute bottom-[8mm] left-[15mm] right-[15mm] flex justify-start items-center border-t border-black pt-1.5">
        <span className="text-[7.5px] font-mono text-slate-500 tracking-wider">
          DRAFT, not instrument raw data
        </span>
      </div>
    </div>
  );
};
