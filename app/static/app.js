const processForm = document.getElementById("processForm");
const processResult = document.getElementById("processResult");
const ffmpegCommand = document.getElementById("ffmpegCommand");
const authButton = document.getElementById("authButton");
const uploadForm = document.getElementById("uploadForm");
const uploadResult = document.getElementById("uploadResult");

processForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  processResult.textContent = "Rendering... this can take a few minutes.";

  const formData = new FormData(processForm);
  const response = await fetch("/api/process", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    processResult.textContent = payload.error || "Render failed.";
    return;
  }

  processResult.innerHTML = `Done! <a href="${payload.output_url}" target="_blank">Download video</a>`;
  ffmpegCommand.textContent = payload.ffmpeg_command;
});

authButton.addEventListener("click", async () => {
  authButton.disabled = true;
  const response = await fetch("/api/youtube/auth-url");
  const payload = await response.json();
  authButton.disabled = false;

  if (!response.ok || !payload.auth_url) {
    uploadResult.textContent = payload.error || "Unable to start OAuth.";
    return;
  }

  window.open(payload.auth_url, "_blank");
  uploadResult.textContent = "Complete the OAuth flow in the new tab.";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadResult.textContent = "Uploading to YouTube...";

  const formData = new FormData(uploadForm);
  const response = await fetch("/api/youtube/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    uploadResult.textContent = payload.error || "Upload failed.";
    return;
  }

  uploadResult.innerHTML = `Uploaded! <a href="${payload.video_url}" target="_blank">View on YouTube</a>`;
});
