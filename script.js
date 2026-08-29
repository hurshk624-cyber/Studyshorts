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
    // PDF.js
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

      fullText += " " + pageText;
    }

    fullText = fullText.replace(/\s+/g, " ").trim();

    if (!fullText) {
      result.innerHTML =
        "❌ इस PDF में पढ़ने योग्य text नहीं मिला।";
      return;
    }

    result.innerHTML =
      "🤖 Gemini AI Short script बना रहा है...";

    // Gemini backend को PDF text भेजना
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: fullText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Gemini API में समस्या हुई।"
      );
    }

    const resultData = data.result;

    displayShortScript(resultData);

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ Error<br><br>
      ${escapeHTML(error.message)}
    `;
  }
}


function displayShortScript(data) {

  const result = document.getElementById("result");

  let scenesHTML = "";

  if (data.scenes && data.scenes.length) {

    data.scenes.forEach((scene, index) => {

      scenesHTML += `
        <div class="scene">
          <h4>🎬 Scene ${index + 1}</h4>

          <p>
            <b>🎙️ Narration:</b><br>
            ${escapeHTML(scene.narration)}
          </p>

          <p>
            <b>🖼️ Visual:</b><br>
            ${escapeHTML(scene.visual)}
          </p>
        </div>
      `;

    });

  }

  result.innerHTML = `
    <h2>🎉 AI Short तैयार है!</h2>

    <h3>📌 ${escapeHTML(data.title || "StudyShorts")}</h3>

    <hr>

    ${scenesHTML}

    <hr>

    <p>
      ✅ Gemini ने आपके PDF के आधार पर Short की
      script और scenes तैयार कर दिए हैं।
    </p>
  `;
}


function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
    }
