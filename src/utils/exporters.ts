import { GroupData, ReportHeader } from "../types";
import { fmt, stats } from "./calculations";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(group: GroupData) {
  if (!group || !group.injections.length) return;
  const lines = [
    "No.,Sample Name,Ret. Time,Area,Height,Tailing Factor,Theoretical Plate(USP),Area%,Resolution(USP),Relative Retention Time",
  ];
  group.injections.forEach((inj) => {
    lines.push(
      [
        inj.no,
        `"${(inj.sampleName || "").replace(/"/g, '""')}"`,
        inj.rt !== null ? inj.rt : "",
        inj.area !== null ? inj.area : "",
        inj.height !== null ? inj.height : "",
        inj.tailing !== null ? inj.tailing : "",
        inj.plates !== null ? inj.plates : "",
        inj.areaPct !== null ? inj.areaPct : "",
        `"${inj.resolution || "--"}"`,
        `"${inj.rrt || "--"}"`,
      ].join(",")
    );
  });

  const rtS = stats(group.injections.map((i) => i.rt));
  const arS = stats(group.injections.map((i) => i.area));
  const htS = stats(group.injections.map((i) => i.height));
  const tfS = stats(group.injections.map((i) => i.tailing));
  const plS = stats(group.injections.map((i) => i.plates));

  lines.push(`Average,,${fmt(rtS.avg, 3)},${fmt(arS.avg, 0)},${fmt(htS.avg, 0)},${fmt(tfS.avg, 3)},${fmt(plS.avg, 0)},0.000,0.000,--`);
  lines.push(`%RSD,,${fmt(rtS.rsd, 3)},${fmt(arS.rsd, 3)},${fmt(htS.rsd, 3)},${fmt(tfS.rsd, 3)},${fmt(plS.rsd, 3)},--,--,--`);
  lines.push(`Maximum,,${fmt(rtS.max, 3)},${fmt(arS.max, 0)},${fmt(htS.max, 0)},${fmt(tfS.max, 3)},${fmt(plS.max, 0)},100.000,--,--`);
  lines.push(`Minimum,,${fmt(rtS.min, 3)},${fmt(arS.min, 0)},${fmt(htS.min, 0)},${fmt(tfS.min, 3)},${fmt(plS.min, 0)},100.000,--,--`);
  lines.push(`Standard Deviation,,${fmt(rtS.sd, 3)},${fmt(arS.sd, 0)},${fmt(htS.sd, 0)},${fmt(tfS.sd, 3)},${fmt(plS.sd, 0)},0.000,--,--`);

  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const safeGroupName = (group?.name || "Group").replace(/\s+/g, "_");
  downloadBlob(blob, `${safeGroupName}_HPLC_Report.csv`);
}

function colName(n: number): string {
  let s = "";
  n++;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetXML(rows: (string | number | null | undefined)[][]): string {
  const body = rows
    .map((row, ri) => {
      const cells = (row || [])
        .map((val, ci) => {
          const ref = colName(ci) + (ri + 1);
          if (val === "" || val === null || val === undefined) return "";
          if (typeof val === "number" && isFinite(val)) {
            return `<c r="${ref}"><v>${val}</v></c>`;
          }
          const t = String(val)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${t}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function zipStore(files: Record<string, string>): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  function u32(n: number) {
    return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  }
  function u16(n: number) {
    return [n & 255, (n >> 8) & 255];
  }

  function crc32(u8: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < u8.length; i++) {
      let c = (crc ^ u8[i]) & 255;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  for (const name in files) {
    const data = enc.encode(files[name]);
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const local = [
      0x50,
      0x4b,
      0x03,
      0x04,
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
    ];
    chunks.push(new Uint8Array(local));
    chunks.push(nameBytes);
    chunks.push(data);

    const cen = [
      0x50,
      0x4b,
      0x01,
      0x02,
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
    ];
    central.push(new Uint8Array(cen));
    central.push(nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  let centralSize = 0;
  central.forEach((c) => {
    centralSize += c.length;
  });
  const centralStart = offset;

  const end = [
    0x50,
    0x4b,
    0x05,
    0x06,
    ...u16(0),
    ...u16(0),
    ...u16(Object.keys(files).length),
    ...u16(Object.keys(files).length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0),
  ];

  return new Blob(
    [
      ...chunks,
      ...central,
      new Uint8Array(end),
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );
}

export function exportExcel(groups: GroupData[], header: ReportHeader) {
  if (!groups.length) return;
  const sheets: {
    name: string;
    rows: (string | number | null | undefined)[][];
  }[] = [];

  groups.forEach((g) => {
    if (!g.injections.length) return;
    const rows: (string | number | null | undefined)[][] = [
      [header.company],
      ...(header.address && header.address.trim() !== "" && !header.address.includes("GOTA, Ahmedabad")
        ? [[header.address]]
        : []),
      [`Compound: ${header.compound}`, `Detector: ${header.detector}`],
      [],
      [
        "No.",
        "Sample Name",
        "Ret. Time",
        "Area",
        "Height",
        "Tailing Factor",
        "Theoretical Plate(USP)",
        "Area%",
        "Resolution(USP)",
        "Relative Retention Time",
      ],
    ];

    g.injections.forEach((inj) => {
      rows.push([
        inj.no,
        inj.sampleName || "",
        inj.rt,
        inj.area,
        inj.height,
        inj.tailing,
        inj.plates,
        inj.areaPct,
        inj.resolution || "--",
        inj.rrt || "--",
      ]);
    });

    const rtS = stats(g.injections.map((i) => i.rt));
    const arS = stats(g.injections.map((i) => i.area));
    const htS = stats(g.injections.map((i) => i.height));
    const tfS = stats(g.injections.map((i) => i.tailing));
    const plS = stats(g.injections.map((i) => i.plates));

    rows.push([]);
    rows.push(["Average", "", rtS.avg, arS.avg, htS.avg, tfS.avg, plS.avg, 0, 0, "--"]);
    rows.push(["%RSD", "", rtS.rsd, arS.rsd, htS.rsd, tfS.rsd, plS.rsd, "--", "--", "--"]);
    rows.push(["Maximum", "", rtS.max, arS.max, htS.max, tfS.max, plS.max, 100, "--", "--"]);
    rows.push(["Minimum", "", rtS.min, arS.min, htS.min, tfS.min, plS.min, 100, "--", "--"]);
    rows.push(["Standard Deviation", "", rtS.sd, arS.sd, htS.sd, tfS.sd, plS.sd, 0, "--", "--"]);

    const groupNameStr = g?.name || "Sheet";
    sheets.push({
      name: groupNameStr.substring(0, 28).replace(/[\\/?*\[\]:]/g, "_"),
      rows,
    });
  });

  if (!sheets.length) return;

  const files: Record<string, string> = {};
  files["[Content_Types].xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")}</Types>`;
  files["_rels/.rels"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files["xl/workbook.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map(
      (s, i) =>
        `<sheet name="${(s.name || `Sheet${i + 1}`).replace(/[\\/?*\[\]:]/g, "_").substring(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join("")}</sheets></workbook>`;
  files["xl/_rels/workbook.xml.rels"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("")}</Relationships>`;

  sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXML(s.rows);
  });

  const blob = zipStore(files);
  const safeCompound = (header?.compound || "Sample").replace(/\s+/g, "_");
  downloadBlob(
    blob,
    `AMV_Report_${safeCompound}_HPLC.xlsx`
  );
}

export function exportWord(reportHtml: string, compound: string) {
  // Inject strict MS Word page breaks before each report-page (except the first)
  let pageCount = 0;
  let processedHtml = reportHtml.replace(/<div([^>]*)class="([^"]*report-page[^"]*)"([^>]*)>/g, (match, p1, p2, p3) => {
    pageCount++;
    if (pageCount > 1) {
      return '<br clear="all" style="mso-special-character:line-break;page-break-before:always" />\n' + match;
    }
    return match;
  });

  const head =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    "<head><meta charset=\"utf-8\"><title>AMV Report</title>" +
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->" +
    "<style>" +
    "@page Section1 { size:21cm 29.7cm; margin:0.8cm; } div.Section1 { page:Section1; }" +
    "body { font-family:'Arial',sans-serif; font-size:10pt; color:#000; }" +
    "table { border-collapse:collapse; margin:4pt 0; width:100%; border:1px solid #000; }" +
    "th, td { border:1px solid #000; padding:2px; vertical-align:middle; }" +
    "tr { page-break-inside: avoid; }" +
    ".no-print { display: none !important; }" +
    /* Tailwind Typography Mappings */
    ".text-left { text-align: left !important; } .text-center { text-align: center !important; } .text-right { text-align: right !important; }" +
    ".font-bold { font-weight: bold !important; } .font-semibold { font-weight: bold !important; } .font-medium { font-weight: bold !important; }" +
    ".font-mono { font-family: 'Courier New', Courier, monospace !important; }" +
    ".font-sans { font-family: Arial, Helvetica, sans-serif !important; }" +
    ".font-serif { font-family: 'Times New Roman', Times, serif !important; }" +
    ".text-xs { font-size: 8pt !important; } .text-sm { font-size: 9pt !important; }" +
    ".text-\\[9px\\] { font-size: 7pt !important; } .text-\\[9\\.5px\\] { font-size: 7.5pt !important; } .text-\\[10px\\] { font-size: 7.5pt !important; }" +
    ".text-\\[10\\.5px\\] { font-size: 8pt !important; } .text-\\[11px\\] { font-size: 8.5pt !important; }" +
    ".text-\\[12\\.5px\\] { font-size: 9.5pt !important; } .text-\\[13px\\] { font-size: 10pt !important; } .text-\\[15px\\] { font-size: 11.5pt !important; }" +
    /* Tailwind Color Mappings */
    ".bg-slate-50 { background-color: #f8fafc !important; } .bg-slate-100 { background-color: #f1f5f9 !important; }" +
    ".bg-slate-200 { background-color: #e2e8f0 !important; } .bg-slate-900 { background-color: #0f172a !important; color: #fff !important; }" +
    ".bg-emerald-50 { background-color: #ecfdf5 !important; } .bg-amber-50 { background-color: #fffbeb !important; }" +
    ".bg-blue-50 { background-color: #eff6ff !important; } .bg-rose-50 { background-color: #fff1f2 !important; }" +
    ".bg-cyan-50 { background-color: #ecfeff !important; } .bg-purple-50 { background-color: #faf5ff !important; }" +
    ".bg-yellow-50 { background-color: #fefce8 !important; } .bg-orange-50 { background-color: #fff7ed !important; }" +
    /* Text Colors */
    ".text-slate-500 { color: #64748b !important; } .text-slate-600 { color: #475569 !important; } .text-slate-700 { color: #334155 !important; }" +
    ".text-slate-800 { color: #1e293b !important; } .text-slate-900 { color: #0f172a !important; }" +
    ".text-emerald-700, .text-emerald-800 { color: #047857 !important; } .text-blue-700, .text-blue-800, .text-blue-900 { color: #1d4ed8 !important; }" +
    ".text-rose-700 { color: #be123c !important; } .text-amber-900 { color: #78350f !important; }" +
    /* Borders & Spacing */
    ".border-0, .border-none { border: none !important; } .border-b { border-bottom: 1px solid #000 !important; }" +
    ".border-black { border: 1px solid #000 !important; }" +
    ".border-slate-200 { border: 1px solid #e2e8f0 !important; } .border-slate-300 { border: 1px solid #cbd5e1 !important; } .border-slate-400 { border: 1px solid #94a3b8 !important; }" +
    ".p-1 { padding: 4px !important; } .p-1\\.5 { padding: 6px !important; } .p-2 { padding: 8px !important; }" +
    ".px-1 { padding-left: 4px !important; padding-right: 4px !important; } .px-1\\.5 { padding-left: 6px !important; padding-right: 6px !important; } .px-2 { padding-left: 8px !important; padding-right: 8px !important; }" +
    ".py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; } .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; } .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; } .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }" +
    ".mb-2 { margin-bottom: 8px; } .mt-4 { margin-top: 16px; }" +
    /* Width Mappings */
    ".w-8 { width: 32px !important; } .w-24 { width: 96px !important; } .w-28 { width: 112px !important; }" +
    ".w-40 { width: 160px !important; } .w-full { width: 100% !important; }" +
    ".w-1\\/3 { width: 33.333% !important; } .w-2\\/3 { width: 66.666% !important; }" +
    /* Specific overrides */
    "table.ls td, table.ls th { border:0.5pt solid #000; font-family:Arial,sans-serif; font-size:7.5pt !important; padding: 2px 4px !important; }" +
    "table.ls td.n { text-align:right; } table.ls td.c { text-align:center; }" +
    ".rep-co { text-align:center; font-weight:bold; } .rep-co .l1 { font-size:13pt; } .rep-co .l2 { font-size:11pt; font-weight:normal; }" +
    ".det-head,.cmp-head { font-family:Arial,sans-serif; font-size:9pt; } .sec-title { text-align:center; font-size:10pt; }" +
    ".rep-tag { font-family:Arial,sans-serif; font-size:8pt; } svg { max-width:100%; display:none; } img { max-width: 100%; }" +
    "</style></head><body><div class=\"Section1\">";

  const fullHtml = head + processedHtml + "</div></body></html>";
  
  // Convert to MHTML to support embedded base64 images in MS Word
  const boundary = "----=_NextPart_Boundary_" + Date.now();
  let mht = `MIME-Version: 1.0\nContent-Type: multipart/related; boundary="${boundary}"\n\n`;
  
  const imageParts: string[] = [];
  let imgCount = 0;
  
  // Replace base64 data URIs with Content-Location references
  const modifiedHtml = fullHtml.replace(/src="data:(image\/[^;]+);base64,([^"]+)"/g, (match, mimeType, b64Data) => {
    imgCount++;
    const ext = mimeType.split('/')[1] || 'jpeg';
    const imgName = `image${imgCount}.${ext}`;
    
    // MS Word MHTML parser requires base64 lines to be max 76 chars
    const chunkedB64 = b64Data.replace(/(.{76})/g, "$1\n");
    
    imageParts.push(
      `--${boundary}\n` +
      `Content-Type: ${mimeType}\n` +
      `Content-Transfer-Encoding: base64\n` +
      `Content-Location: ${imgName}\n\n` +
      `${chunkedB64}\n`
    );
    
    return `src="${imgName}"`;
  });
  
  // Assemble MHTML parts
  mht += `--${boundary}\n`;
  mht += `Content-Type: text/html; charset="utf-8"\n`;
  mht += `Content-Transfer-Encoding: 8bit\n\n`;
  mht += `${modifiedHtml}\n\n`;
  mht += imageParts.join("\n");
  mht += `--${boundary}--\n`;

  const blob = new Blob([mht], { type: "application/msword" });
  const safeWordCompound = (compound || "Sample").replace(/\s+/g, "_");
  downloadBlob(blob, `AMV_Report_${safeWordCompound}.doc`);
}

export interface PdfExportOptions {
  pageIndices?: number[];
  scale?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

export async function generateDirectPDF(
  pagesContainer: HTMLElement,
  filename: string,
  onProgress?: (msg: string, current?: number, total?: number) => void,
  options?: PdfExportOptions
): Promise<void> {
  const allPages = Array.from(pagesContainer.querySelectorAll<HTMLElement>(".report-page"));
  if (!allPages.length) {
    throw new Error("No report pages found to generate PDF. Please ensure Report View is loaded.");
  }

  // Filter pages if specific pageIndices provided
  const pages = options?.pageIndices && options.pageIndices.length > 0
    ? options.pageIndices
        .map((idx) => allPages[idx])
        .filter((p): p is HTMLElement => Boolean(p))
    : allPages;

  if (!pages.length) {
    throw new Error("Selected page range has no pages to generate.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const totalPages = pages.length;
  const pdfWidth = 210; // A4 width mm
  const pdfHeight = 297; // A4 height mm
  let completedPages = 0;

  // Optimized batch concurrency (3 parallel renders for multi-core throughput)
  const batchSize = Math.max(1, options?.concurrency || 3);
  const renderScale = options?.scale || 1.0; // 1.0 provides exact crisp 1:1 pixel rendering at 3x the speed

  for (let i = 0; i < totalPages; i += batchSize) {
    if (options?.signal?.aborted) {
      throw new Error("PDF generation was cancelled.");
    }

    const chunk = pages.slice(i, i + batchSize);
    
    if (onProgress) {
      onProgress(
        `Fast-rendering pages ${i + 1}-${Math.min(i + batchSize, totalPages)} of ${totalPages}...`,
        completedPages,
        totalPages
      );
    }

    // Small yield to keep UI responsive
    await new Promise((resolve) => setTimeout(resolve, 8));

    if (options?.signal?.aborted) {
      throw new Error("PDF generation was cancelled.");
    }

    const renderedImages = await Promise.all(
      chunk.map(async (pageEl) => {
        try {
          const canvas = await html2canvas(pageEl, {
            scale: renderScale,
            useCORS: false,
            logging: false,
            backgroundColor: "#ffffff",
            imageTimeout: 0,
            removeContainer: true,
            ignoreElements: (el) => el.classList?.contains("no-print"),
          });
          return canvas.toDataURL("image/jpeg", 0.75);
        } catch (err) {
          console.warn("Error rendering page element:", err);
          return null;
        }
      })
    );

    if (options?.signal?.aborted) {
      throw new Error("PDF generation was cancelled.");
    }

    // Append rendered page images to jsPDF document in strict order
    for (const imgData of renderedImages) {
      if (imgData) {
        if (completedPages > 0) {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }
      completedPages++;
      if (onProgress) {
        onProgress(`Page ${completedPages} of ${totalPages} compiled`, completedPages, totalPages);
      }
    }
  }

  if (onProgress) onProgress("Finalizing & saving PDF file...", totalPages, totalPages);

  // Reliable cross-browser Blob download
  const blob = pdf.output("blob");
  downloadBlob(blob, filename);
}
