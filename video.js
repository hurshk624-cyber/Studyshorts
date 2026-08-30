// StudyShorts - Actual 9:16 Video Generator

function showVideoPreview(result) {
  const container = document.getElementById("videoPreview");

  if (!container) {
    console.error("videoPreview element not found");
    return;
  }

  if (!result || !Array.isArray(result.scenes)) {
    container.innerHTML = `
      <p style="color:red;">Video scenes नहीं मिले।</p>
    `;
    return;
  }

  const title = result.title || "StudyShorts";

  let html = `
    <div style="
      max-width:400px;
      margin:20px auto;
      text-align:center;
    ">
      <h3>${escapeHTML(title)}</h3>

      <button
        id="makeVideoBtn"
        onclick="createShortVideo(window.currentShortResult)"
        style="
          width:100%;
          padding:15px;
          margin:15px 0;
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
    </div>
  `;

  container.innerHTML = html;

  window.currentShortResult = result;
}


async function createShortVideo(result) {

  const status = document.getElementById("videoStatus");
  const videoResult = document.getElementById("videoResult");
  const button = document.getElementById("makeVideoBtn");

  if (!result || !result.scenes || !result.scenes.length) {
    if (status) {
      status.innerHTML = "❌ Scenes नहीं मिले।";
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.innerText = "⏳ Video बनाया जा रहा है...";
  }

  if (status) {
    status.innerHTML = "🎬 Short video तैयार हो रहा है...";
  }

  try {

    // 9:16 vertical canvas
    const canvas = document.createElement("canvas");

    canvas.width = 720;
    canvas.height = 1280;

    const ctx = canvas.getContext("2d");

    // Try WebM
    const stream = canvas.captureStream(30);

    let mimeType = "";

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else {
      mimeType = "";
    }

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );

    const chunks = [];

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const stopped = new Promise(resolve => {
      recorder.onstop = resolve;
    });

    recorder.start();

    // Title
    drawBackground(ctx);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";

    drawWrappedText(
      ctx,
      result.title || "StudyShorts",
      360,
      120,
      620,
      52
    );

    await wait(2000);

    // Every scene
    for (let i = 0; i < result.scenes.length; i++) {

      const scene = result.scenes[i];

      if (status) {
        status.innerHTML =
          `🎨 Scene ${i + 1}/${result.scenes.length} तैयार हो रहा है...`;
      }

      await playScene(
        ctx,
        scene,
        i,
        result.scenes.length
      );
    }

    recorder.stop();

    await stopped;

    const blob = new Blob(
      chunks,
      { type: mimeType || "video/webm" }
    );

    const videoURL = URL.createObjectURL(blob);

    videoResult.innerHTML = `
      <h3>🎉 Short Video तैयार है!</h3>

      <video
        controls
        playsinline
        style="
          width:100%;
          max-width:360px;
          border-radius:14px;
          display:block;
          margin:10px auto;
        "
        src="${videoURL}"
      ></video>

      <a
        href="${videoURL}"
        download="studyshorts.webm"
        style="
          display:block;
          text-decoration:none;
          margin-top:15px;
          padding:14px;
          border-radius:12px;
          font-size:18px;
          font-weight:bold;
        "
      >
        ⬇️ Download Short
      </a>
    `;

    if (status) {
      status.innerHTML =
        "✅ Video successfully तैयार हो गया।";
    }

    if (button) {
      button.disabled = false;
      button.innerText = "🎬 Create Short Video";
    }

  } catch (error) {

    console.error("Video generation error:", error);

    if (status) {
      status.innerHTML =
        `❌ Video नहीं बन सका: ${escapeHTML(error.message)}`;
    }

    if (button) {
      button.disabled = false;
      button.innerText = "🔄 Try Again";
    }
  }
}


async function playScene(
  ctx,
  scene,
  index,
  total
) {

  const duration = 5000;
  const start = performance.now();

  // Try to find AI-generated image
  const imageElement =
    document.getElementById(`image-${index}`)
      ?.querySelector("img");

  let image = null;

  if (imageElement) {
    image = await loadImage(imageElement.src);
  }

  return new Promise(resolve => {

    function frame(now) {

      const elapsed = now - start;
      const progress =
        Math.min(elapsed / duration, 1);

      drawBackground(ctx);

      // Scene number
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Arial";

      ctx.fillText(
        `Scene ${index + 1} / ${total}`,
        360,
        70
      );

      // AI image
      if (image) {

        const zoom =
          1 + progress * 0.08;

        const imageWidth = 600 * zoom;
        const imageHeight = 650 * zoom;

        const x =
          (720 - imageWidth) / 2;

        const y =
          150 - (imageHeight - 650) / 2;

        ctx.save();

        ctx.globalAlpha =
          Math.min(1, progress * 5);

        ctx.drawImage(
          image,
          x,
          y,
          imageWidth,
          imageHeight
        );

        ctx.restore();

      } else {

        // Fallback if image not available
        ctx.fillStyle = "#ffffff";
        ctx.font = "28px Arial";

        drawWrappedText(
          ctx,
          scene.visual || "Visual",
          360,
          350,
          600,
          42
        );
      }

      // Narration caption
      ctx.fillStyle = "rgba(0,0,0,0.78)";

      roundRect(
        ctx,
        40,
        850,
        640,
        270,
        20
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 27px Arial";

      drawWrappedText(
        ctx,
        scene.narration || "",
        360,
        910,
        570,
        42
      );

      // Progress bar
      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        40,
        1160,
        640 * progress,
        8
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


function drawBackground(ctx) {

  ctx.fillStyle = "#08111f";

  ctx.fillRect(
    0,
    0,
    720,
    1280
  );
}


function roundRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {

  ctx.beginPath();

  ctx.moveTo(x + radius, y);

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

  ctx.fill();
}


function drawWrappedText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {

  const words =
    String(text || "").split(" ");

  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i++) {

    const testLine =
      line + words[i] + " ";

    const width =
      ctx.measureText(testLine).width;

    if (
      width > maxWidth &&
      line !== ""
    ) {

      ctx.fillText(
        line,
        x,
        currentY
      );

      line =
        words[i] + " ";

      currentY += lineHeight;

    } else {

      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(
      line,
      x,
      currentY
    );
  }
}


function loadImage(src) {

  return new Promise((resolve, reject) => {

    const img =
      new Image();

    img.onload = () =>
      resolve(img);

    img.onerror = reject;

    img.src = src;
  });
}


function wait(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


window.showVideoPreview =
  showVideoPreview;

window.createShortVideo =
  createShortVideo;
