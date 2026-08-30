/* =====================================================
   StudyShorts - PDF → Script → Free Animated Video
   No Gemini Image API
===================================================== */

async function convertPDF() {
  const fileInput = document.getElementById("pdfFile");
  const result = document.getElementById("result");

  if (!fileInput || !fileInput.files.length) {
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

    if (!data.result) {
      throw new Error(
        "Gemini से Short result नहीं मिला।"
      );
    }

    displayShortScript(data.result);

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      ❌ Error<br><br>
      ${escapeHTML(error.message)}
    `;
  }
}


/* =====================================================
   DISPLAY SCRIPT
===================================================== */

function displayShortScript(data) {
  const result = document.getElementById("result");

  if (
    !data ||
    !Array.isArray(data.scenes) ||
    !data.scenes.length
  ) {
    result.innerHTML =
      "❌ कोई scene नहीं मिला।";
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

        <h3>
          🎬 Scene ${index + 1}
        </h3>

        <p>
          <b>🎙️ Narration:</b><br>
          ${escapeHTML(scene.narration || "")}
        </p>

        <p>
          <b>🖼️ Visual:</b><br>
          ${escapeHTML(scene.visual || "")}
        </p>

      </div>
    `;
  });

  result.innerHTML = `
    <h2>🎉 AI Short तैयार है!</h2>

    <h3>
      📌 ${escapeHTML(
        data.title || "StudyShorts"
      )}
    </h3>

    <hr>

    ${scenesHTML}

    <button
      id="makeVideoBtn"
      style="
        width:100%;
        padding:16px;
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

    <div
      id="videoStatus"
      style="
        margin-top:15px;
        text-align:center;
      "
    ></div>

    <div id="videoResult"></div>
  `;

  document
    .getElementById("makeVideoBtn")
    .addEventListener(
      "click",
      () => createVideo(data)
    );
}


/* =====================================================
   CREATE VIDEO
   Browser Canvas + MediaRecorder
===================================================== */

async function createVideo(data) {
  const button =
    document.getElementById("makeVideoBtn");

  const status =
    document.getElementById("videoStatus");

  const videoResult =
    document.getElementById("videoResult");

  if (
    !data ||
    !Array.isArray(data.scenes) ||
    !data.scenes.length
  ) {
    return;
  }

  button.disabled = true;

  button.innerText =
    "⏳ Video बनाया जा रहा है...";

  status.innerHTML =
    "🎬 Short render हो रहा है...";

  try {

    const canvas =
      document.createElement("canvas");

    canvas.width = 720;
    canvas.height = 1280;

    const ctx =
      canvas.getContext("2d");

    const stream =
      canvas.captureStream(30);

    const supportedTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];

    const mimeType =
      supportedTypes.find(
        type =>
          MediaRecorder.isTypeSupported(type)
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
          videoBitsPerSecond: 5000000
        }
      );

    const chunks = [];

    recorder.ondataavailable =
      event => {
        if (
          event.data &&
          event.data.size
        ) {
          chunks.push(event.data);
        }
      };

    const stopped =
      new Promise(resolve => {
        recorder.onstop = resolve;
      });

    recorder.start();

    /* TITLE */

    drawTitle(
      ctx,
      data.title || "StudyShorts"
    );

    await sleep(1800);

    /* SCENES */

    for (
      let index = 0;
      index < data.scenes.length;
      index++
    ) {

      const scene =
        data.scenes[index];

      status.innerHTML =
        `🎬 Scene ${index + 1}/${data.scenes.length} बनाया जा रहा है...`;

      await renderScene(
        ctx,
        scene,
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
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );

    const videoURL =
      URL.createObjectURL(blob);

    videoResult.innerHTML = `
      <h3>🎉 Short Video तैयार है!</h3>

      <video
        controls
        playsinline
        src="${videoURL}"
        style="
          width:100%;
          max-width:360px;
          display:block;
          margin:15px auto;
          border-radius:16px;
        "
      ></video>

      <a
        href="${videoURL}"
        download="StudyShorts.webm"
        style="
          display:block;
          max-width:360px;
          margin:15px auto;
          padding:15px;
          text-align:center;
          text-decoration:none;
          border-radius:12px;
          font-size:18px;
          font-weight:bold;
          background:#16a34a;
          color:white;
        "
      >
        ⬇️ Download Short
      </a>

      <p style="text-align:center;">
        ✅ 9:16 vertical video तैयार है।
      </p>
    `;

    status.innerHTML =
      "✅ Video successfully तैयार हो गया।";

    button.disabled = false;

    button.innerText =
      "🎬 Create Short Video";

  } catch (error) {

    console.error(error);

    status.innerHTML = `
      ❌ Video नहीं बन सकी।<br><br>
      ${escapeHTML(error.message)}
    `;

    button.disabled = false;

    button.innerText =
      "🔄 Try Again";
  }
}


/* =====================================================
   RENDER EACH SCENE
===================================================== */

async function renderScene(
  ctx,
  scene,
  index,
  total
) {
  const duration = 6500;

  const start =
    performance.now();

  return new Promise(resolve => {

    function frame(now) {

      const elapsed =
        now - start;

      const progress =
        Math.min(
          elapsed / duration,
          1
        );

      drawScene(
        ctx,
        scene,
        index,
        total,
        progress
      );

      if (progress < 1) {

        requestAnimationFrame(frame);

      } else {

        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}


/* =====================================================
   DRAW ANIMATED EDUCATIONAL SCENE
===================================================== */

function drawScene(
  ctx,
  scene,
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

  /* BACKGROUND */

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

  /* HEADER */

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
    `Scene ${index + 1}/${total}`,
    560,
    55
  );

  /* ANIMATED GRAPHIC */

  const centerX = 360;
  const centerY = 360;

  const scale =
    1 +
    Math.sin(
      progress *
      Math.PI *
      2
    ) *
    0.06;

  ctx.save();

  ctx.translate(
    centerX,
    centerY
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
    135,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle =
    "#1e3a8a";

  ctx.font =
    "90px Arial";

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.fillText(
    getSymbol(index),
    0,
    0
  );

  ctx.restore();

  ctx.textAlign =
    "left";

  ctx.textBaseline =
    "alphabetic";

  /* VISUAL DESCRIPTION */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 28px Arial";

  wrapText(
    ctx,
    scene.visual || "",
    50,
    610,
    620,
    40,
    4
  );

  /* NARRATION BOX */

  ctx.fillStyle =
    "rgba(0,0,0,0.72)";

  roundRect(
    ctx,
    35,
    850,
    650,
    290,
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
    910,
    600,
    40,
    5
  );

  /* PROGRESS */

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


/* =====================================================
   TITLE
===================================================== */

function drawTitle(
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
    "bold 50px Arial";

  wrapText(
    ctx,
    title,
    360,
    540,
    600,
    65,
    3
  );

  ctx.font =
    "bold 32px Arial";

  ctx.fillText(
    "📚 StudyShorts",
    360,
    750
  );

  ctx.textAlign =
    "left";
}


/* =====================================================
   SYMBOLS
===================================================== */

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


/* =====================================================
   TEXT WRAP
===================================================== */

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

  let line = "";
  const lines = [];

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
    lines.length <
      maxLines &&
    line
  ) {
    lines.push(line);
  }

  lines.forEach(
    (textLine, i) => {

      ctx.fillText(
        textLine,
        x,
        y +
          i * lineHeight
      );
    }
  );
}


/* =====================================================
   ROUNDED RECTANGLE
===================================================== */

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


/* =====================================================
   HELPERS
===================================================== */

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


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
