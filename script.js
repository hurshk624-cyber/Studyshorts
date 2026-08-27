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

  result.innerHTML = "📖 PDF पढ़ी जा रही है...";

  try {
    // PDF.js library load
    const pdfjs = await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
    );

    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjs.getDocument({
      data: arrayBuffer
    }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str)
        .join(" ");

      fullText += `\n\nPage ${pageNumber}\n${pageText}`;
    }

    if (!fullText.trim()) {
      result.innerHTML =
        "❌ इस PDF में पढ़ने योग्य text नहीं मिला।";
      return;
    }

    // Text को साफ करना
    fullText = fullText
      .replace(/\s+/g, " ")
      .trim();

    // Short के लिए शुरुआती script
    const shortScript = createShortScript(fullText);

    result.innerHTML = `
      <h2>✅ PDF पढ़ ली गई!</h2>

      <p><b>Pages:</b> ${pdf.numPages}</p>

      <hr>

      <h3>🎬 Short Script</h3>

      <div class="script-box">
        ${shortScript}
      </div>

      <hr>

      <h3>📄 PDF Text Preview</h3>

      <p>${fullText.substring(0, 3000)}</p>
    `;

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ PDF पढ़ने में समस्या हुई।<br><br>
      ${error.message}
    `;
  }
}


function createShortScript(text) {

  // लगभग शुरुआती 1000 characters लेकर
  // एक basic educational short script बनाना
  const content = text.substring(0, 1000);

  return `
    🎬 <b>StudyShorts</b><br><br>

    📚 <b>आज का Topic</b><br>
    इस PDF के महत्वपूर्ण हिस्से को आसान भाषा में समझते हैं।<br><br>

    🧠 <b>मुख्य जानकारी:</b><br>
    ${content}<br><br>

    💡 <b>Quick Revision:</b><br>
    ऊपर दिए गए मुख्य points को याद रखें।<br><br>

    🔔 <b>StudyShorts</b> — पढ़ाई को आसान बनाएं!
  `;
      }
