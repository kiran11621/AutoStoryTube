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
├── app/
│   ├── main.py
│   ├── static/
│   │   ├── app.js
│   │   └── styles.css
│   └── templates/
│       └── index.html
├── data/
│   ├── credentials/
│   │   └── client_secret.json   # you add this
│   ├── outputs/
│   └── uploads/
├── requirements.txt
├── run.sh
├── run.ps1
└── README.md
```

---

## How it works

1. **Upload** a background MP4 and a `.txt` script.
2. The app uses **pyttsx3** (offline TTS) to create a WAV voice track.
3. It generates **animated ASS subtitles** and overlays them with FFmpeg.
4. It exports a final MP4 and lets you download it.
5. You can upload directly to YouTube after authenticating.

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

## Offline guarantee

- All video processing is local using **FFmpeg**.
- Text-to-speech is offline via **pyttsx3**.
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
