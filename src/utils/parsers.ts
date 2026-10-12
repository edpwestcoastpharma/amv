import { GroupData, InjectionData } from "../types";
import { num } from "./calculations";

export function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const delim = text.includes("\t") && !text.includes(",") ? "\t" : ",";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

export function parseQuickPaste(text: string, defaultSampleId: string = ""): InjectionData[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const injections: InjectionData[] = [];

  lines.forEach((line, index) => {
    const parts = line
      .split(/\t|,|;|\s{2,}/)
      .map((x) => x.trim())
      .filter((x) => x !== "");
    if (!parts.length) return;

    let sampleName = `Sample ${(index + 1).toString().padStart(2, "0")}`;
    let sampleId = defaultSampleId;
    let rt: number | null = null;
    let area: number | null = null;
    let height: number | null = null;
    let tailing: number | null = null;
    let plates: number | null = null;
    let areaPct: number | null = 100.0;
    let resolution: string | null = "--";
    let rrt: string | null = "--";

    if (isNaN(parseFloat(parts[0]))) {
      sampleName = parts[0];
      const rest = parts.slice(1);
      if (
        rest.length &&
        /[A-Za-z/]/.test(rest[0]) &&
        isNaN(parseFloat(rest[0]))
      ) {
        sampleId = rest[0];
        rest.shift();
      }
      rt = num(rest[0]);
      area = num(rest[1]);
      height = num(rest[2]);
      tailing = num(rest[3]);
      plates = num(rest[4]);
      if (rest[5] !== undefined) areaPct = num(rest[5]);
      if (rest[6] !== undefined) resolution = rest[6];
      if (rest[7] !== undefined) rrt = rest[7];
    } else {
      rt = num(parts[0]);
      area = num(parts[1]);
      height = num(parts[2]);
      tailing = num(parts[3]);
      plates = num(parts[4]);
      if (parts[5] !== undefined) areaPct = num(parts[5]);
      if (parts[6] !== undefined) resolution = parts[6];
      if (parts[7] !== undefined) rrt = parts[7];
    }

    injections.push({
      id: "inj_" + Math.random().toString(36).substring(2, 9),
      no: (index + 1).toString().padStart(2, "0"),
      sampleName,
      sampleId,
      rt,
      area,
      height,
      tailing,
      plates,
      areaPct: areaPct ?? 100.0,
      resolution: resolution ?? "--",
      rrt: rrt ?? "--",
    });
  });

  return injections;
}

export function parseRawSignalRows(rows: string[][]): [number, number][] {
  if (!rows || !rows.length) return [];
  const firstNumeric = rows[0].every(
    (c) => c !== "" && !isNaN(parseFloat(c))
  );
  const body = firstNumeric ? rows : rows.slice(1);
  const trace: [number, number][] = [];
  body.forEach((rr) => {
    const t = parseFloat(rr[0]);
    const y = parseFloat(rr[1]);
    if (!isNaN(t) && !isNaN(y)) trace.push([t, y]);
  });
  return trace;
}
