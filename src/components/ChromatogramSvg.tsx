import React from "react";
import { InjectionData } from "../types";
import { fmt, getFixedTrace } from "../utils/calculations";

interface ChromatogramSvgProps {
  injection: InjectionData;
  compound?: string;
  detector?: string;
  width?: number;
  height?: number;
  small?: boolean;
  runTimeMin?: number;
  boxBorder?: boolean;
}

export const ChromatogramSvg: React.FC<ChromatogramSvgProps> = ({
  injection,
  compound = "",
  detector = "",
  width = 360,
  height = 180,
  small = false,
  runTimeMin = 30,
  boxBorder = false,
}) => {
  const hasArea =
    injection.area !== null &&
    injection.area !== undefined &&
    !isNaN(Number(injection.area)) &&
    Number(injection.area) > 0;

  const isZeroArea =
    injection.isNoPeak === true ||
    (injection.area !== null && injection.area !== undefined && Number(injection.area) === 0) ||
    (!hasArea && /^(blank|placebo|diluent|no[ _-]?peak)$/i.test((injection.sampleName || "").trim()));

  const safeRt =
    injection.rt !== null &&
    injection.rt !== undefined &&
    !isNaN(Number(injection.rt)) &&
    Number(injection.rt) > 0
      ? Number(injection.rt)
      : 4.81;

  // Ensure runTimeMin is a positive number and covers the retention time safely
  const parsedRunTime =
    typeof runTimeMin === "number" && !isNaN(runTimeMin) && runTimeMin > 0
      ? runTimeMin
      : 30;
  const x1 = Math.max(parsedRunTime, Math.ceil(safeRt * 1.3), 10);
  const x0 = 0;

  const numIntervals = 6;
  const step = (x1 - x0) / numIntervals;
  const xt = Array.from({ length: numIntervals + 1 }, (_, i) => {
    const raw = x0 + i * step;
    return Number(raw.toFixed(1)) % 1 === 0 ? Math.round(raw) : Number(raw.toFixed(1));
  });

  const pts = getFixedTrace(injection, x1);

  const m = {
    l: 45, // wider left margin for large numbers
    r: 14,
    t: small ? 14 : 16,
    b: 24,
  };
  const pw = Math.max(10, width - m.l - m.r);
  const ph = Math.max(10, height - m.t - m.b);

  // Dynamically scale Y axis based on actual peak height in uV
  const maxPt = pts.reduce((max, p) => (p[1] > max[1] ? p : max), [safeRt, 0.1]);
  let peakVal = !isNaN(maxPt[1]) && maxPt[1] > 0 ? maxPt[1] : 100;

  // Round up to a nice tick number
  const exponent = Math.floor(Math.log10(peakVal));
  const fraction = peakVal / Math.pow(10, exponent);
  let niceFraction = 10;
  if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 4) niceFraction = 4;
  else if (fraction <= 5) niceFraction = 5;
  else if (fraction <= 8) niceFraction = 8;
  const niceMax = Math.max(10, niceFraction * Math.pow(10, exponent));

  // When isZeroArea (No peak / blank / placebo), provide clean 0 to 100 uV scale with no line inside
  const y1 = isZeroArea ? 100 : niceMax;
  const y0 = isZeroArea ? 0 : -0.25 * niceMax;
  const yt = isZeroArea
    ? [0, 20, 40, 60, 80, 100]
    : [y0, 0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  const X = (t: number): number => {
    const denom = x1 - x0;
    if (denom <= 0 || isNaN(denom)) return m.l;
    const val = m.l + ((t - x0) / denom) * pw;
    return isNaN(val) ? m.l : val;
  };

  const Y = (v: number): number => {
    const denom = y1 - y0;
    if (denom <= 0 || isNaN(denom)) return m.t + ph;
    const val = m.t + ph - ((v - y0) / denom) * ph;
    return isNaN(val) ? m.t + ph : val;
  };

  const fs = small ? 8 : 8.5;
  // Valid points from getFixedTrace (full Gaussian curve for peaks, flat baseline with micro-noise for blanks)
  const validPts = pts.filter((pt) => Array.isArray(pt) && !isNaN(pt[0]) && !isNaN(pt[1]));
  const safePts = validPts;
  const dstr = safePts
    .map((pt, i) => {
      const xVal = X(pt[0]);
      const yVal = Y(pt[1]);
      return `${i === 0 ? "M" : "L"}${xVal.toFixed(2)},${yVal.toFixed(2)}`;
    })
    .join(" ");

  const hasPeak =
    !isZeroArea &&
    injection.rt !== null &&
    injection.rt !== undefined &&
    !isNaN(Number(injection.rt)) &&
    Number(injection.rt) > 0;
  const apexRt = safeRt;
  const px = X(apexRt);
  const apexY = !isNaN(maxPt[1]) ? maxPt[1] : 0;
  const rawApexY = Y(apexY);
  const safeApexY = isNaN(rawApexY) ? m.t + ph : rawApexY;
  const labelY = Math.max(m.t + 45, safeApexY - 5);

  // Check for secondary degradation peak from degradantInfo or sample name
  const deg = injection.degradantInfo;
  const isDegradation =
    Boolean(deg) ||
    /acid|base|alkali|peroxide|oxid|thermal|photo|degrad/i.test(injection.sampleName || "") ||
    (typeof injection.resolution === "string" &&
      injection.resolution !== "--" &&
      parseFloat(injection.resolution) > 1.0);
  const degRt = deg ? deg.degradantRt : (isDegradation ? safeRt * 0.65 : null);
  const degPx = degRt !== null ? X(degRt) : null;
  const degHeight = deg ? deg.degradantHeight : (isDegradation ? apexY * 0.25 : null);
  const degRrtStr = deg ? deg.degradantRrt.toFixed(3) : "0.650";

  // Short compound name in uppercase matching image.png (e.g. "ROSUVA" or "CETIRIZINE")
  const compoundShort = React.useMemo(() => {
    if (!compound) return "COMPOUND";
    const cleaned = compound
      .replace(/\s*(oral\s+solution|tablets?|capsules?|injection|suspension|syrup|cream|ointment|gel|bp|usp|ep|ip|pm).*$/i, "")
      .trim();
    const words = cleaned.split(/\s+/);
    return (words[0] || cleaned).toUpperCase();
  }, [compound]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto bg-white block select-none"
      width={width}
      height={height}
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* Pure White Background */}
      <rect width={width} height={height} fill="#ffffff" />

      {/* Plot Axes: Enclosed box matching image.png, or open L-shaped axes */}
      {boxBorder ? (
        <rect
          x={m.l}
          y={m.t}
          width={pw}
          height={ph}
          fill="none"
          stroke="#000000"
          strokeWidth="0.8"
        />
      ) : (
        <>
          {/* Left Y-Axis */}
          <line
            x1={m.l}
            y1={m.t}
            x2={m.l}
            y2={m.t + ph}
            stroke="#000000"
            strokeWidth="0.8"
          />
          {/* Bottom X-Axis */}
          <line
            x1={m.l}
            y1={m.t + ph}
            x2={m.l + pw}
            y2={m.t + ph}
            stroke="#000000"
            strokeWidth="0.8"
          />
        </>
      )}

      {/* Y-Axis Unit: only show when not in boxBorder mode */}
      {!boxBorder && (
        <text
          x={m.l - 22}
          y={m.t - 4}
          fontSize={fs + 2.5}
          fontWeight="bold"
          fontFamily="sans-serif"
          textAnchor="start"
          fill="#000000"
        >
          uV
        </text>
      )}

      {/* Y Ticks */}
      {yt.map((v, idx) => {
        const yy = Y(v);
        let tickLabel = "";
        if (v === 0) {
          tickLabel = "0.0";
        } else if (isZeroArea) {
          tickLabel = String(v);
        } else {
          tickLabel = Math.round(v).toLocaleString();
        }

        return (
          <g key={`y-tick-${idx}-${v}`}>
            {/* Left Y Tick */}
            <line
              x1={m.l - 4}
              y1={yy}
              x2={m.l}
              y2={yy}
              stroke="#000000"
              strokeWidth="0.6"
            />
            {/* Right Y Tick when boxBorder is true (matching image.png) */}
            {boxBorder && (
              <line
                x1={m.l + pw}
                y1={yy}
                x2={m.l + pw + 4}
                y2={yy}
                stroke="#000000"
                strokeWidth="0.6"
              />
            )}
            <text
              x={m.l - 6}
              y={yy + 3}
              fontSize={fs}
              textAnchor="end"
              fill="#000000"
            >
              {tickLabel}
            </text>
          </g>
        );
      })}

      {/* X Ticks */}
      {xt.map((v, idx) => {
        const xx = X(v);
        return (
          <g key={`x-tick-${idx}-${v}`}>
            {/* Bottom X Tick */}
            <line
              x1={xx}
              y1={m.t + ph}
              x2={xx}
              y2={m.t + ph + 4}
              stroke="#000000"
              strokeWidth="0.6"
            />
            {/* Top X Tick when boxBorder is true (matching image.png) */}
            {boxBorder && (
              <line
                x1={xx}
                y1={m.t - 4}
                x2={xx}
                y2={m.t}
                stroke="#000000"
                strokeWidth="0.6"
              />
            )}
            <text
              x={xx}
              y={m.t + ph + 13}
              fontSize={fs}
              textAnchor="middle"
              fill="#000000"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* X Axis Unit: min */}
      <text
        x={m.l + pw}
        y={m.t + ph + 21}
        fontSize={fs}
        textAnchor="end"
        fill="#000000"
      >
        min
      </text>

      {/* Clean Smooth Chromatogram Signal Curve */}
      {Boolean(dstr) ? (
        <path d={dstr} fill="none" stroke="#000000" strokeWidth="0.8" />
      ) : (
        <line
          x1={m.l}
          y1={Y(0.0)}
          x2={m.l + pw}
          y2={Y(0.0)}
          stroke="#000000"
          strokeWidth="0.8"
        />
      )}

      {/* Degradant Peak drop line if degradation sample */}
      {hasPeak && degRt !== null && degPx !== null && degHeight !== null && degPx > m.l && degPx < m.l + pw && (
        <g>
          <line
            x1={degPx}
            y1={Y(degHeight)}
            x2={degPx}
            y2={Y(0.0)}
            stroke="#000000"
            strokeWidth="0.4"
            strokeDasharray="1.5 1.5"
          />
          <text
            x={degPx - 2}
            y={Math.max(m.t + 45, Y(degHeight) - 5)}
            fontSize={small ? 6.5 : 7}
            fill="#000000"
            fontFamily="sans-serif"
            transform={`rotate(-90 ${degPx - 2} ${Math.max(m.t + 45, Y(degHeight) - 5)})`}
          >
            {fmt(degRt, 3)} / Degradant (RRT {degRrtStr})
          </text>
        </g>
      )}

      {/* Peak Apex Marker & Vertical Tag matching image.png */}
      {hasPeak && px > m.l && px < m.l + pw && (
        <g>
          {/* Main Peak Dashed drop line from apex down to baseline */}
          <line
            x1={px}
            y1={Y(apexY)}
            x2={px}
            y2={Y(0.0)}
            stroke="#000000"
            strokeWidth="0.45"
            strokeDasharray="1.5 1.5"
          />
          {/* Line from apex UP to top border, matching image.png */}
          <line
            x1={px}
            y1={m.t}
            x2={px}
            y2={Y(apexY)}
            stroke="#000000"
            strokeWidth="0.45"
          />
          {/* Rotated Vertical Text Label: e.g. "8.108 / ROSUVA" */}
          <text
            x={px - 2.5}
            y={labelY}
            fontSize={fs}
            fill="#000000"
            fontFamily="sans-serif"
            transform={`rotate(-90 ${px - 2.5} ${labelY})`}
          >
            {fmt(safeRt, 3)} / {compoundShort}
          </text>
        </g>
      )}
    </svg>
  );
};
