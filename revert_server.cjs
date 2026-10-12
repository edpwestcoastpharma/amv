const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newCode = `    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", ...(customKey ? ["gemini-3.1-pro-preview"] : [])];
    
    let resultText = "";
    let lastError = null;
    for (const modelName of candidateModels) {
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
        if (resultText) break;
      } catch (err: any) {
        lastError = err;
        console.error(err);
      }
    }
    
    if (!resultText) throw lastError || new Error("Failed to extract");`;

code = code.replace(/const candidateModels = \["gemini-3\.8-flash"[\s\S]*?throw lastError \|\| new Error\("Failed to extract after multiple attempts\. The AI models are currently experiencing high demand\. Please try again in a few minutes\."\);/, newCode);

fs.writeFileSync('server.ts', code);
