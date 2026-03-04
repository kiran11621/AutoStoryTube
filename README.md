# AutoStoryTube

AutoStoryTube is a **100% local** web app that turns a background video + story text into a narrated video with animated subtitles, then uploads it to YouTube using the official YouTube Data API v3.

The YouTube upload flow supports all three post-processing features:

- Thumbnail (manual upload or auto first-frame thumbnail)
- Logo overlay (position + size)
- End credits text on the final seconds of the video
- Optional Shorts mode (converts video to vertical 9:16 and max 59s)

It runs completely offline **except for the YouTube upload step**.

## Prerequisites

Install these before running the app:

- Python 3.10+ (with `pip`)
- Node.js 18+ (includes `npm`)
- FFmpeg (must be available on your `PATH`)

## Startup Guide (Single Port)

Use this mode for normal usage: React frontend + FastAPI backend on one port (`8000`).

### First run (new machine)

1. Build frontend:

```bash
cd frontend
npm install
npm run build
cd ..
```

2. Start backend:
   - macOS/Linux: `./run.sh`
   - Windows (PowerShell): `./run.ps1`

3. Open: [http://localhost:8000](http://localhost:8000)

Notes:

- `run.sh` / `run.ps1` automatically creates `.venv` (if missing) and installs Python requirements.
- FastAPI serves `frontend/dist` at `/` and API routes at `/api/*`.

### later runs

Usually only this is needed:

- macOS/Linux: `./run.sh`
- Windows (PowerShell): `./run.ps1`

Then open [http://localhost:8000](http://localhost:8000).

### If frontend code was changed

Rebuild once before starting backend:

```bash
cd frontend
npm run build
cd ..
```

Then run `./run.sh` or `./run.ps1`.

---

## Project structure

```
AutoStoryTube/
|-- app
|   |-- main.py                         # FastAPI backend (render + batch + YouTube upload)
|-- frontend
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   `-- src
|       |-- App.jsx
|       |-- main.jsx
|       |-- index.css
|       |-- components
|       |   |-- CreateVideo.jsx         # single render flow
|       |   |-- BulkUpload.jsx          # Excel batch flow
|       |   `-- YoutubeUpload.jsx       # upload + thumbnail/logo/branding/end credits
|       `-- pages
|           `-- Dashboard.jsx
|-- data
|   |-- credentials
|   |   |-- .gitkeep
|   |   |-- client_secret.json          # local only, do not commit
|   |   `-- token.json                  # local only, generated after OAuth
|   |-- outputs                          # rendered videos and generated upload intermediates
|   |-- logos                            # optional batch logo files
|   |-- thumbnails                       # optional batch manual thumbnails
|   |-- audio_library
|   |   |-- catalog.json
|   |   `-- README.md
|   |-- scripts
|   |   `-- README.md
|   |-- uploads
|   |-- video_library
|   |   |-- catalog.json
|   |   `-- README.md
|   |-- branding_packs.json             # reusable branding presets
|   |-- music                            # legacy/fallback background music folder
|   |-- branding_packs.README.md
|   `-- voices
|       `-- piper
|-- requirements.txt
|-- run.ps1
|-- run.sh
`-- README.md
```

---

## How it works

1. **Upload** a background MP4 and a `.txt` script.
2. The app uses **Piper TTS** (offline) to create a WAV voice track.
   - If Piper or voice models are unavailable, it falls back to **pyttsx3**.
3. It generates **animated ASS subtitles** and overlays them with FFmpeg.
4. It exports a final MP4 and lets you download it.
5. You can upload directly to YouTube after authenticating.
   - Thumbnail: upload your own image or let the app generate one from the first frame.
   - Logo: apply an optional PNG logo overlay with position and scale controls.
   - End credits: add optional closing text during the last N seconds of the video.
   - Shorts mode: converts the upload to vertical 1080x1920 and trims to 59 seconds.

### YouTube upload result fields

`/api/youtube/upload` returns status fields so UI can report exactly what was applied:

- `thumbnail_applied`, `thumbnail_source`, `thumbnail_error`
- `logo_applied`, `logo_error`
- `end_credits_applied`, `end_credits_error`
- `short_mode_enabled`, `short_processed`, `short_error`

### Video library + Excel mapping (optional)

You can keep reusable background videos in `data/video_library` and list them
in `data/video_library/catalog.json`. The UI will show the list and let you
select a video by code instead of uploading every time.

`context_switch` (context-based video changing) also uses clips from this same
local `data/video_library` folder. To make it work on another machine, copy the
`data/video_library` files and keep `catalog.json` in sync with actual files.

For batch generation, upload one Excel file where each row is one video.

Required columns per row:

- `video_code` (matches the catalog code)
- one script source:
  - `video_script` or `script_text`, or
  - `script_file` (filename of a `.txt` inside `data/scripts`)

Common optional columns:

- `output_video_name`, `video_description`, `video_tags`
- YouTube upload controls:
  - `publish_at` (future datetime; used for scheduling only when visibility is `public` or `unlisted`)
  - `visibility` (`public` / `private` / `unlisted`)
- output framing:
  - `output_mode` (`youtube` = 16:9, `shorts`/`reels` = 9:16, `square` = 1:1)
- `voice_style`, `voice_gender`, `tts_rate`
- thumbnail/branding (optional):
  - `thumbnail_mode` (`auto`, `manual`, `none`)
  - `thumbnail_file` (used when `thumbnail_mode=manual`, from `data/thumbnails`)
  - `branding_pack` (reusable pack from `data/branding_packs.json`)
  - `logo_file` (from `data/logos`)
  - `logo_position` (`top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`)
  - `logo_scale_percent` (`5`-`40`)
  - `logo_animated` (`true`/`false`)
  - `intro_text`, `intro_duration_sec`
  - `subscribe_cta_text`, `subscribe_cta_duration_sec`, `subscribe_cta_from_end_sec`
  - `end_screen_blocks`, `end_screen_duration_sec`
  - `outro_text`, `outro_duration_sec`
  - `end_credits_text`
  - `end_credits_duration_sec`
- background music (optional):
  - `audio_library` (preferred: audio code/title/filename from `data/audio_library/catalog.json`)
  - `audio_library_code`, `audio_name` (aliases)
  - `bgm_file` (also supported: filename/path; resolves from `data/audio_library` first, then `data/music`)
  - `bgm_volume` (0.00 to 1.00, default `0.18`)
  - `bgm_ducking` (`true`/`false`, default `true`)
- subtitle styling:
  - `subtitle_preset` (`classic`, `viral`, `reels`, `cinematic`)
  - `subtitle_template` (`fade`, `bold_center`, `karaoke_word_by_word`, `bounce_fade`, `beat_sync`)
  - `text_color` / `subtitle_text_color`
  - `bg_color` / `subtitle_bg_color`
  - `bold` / `subtitle_bold`
  - `italic` / `subtitle_italic`
  - `placement` / `subtitle_placement`

`subtitle_preset` sets defaults (font size, color theme, weight, placement margin);
explicit `text_color/bg_color/bold/italic/alignment` values in the row still override.
`subtitle_template` is optional and controls subtitle animation style.

The app also supports downloading a ready-made batch template from the Bulk
Upload UI (`Download Batch Template`).

### Bulk generate + YouTube upload

In the Bulk Upload page, enable `Generate + upload to YouTube` to process each
Excel row and upload it directly to YouTube.

Reusable branding packs are supported for both single and batch uploads:

- Create/edit `data/branding_packs.json`
- Set `default_pack` to enforce a consistent branding pack across all uploads
- Use `branding_pack` in Excel rows or in YouTube Upload UI
- Row/manual fields still override pack values

- If a row has `publish_at` and `visibility` is `public` or `unlisted`, the upload is scheduled with YouTube `publishAt`.
- If `visibility` is `private`, the upload remains private and `publish_at` is not applied.
- If `publish_at` is blank/invalid/past, normal `visibility` is used.
- If `publish_at` has no timezone (example `2026-03-03T10:00`), it is treated
  as your local machine time and then converted to UTC for YouTube.
- Thumbnail behavior in batch:
  - `thumbnail_mode=auto` generates an auto thumbnail from rendered video.
  - `thumbnail_mode=manual` uses `thumbnail_file`; if file is missing, it falls back to auto.
  - For `output_mode` in `shorts` / `reels` / `square`, blank/none thumbnail mode defaults to auto.

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
