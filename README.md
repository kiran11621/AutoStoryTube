# AutoStoryTube

AutoStoryTube is a **100% local** web app that turns a background video + story text into a narrated video with animated subtitles, then uploads it to YouTube using the official YouTube Data API v3.

It runs completely offline **except for the YouTube upload step**.

## One-command start

### macOS / Linux

```bash
./run.sh
```

### Windows (PowerShell)

```powershell
./run.ps1
```

Then open: [http://localhost:8000](http://localhost:8000)

---

## Project structure

```
AutoStoryTube/
+-- app/
|   +-- main.py
|   +-- static/
|   |   +-- app.js
|   |   +-- styles.css
|   +-- templates/
|       +-- index.html
+-- frontend/
|   +-- src/
|   |   +-- components/
|   +-- public/
|   +-- package.json
|   +-- vite.config.js
+-- data/
|   +-- credentials/
|   |   +-- client_secret.json
|   +-- outputs/
|   +-- scripts/
|   +-- uploads/
|   +-- video_library/
|   |   +-- catalog.json
|   +-- voices/
|       +-- piper/
+-- requirements.txt
+-- run.sh
+-- run.ps1
+-- README.md
```

---

## How it works

1. **Upload** a background MP4 and a `.txt` script.
2. The app uses **Piper TTS** (offline) to create a WAV voice track.
   - If Piper or voice models are unavailable, it falls back to **pyttsx3**.
3. It generates **animated ASS subtitles** and overlays them with FFmpeg.
4. It exports a final MP4 and lets you download it.
5. You can upload directly to YouTube after authenticating.

### Video library + Excel mapping (optional)

You can keep reusable background videos in `data/video_library` and list them
in `data/video_library/catalog.json`. The UI will show the list and let you
select a video by code instead of uploading every time.

For batch generation, upload one Excel file where each row is one video.

Required columns per row:

- `video_code` (matches the catalog code)
- one script source:
  - `video_script` or `script_text`, or
  - `script_file` (filename of a `.txt` inside `data/scripts`)

Common optional columns:

- `output_video_name`, `video_description`, `video_tags`
- `voice_style`, `voice_gender`, `tts_rate`
- subtitle styling:
  - `text_color` / `subtitle_text_color`
  - `bg_color` / `subtitle_bg_color`
  - `bold` / `subtitle_bold`
  - `italic` / `subtitle_italic`
  - `placement` / `subtitle_placement`

The app also supports downloading a ready-made batch template from the Bulk
Upload UI (`Download Batch Template`).

---

## FFmpeg command used

The exact command is shown in the UI after rendering. Example:

```bash
ffmpeg -y -i input.mp4 -i voice.wav -vf ass=subtitles.ass -c:v libx264 -c:a aac -shortest output.mp4
```

---

## YouTube API setup (one-time)

> You **must** do this once to enable uploads.

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable **YouTube Data API v3**.
4. Create **OAuth Client ID** credentials.
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:8000/oauth2callback`
5. Download the JSON file and save it as:

```
AutoStoryTube/data/credentials/client_secret.json
```

The app stores tokens at:

```
AutoStoryTube/data/credentials/token.json
```

This file is local-only and set to chmod `600` for safety.

---

## Piper voice models (for voice style dropdown)

Voice styles in the UI map to Piper models under:

```
AutoStoryTube/data/voices/piper/
```

Current style/gender mapping in code uses these models:

- `en_US-john-medium.onnx`
- `en_US-kristin-medium.onnx`
- `en_US-joe-medium.onnx`
- `en_US-amy-medium.onnx`
- `en_US-norman-medium.onnx`
- `en_US-libritts-high.onnx`
- `en_US-sam-medium.onnx`
- `en_US-hfc_female-medium.onnx`
- `en_US-hfc_male-medium.onnx`
- `en_US-kathleen-low.onnx`
- `en_US-ryan-high.onnx`
- `en_US-ljspeech-high.onnx`

Each model should also have its matching metadata file:

- `<model>.onnx.json`

If Piper is unavailable, or the selected model file is missing, the app falls back to local `pyttsx3`.

Install Piper in your environment:

```bash
pip install piper-tts
```
## Offline guarantee

- All video processing is local using **FFmpeg**.
- Text-to-speech is offline via **Piper** (with local pyttsx3 fallback).
- The only online step is the YouTube upload.

---

## Notes

- Animated subtitles are done with `.ass` and fade-in/out.
- For longer scripts, rendering can take several minutes.
- If FFmpeg is missing, the start script will prompt you to install it.

---

## Troubleshooting

**`FFmpeg not found`**

macOS/Linux:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

Windows:

```powershell
winget install Gyan.FFmpeg
```

**PowerShell blocked script**

If Windows prevents running `run.ps1`:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**OAuth error**

Double check the redirect URL in Google Console:

```
http://localhost:8000/oauth2callback
```
