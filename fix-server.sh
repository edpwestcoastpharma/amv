#!/bin/bash

# We will use awk or node script to replace the fetch logic
cat << 'NODE_SCRIPT' > fix-server.cjs
const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const oldCode = `    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", ...(customKey ? ["gemini-3.1-pro-preview"] : [])];    let resultText = "";    let lastError = null;    for (const modelName of candidateModels) {      try {        const response = await ai.models.generateContent({          model: modelName,          contents: { parts: [filePart, { text: promptText }] },          config: {            temperature: 0.1,            responseMimeType: "application/json",            responseSchema: amvSourceSchema,          },        });        resultText = response.text || "";        if (resultText) break;      } catch (err: any) {        lastError = err;        console.error(err);      }    }        if (!resultText) throw lastError || new Error("Failed to extract");`;

// Regex replacement for robustness since indentation might be off
code = code.replace(/const candidateModels = \["gemini-3\.1-flash-lite"[\s\S]*?throw lastError \|\| new Error\("Failed to extract"\);/, 
`const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", ...(customKey ? ["gemini-3.1-pro-preview"] : [])];
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    let resultText = "";
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const modelName of candidateModels) {
        try {
          console.log(\`Attempt \${attempt}: Trying model \${modelName}\`);
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
          if (resultText) break;
        } catch (err) {
          lastError = err;
          console.error(\`Error with \${modelName}:\`, err?.message || err);
          if (err?.message?.includes("503") || err?.status === 503 || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE")) {
             console.log("503 High demand detected, waiting before next attempt...");
             await delay(3000 * attempt);
          }
        }
      }
      if (resultText) break;
      await delay(4000 * attempt);
    }
    
    if (!resultText) throw lastError || new Error("Failed to extract after multiple attempts. The AI models are currently experiencing high demand. Please try again in a few minutes.");`);

fs.writeFileSync("server.ts", code);
NODE_SCRIPT

node fix-server.cjs
