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

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
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

    // अब scenes की AI images generate करें
    await generateSceneImages(resultData);

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
            ${escapeHTML(scene.narration || "")}
          </p>

          <p>
            <b>🖼️ Visual:</b><br>
            ${escapeHTML(scene.visual || "")}
          </p>

          <div id="image-${index}"
               style="margin-top:10px;">
            ⏳ Image अभी generate नहीं हुई...
          </div>
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
      🤖 अब हर scene की AI image बनाई जा रही है...
    </p>
  `;
}


async function generateSceneImages(data) {

  if (!data.scenes || !data.scenes.length) {
    return;
  }

  for (
    let index = 0;
    index < data.scenes.length;
    index++
  ) {

    const scene = data.scenes[index];

    const imageBox =
      document.getElementById(`image-${index}`);

    if (imageBox) {
      imageBox.innerHTML =
        "🎨 AI visual बनाया जा रहा है...";
    }

    try {

      const prompt = `
Create a vertical 9:16 educational illustration
for a Hindi school YouTube Short.

Scene:
${scene.visual}

Style:
- Educational
- Clean
- Attractive
- Student friendly
- Easy to understand
- No unnecessary text
- No watermark
- 9:16 vertical composition
`;

      const response = await fetch(
        "/api/generate-image",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            prompt: prompt
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Image generation failed"
        );
      }

      if (!data.image) {
        throw new Error(
          "Image data नहीं मिली"
        );
      }

      const imageUrl =
        `data:${data.mimeType || "image/png"};base64,${data.image}`;

      if (imageBox) {

        imageBox.innerHTML = `
          <img
            src="${imageUrl}"
            alt="AI generated scene"
            style="
              width:100%;
              max-width:360px;
              border-radius:12px;
              display:block;
              margin:10px auto;
            "
          >
          <p>✅ AI visual तैयार</p>
        `;
      }

    } catch (error) {

      console.error(
        `Scene ${index + 1} image error:`,
        error
      );

      if (imageBox) {
        imageBox.innerHTML = `
          ❌ इस scene की image नहीं बन सकी।<br>
          ${escapeHTML(error.message)}
        `;
      }
    }
  }
}


function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
      }
