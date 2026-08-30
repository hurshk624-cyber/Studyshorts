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

      fullText +=
        " " +
        textContent.items
          .map(item => item.str)
          .join(" ");
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

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ Error<br><br>
      ${escapeHTML(error.message)}
    `;
  }
}


/* =========================
   SCRIPT + SCENES DISPLAY
========================= */

function displayShortScript(data) {
  const result = document.getElementById("result");

  if (!data.scenes || !data.scenes.length) {
    result.innerHTML =
      "❌ कोई scene नहीं मिला।";
    return;
  }

  let scenesHTML = "";

  data.scenes.forEach((scene, index) => {

    scenesHTML += `
      <div class="scene"
           style="
             margin:20px 0;
             padding:15px;
             border-radius:16px;
             background:#111827;
             color:white;
           ">

        <h3>🎬 Scene ${index + 1}</h3>

        <p>
          <b>🎙️ Narration:</b><br>
          ${escapeHTML(scene.narration || "")}
        </p>

        <p>
          <b>🖼️ Visual:</b><br>
          ${escapeHTML(scene.visual || "")}
        </p>

        <div
          id="visual-${index}"
          style="
            width:100%;
            max-width:360px;
            aspect-ratio:9/16;
            margin:15px auto;
            border-radius:16px;
            overflow:hidden;
            background:#020617;
          "
        >
          <canvas
            id="canvas-${index}"
            width="720"
            height="1280"
            style="
              width:100%;
              height:100%;
              display:block;
            "
          ></canvas>
        </div>

      </div>
    `;
  });

  result.innerHTML = `
    <h2>🎉 AI Short तैयार है!</h2>

    <h3>📌 ${escapeHTML(
      data.title || "StudyShorts"
    )}</h3>

    <hr>

    ${scenesHTML}

    <button
      id="makeVideoBtn"
      onclick='createVideo(${JSON.stringify(
        data
      )})'
      style="
        width:100%;
        padding:15px;
        margin-top:20px;
        border:0;
        border-radius:12px;
        font-size:18px;
        font-weight:bold;
        cursor:pointer;
      "
    >
      🎬 Create Short Video
    </button>

    <div id="videoResult"></div>
  `;

  createScenePreviews(data);
}


/* =========================
   FREE VISUAL SCENES
========================= */

function createScenePreviews(data) {

  data.scenes.forEach((scene, index) => {

    const canvas =
      document.getElementById(
        `canvas-${index}`
      );

    if (!canvas) return;

    drawScene(
      canvas,
      scene,
      index,
      data.scenes.length
    );
  });
}


function drawScene(
  canvas,
  scene,
  index,
  total
) {

  const ctx = canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  /* Background */

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      w,
      h
    );

  gradient.addColorStop(
    0,
    "#0f172a"
  );

  gradient.addColorStop(
    1,
    "#1e3a8a"
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(
    0,
    0,
    w,
    h
  );

  /* Top label */

  ctx.fillStyle = "#ffffff";
  ctx.font =
    "bold 34px Arial";

  ctx.fillText(
    "📚 StudyShorts",
    45,
    70
  );

  ctx.font =
    "bold 30px Arial";

  ctx.fillText(
    `SCENE ${index + 1}/${total}`,
    45,
    120
  );

  /* Main visual card */

  ctx.fillStyle =
    "rgba(255,255,255,0.10)";

  roundRect(
    ctx,
    40,
    180,
    w - 80,
    430,
    30
  );

  ctx.fill();

  /* Simple educational graphic */

  drawEducationalGraphic(
    ctx,
    w / 2,
    395,
    index
  );

  /* Visual description */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 32px Arial";

  wrapText(
    ctx,
    scene.visual || "Educational visual",
    65,
    680,
    w - 130,
    48,
    5
  );

  /* Narration caption */

  ctx.fillStyle =
    "rgba(0,0,0,0.45)";

  roundRect(
    ctx,
    45,
    900,
    w - 90,
    260,
    28
  );

  ctx.fill();

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 28px Arial";

  wrapText(
    ctx,
    scene.narration || "",
    75,
    955,
    w - 150,
    42,
    6
  );

  /* Progress */

  ctx.fillStyle =
    "rgba(255,255,255,0.25)";

  ctx.fillRect(
    45,
    1220,
    w - 90,
    10
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    45,
    1220,
    ((w - 90) *
      (index + 1)) /
      total,
    10
  );
}


/* =========================
   EDUCATIONAL GRAPHIC
========================= */

function drawEducationalGraphic(
  ctx,
  x,
  y,
  index
) {

  ctx.save();

  ctx.translate(
    x,
    y
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    120,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle =
    "#1e3a8a";

  ctx.font =
    "bold 100px Arial";

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  const symbols = [
    "📖",
    "🧠",
    "🔬",
    "🌱",
    "⚛️",
    "📐",
    "💡",
    "🎓"
  ];

  ctx.fillText(
    symbols[index % symbols.length],
    0,
    0
  );

  ctx.restore();
}


/* =========================
   CREATE VIDEO
========================= */

async function createVideo(data) {

  const button =
    document.getElementById(
      "makeVideoBtn"
    );

  const videoResult =
    document.getElementById(
      "videoResult"
    );

  if (!data.scenes?.length) {
    return;
  }

  button.disabled = true;
  button.innerText =
    "🎬 Video बनाया जा रहा है...";

  videoResult.innerHTML = `
    <p>⏳ Scenes render हो रहे हैं...</p>
  `;

  try {

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 720;
    canvas.height = 1280;

    const ctx =
      canvas.getContext("2d");

    const stream =
      canvas.captureStream(30);

    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];

    let mimeType =
      mimeTypes.find(
        type =>
          MediaRecorder.isTypeSupported(
            type
          )
      );

    if (!mimeType) {
      throw new Error(
        "इस browser में video recording supported नहीं है।"
      );
    }

    const recorder =
      new MediaRecorder(
        stream,
        {
          mimeType,
          videoBitsPerSecond:
            5000000
        }
      );

    const chunks = [];

    recorder.ondataavailable =
      event => {

        if (
          event.data &&
          event.data.size > 0
        ) {
          chunks.push(
            event.data
          );
        }
      };

    const stopped =
      new Promise(resolve => {

        recorder.onstop =
          resolve;
      });

    recorder.start();

    const sceneDuration =
      7000;

    for (
      let index = 0;
      index < data.scenes.length;
      index++
    ) {

      const scene =
        data.scenes[index];

      const start =
        performance.now();

      while (
        performance.now() -
          start <
        sceneDuration
      ) {

        const elapsed =
          performance.now() -
          start;

        drawAnimatedScene(
          ctx,
          canvas,
          scene,
          index,
          data.scenes.length,
          elapsed
        );

        await new Promise(
          requestAnimationFrame
        );
      }
    }

    recorder.stop();

    await stopped;

    stream
      .getTracks()
      .forEach(track =>
        track.stop()
      );

    const blob =
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );

    const videoUrl =
      URL.createObjectURL(
        blob
      );

    videoResult.innerHTML = `
      <h3>🎉 Short तैयार है!</h3>

      <video
        controls
        playsinline
        style="
          width:100%;
          max-width:360px;
          display:block;
          margin:auto;
          border-radius:15px;
        "
        src="${videoUrl}"
      ></video>

      <a
        href="${videoUrl}"
        download="StudyShorts.webm"
        style="
          display:block;
          text-align:center;
          margin:20px auto;
          padding:15px;
          max-width:360px;
          background:#16a34a;
          color:white;
          text-decoration:none;
          border-radius:12px;
          font-weight:bold;
        "
      >
        ⬇️ Download Short
      </a>

      <p>
        ℹ️ यह browser-generated video है।
        अलग paid video-rendering API की जरूरत नहीं है।
      </p>
    `;

    button.innerText =
      "✅ Video तैयार";

  } catch (error) {

    console.error(error);

    videoResult.innerHTML = `
      ❌ Video नहीं बन सकी।<br><br>
      ${escapeHTML(error.message)}
    `;

    button.disabled = false;

    button.innerText =
      "🎬 Create Short Video";
  }
}


/* =========================
   ANIMATED SCENE
========================= */

function drawAnimatedScene(
  ctx,
  canvas,
  scene,
  index,
  total,
  elapsed
) {

  const w =
    canvas.width;

  const h =
    canvas.height;

  const progress =
    Math.min(
      elapsed / 7000,
      1
    );

  ctx.clearRect(
    0,
    0,
    w,
    h
  );

  /* Background */

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      w,
      h
    );

  gradient.addColorStop(
    0,
    "#020617"
  );

  gradient.addColorStop(
    1,
    "#1d4ed8"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    w,
    h
  );

  /* Header */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 34px Arial";

  ctx.fillText(
    "📚 StudyShorts",
    40,
    65
  );

  ctx.font =
    "bold 28px Arial";

  ctx.fillText(
    `Scene ${index + 1} / ${total}`,
    40,
    110
  );

  /* Animated circle */

  const scale =
    1 +
    Math.sin(
      progress *
        Math.PI *
        2
    ) *
      0.08;

  ctx.save();

  ctx.translate(
    w / 2,
    380
  );

  ctx.scale(
    scale,
    scale
  );

  ctx.fillStyle =
    "rgba(255,255,255,0.95)";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    130,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle =
    "#1e3a8a";

  ctx.font =
    "bold 95px Arial";

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  const symbols = [
    "📖",
    "🧠",
    "🔬",
    "🌱",
    "⚛️",
    "📐",
    "💡",
    "🎓"
  ];

  ctx.fillText(
    symbols[index % symbols.length],
    0,
    0
  );

  ctx.restore();

  /* Visual */

  ctx.textAlign =
    "left";

  ctx.textBaseline =
    "alphabetic";

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 32px Arial";

  wrapText(
    ctx,
    scene.visual || "",
    55,
    650,
    w - 110,
    45,
    5
  );

  /* Caption box */

  ctx.fillStyle =
    "rgba(0,0,0,0.60)";

  roundRect(
    ctx,
    45,
    900,
    w - 90,
    260,
    28
  );

  ctx.fill();

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 28px Arial";

  wrapText(
    ctx,
    scene.narration || "",
    75,
    955,
    w - 150,
    42,
    6
  );

  /* Progress bar */

  ctx.fillStyle =
    "rgba(255,255,255,0.25)";

  ctx.fillRect(
    45,
    1220,
    w - 90,
    10
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    45,
    1220,
    ((w - 90) *
      (index + 1)) /
      total,
    10
  );
}


/* =========================
   TEXT WRAPPING
========================= */

function wrapText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines
) {

  const words =
    String(text)
      .split(/\s+/);

  let line = "";
  let lines = [];

  for (
    let i = 0;
    i < words.length;
    i++
  ) {

    const test =
      line +
      words[i] +
      " ";

    const width =
      ctx.measureText(
        test
      ).width;

    if (
      width > maxWidth &&
      line
    ) {

      lines.push(
        line.trim()
      );

      line =
        words[i] +
        " ";

    } else {

      line =
        test;
    }

    if (
      lines.length >=
      maxLines
    ) {
      break;
    }
  }

  if (
    lines.length <
    maxLines &&
    line.trim()
  ) {
    lines.push(
      line.trim()
    );
  }

  lines.forEach(
    (lineText, index) => {

      ctx.fillText(
        lineText,
        x,
        y +
          index *
            lineHeight
      );
    }
  );
}


/* =========================
   ROUNDED RECTANGLE
========================= */

function roundRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {

  ctx.beginPath();

  ctx.moveTo(
    x + radius,
    y
  );

  ctx.lineTo(
    x + width - radius,
    y
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + radius
  );

  ctx.lineTo(
    x + width,
    y + height - radius
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );

  ctx.lineTo(
    x + radius,
    y + height
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - radius
  );

  ctx.lineTo(
    x,
    y + radius
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + radius,
    y
  );

  ctx.closePath();
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(text) {

  return String(text)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
