function generateMHTML(html) {
  const boundary = "----=_NextPart_Boundary_" + Date.now();
  let mht = `MIME-Version: 1.0\nContent-Type: multipart/related; boundary="${boundary}"\n\n`;
  const imageParts = [];
  let imgCount = 0;
  
  const modifiedHtml = html.replace(/src="data:(image\/[^;]+);base64,([^"]+)"/g, (match, mimeType, b64Data) => {
    imgCount++;
    const ext = mimeType.split('/')[1] || 'jpeg';
    const imgName = `image${imgCount}.${ext}`;
    
    // Chunk base64 to 76 chars
    const formattedB64 = b64Data.replace(/(.{76})/g, "$1\n");
    
    imageParts.push(
      `--${boundary}\n` +
      `Content-Type: ${mimeType}\n` +
      `Content-Transfer-Encoding: base64\n` +
      `Content-Location: ${imgName}\n\n` +
      `${formattedB64}\n`
    );
    
    return `src="${imgName}"`;
  });
  
  mht += `--${boundary}\n`;
  mht += `Content-Type: text/html; charset="utf-8"\n`;
  mht += `Content-Transfer-Encoding: 8bit\n\n`;
  mht += `${modifiedHtml}\n\n`;
  mht += imageParts.join("\n");
  mht += `--${boundary}--\n`;
  
  return mht;
}

const html = `<html><body><img src="data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="></body></html>`;
console.log(generateMHTML(html));
