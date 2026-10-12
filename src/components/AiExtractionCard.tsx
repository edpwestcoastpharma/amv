import React, { useRef, useState } from "react";
import { Upload, Loader2, Sparkles, CheckCircle2, FileText } from "lucide-react";
import { AmvSource } from "../types";

interface AiExtractionCardProps {
  onExtractionSuccess: (data: AmvSource) => void;
  onFlash: (msg: string, type: "success" | "err" | "warn") => void;
  onDirectPdfDownload?: () => void;
}

export const AiExtractionCard: React.FC<AiExtractionCardProps> = ({
  onExtractionSuccess,
  onFlash,
  onDirectPdfDownload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState("");

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage(`Reading ${file.name}...`);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let mimeType = file.type || "application/pdf";
      if (/\.pdf$/i.test(file.name)) mimeType = "application/pdf";
      else if (/\.png$/i.test(file.name)) mimeType = "image/png";
      else if (/\.jpe?g$/i.test(file.name)) mimeType = "image/jpeg";
      else if (/\.webp$/i.test(file.name)) mimeType = "image/webp";

      setStatusMessage("Extracting all validation tables...");

      const response = await fetch("/api/extract-amv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          mimeType,
          fileName: file.name,
          customKey: customKey || undefined,
        }),
      });

      const responseText = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(
            `Server returned HTTP ${response.status}. The uploaded file might be too large or the server timed out.`
          );
        }
        throw new Error("Unable to parse AI response. Please try again.");
      }

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Failed to process document with AI");
      }

      const extractedData = json.data;
      onExtractionSuccess(extractedData);
      onFlash(`Successfully extracted AMV report for ${extractedData.product?.name}`, "success");
    } catch (err: any) {
      console.error(err);
      onFlash(`Extraction failed: ${err?.message || "Failed to process"}`, "err");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-lg text-white p-4 shadow-sm border border-indigo-900/50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-indigo-200">
              AMV Generator
            </h3>
            <p className="text-[11px] text-slate-300">
              Upload your lab AMV PDF to generate the report
            </p>
          </div>
        </div>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
          isProcessing
            ? "border-indigo-400 bg-indigo-950/40 pointer-events-none"
            : "border-indigo-700/60 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-900/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileSelection}
          className="hidden"
        />
        {isProcessing ? (
          <div className="py-1.5 flex flex-col items-center justify-center gap-1.5 text-indigo-300">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <p className="text-xs font-medium">{statusMessage}</p>
          </div>
        ) : (
          <div className="py-1 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-300" />
              <span className="text-xs font-semibold text-white">
                Upload AMV Report Document (PDF, Images)
              </span>
            </div>
            <p className="text-[10px] text-indigo-300/80">
              Extracts all validation tables &amp; plots graphs automatically
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-indigo-300/80">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Traceable generation
        </span>
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="underline hover:text-white transition-colors"
        >
          {showKeyInput ? "Hide API settings" : "Custom Gemini Key"}
        </button>
      </div>
      {showKeyInput && (
        <div className="pt-2 border-t border-indigo-900/60">
          <label className="block text-[10px] text-indigo-300 uppercase font-semibold mb-1">
            Optional Custom Gemini API Key:
          </label>
          <input
            type="password"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="AIzaSy... (Leave empty to use server default key)"
            className="w-full px-2 py-1 text-xs bg-indigo-950/80 border border-indigo-800 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
          />
        </div>
      )}
    </div>
  );
};
