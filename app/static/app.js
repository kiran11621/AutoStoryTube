const processForm = document.getElementById("processForm");
const processResult = document.getElementById("processResult");
const ffmpegCommand = document.getElementById("ffmpegCommand");
const librarySelect = document.getElementById("librarySelect");
const libraryList = document.getElementById("libraryList");
const backgroundInput = processForm.querySelector("input[name='background_video']");
const scriptExcelInput = processForm.querySelector("input[name='script_excel']");
const authButton = document.getElementById("authButton");
const uploadForm = document.getElementById("uploadForm");
const uploadResult = document.getElementById("uploadResult");

processForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  processResult.textContent = "Rendering... this can take a few minutes.";

  const formData = buildProcessFormData();
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

function buildProcessFormData() {
  const formData = new FormData();
  const libraryCode = librarySelect.value.trim();
  formData.append("library_code", libraryCode);
  if (!libraryCode && backgroundInput.files.length > 0) {
    formData.append("background_video", backgroundInput.files[0]);
  }
  if (processForm.script_file.files.length > 0) {
    formData.append("script_file", processForm.script_file.files[0]);
  }
  if (scriptExcelInput.files.length > 0) {
    formData.append("script_excel", scriptExcelInput.files[0]);
  }
  formData.append("tts_rate", processForm.tts_rate.value);
  return formData;
}

async function loadLibrary() {
  const response = await fetch("/api/library");
  const payload = await response.json();
  libraryList.innerHTML = "";
  payload.videos.forEach((video) => {
    const option = document.createElement("option");
    option.value = video.code;
    option.textContent = `${video.code} — ${video.title || "Untitled"}`;
    librarySelect.appendChild(option);

    const listItem = document.createElement("li");
    listItem.textContent = `${video.code} — ${video.title || "Untitled"}`;
    libraryList.appendChild(listItem);
  });

  const toggleBackgroundRequirement = () => {
    const hasLibrary = Boolean(librarySelect.value);
    backgroundInput.required = !hasLibrary;
  };
  toggleBackgroundRequirement();
  librarySelect.addEventListener("change", toggleBackgroundRequirement);
}

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

loadLibrary();
