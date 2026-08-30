/* =========================================================
   STUDYSHORTS
   PDF -> Gemini Script -> Browser Video
   No Gemini Image API
   No /api/generate-image
========================================================= */


/* =========================================================
   PDF -> GEMINI SCRIPT
========================================================= */

async function convertPDF() {

  const fileInput = document.getElementById("pdfFile");
  const result = document.getElementById("result");

  if (!fileInput) {
    alert("PDF input नहीं मिला।");
    return;
  }

  if (!result) {
    alert("Result area नहीं मिला।");
    return;
  }

  if (!fileInput.files || !fileInput.files.length) {
    result.innerHTML = "⚠️ पहले PDF चुनिए।";
    return;
  }

  const file = fileInput.files[0];

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    result.innerHTML = "❌ केवल PDF file चुनिए।";
    return;
  }

  result.innerHTML = "📖 PDF पढ़ी जा रही है...";

  try {

    /* =========================
       LOAD PDF.JS
    ========================= */

    const pdfjs = await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
    );

    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


    /* =========================
       READ PDF
    ========================= */

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

      const textContent =
        await page.getTextContent();

      const pageText =
        textContent.items
          .map(item => item.str || "")
          .join(" ");

      fullText += " " + pageText;
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


    /* =========================
       LIMIT VERY LARGE PDF
    ========================= */

    if (fullText.length > 50000) {
      fullText =
        fullText.substring(0, 50000);
    }


    /* =========================
       GEMINI SCRIPT
    ========================= */

    result.innerHTML =
      "🤖 Gemini AI Short script बना रहा है...";


    const response = await fetch(
      "/api/generate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          text: fullText
        })
      }
    );


    /* =========================
       READ SERVER RESPONSE
    ========================= */

    const rawText =
      await response.text();

    let data;

    try {

      data = JSON.parse(rawText);

    } catch (jsonError) {

      throw new Error(
        "Server ने सही JSON response नहीं दिया। HTTP " +
        response.status
      );
    }


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


    /* =========================
       SHOW RESULT
    ========================= */

    displayShortScript(data.result);

  } catch (error) {

    console.error(
      "convertPDF error:",
      error
    );

    result.innerHTML = `
      <div style="
        padding:15px;
        border-radius:12px;
        background:#fee2e2;
        color:#991b1b;
      ">
        ❌ PDF Convert नहीं हो सका।<br><br>
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}


/* =========================================================
   DISPLAY SCRIPT + SCENES
========================================================= */

function displayShortScript(data) {

  const result =
    document.getElementById("result");

  if (
    !data ||
    !Array.isArray(data.scenes) ||
    data.scenes.length === 0
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
            padding:18px;
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

    <div>

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
        type="button"
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

    </div>

  `;


  /* =========================
     BUTTON CONNECTION
  ========================= */

  const button =
    document.getElementById(
      "makeVideoBtn"
    );


  if (button) {

    button.addEventListener(
      "click",
      function () {

        createVideo(data);

      }
    );

  }

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
    data.scenes.length === 0
  ) {

    if (status) {
      status.innerHTML =
        "❌ कोई scenes नहीं मिले।";
    }

    return;
  }


  if (!button) {

    console.error(
      "Create video button not found"
    );

    return;
  }


  button.disabled = true;

  button.innerText =
    "⏳ Video बनाया जा रहा है...";


  if (status) {

    status.innerHTML =
      "🎬 YouTube Shorts-style video render हो रहा है...";

  }


  try {

    /* =========================
       CREATE CANVAS
    ========================= */

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 720;
    canvas.height = 1280;


    const ctx =
      canvas.getContext(
        "2d"
      );


    if (!ctx) {

      throw new Error(
        "Canvas supported नहीं है।"
      );

    }


    /* =========================
       VIDEO STREAM
    ========================= */

    if (
      !canvas.captureStream
    ) {

      throw new Error(
        "इस browser में video recording supported नहीं है।"
      );

    }


    const stream =
      canvas.captureStream(
        30
      );


    /* =========================
       MIME TYPE
    ========================= */

    const mimeTypes = [

      "video/webm;codecs=vp9",

      "video/webm;codecs=vp8",

      "video/webm"

    ];


    let mimeType = "";


    for (
      const type of mimeTypes
    ) {

      if (
        MediaRecorder.isTypeSupported(
          type
        )
      ) {

        mimeType = type;
        break;

      }

    }


    if (!mimeType) {

      throw new Error(
        "इस browser में video recording supported नहीं है।"
      );

    }


    /* =========================
       RECORDER
    ========================= */

    const recorder =
      new MediaRecorder(
        stream,
        {
          mimeType:
            mimeType,

          videoBitsPerSecond:
            5000000
        }
      );


    const chunks = [];


    recorder.ondataavailable =
      function (event) {

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


    /* =========================
       INTRO
    ========================= */

    if (status) {

      status.innerHTML =
        "🎬 Intro बनाया जा रहा है...";

    }


    await renderIntro(
      ctx,
      data.title ||
        "StudyShorts"
    );


    /* =========================
       SCENES
    ========================= */

    for (
      let index = 0;
      index < data.scenes.length;
      index++
    ) {

      if (status) {

        status.innerHTML =
          `🎬 Scene ${index + 1}/${data.scenes.length} बनाया जा रहा है...`;

      }


      await renderShortScene(
        ctx,
        data.scenes[index],
        index,
        data.scenes.length
      );

    }


    /* =========================
       OUTRO
    ========================= */

    if (status) {

      status.innerHTML =
        "🎬 Final screen बनाई जा रही है...";

    }


    await renderOutro(
      ctx
    );


    /* =========================
       STOP RECORDING
    ========================= */

    recorder.stop();

    await stopped;


    stream
      .getTracks()
      .forEach(
        track => track.stop()
      );


    /* =========================
       CREATE VIDEO BLOB
    ========================= */

    const blob =
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );


    if (!blob.size) {

      throw new Error(
        "Video file खाली बनी है।"
      );

    }


    const videoURL =
      URL.createObjectURL(
        blob
      );


    /* =========================
       SHOW VIDEO
    ========================= */

    videoResult.innerHTML = `

      <h3 style="text-align:center;">
        🎉 YouTube Short तैयार है!
      </h3>

      <video
        controls
        playsinline
        preload="metadata"
        src="${videoURL}"
        style="
          width:100%;
          max-width:360px;
          display:block;
          margin:15px auto;
          border-radius:18px;
          background:#000;
        "
      ></video>

      <a
        href="${videoURL}"
        download="StudyShorts-Short.webm"
        style="
          display:block;
          width:calc(100% - 30px);
          max-width:330px;
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
        ✅ 9:16 vertical video तैयार है।
      </p>

    `;


    if (status) {

      status.innerHTML =
        "✅ Video successfully तैयार हो गया।";

    }


    button.disabled = false;

    button.innerText =
      "🎬 Create YouTube Short";


  } catch (error) {

    console.error(
      "createVideo error:",
      error
    );


    if (status) {

      status.innerHTML = `
        ❌ Video नहीं बन सकी।<br><br>
        ${escape
