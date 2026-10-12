import { AmvSource, GroupData, InjectionData, StatsResult, ReportHeader } from "../types";

export function peakHeight(area: number, rtMin: number, plates: number): number {
  if (plates <= 0 || rtMin <= 0) return 0;
  const halfWidthSec = rtMin * Math.sqrt(5.54 / plates) * 60;
  return area / (1.0645 * halfWidthSec);
}

export function generatePeakTrace(
  peakRt: number,
  peakHeight: number,
  noiseLevel: number = 0,
  tailingFactor: number = 1.0
): [number, number][] {
  const points: [number, number][] = [];
  const startT = Math.max(0, peakRt - 2);
  const endT = peakRt + 4;
  const dt = 0.05;
  const sigma = 0.16;
  const peak_uV = peakHeight;
  const baseline = 0.0;

  for (let t = startT; t <= endT; t += dt) {
    const dtPeak = t - peakRt;
    const effectiveSigma = dtPeak > 0 ? sigma * tailingFactor : sigma;
    const peak = peak_uV * Math.exp(-0.5 * Math.pow(dtPeak / effectiveSigma, 2));
    points.push([parseFloat(t.toFixed(2)), parseFloat((baseline + Math.max(0, peak)).toFixed(3))]);
  }
  return points;
}

export function calculateStats(injections: InjectionData[]): StatsResult {
  const validInjections = injections.filter((i) => i.area !== null && i.area > 0 && i.rt !== null && i.rt > 0);
  const n = validInjections.length;
  if (n === 0) return { n: 0, avg: null, rsd: null, max: null, min: null, sd: null };

  const areas = validInjections.map((i) => i.area as number);
  const sum = areas.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const max = Math.max(...areas);
  const min = Math.min(...areas);

  if (n === 1) return { n, avg, rsd: 0, max, min, sd: 0 };

  const sumSq = areas.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
  const sd = Math.sqrt(sumSq / (n - 1));
  const rsd = (sd / avg) * 100;

  return { n, avg, rsd, max, min, sd };
}

export function yAxis(maxHeight: number) {
  const top = Math.ceil(maxHeight * 1.25 / 1000) * 1000;
  return { max: top, gridlines: [-top / 4, 0, top / 4, top / 2, (3 * top) / 4, top] };
}


function generateAreasForRsd(n: number, mean: number, targetRsdPct: number): number[] {
  if (n <= 1 || targetRsdPct === 0) return Array(n).fill(Math.round(mean));
  const targetSd = mean * targetRsdPct / 100;
  const base = [];
  for (let i = 0; i < n; i++) {
    base.push(i - (n - 1) / 2);
  }
  const baseVar = base.reduce((a, b) => a + b * b, 0) / (n - 1);
  const baseSd = Math.sqrt(baseVar);
  const scale = targetSd / baseSd;
  return base.map(x => Math.round(mean + x * scale));
}

function seededDrift(seedStr: string, maxDrift: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  const random = (Math.abs(hash) % 1000) / 1000;
  return maxDrift * (random * 2 - 1);
}

export function processAmvSource(source: AmvSource): GroupData[] {
  const groups: GroupData[] = [];
  
  const rt = source.analyteRtMin || 5.0;
  const basePlates = (source.sst && source.sst.length > 0 && source.sst[0]?.plates) ? source.sst[0].plates : 60000;
  const baseTailing = (source.sst && source.sst.length > 0 && source.sst[0]?.tailing) ? source.sst[0].tailing : 1.0;
  
  // 1. System Suitability
  const ssInjections: InjectionData[] = (source.sst || []).map((s, i) => {
    const injRt = (s.rt !== undefined && s.rt !== null && s.rt > 0)
      ? s.rt
      : Number((rt + seededDrift(s.area.toString() + i, 0.03)).toFixed(3));
    const injPlates = s.plates || basePlates;
    const injTailing = s.tailing || baseTailing;
    const injHeight = (s.height !== undefined && s.height !== null && s.height > 0)
      ? s.height
      : Math.round(peakHeight(s.area, injRt, injPlates));

    return {
      id: `sst_${i}`,
      _traceability: { rule: "R1", sourceSection: "System Suitability" },
      no: String(i + 1).padStart(2, "0"),
      sampleName: s.sampleName || `Standard Solution ${i + 1}`,
      sampleId: `STD-${i + 1}`,
      rt: injRt,
      area: s.area,
      height: injHeight,
      tailing: injTailing,
      plates: injPlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
    };
  });
  if (ssInjections.length > 0) groups.push({ id: "grp_sst", name: "System Suitability", injections: ssInjections });
  
  // Safe base area
  let stdArea = 1000000;
  if (ssInjections.length > 0) {
    stdArea = ssInjections.reduce((a, b) => a + (b.area || 0), 0) / ssInjections.length;
  } else if (source.linearity && source.linearity.length > 0) {
    const l100 = source.linearity.find(l => l.levelPct === 100) || source.linearity[Math.floor(source.linearity.length / 2)];
    if (l100) stdArea = l100.meanArea;
  }

  // 2. Specificity
  let specInjections: InjectionData[] = [];
  if (source.specificityInjections && source.specificityInjections.length > 0) {
    specInjections = source.specificityInjections.map((sp, i) => {
      const isBlank = sp.isNoPeak || /blank|placebo|no[ _-]?peak/i.test(sp.sampleName) || (!sp.area && sp.area !== undefined);
      const injRt = isBlank ? null : (sp.rt !== undefined && sp.rt !== null && sp.rt > 0 ? sp.rt : rt);
      const injArea = isBlank ? 0 : (sp.area || stdArea);
      const injPlates = isBlank ? null : (sp.plates || basePlates);
      const injTailing = isBlank ? null : (sp.tailing || baseTailing);
      const injHeight = isBlank ? 0 : (sp.height || Math.round(peakHeight(injArea, injRt || rt, injPlates || basePlates)));
      return {
        id: `spec_${i}`,
        _traceability: { rule: isBlank ? "R7" : "R1", sourceSection: "Specificity" },
        no: String(i + 1).padStart(2, "0"),
        sampleName: sp.sampleName,
        sampleId: `SPEC-${i + 1}`,
        rt: injRt,
        area: injArea,
        height: injHeight,
        tailing: injTailing,
        plates: injPlates,
        areaPct: isBlank ? 0 : 100.0,
        resolution: "--",
        rrt: isBlank ? "--" : "1.000",
        isNoPeak: isBlank,
        _trace: isBlank ? undefined : generatePeakTrace(injRt || rt, injHeight, 0, injTailing || 1.0),
      };
    });
  } else if (source.hasSpecificity || (source.degradation && source.degradation.length > 0)) {
    specInjections = [
      {
        id: "spec_1", _traceability: { rule: "R7", sourceSection: "Specificity" }, no: "01", sampleName: "Diluent / Blank", sampleId: "BLK-01",
        rt: null, area: 0, height: 0, tailing: null, plates: null, areaPct: 0, resolution: "--", rrt: "--", isNoPeak: true
      },
      {
        id: "spec_2", _traceability: { rule: "R7", sourceSection: "Specificity" }, no: "02", sampleName: "Placebo", sampleId: "PLC-01",
        rt: null, area: 0, height: 0, tailing: null, plates: null, areaPct: 0, resolution: "--", rrt: "--", isNoPeak: true
      },
      {
        id: "spec_3", _traceability: { rule: "R1", sourceSection: "Specificity (Standard)" }, no: "03", sampleName: "Standard Solution (100%)", sampleId: "STD-100",
        rt: rt, area: stdArea, height: Math.round(peakHeight(stdArea, rt, basePlates)),
        tailing: baseTailing, plates: basePlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(rt, Math.round(peakHeight(stdArea, rt, basePlates)), 0, baseTailing)
      },
      {
        id: "spec_4", _traceability: { rule: "R1", sourceSection: "Specificity (Sample)" }, no: "04", sampleName: "As-Is Sample", sampleId: "SPL-100",
        rt: rt, area: stdArea, height: Math.round(peakHeight(stdArea, rt, basePlates)),
        tailing: baseTailing, plates: basePlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(rt, Math.round(peakHeight(stdArea, rt, basePlates)), 0, baseTailing)
      }
    ];
  }
  
  if (source.degradation) {
    source.degradation.forEach((deg, i) => {
      const analyteArea = deg.analyteArea || Math.round(stdArea * (deg.remainingPct / 100));
      const degradantArea = deg.degradantArea || Math.round(stdArea - analyteArea);
      const degradantRt = deg.degradantRt || Number((rt * deg.degradantRrt).toFixed(3));
      const degradantPlates = Math.round(basePlates * 0.95);
      const degradantHeight = Math.round(peakHeight(degradantArea, degradantRt, degradantPlates));
      const analyteHeight = Math.round(peakHeight(analyteArea, rt, basePlates));

      specInjections.push({
        id: `spec_deg_${i}`,
        _traceability: { rule: "R5", sourceSection: "Forced Degradation" },
        no: String(specInjections.length + 1).padStart(2, "0"),
        sampleName: deg.condition,
        sampleId: `DEG-${i + 1}`,
        rt: rt,
        area: analyteArea,
        height: analyteHeight,
        tailing: baseTailing,
        plates: basePlates,
        areaPct: Number(deg.remainingPct.toFixed(3)),
        resolution: "3.450",
        rrt: "1.000",
        degradantInfo: {
          condition: deg.condition,
          remainingPct: deg.remainingPct,
          degradantRrt: deg.degradantRrt,
          degradantRt: degradantRt,
          degradantArea: degradantArea,
          degradantHeight: degradantHeight,
          degradantPlates: degradantPlates,
          degradantTailing: 1.080,
          resolution: "3.450",
        },
      });
    });
  }
  if (specInjections.length > 0) groups.push({ id: "grp_spec", name: "Specificity & Degradation", injections: specInjections });

  // 3. Linearity
  const linInjections: InjectionData[] = source.linearity.map((l, i) => {
    const injArea = (l.area !== undefined && l.area !== null && l.area > 0)
      ? l.area
      : l.meanArea;
    const injRt = (l.rt !== undefined && l.rt !== null && l.rt > 0) ? l.rt : rt;
    const injPlates = l.plates || basePlates;
    const injTailing = l.tailing || baseTailing;
    const injHeight = (l.height !== undefined && l.height !== null && l.height > 0)
      ? l.height
      : Math.round(peakHeight(injArea, injRt, injPlates));

    return {
      id: `lin_${i}`,
      _traceability: { rule: "R1", sourceSection: "Linearity and Range" },
      no: String(i + 1).padStart(2, "0"),
      sampleName: l.sampleName || `Linearity Level ${l.levelPct}%`,
      sampleId: `LIN-${l.levelPct}`,
      rt: injRt,
      area: injArea,
      height: injHeight,
      tailing: injTailing,
      plates: injPlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
    };
  });
  if (linInjections.length > 0) groups.push({ id: "grp_lin", name: "Linearity", kind: "Linearity", injections: linInjections });

  // 3b. Range (if present in AMV report or automatically derived from Linearity & Range)
  const rangeItems = (source.range && source.range.length > 0)
    ? source.range
    : (source.linearity && source.linearity.length > 0)
      ? source.linearity.map((l, i) => {
          const ppmVal = l.concUgMl || (source.method?.workingConcUgMl ? (source.method.workingConcUgMl * (l.levelPct || 100)) / 100 : l.levelPct);
          return {
            levelPct: l.levelPct,
            concUgMl: l.concUgMl,
            levelPpm: ppmVal,
            sampleId: `RANGE-${l.levelPct}%`,
            sampleName: l.sampleName ? l.sampleName.replace(/linearity/i, "Range") : `Range Level ${l.levelPct}% (${ppmVal} µg/mL)`,
            area: l.area || l.meanArea,
            rt: l.rt || rt,
            tailing: l.tailing || baseTailing,
            plates: l.plates || basePlates,
          };
        })
      : [];

  if (rangeItems.length > 0) {
    const rangeInjections: InjectionData[] = rangeItems.map((r, i) => {
      const injRt = (r.rt !== undefined && r.rt !== null && r.rt > 0) ? r.rt : rt;
      const injPlates = r.plates || basePlates;
      const injTailing = r.tailing || baseTailing;
      const injHeight = (r.height !== undefined && r.height !== null && r.height > 0)
        ? r.height
        : Math.round(peakHeight(r.area, injRt, injPlates));

      const lvlLabel = r.levelPpm !== undefined ? `${r.levelPpm} ppm` : (r.levelPct !== undefined ? `${r.levelPct}%` : (r.concUgMl !== undefined ? `${r.concUgMl} µg/mL` : ""));
      const sampleName = r.sampleName || (r.sampleId ? `${r.sampleId} (${lvlLabel})` : `Range Determination ${i + 1} (${lvlLabel})`);

      return {
        id: `range_${i}`,
        _traceability: { rule: "R1", sourceSection: "Range" },
        no: String(i + 1).padStart(2, "0"),
        sampleName,
        sampleId: r.sampleId || `RANGE-${i + 1}`,
        rt: injRt,
        area: r.area,
        height: injHeight,
        tailing: injTailing,
        plates: injPlates,
        areaPct: 100.0,
        resolution: "--",
        rrt: "1.000",
        _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
      };
    });
    if (rangeInjections.length > 0) {
      groups.push({ id: "grp_range", name: "Range", kind: "Range", injections: rangeInjections });
    }
  }

  // 4. Accuracy
  // Group accuracy by level
  const accLevels = [...new Set(source.accuracy.map(a => a.levelPct))];
  accLevels.forEach((level) => {
    const levelInjections: InjectionData[] = [];
    const levelData = source.accuracy.filter(a => a.levelPct === level);
    levelData.forEach((a, i) => {
      const nominalConc = (a.levelPct / 100) * source.method.workingConcUgMl;
      const conc = a.addedMg > 0 ? (a.recoveredMg / a.addedMg) * nominalConc : nominalConc;
      const calculatedArea = Math.round(source.regression ? (source.regression.slope * conc + source.regression.intercept) : (stdArea * (conc / source.method.workingConcUgMl)));
      const area = (a.area !== undefined && a.area !== null && a.area > 0) ? a.area : calculatedArea;
      const injRt = (a.rt !== undefined && a.rt !== null && a.rt > 0) ? a.rt : rt;
      const injPlates = a.plates || basePlates;
      const injTailing = a.tailing || baseTailing;
      const injHeight = (a.height !== undefined && a.height !== null && a.height > 0)
        ? a.height
        : Math.round(peakHeight(area, injRt, injPlates));

      levelInjections.push({
        id: `acc_${level}_${i}`,
        _traceability: { rule: a.area ? "R1" : "R3", sourceSection: "Accuracy / Recovery" },
        no: String(i + 1).padStart(2, "0"),
        sampleName: a.sampleName || `Accuracy ${a.levelPct}% Prep ${i + 1}`,
        sampleId: `ACC-${level}-${i + 1}`,
        rt: injRt,
        area,
        height: injHeight,
        tailing: injTailing,
        plates: injPlates,
        areaPct: 100.0,
        resolution: "--",
        rrt: "1.000",
        _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
      });
    });
    if (levelInjections.length > 0) {
      groups.push({ id: `grp_acc_${level}`, name: `Accuracy / Recovery (${level}%)`, injections: levelInjections });
    }
  });

  // 5. Method Precision
  const mpInjections: InjectionData[] = source.methodPrec.map((m, i) => {
    const area = (m.area !== undefined && m.area !== null && m.area > 0)
      ? m.area
      : Math.round(stdArea * (m.assayPct / 100));
    const injRt = (m.rt !== undefined && m.rt !== null && m.rt > 0) ? m.rt : rt;
    const injPlates = m.plates || basePlates;
    const injTailing = m.tailing || baseTailing;
    const injHeight = (m.height !== undefined && m.height !== null && m.height > 0)
      ? m.height
      : Math.round(peakHeight(area, injRt, injPlates));

    return {
      id: `mp_${i}`,
      _traceability: { rule: m.area ? "R1" : "R2", sourceSection: "Method Precision" },
      no: String(i + 1).padStart(2, "0"),
      sampleName: m.sampleName || `Preparation ${i + 1}`,
      sampleId: `MP-${i + 1}`,
      rt: injRt,
      area,
      height: injHeight,
      tailing: injTailing,
      plates: injPlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
    };
  });
  if (mpInjections.length > 0) groups.push({ id: "grp_mp", name: "Method Precision", injections: mpInjections });

  // 6. Intermediate Precision
  const ipInjections: InjectionData[] = source.intermPrec.map((m, i) => {
    const area = (m.area !== undefined && m.area !== null && m.area > 0)
      ? m.area
      : Math.round(stdArea * (m.assayPct / 100));
    const ipRt = (m.rt !== undefined && m.rt !== null && m.rt > 0)
      ? m.rt
      : Number((rt + seededDrift(m.assayPct.toString() + i, 0.05)).toFixed(3));
    const injPlates = m.plates || basePlates;
    const injTailing = m.tailing || baseTailing;
    const injHeight = (m.height !== undefined && m.height !== null && m.height > 0)
      ? m.height
      : Math.round(peakHeight(area, ipRt, injPlates));

    return {
      id: `ip_${i}`,
      _traceability: { rule: m.area ? "R1" : "R2", sourceSection: "Intermediate Precision" },
      no: String(i + 1).padStart(2, "0"),
      sampleName: m.sampleName || `Analyst-2 Prep ${i + 1}`,
      sampleId: `IP-${i + 1}`,
      rt: ipRt,
      area,
      height: injHeight,
      tailing: injTailing,
      plates: injPlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(ipRt, injHeight, 0, injTailing),
    };
  });
  if (ipInjections.length > 0) groups.push({ id: "grp_ip", name: "Intermediate Precision", injections: ipInjections });

  // 7. Robustness
  const robInjections: InjectionData[] = [];
  source.robustness.forEach((r, i) => {
    if (r.injections && r.injections.length > 0) {
      r.injections.forEach((rinj, j) => {
        const injRt = (rinj.rt !== undefined && rinj.rt !== null && rinj.rt > 0) ? rinj.rt : (r.rt || rt);
        const injArea = rinj.area;
        const injPlates = rinj.plates || r.plates || basePlates;
        const injTailing = rinj.tailing || r.tailing || baseTailing;
        const injHeight = (rinj.height !== undefined && rinj.height !== null && rinj.height > 0)
          ? rinj.height
          : Math.round(peakHeight(injArea, injRt, injPlates));

        robInjections.push({
          id: `rob_${i}_${j}`,
          _traceability: { rule: "R1", sourceSection: "Robustness" },
          no: String(robInjections.length + 1).padStart(2, "0"),
          sampleName: rinj.sampleName || `${r.condition} - Inj ${j + 1}`,
          sampleId: `ROB-${i + 1}-${j + 1}`,
          rt: injRt,
          area: injArea,
          height: injHeight,
          tailing: injTailing,
          plates: injPlates,
          areaPct: 100.0,
          resolution: "--",
          rrt: "1.000",
          _trace: generatePeakTrace(injRt, injHeight, 0, injTailing),
        });
      });
    } else {
      let robRt = r.rt || rt;
      let robMeanArea = r.meanArea || stdArea;
      const lc = r.condition.toLowerCase();
      
      // Heuristics for flow
      if (lc.includes("flow")) {
        const match = lc.match(/([0-9.]+)\s*ml/);
        if (match && source.method.flowRate) {
          const flow = parseFloat(match[1]);
          robRt = rt * (source.method.flowRate / flow);
          robMeanArea = stdArea * (source.method.flowRate / flow);
        } else if (lc.includes("-") || lc.includes("low")) {
          robRt = rt * 1.1; robMeanArea = stdArea * 1.1;
        } else if (lc.includes("+") || lc.includes("high")) {
          robRt = rt * 0.9; robMeanArea = stdArea * 0.9;
        }
      } 
      // Heuristics for temp
      else if (lc.includes("temp") || lc.includes("column") || lc.includes("°c")) {
        const match = lc.match(/([0-9.]+)\s*°?c/);
        if (match && source.method.columnTempC) {
          const temp = parseFloat(match[1]);
          robRt = rt * (1 - 0.015 * (temp - source.method.columnTempC));
        } else if (lc.includes("-") || lc.includes("low")) {
          robRt = rt * (1 - 0.015 * (-5));
        } else if (lc.includes("+") || lc.includes("high")) {
          robRt = rt * (1 - 0.015 * (5));
        }
      }
      // Heuristics for pH
      else if (lc.includes("ph") || lc.includes("buffer")) {
        if (lc.includes("-") || lc.includes("low")) {
          robRt = rt * (1 + 0.05 * (-0.2));
        } else if (lc.includes("+") || lc.includes("high")) {
          robRt = rt * (1 + 0.05 * (0.2));
        }
      }

      const areas = generateAreasForRsd(r.n, robMeanArea, r.rsdPct);
      
      for (let j = 0; j < r.n; j++) {
        const area = areas[j];
        const injRt = Number((robRt + seededDrift(r.condition + j, 0.03)).toFixed(3));
        robInjections.push({
          id: `rob_${i}_${j}`, _traceability: { rule: "R6", sourceSection: "Robustness" }, no: String(robInjections.length + 1).padStart(2, "0"), sampleName: `${r.condition} - Inj ${j+1}`, sampleId: `ROB-${i}-${j}`,
          rt: injRt, area, height: Math.round(peakHeight(area, injRt, r.plates)),
          tailing: r.tailing, plates: r.plates, areaPct: 100.0, resolution: "--", rrt: "1.000",
          _trace: generatePeakTrace(injRt, Math.round(peakHeight(area, injRt, r.plates)), 0, r.tailing)
        });
      }
    }
  });
  if (robInjections.length > 0) groups.push({ id: "grp_rob", name: "Robustness", injections: robInjections });

  // 8. Solution Stability
  source.stability.forEach((s, i) => {
    const stabInjections: InjectionData[] = [];
    const stdAreaLocal = s.stdArea || Math.round(stdArea * (1 - s.diffPct / 100));
    const splAreaLocal = s.splArea || Math.round(stdArea * (1 - s.diffPct / 100));
    const stdRt = (s.stdRt !== undefined && s.stdRt !== null && s.stdRt > 0) ? s.stdRt : rt;
    const splRt = (s.splRt !== undefined && s.splRt !== null && s.splRt > 0) ? s.splRt : rt;
    const stabPlates = s.plates || basePlates;
    const stabTailing = s.tailing || baseTailing;

    stabInjections.push({
      id: `stab_${i}_std`, _traceability: { rule: "R8", sourceSection: "Solution Stability" }, no: "01", sampleName: `Stability Std ${s.hours} hr`, sampleId: `STAB-STD-${i}`,
      rt: stdRt, area: stdAreaLocal, height: Math.round(peakHeight(stdAreaLocal, stdRt, stabPlates)),
      tailing: stabTailing, plates: stabPlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
      _trace: generatePeakTrace(stdRt, Math.round(peakHeight(stdAreaLocal, stdRt, stabPlates)), 0, stabTailing)
    });
    
    if (s.splArea > 0) {
      stabInjections.push({
        id: `stab_${i}_spl`, _traceability: { rule: "R8", sourceSection: "Solution Stability" }, no: "02", sampleName: `Stability Spl ${s.hours} hr`, sampleId: `STAB-SPL-${i}`,
        rt: splRt, area: splAreaLocal, height: Math.round(peakHeight(splAreaLocal, splRt, stabPlates)),
        tailing: stabTailing, plates: stabPlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(splRt, Math.round(peakHeight(splAreaLocal, splRt, stabPlates)), 0, stabTailing)
      });
    }

    if (stabInjections.length > 0) {
      groups.push({ id: `grp_stab_${i}`, name: `Solution Stability (${s.hours} hr)`, injections: stabInjections });
    }
  });

  // 9. Limit of Detection (LOD)
  const lodData = source.lod || {
    concUgMl: Number((source.method.workingConcUgMl * 0.0033).toFixed(2)),
    snRatio: 3.32,
    area: Math.round(stdArea * 0.0033),
    height: Math.round(peakHeight(stdArea * 0.0033, rt, basePlates)),
  };
  const lodInjections: InjectionData[] = [
    {
      id: "lod_01",
      _traceability: { rule: "R9", sourceSection: "Limit of Detection (LOD)" },
      no: "01",
      sampleName: `LOD Solution (${lodData.concUgMl} ug/mL)`,
      sampleId: "LOD-01",
      rt: rt,
      area: lodData.area,
      height: lodData.height || Math.round(peakHeight(lodData.area, rt, basePlates)),
      tailing: baseTailing,
      plates: basePlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(rt, lodData.height || Math.round(peakHeight(lodData.area, rt, basePlates)), 0, baseTailing),
    },
  ];
  groups.push({ id: "grp_lod", name: "Limit of Detection (LOD)", kind: "LOD", injections: lodInjections });

  // 10. Limit of Quantitation (LOQ)
  const loqData = source.loq || {
    concUgMl: Number((source.method.workingConcUgMl * 0.01).toFixed(2)),
    snRatio: 10.24,
    area: Math.round(stdArea * 0.01),
    height: Math.round(peakHeight(stdArea * 0.01, rt, basePlates)),
    precisionRsdPct: 3.15,
  };
  const loqMeanArea = loqData.area;
  const loqAreas = loqData.injections?.map((inj: any) => inj.area) || generateAreasForRsd(6, loqMeanArea, loqData.precisionRsdPct || 3.15);
  const loqInjections: InjectionData[] = loqAreas.map((area: number, i: number) => {
    const injRt = Number((rt + seededDrift(`loq_${i}`, 0.02)).toFixed(3));
    const injH = Math.round(peakHeight(area, injRt, basePlates));
    return {
      id: `loq_${i}`,
      _traceability: { rule: "R9", sourceSection: "Limit of Quantitation (LOQ)" },
      no: String(i + 1).padStart(2, "0"),
      sampleName: `LOQ Replicate ${i + 1} (${loqData.concUgMl} ug/mL)`,
      sampleId: `LOQ-${String(i + 1).padStart(2, "0")}`,
      rt: injRt,
      area,
      height: injH,
      tailing: baseTailing,
      plates: basePlates,
      areaPct: 100.0,
      resolution: "--",
      rrt: "1.000",
      _trace: generatePeakTrace(injRt, injH, 0, baseTailing),
    };
  });
  groups.push({ id: "grp_loq", name: "Limit of Quantitation (LOQ)", kind: "LOQ", injections: loqInjections });

  // 11. Content of Uniformity (CU)
  if (source.contentOfUniformity && source.contentOfUniformity.length > 0) {
    const cuInjections: InjectionData[] = source.contentOfUniformity.map((cu, i) => {
      const injRt = cu.rt || rt;
      const injHeight = cu.height || Math.round(peakHeight(cu.area, injRt, basePlates));
      return {
        id: `cu_${i}`,
        _traceability: { rule: "R1", sourceSection: "Content of Uniformity" },
        no: String(i + 1).padStart(2, "0"),
        sampleName: cu.sampleName || `CU-${String(i + 1).padStart(2, "0")}`,
        sampleId: `CU-${String(i + 1).padStart(2, "0")}`,
        rt: injRt,
        area: cu.area,
        height: injHeight,
        tailing: baseTailing,
        plates: basePlates,
        areaPct: 100.0,
        resolution: "--",
        rrt: "1.000",
        _trace: generatePeakTrace(injRt, injHeight, 0, baseTailing),
      };
    });
    groups.push({
      id: "grp_cu",
      name: "Content of Uniformity (CU, n=10)",
      injections: cuInjections,
    });
  }

  return groups;
}

export function fmt(val: number | null | undefined, dec: number = 0): string {
  if (val === null || val === undefined || isNaN(val)) return "--";
  return val.toFixed(dec);
}

export function num(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function stats(arr: any[], fullOutput?: boolean) {
  const valid = arr
    .map((x) => parseFloat(x))
    .filter((x) => !isNaN(x) && x > 0);
  
  const n = valid.length;
  if (n === 0) return { n: 0, avg: 0, rsd: 0, max: 0, min: 0, sd: 0 };
  
  const sum = valid.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  
  if (n === 1) return { n, avg, rsd: 0, max, min, sd: 0 };
  
  const sumSq = valid.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
  const sd = Math.sqrt(sumSq / (n - 1));
  const rsd = (sd / avg) * 100;
  
  return { n, avg, rsd, max, min, sd };
}

export function getFixedTrace(inj: InjectionData, maxX: number = 30): [number, number][] {
  const hasArea = typeof inj.area === "number" && !isNaN(inj.area) && inj.area > 0;
  const isZero =
    inj.isNoPeak === true ||
    (inj.area !== null && inj.area !== undefined && inj.area === 0) ||
    (!hasArea && /^(blank|placebo|diluent|no[ _-]?peak)$/i.test((inj.sampleName || "").trim()));

  const numMaxX = typeof maxX === "number" && !isNaN(maxX) && maxX > 0 ? maxX : 30;

  if (isZero) {
    // Generate realistic flat baseline with micro-noise across the whole time axis for blanks
    const basePts: [number, number][] = [];
    const dt = 0.05;
    for (let t = 0; t <= numMaxX; t += dt) {
      const noise = (Math.sin(t * 11.2) * 1.5 + Math.cos(t * 24.3) * 1.2 + Math.sin(t * 53.7) * 0.8);
      basePts.push([parseFloat(t.toFixed(2)), parseFloat(noise.toFixed(2))]);
    }
    return basePts;
  }

  const safeRt = typeof inj.rt === "number" && !isNaN(inj.rt) && inj.rt > 0 ? inj.rt : 13.958;
  const safeTailing = typeof inj.tailing === "number" && !isNaN(inj.tailing) && inj.tailing > 0 ? inj.tailing : 1.12;
  const safePlates = typeof inj.plates === "number" && !isNaN(inj.plates) && inj.plates > 0 ? inj.plates : 64000;
  const safeArea = hasArea ? (inj.area as number) : 50000;

  // Auto-calculate height if missing or <= 0
  const calculatedHeight = Math.round(peakHeight(safeArea, safeRt, safePlates));
  const safeHeight = typeof inj.height === "number" && !isNaN(inj.height) && inj.height > 0
    ? inj.height
    : (calculatedHeight > 0 ? calculatedHeight : 5000);

  const safeMaxX = Math.max(numMaxX, Math.ceil(safeRt * 1.3), 10);

  // Theoretical Gaussian width from plates: W1/2(min) = tR * sqrt(5.54 / N)
  // W1/2 = 2.35482 * sigma  =>  sigma = W1/2 / 2.35482
  const wHalfMin = safeRt * Math.sqrt(5.54 / safePlates);
  const sigma = wHalfMin / 2.35482;

  const points: [number, number][] = [];
  const deg = inj.degradantInfo;

  // Adaptive sampling: high-density (0.005 min) in peak region for ultra-smooth bell curve
  let t = 0;
  while (t <= safeMaxX) {
    const inPeakRegion = Math.abs(t - safeRt) <= 2.0 || (deg && deg.degradantRt && Math.abs(t - deg.degradantRt) <= 1.5);
    const dt = inPeakRegion ? 0.005 : 0.04;

    let y = 0;

    // Main analyte peak with tailing factor
    const dtPeak = t - safeRt;
    const effectiveSigma = dtPeak > 0 ? sigma * safeTailing : sigma;
    const mainPeak = safeHeight * Math.exp(-0.5 * Math.pow(dtPeak / effectiveSigma, 2));
    if (mainPeak > 0.05) y += mainPeak;

    // Degradant peak if present in data
    if (deg && deg.degradantRt && deg.degradantHeight > 0) {
      const degWHalf = deg.degradantRt * Math.sqrt(5.54 / (deg.degradantPlates || safePlates));
      const degSigma = degWHalf / 2.35482;
      const dtDeg = t - deg.degradantRt;
      const effectiveDegSigma = dtDeg > 0 ? degSigma * (deg.degradantTailing || 1.08) : degSigma;
      const degPeak = deg.degradantHeight * Math.exp(-0.5 * Math.pow(dtDeg / effectiveDegSigma, 2));
      if (degPeak > 0.05) y += degPeak;
    }

    // Realistic baseline micro-noise (0.02% of peak height)
    const noiseAmp = Math.min(15, Math.max(1, safeHeight * 0.00015));
    const noise = Math.sin(t * 9.2) * (noiseAmp * 0.4) + Math.cos(t * 23.5) * (noiseAmp * 0.35) + Math.sin(t * 51.1) * (noiseAmp * 0.25);

    points.push([parseFloat(t.toFixed(3)), parseFloat((y + noise).toFixed(2))]);
    t += dt;
  }

  // Ensure exact apex is present
  const apexIdx = points.findIndex(p => Math.abs(p[0] - safeRt) < 0.003);
  if (apexIdx >= 0) {
    points[apexIdx] = [safeRt, safeHeight];
  } else {
    points.push([safeRt, safeHeight]);
    points.sort((a, b) => a[0] - b[0]);
  }

  return points;
}

export function calculateRRT(injections: InjectionData[], refRt: number) {
  injections.forEach((inj) => {
    if (inj.rt) inj.rrt = (inj.rt / refRt).toFixed(3);
  });
}

export function calculateResolution(injections: InjectionData[]) {
  // dummy
}

export function autoFillAllGroups(groups: GroupData[]) { return groups.map(g => autoFillGroup(g)); }
export function autoFillGroup(group: GroupData) {
  return group;
}

export function calculateTraceMetrics(pts: [number, number][]) {
  return { rt: 0, area: 0, height: 0, plates: 60000, tailing: 1.0, trace: pts };
}
