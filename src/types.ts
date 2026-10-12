export interface DegradantInfo {
  condition: string;
  remainingPct: number;
  degradantRrt: number;
  degradantRt: number;
  degradantArea: number;
  degradantHeight: number;
  degradantPlates: number;
  degradantTailing: number;
  resolution: string;
}

export interface InjectionData {
  id: string;
  no: string;
  sampleName: string;
  sampleId: string;
  rt: number | null;
  area: number | null;
  height: number | null;
  tailing: number | null;
  plates: number | null;
  areaPct: number | null;
  resolution: string | null;
  rrt: string | null;
  _trace?: [number, number][];
  _traceability?: { rule: string; sourceSection: string; };
  degradantInfo?: DegradantInfo;
  isNoPeak?: boolean;
}

export interface GroupData {
  id: string;
  name: string;
  kind?: string;
  fixedSampleId?: string;
  compound?: string;
  injections: InjectionData[];
}

export interface ReportHeader {
  company: string;
  address: string;
  compound: string;
  detector: string;
  analyst: string;
  date: string;
  baseName: string;
  batchNo?: string;
  reportNo?: string;
  strength?: string;
}

export interface StatsResult {
  n: number;
  avg: number | null;
  rsd: number | null;
  max: number | null;
  min: number | null;
  sd: number | null;
}

export interface AmvSource {
  headerInfo?:  { company?: string; reportNo?: string; batchNo?: string; reportDate?: string; analyst?: string; testParameter?: string };
  product:      { name: string; strength: string; labelClaim: string };
  method:       { runTimeMin: number; flowRate: number; columnTempC: number;
                  wavelengthNm: number; injectionVolUl: number;
                  workingConcUgMl: number };
  analyteRtMin: number;              // Specificity table, standard solution row
  sst:          { area: number; tailing: number; plates: number; rt?: number; height?: number; sampleName?: string }[];
  linearity:    { levelPct: number; concUgMl: number; meanArea: number; area?: number; rt?: number; height?: number; tailing?: number; plates?: number; sampleName?: string }[];
  range?:       { levelPpm?: number; levelPct?: number; concUgMl?: number; sampleId?: string; sampleName?: string; area: number; rt?: number; height?: number; tailing?: number; plates?: number }[];
  regression:   { slope: number; intercept: number; r: number; r2: number };
  accuracy:     { levelPct: number; addedMg: number; recoveredMg: number;
                  recoveryPct: number; area?: number; rt?: number; height?: number; tailing?: number; plates?: number; sampleName?: string }[];
  methodPrec:   { assayPct: number; area?: number; rt?: number; height?: number; tailing?: number; plates?: number; sampleName?: string }[];
  intermPrec:   { assayPct: number; area?: number; rt?: number; height?: number; tailing?: number; plates?: number; sampleName?: string }[];
  robustness:   { condition: string; rsdPct: number; tailing: number;
                  plates: number; n: number; meanArea?: number; rt?: number;
                  injections?: { area: number; rt?: number; height?: number; tailing?: number; plates?: number; sampleName?: string }[] }[];
  hasSpecificity?: boolean;
  specificityInjections?: { sampleName: string; rt?: number | null; area?: number; height?: number; tailing?: number | null; plates?: number | null; isNoPeak?: boolean }[];
  stability:    { hours: number; stdArea: number; splArea: number;
                  diffPct: number; stdRt?: number; splRt?: number; tailing?: number; plates?: number }[];
  lod?:         { concUgMl: number; snRatio: number; area: number; height: number; rt?: number };
  loq?:         { concUgMl: number; snRatio: number; area: number; height: number; rt?: number;
                  precisionRsdPct: number; injections?: { area: number; height: number; rt?: number }[] };
  degradation:  { condition: string; remainingPct: number;
                  degradantRrt: number; analyteArea?: number; degradantArea?: number; degradantRt?: number }[] | null;
  contentOfUniformity?: { sampleName: string; area: number; contentPct: number; rt?: number; height?: number }[];
  conflicts:    { field: string; values: string[]; used: string }[];
  missing:      string[];
}
