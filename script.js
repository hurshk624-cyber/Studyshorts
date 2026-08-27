async function convertPDF() {
  const fileInput = document.getElementById("pdfFile");
  const result = document.getElementById("result");

  if (!fileInput.files.length) {
    result.innerHTML = "⚠️ पहले PDF चुनिए।";
    return;
  }

  const file = fileInput.files[0];

  if (file.type !== "application/pdf") {
    result.innerHTML = "❌ केवल PDF file चुनिए।";
    return;
  }

  result.innerHTML = `
    <p>📄 PDF मिल गई: <b>${file.name}</b></p>
    <p>⏳ Shorts तैयार किए जा रहे हैं...</p>
  `;

  setTimeout(() => {
    result.innerHTML = `
      <h2>✅ PDF तैयार है!</h2>
      <p>आपकी PDF को Shorts में बदलने का अगला चरण यहाँ आएगा।</p>
      <p>🎬 StudyShorts Generator</p>
    `;
  }, 2000);
}
