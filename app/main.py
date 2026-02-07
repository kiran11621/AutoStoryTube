import json
import os
import re
import shutil
import subprocess
import uuid
import wave
from datetime import datetime
from pathlib import Path

import pyttsx3
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"
CREDENTIALS_DIR = DATA_DIR / "credentials"
TOKEN_PATH = CREDENTIALS_DIR / "token.json"
CLIENT_SECRET_PATH = CREDENTIALS_DIR / "client_secret.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

app = FastAPI()
app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


def _run_ffmpeg(command: list[str]) -> None:
    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {process.stderr}")


def _safe_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


def _ffmpeg_filter_path(path: Path) -> str:
    normalized = path.as_posix()
    return (
        normalized.replace("\\", "/")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace(" ", "\\ ")
    )


def _ffmpeg_subtitles_path(path: Path) -> str:
    try:
        relative = path.relative_to(BASE_DIR)
    except ValueError:
        relative = path.resolve()
    return _ffmpeg_filter_path(relative)


def _wav_duration_seconds(wav_path: Path) -> float:
    with wave.open(str(wav_path), "rb") as wav_file:
        frames = wav_file.getnframes()
        rate = wav_file.getframerate()
        return frames / float(rate)


def _text_to_speech(text: str, output_path: Path, rate: int) -> None:
    engine = pyttsx3.init()
    engine.setProperty("rate", rate)
    engine.save_to_file(text, str(output_path))
    engine.runAndWait()


def _format_ass_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_remainder = seconds % 60
    return f"{hours}:{minutes:02d}:{seconds_remainder:05.2f}"


def _build_ass_subtitles(text: str, total_duration: float, output_path: Path) -> None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        lines = [text.strip()]

    word_counts = [max(1, len(line.split())) for line in lines]
    total_words = sum(word_counts)

    header = """[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,3,2,2,60,60,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    start_time = 0.0
    for line, count in zip(lines, word_counts):
        segment_duration = (count / total_words) * total_duration
        end_time = start_time + max(0.5, segment_duration)
        start_stamp = _format_ass_time(start_time)
        end_stamp = _format_ass_time(end_time)
        escaped = line.replace("{", "\\{").replace("}", "\\}")
        events.append(
            f"Dialogue: 0,{start_stamp},{end_stamp},Default,,0,0,0,,{{\\fad(200,200)}}{escaped}"
        )
        start_time = end_time

    output_path.write_text(header + "\n" + "\n".join(events), encoding="utf-8")


@app.post("/api/process")
def process_video(
    background_video: UploadFile = File(...),
    script_file: UploadFile = File(...),
    tts_rate: int = Form(175),
) -> JSONResponse:
    job_id = uuid.uuid4().hex
    video_path = UPLOAD_DIR / f"{job_id}_{_safe_filename(background_video.filename)}"
    script_path = UPLOAD_DIR / f"{job_id}_{_safe_filename(script_file.filename)}"

    with video_path.open("wb") as video_buffer:
        shutil.copyfileobj(background_video.file, video_buffer)
    with script_path.open("wb") as script_buffer:
        shutil.copyfileobj(script_file.file, script_buffer)

    text = script_path.read_text(encoding="utf-8")
    voice_path = OUTPUT_DIR / f"{job_id}_voice.wav"
    _text_to_speech(text, voice_path, tts_rate)

    duration = _wav_duration_seconds(voice_path)
    subtitles_path = OUTPUT_DIR / f"{job_id}.ass"
    _build_ass_subtitles(text, duration, subtitles_path)

    output_path = OUTPUT_DIR / f"{job_id}_final.mp4"

    subtitles_filter = (
        f"subtitles=filename='{_ffmpeg_subtitles_path(subtitles_path)}':charenc=UTF-8"
    )
    ffmpeg_command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(voice_path),
        "-vf",
        subtitles_filter,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ]

    _run_ffmpeg(ffmpeg_command)

    return JSONResponse(
        {
            "job_id": job_id,
            "output_url": f"/api/download/{output_path.name}",
            "ffmpeg_command": " ".join(ffmpeg_command),
        }
    )


@app.get("/api/download/{filename}")
def download_output(filename: str) -> FileResponse:
    file_path = OUTPUT_DIR / filename
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


def _load_credentials() -> Credentials | None:
    if not TOKEN_PATH.exists():
        return None
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        os.chmod(TOKEN_PATH, 0o600)
    return creds


@app.get("/api/youtube/auth-url")
def youtube_auth_url() -> JSONResponse:
    if not CLIENT_SECRET_PATH.exists():
        return JSONResponse(
            {"error": "Missing client_secret.json in data/credentials."}, status_code=400
        )

    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        scopes=SCOPES,
        redirect_uri="http://localhost:8000/oauth2callback",
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    (CREDENTIALS_DIR / "oauth_state.json").write_text(
        json.dumps({"state": state}), encoding="utf-8"
    )
    return JSONResponse({"auth_url": auth_url})


@app.get("/oauth2callback")
def oauth_callback(request: Request) -> HTMLResponse:
    state_path = CREDENTIALS_DIR / "oauth_state.json"
    if not state_path.exists():
        return HTMLResponse("Missing OAuth state.", status_code=400)

    state = json.loads(state_path.read_text(encoding="utf-8"))["state"]
    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        scopes=SCOPES,
        state=state,
        redirect_uri="http://localhost:8000/oauth2callback",
    )
    flow.fetch_token(authorization_response=str(request.url))
    credentials = flow.credentials
    TOKEN_PATH.write_text(credentials.to_json(), encoding="utf-8")
    os.chmod(TOKEN_PATH, 0o600)
    state_path.unlink(missing_ok=True)
    return HTMLResponse("YouTube authorization complete. You can close this tab.")


@app.post("/api/youtube/upload")
def youtube_upload(
    title: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    visibility: str = Form("private"),
    video_file: UploadFile = File(...),
    thumbnail: UploadFile | None = File(None),
) -> JSONResponse:
    creds = _load_credentials()
    if not creds:
        return JSONResponse({"error": "YouTube not authorized."}, status_code=401)

    service = build("youtube", "v3", credentials=creds)

    video_id = uuid.uuid4().hex
    video_path = OUTPUT_DIR / f"{video_id}_{_safe_filename(video_file.filename)}"
    with video_path.open("wb") as video_buffer:
        shutil.copyfileobj(video_file.file, video_buffer)

    request_body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
            "categoryId": "22",
        },
        "status": {"privacyStatus": visibility},
    }

    media = MediaFileUpload(str(video_path), resumable=True)
    upload_request = service.videos().insert(
        part=",".join(request_body.keys()),
        body=request_body,
        media_body=media,
    )
    response = upload_request.execute()

    if thumbnail is not None:
        thumbnail_path = OUTPUT_DIR / f"{video_id}_thumb_{_safe_filename(thumbnail.filename)}"
        with thumbnail_path.open("wb") as thumb_buffer:
            shutil.copyfileobj(thumbnail.file, thumb_buffer)
        service.thumbnails().set(
            videoId=response["id"],
            media_body=MediaFileUpload(str(thumbnail_path)),
        ).execute()

    return JSONResponse(
        {
            "video_id": response.get("id"),
            "video_url": f"https://www.youtube.com/watch?v={response.get('id')}",
        }
    )


@app.get("/api/status")
def status() -> JSONResponse:
    return JSONResponse({"time": datetime.utcnow().isoformat()})
