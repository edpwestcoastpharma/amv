import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const amvSourceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    headerInfo: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING },
        reportNo: { type: Type.STRING },
        batchNo: { type: Type.STRING },
        reportDate: { type: Type.STRING },
        analyst: { type: Type.STRING },
        testParameter: { type: Type.STRING },
      },
    },
    product: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        strength: { type: Type.STRING },
        labelClaim: { type: Type.STRING },
      },
      required: ["name", "strength", "labelClaim"],
    },
    method: {
      type: Type.OBJECT,
      properties: {
        runTimeMin: { type: Type.NUMBER },
        flowRate: { type: Type.NUMBER },
        columnTempC: { type: Type.NUMBER },
        wavelengthNm: { type: Type.NUMBER },
        injectionVolUl: { type: Type.NUMBER },
        workingConcUgMl: { type: Type.NUMBER },
      },
      required: ["runTimeMin", "flowRate", "columnTempC", "wavelengthNm", "injectionVolUl", "workingConcUgMl"],
    },
    analyteRtMin: { type: Type.NUMBER },
    sst: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.NUMBER },
          tailing: { type: Type.NUMBER },
          plates: { type: Type.NUMBER },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
        },
        required: ["area", "tailing", "plates"],
      },
    },
    linearity: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          levelPct: { type: Type.NUMBER },
          concUgMl: { type: Type.NUMBER },
          meanArea: { type: Type.NUMBER },
          area: { type: Type.NUMBER, nullable: true },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
        },
        required: ["levelPct", "concUgMl", "meanArea"],
      },
    },
    range: {
      type: Type.ARRAY,
      nullable: true,
      description: "Range section determinations (e.g. Range 8.2 table with Sample ID Range-1A, 1B, 1C, 2A, 2B, 2C at 18.75 ppm, 31.25 ppm, etc.)",
      items: {
        type: Type.OBJECT,
        properties: {
          levelPpm: { type: Type.NUMBER, nullable: true },
          levelPct: { type: Type.NUMBER, nullable: true },
          concUgMl: { type: Type.NUMBER, nullable: true },
          sampleId: { type: Type.STRING, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
          area: { type: Type.NUMBER },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
        },
        required: ["area"],
      },
    },
    regression: {
      type: Type.OBJECT,
      properties: {
        slope: { type: Type.NUMBER },
        intercept: { type: Type.NUMBER },
        r: { type: Type.NUMBER },
        r2: { type: Type.NUMBER },
      },
      required: ["slope", "intercept", "r", "r2"],
    },
    accuracy: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          levelPct: { type: Type.NUMBER },
          addedMg: { type: Type.NUMBER },
          recoveredMg: { type: Type.NUMBER },
          recoveryPct: { type: Type.NUMBER },
          area: { type: Type.NUMBER, nullable: true },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
        },
        required: ["levelPct", "addedMg", "recoveredMg", "recoveryPct"],
      },
    },
    methodPrec: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          assayPct: { type: Type.NUMBER },
          area: { type: Type.NUMBER, nullable: true },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
        },
        required: ["assayPct"],
      },
    },
    intermPrec: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          assayPct: { type: Type.NUMBER },
          area: { type: Type.NUMBER, nullable: true },
          rt: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
          sampleName: { type: Type.STRING, nullable: true },
        },
        required: ["assayPct"],
      },
    },
    robustness: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          condition: { type: Type.STRING },
          rsdPct: { type: Type.NUMBER },
          tailing: { type: Type.NUMBER },
          plates: { type: Type.NUMBER },
          n: { type: Type.NUMBER },
          meanArea: { type: Type.NUMBER, nullable: true },
          rt: { type: Type.NUMBER, nullable: true },
          injections: {
            type: Type.ARRAY,
            nullable: true,
            items: {
              type: Type.OBJECT,
              properties: {
                sampleName: { type: Type.STRING, nullable: true },
                rt: { type: Type.NUMBER, nullable: true },
                area: { type: Type.NUMBER },
                height: { type: Type.NUMBER, nullable: true },
                tailing: { type: Type.NUMBER, nullable: true },
                plates: { type: Type.NUMBER, nullable: true },
              },
              required: ["area"],
            },
          },
        },
        required: ["condition", "rsdPct", "tailing", "plates", "n"],
      },
    },
    hasSpecificity: { type: Type.BOOLEAN, description: "True if the report has a Specificity or Selectivity section, false otherwise." },
    specificityInjections: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          sampleName: { type: Type.STRING },
          rt: { type: Type.NUMBER, nullable: true },
          area: { type: Type.NUMBER, nullable: true },
          height: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
        },
        required: ["sampleName"],
      },
    },
    stability: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hours: { type: Type.NUMBER },
          stdArea: { type: Type.NUMBER },
          splArea: { type: Type.NUMBER },
          diffPct: { type: Type.NUMBER },
          stdRt: { type: Type.NUMBER, nullable: true },
          splRt: { type: Type.NUMBER, nullable: true },
          tailing: { type: Type.NUMBER, nullable: true },
          plates: { type: Type.NUMBER, nullable: true },
        },
        required: ["hours", "stdArea", "splArea", "diffPct"],
      },
    },
    degradation: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          condition: { type: Type.STRING },
          remainingPct: { type: Type.NUMBER },
          degradantRrt: { type: Type.NUMBER },
        },
        required: ["condition", "remainingPct", "degradantRrt"],
      },
    },
    contentOfUniformity: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          sampleName: { type: Type.STRING },
          area: { type: Type.NUMBER },
          contentPct: { type: Type.NUMBER },
          rt: { type: Type.NUMBER, nullable: true },
        },
        required: ["sampleName", "area", "contentPct"],
      },
    },
    conflicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          values: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          used: { type: Type.STRING },
        },
        required: ["field", "values", "used"],
      },
    },
    missing: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "product", "method", "analyteRtMin", "sst", "linearity", "regression", 
    "accuracy", "methodPrec", "intermPrec", "robustness", "stability", "hasSpecificity", 
    "conflicts", "missing"
  ],
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/api/extract-amv", async (req, res) => {
  try {
    const { base64Data, mimeType, fileName, customKey } = req.body;
    if (!base64Data || !mimeType) {
      res.status(400).json({ error: "Missing file data or mimeType" });
      return;
    }
    const apiKey = customKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        error: "GEMINI_API_KEY is not configured.",
      });
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const promptText = `Extract data from this Analytical Method Validation (AMV) report according to the following schema strictly.
- PRINCIPLE 0 — EXTRACT EXACT PRINTED TABLE NUMBERS FIRST:
  * Extract headerInfo: company name, report number (reportNo), batch number (batchNo), report date (reportDate), analyst names, and test parameter. Copy character for character from the title/header block.
  * For every section and table in the AMV report, extract exact printed values (Area, Ret. Time (rt), Height, Theoretical Plates, Tailing Factor, Assay %, Recovery %, etc.).
  * For Method Precision: extract the exact Area, RT, Plates, Tailing, and Assay % for every preparation row printed in the table.
  * For Intermediate Precision: extract the exact Area, RT, Plates, Tailing, and Assay % for every preparation row.
  * For System Suitability: extract exact Area, RT, Tailing, Plates, and Height for every injection row.
  * For Accuracy / Recovery: extract the exact Area, RT, Added (addedMg), Recovered (recoveredMg), and Recovery % for every replicate / row.
  * For Linearity: extract the exact meanArea (and individual areas if present), concUgMl, and RT for each level.
  * For Range (e.g. Section 8.2 Range table with determinations at 18.75 ppm, 31.25 ppm, or Sample IDs Range-1A, 1B, 1C, 2A, 2B, 2C): extract every single determination into the range array with exact sampleId, levelPpm, levelPct, area, RT, height, tailing, plates.
  * For Robustness: extract condition name, %RSD, tailing, plates, and if individual injection areas/RT are in the table, extract them in the injections array.
  * For Solution Stability: extract the exact standard area (stdArea), sample area (splArea), % difference (diffPct), and RT for every time point.
  * For Content of Uniformity (CU, e.g. CU-01 to CU-10 or 10 dosage units): extract all 10 unit rows into contentOfUniformity with exact Sample Name, Area, and % Content.
  * Prefer values printed in results tables over values in narrative method text. Compendial monograph text is often pasted into the method section and contains values belonging to a different method.
  * If two different values exist for the same field, record both in conflicts, use the table value.
  * Any field that cannot be found goes into missing. Never guess.
  * IMPORTANT: If a table or section (like Linearity, Accuracy, Precision, Robustness, Stability) is completely MISSING from the AMV report, you MUST return an empty array [] for that field. DO NOT invent, hallucinate, or carry over data.
  * CRITICAL: For tables that contain multiple injections, replicates, or levels (e.g., System Suitability usually has 5-6 replicates, Accuracy usually has 9 injections across 3 levels, Precision usually has 6 preparations), YOU MUST EXTRACT EVERY SINGLE ROW. Do NOT summarize or extract only the first row. If the table has 6 rows, you must output an array of 6 items.
  * degradation is null if the report has no forced degradation table. Do not invent degradation data.`;

    const filePart = {
      inlineData: { mimeType, data: base64Data },
    };

        const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", ...(customKey ? ["gemini-3.1-pro-preview"] : [])];
    
    let resultText = "";
    let lastError = null;
    for (const modelName of candidateModels) {
      let attempts = 0;
      while (attempts < 3) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [filePart, { text: promptText }] },
            config: {
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: amvSourceSchema,
            },
          });
          resultText = response.text || "";
          break;
        } catch (err: any) {
          lastError = err;
          console.error(`Error with ${modelName} (attempt ${attempts + 1}):`, err?.message || err);
          
          const isRetryable = err?.status === "UNAVAILABLE" || err?.status === "RESOURCE_EXHAUSTED" || 
                              err?.message?.includes("503") || err?.message?.includes("429") || err?.message?.includes("high demand");
          
          if (isRetryable) {
             attempts++;
             if (attempts < 3) {
                 await new Promise(r => setTimeout(r, 2000 * attempts));
                 continue;
             }
          }
          break;
        }
      }
      if (resultText) break;
    }
    
    if (!resultText) throw lastError || new Error("Failed to extract");
    let json = JSON.parse(jsonrepair(resultText));
    res.json({ success: true, data: json });
  } catch (error: any) {
    console.error("AMV extraction error:", error);
    res.status(500).json({ error: error?.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}
startServer();
