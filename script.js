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

    // AI images generate करें
    await generateSceneImages(resultData);

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ Error<br><br>
      ${escapeHTML(error.message)}
    `;
  }
}


/* =========================
   SCRIPT + SCENES
========================= */

function displayShortScript(data) {
  const result = document.getElementById("result");

  if (!data || !Array.isArray(data.scenes) || !data.scenes.length) {
    result.innerHTML = "❌ कोई scene नहीं मिला।";
    return;
  }

  let scenesHTML = "";

  data.scenes.forEach((scene, index) => {
    scenesHTML += `
      <div
        class="scene"
        style="
          margin:20px 0;
          padding:15px;
          border-radius:16px;
          background:#111827;
          color:white;
        "
      >
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
          id="image-${index}"
          style="
            width:100%;
            max-width:360px;
            margin:15px auto;
            text-align:center;
          "
        >
          🎨 AI visual बनाया जा रहा है...
        </div>
      </div>
    `;
  });

  result.innerHTML = `
    <h2>🎉 AI Short तैयार है!</h2>

    <h3>📌 ${escapeHTML(data.title || "StudyShorts")}</h3>

    <hr>

    ${scenesHTML}

    <button
      id="makeVideoBtn"
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

    <div id="videoStatus"></div>
    <div id="videoResult"></div>
  `;

  document
    .getElementById("makeVideoBtn")
    .addEventListener("click", () => {
      createVideo(data);
    });
}


/* =========================
   AI IMAGE GENERATION
========================= */

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
${scene.visual || ""}

Style:
- Educational
- Clean
- Attractive
- Student friendly
- Easy to understand
- No unnecessary text
- No watermark
- Vertical 9:16
`;

      const response = await fetch(
        "/api/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Image generation failed"
        );
      }

      if (!data.image) {
        throw new Error(
          "Image data नहीं मिली"
        );
      }

      const mimeType =
        data.mimeType || "image/jpeg";

      const imageUrl =
        `data:${mimeType};base64,${data.image}`;

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
              margin:auto;
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


/* =========================
   CREATE ACTUAL VIDEO
========================= */

async function createVideo(data) {
  const button =
    document.getElementById("makeVideoBtn");

  const status =
    document.getElementById("videoStatus");

  const videoResult =
    document.getElementById("videoResult");

  if (!data?.scenes?.length) {
    return;
  }

  button.disabled = true;
  button.innerText =
    "⏳ Video बनाया जा रहा है...";

  videoResult.innerHTML = "";

  try {
    const canvas =
      document.createElement("canvas");

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

    const mimeType =
      mimeTypes.find(type =>
        MediaRecorder.isTypeSupported(type)
      );

    if (!mimeType) {
      throw new Error(
        "इस browser में video recording supported नहीं है।"
      );
    }

    const recorder =
      new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

    const chunks = [];

    recorder.ondataavailable = event => {
      if (
        event.data &&
        event.data.size > 0
      ) {
        chunks.push(event.data);
      }
    };

    const stopped =
      new Promise(resolve => {
        recorder.onstop = resolve;
      });

    recorder.start();

    /* Title screen */

    drawTitleScreen(
      ctx,
      data.title || "StudyShorts"
    );

    await sleep(1800);

    /* Scenes */

    for (
      let index = 0;
      index < data.scenes.length;
      index++
    ) {
      const scene =
        data.scenes[index];

      if (status) {
        status.innerHTML =
          `🎬 Scene ${index + 1}/${data.scenes.length} render हो रहा है...`;
      }

      const imageElement =
        document
          .getElementById(`image-${index}`)
          ?.querySelector("img");

      let image = null;

      if (imageElement) {
        image =
          await loadImage(
            imageElement.src
          );
      }

      await renderScene(
        ctx,
        scene,
        image,
        index,
        data.scenes.length
      );
    }

    recorder.stop();

    await stopped;

    stream
      .getTracks()
      .forEach(track =>
        track.stop()
      );

    const blob =
      new Blob(chunks, {
        type: mimeType
      });

    const videoUrl =
      URL.createObjectURL(blob);

    videoResult.innerHTML = `
      <h3>🎉 Short Video तैयार है!</h3>

      <video
        controls
        playsinline
        src="${videoUrl}"
        style="
          width:100%;
          max-width:360px;
          display:block;
          margin:15px auto;
          border-radius:16px;
        "
      ></video>

      <a
        href="${videoUrl}"
        download="StudyShorts.webm"
        style="
          display:block;
          max-width:360px;
          margin:15px auto;
          padding:15px;
          text-align:center;
          text-decoration:none;
          border-radius:12px;
          font-weight:bold;
          background:#16a34a;
          color:white;
        "
      >
        ⬇️ Download Short
      </a>

      <p>
        ✅ 9:16 vertical video तैयार है।
      </p>
    `;

    if (status) {
      status.innerHTML =
        "✅ Video successfully तैयार हो गया।";
    }

    button.disabled = false;
    button.innerText =
      "🎬 Create Short Video";

  } catch (error) {
    console.error(error);

    videoResult.innerHTML = `
      ❌ Video नहीं बन सकी।<br><br>
      ${escapeHTML(error.message)}
    `;

    button.disabled = false;
    button.innerText =
      "🔄 Try Again";
  }
}


/* =========================
   RENDER ONE SCENE
========================= */

async function renderScene(
  ctx,
  scene,
  image,
  index,
  total
) {
  const duration = 6500;
  const start = performance.now();

  return new Promise(resolve => {

    function animate(now) {
      const elapsed =
        now - start;

      const progress =
        Math.min(
          elapsed / duration,
          1
        );

      drawSceneFrame(
        ctx,
        scene,
        image,
        index,
        total,
        progress
      );

      if (progress < 1) {
        requestAnimationFrame(
          animate
        );
      } else {
        resolve();
      }
    }

    requestAnimationFrame(
      animate
    );
  });
}


/* =========================
   VIDEO FRAME
========================= */

function drawSceneFrame(
  ctx,
  scene,
  image,
  index,
  total,
  progress
) {
  const w = 720;
  const h = 1280;

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
    "#1e3a8a"
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
    "bold 30px Arial";

  ctx.fillText(
    "📚 StudyShorts",
    35,
    55
  );

  ctx.font =
    "bold 26px Arial";

  ctx.fillText(
    `${index + 1}/${total}`,
    625,
    55
  );

  /* AI IMAGE */

  if (image) {

    const zoom =
      1 + progress * 0.06;

    const boxX = 35;
    const boxY = 90;
    const boxW = 650;
    const boxH = 680;

    ctx.save();

    ctx.beginPath();

    roundRectPath(
      ctx,
      boxX,
      boxY,
      boxW,
      boxH,
      24
    );

    ctx.clip();

    const scale =
      Math.max(
        boxW / image.width,
        boxH / image.height
      ) * zoom;

    const drawW =
      image.width * scale;

    const drawH =
      image.height * scale;

    const moveX =
      (boxW - drawW) / 2;

    const moveY =
      (boxH - drawH) / 2;

    ctx.drawImage(
      image,
      boxX + moveX,
      boxY + moveY,
      drawW,
      drawH
    );

    ctx.restore();

  } else {

    /* Fallback visual */

    ctx.fillStyle =
      "rgba(255,255,255,0.12)";

    roundRectPath(
      ctx,
      35,
      90,
      650,
      680,
      24
    );

    ctx.fill();

    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "90px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      getSymbol(index),
      360,
      430
    );

    ctx.textAlign =
      "left";
  }

  /* Visual caption */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 27px Arial";

  wrapText(
    ctx,
    scene.visual || "",
    45,
    820,
    630,
    38,
    3
  );

  /* Narration */

  ctx.fillStyle =
    "rgba(0,0,0,0.75)";

  roundRectPath(
    ctx,
    35,
    930,
    650,
    250,
    25
  );

  ctx.fill();

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 27px Arial";

  wrapText(
    ctx,
    scene.narration || "",
    60,
    985,
    600,
    40,
    5
  );

  /* Progress */

  ctx.fillStyle =
    "rgba(255,255,255,0.3)";

  ctx.fillRect(
    35,
    1215,
    650,
    8
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    35,
    1215,
    650 * progress,
    8
  );
}


/* =========================
   TITLE SCREEN
========================= */

function drawTitleScreen(
  ctx,
  title
) {
  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      720,
      1280
    );

  gradient.addColorStop(
    0,
    "#020617"
  );

  gradient.addColorStop(
    1,
    "#1e3a8a"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    720,
    1280
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.textAlign =
    "center";

  ctx.font =
    "bold 48px Arial";

  wrapText(
    ctx,
    title,
    360,
    560,
    600,
    65,
    3
  );

  ctx.font =
    "bold 30px Arial";

  ctx.fillText(
    "📚 StudyShorts",
    360,
    760
  );

  ctx.textAlign =
    "left";
}


/* =========================
   HELPERS
========================= */

function getSymbol(index) {
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

  return symbols[
    index % symbols.length
  ];
}


function loadImage(src) {
  return new Promise(
    (resolve, reject) => {
      const img =
        new Image();

      img.onload = () =>
        resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            "Image load नहीं हुई"
          )
        );

      img.src = src;
    }
  );
}


function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


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
    String(text || "")
      .split(/\s+/);

  const lines = [];
  let line = "";

  for (
    const word of words
  ) {
    const test =
      line
        ? line + " " + word
        : word;

    if (
      ctx.measureText(test)
        .width > maxWidth &&
      line
    ) {
      lines.push(line);
      line = word;

      if (
        lines.length >=
        maxLines
      ) {
        break;
      }

    } else {
      line = test;
    }
  }

  if (
    lines.length < maxLines &&
    line
  ) {
    lines.push(line);
  }

  lines.forEach(
    (lineText, i) => {
      ctx.fillText(
        lineText,
        x,
        y + i * lineHeight
      );
    }
  );
}


function roundRectPath(
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


function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
    }
