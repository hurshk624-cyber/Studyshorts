// StudyShorts - Vertical Video Preview

function showVideoPreview(result) {
  const container = document.getElementById("videoPreview");

  if (!container) {
    console.error("videoPreview element not found");
    return;
  }

  if (!result || !Array.isArray(result.scenes)) {
    container.innerHTML = `
      <p style="color:red;">
        Video scenes नहीं मिले।
      </p>
    `;
    return;
  }

  const title = result.title || "StudyShorts";

  let html = `
    <div class="short-preview">
      <div class="short-title">
        ${escapeHTML(title)}
      </div>
  `;

  result.scenes.forEach((scene, index) => {
    html += `
      <div class="short-scene">
        <div class="scene-number">
          Scene ${index + 1}
        </div>

        <div class="scene-visual">
          ${escapeHTML(scene.visual || "Visual")}
        </div>

        <div class="scene-narration">
          ${escapeHTML(scene.narration || "")}
        </div>
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;
}


function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// Make function available to your existing script
window.showVideoPreview = showVideoPreview;
