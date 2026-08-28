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

    const shortScript = createShortScript(fullText);

    result.innerHTML = `
      <h2>✅ PDF पढ़ ली गई!</h2>

      <p><b>Pages:</b> ${pdf.numPages}</p>

      <h3>🎬 Short Script</h3>

      <div class="script-box">
        ${escapeHTML(shortScript).replace(/\n/g, "<br>")}
      </div>

      <br>

      <button id="makeVideoBtn">
        🎥 Short Video बनाएं
      </button>

      <div id="videoResult"></div>
    `;

    document
      .getElementById("makeVideoBtn")
      .addEventListener("click", () => {
        makeVideo(shortScript);
      });

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ PDF पढ़ने में समस्या हुई।<br><br>
      ${escapeHTML(error.message)}
    `;
  }
}


function createShortScript(text) {
  const content = text.substring(0, 1800);

  return `📚 आज का Topic

इस chapter के important points को आसान भाषा में समझते हैं।

🧠 मुख्य जानकारी:

${content}

💡 Quick Revision:

इस topic के important points को दोबारा पढ़ें और याद करें।

🔔 StudyShorts
पढ़ाई को आसान बनाएं!`;
}


function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


async function makeVideo(script) {

  const videoResult = document.getElementById("videoResult");

  videoResult.innerHTML =
    "<p>🎬 Video तैयार हो रही है... कृपया इंतज़ार करें।</p>";

  const canvas = document.createElement("canvas");

  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext("2d");

  const stream = canvas.captureStream(30);

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm"
  });

  const chunks = [];

  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {

    const blob = new Blob(chunks, {
      type: "video/webm"
    });

    const url = URL.createObjectURL(blob);

    videoResult.innerHTML = `
      <h3>✅ Short तैयार है!</h3>

      <video
        controls
        playsinline
        style="width:100%;max-width:400px;">
        <source src="${url}" type="video/webm">
      </video>

      <br><br>

      <a
        href="${url}"
        download="StudyShorts.webm">
        <button>⬇️ Video Download करें</button>
      </a>
    `;
  };

  recorder.start();

  const slides = makeSlides(script);

  for (const slide of slides) {
    await drawSlide(ctx, slide);
  }

  recorder.stop();
}


function makeSlides(text) {

  const cleanText = text
    .replace(/\n+/g, "\n")
    .trim();

  const words = cleanText.split(/\s+/);

  const slides = [];

  let current = "";

  for (const word of words) {

    if ((current + " " + word).length > 170) {

      slides.push(current.trim());

      current = word;

    } else {

      current += " " + word;
    }
  }

  if (current.trim()) {
    slides.push(current.trim());
  }

  return slides.slice(0, 10);
}


function drawSlide(ctx, text) {

  return new Promise(resolve => {

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "#ffffff";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 64px Arial";

    ctx.fillText(
      "📚 StudyShorts",
      540,
      180
    );

    ctx.font = "42px Arial";

    const lines = wrapText(ctx, text, 850);

    let y = 700;

    for (const line of lines) {

      ctx.fillText(
        line,
        540,
        y
      );

      y += 70;
    }

    setTimeout(resolve, 2500);
  });
}


function wrapText(ctx, text, maxWidth) {

  const words = text.split(" ");

  const lines = [];

  let line = "";

  for (const word of words) {

    const testLine =
      line + (line ? " " : "") + word;

    const width =
      ctx.measureText(testLine).width;

    if (width > maxWidth && line) {

      lines.push(line);

      line = word;

    } else {

      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}
