/* =========================================================
   STUDYSHORTS
   YouTube Shorts Style Video Generator
   PDF -> Gemini Script -> Animated 9:16 Video

   IMPORTANT:
   - No Gemini Image API
   - No /api/generate-image
   - Video generated in browser
========================================================= */


/* =========================================================
   PDF -> GEMINI SCRIPT
========================================================= */

async function convertPDF() {

  const fileInput =
    document.getElementById("pdfFile");

  const result =
    document.getElementById("result");

  if (!fileInput || !fileInput.files.length) {
    result.innerHTML =
      "⚠️ पहले PDF चुनिए।";
    return;
  }

  const file =
    fileInput.files[0];

  if (file.type !== "application/pdf") {
    result.innerHTML =
      "❌ केवल PDF file चुनिए।";
    return;
  }

  result.innerHTML =
    "📖 PDF पढ़ी जा रही है...";

  try {

    const pdfjs =
      await import(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
      );

    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

    const arrayBuffer =
      await file.arrayBuffer();

    const pdf =
      await pdfjs.getDocument({
        data: arrayBuffer
      }).promise;

    let fullText = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {

      const page =
        await pdf.getPage(pageNumber);

      const textContent =
        await page.getTextContent();

      fullText +=
        " " +
        textContent.items
          .map(item => item.str)
          .join(" ");
    }

    fullText =
      fullText
        .replace(/\s+/g, " ")
        .trim();

    if (!fullText) {

      result.innerHTML =
        "❌ इस PDF में पढ़ने योग्य text नहीं मिला।";

      return;
    }

    result.innerHTML =
      "🤖 Gemini AI Short script बना रहा है...";

    const response =
      await fetch(
        "/api/generate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            text: fullText
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Gemini API में समस्या हुई।"
      );
    }

    if (!data.result) {

      throw new Error(
        "Gemini से Short result नहीं मिला।"
      );
    }

    displayShortScript(
      data.result
    );

  } catch (error) {

    console.error(error);

    result.innerHTML = `
      ❌ Error<br><br>
      ${escapeHTML(
        error.message
      )}
    `;
  }
}


/* =========================================================
   DISPLAY SCRIPT
========================================================= */

function displayShortScript(data) {

  const result =
    document.getElementById("result");

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

  data.scenes.forEach(
    (scene, index) => {

      scenesHTML += `
        <div
          class="scene"
          style="
            margin:20px 0;
            padding:16px;
            border-radius:18px;
            background:#111827;
            color:white;
          "
        >

          <h3>
            🎬 Scene ${index + 1}
          </h3>

          <p>
            <b>🎙️ Narration:</b><br>
            ${escapeHTML(
              scene.narration || ""
            )}
          </p>

          <p>
            <b>🖼️ Visual:</b><br>
            ${escapeHTML(
              scene.visual || ""
            )}
          </p>

        </div>
      `;
    }
  );

  result.innerHTML = `

    <h2>
      🎉 AI Short तैयार है!
    </h2>

    <h3>
      📌 ${escapeHTML(
        data.title ||
        "StudyShorts"
      )}
    </h3>

    <hr>

    ${scenesHTML}

    <button
      id="makeVideoBtn"
      style="
        width:100%;
        padding:17px;
        margin-top:20px;
        border:0;
        border-radius:14px;
        font-size:18px;
        font-weight:bold;
        cursor:pointer;
      "
    >
      🎬 Create YouTube Short
    </button>

    <div
      id="videoStatus"
      style="
        margin-top:15px;
        text-align:center;
      "
    ></div>

    <div
      id="videoResult"
      style="
        margin-top:20px;
      "
    ></div>
  `;

  document
    .getElementById(
      "makeVideoBtn"
    )
    .addEventListener(
      "click",
      () => createVideo(data)
    );
}


/* =========================================================
   CREATE VIDEO
========================================================= */

async function createVideo(data) {

  const button =
    document.getElementById(
      "makeVideoBtn"
    );

  const status =
    document.getElementById(
      "videoStatus"
    );

  const videoResult =
    document.getElementById(
      "videoResult"
    );

  if (
    !data ||
    !Array.isArray(data.scenes) ||
    !data.scenes.length
  ) {

    return;
  }

  button.disabled = true;

  button.innerText =
    "⏳ Short बनाया जा रहा है...";

  status.innerHTML =
    "🎬 YouTube Shorts-style video render हो रहा है...";

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

    const mimeType =
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
            6000000
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
      new Promise(
        resolve => {

          recorder.onstop =
            resolve;

        }
      );

    recorder.start();

    /* =====================================
       INTRO
    ===================================== */

    await renderIntro(
      ctx,
      data.title ||
        "StudyShorts"
    );


    /* =====================================
       SCENES
    ===================================== */

    for (
      let index = 0;
      index < data.scenes.length;
      index++
    ) {

      status.innerHTML =
        `🎬 Scene ${index + 1}/${data.scenes.length} render हो रहा है...`;

      await renderShortScene(
        ctx,
        data.scenes[index],
        index,
        data.scenes.length
      );
    }


    /* =====================================
       OUTRO
    ===================================== */

    await renderOutro(
      ctx
    );


    recorder.stop();

    await stopped;

    stream
      .getTracks()
      .forEach(
        track =>
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
      URL.createObjectURL(
        blob
      );

    videoResult.innerHTML = `

      <h3>
        🎉 YouTube Short तैयार है!
      </h3>

      <video
        controls
        playsinline
        src="${videoURL}"
        style="
          width:100%;
          max-width:360px;
          display:block;
          margin:15px auto;
          border-radius:18px;
          background:black;
        "
      ></video>

      <a
        href="${videoURL}"
        download="StudyShorts-Short.webm"
        style="
          display:block;
          max-width:360px;
          margin:18px auto;
          padding:16px;
          text-align:center;
          text-decoration:none;
          border-radius:14px;
          font-size:18px;
          font-weight:bold;
          background:#16a34a;
          color:white;
        "
      >
        ⬇️ Download Short
      </a>

      <p
        style="
          text-align:center;
          font-size:14px;
        "
      >
        ✅ 9:16 vertical Short तैयार है।
      </p>
    `;

    status.innerHTML =
      "✅ Video successfully तैयार हो गया।";

    button.disabled = false;

    button.innerText =
      "🎬 Create YouTube Short";

  } catch (error) {

    console.error(error);

    status.innerHTML = `
      ❌ Video नहीं बन सकी।<br><br>
      ${escapeHTML(
        error.message
      )}
    `;

    button.disabled = false;

    button.innerText =
      "🔄 Try Again";
  }
}


/* =========================================================
   INTRO
========================================================= */

async function renderIntro(
  ctx,
  title
) {

  const duration =
    1800;

  const start =
    performance.now();

  return new Promise(
    resolve => {

      function frame(now) {

        const progress =
          Math.min(
            (now - start) /
              duration,
            1
          );

        drawBackground(
          ctx,
          progress
        );

        ctx.textAlign =
          "center";

        ctx.fillStyle =
          "#ffffff";

        ctx.font =
          "bold 38px Arial";

        ctx.fillText(
          "📚 STUDYSHORTS",
          360,
          470
        );

        ctx.font =
          "bold 48px Arial";

        drawWrappedCentered(
          ctx,
          title,
          360,
          560,
          580,
          58,
          3
        );

        ctx.font =
          "bold 25px Arial";

        ctx.fillText(
          "Learn • Understand • Remember",
          360,
          760
        );

        ctx.textAlign =
          "left";

        if (
          progress < 1
        ) {

          requestAnimationFrame(
            frame
          );

        } else {

          resolve();
        }
      }

      requestAnimationFrame(
        frame
      );
    }
  );
}


/* =========================================================
   SHORT SCENE
========================================================= */

async function renderShortScene(
  ctx,
  scene,
  index,
  total
) {

  const duration =
    6500;

  const start =
    performance.now();

  return new Promise(
    resolve => {

      function frame(now) {

        const progress =
          Math.min(
            (now - start) /
              duration,
            1
          );

        drawShortScene(
          ctx,
          scene,
          index,
          total,
          progress
        );
