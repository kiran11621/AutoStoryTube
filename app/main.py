import json
import os
import re
import shutil
import subprocess
import sys
import uuid
import wave
from datetime import datetime
from pathlib import Path

import pyttsx3

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from openpyxl import load_workbook
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
VIDEO_LIBRARY_DIR = DATA_DIR / "video_library"
VIDEO_LIBRARY_CATALOG = VIDEO_LIBRARY_DIR / "catalog.json"
SCRIPTS_DIR = DATA_DIR / "scripts"
VOICES_DIR = DATA_DIR / "voices"
PIPER_VOICES_DIR = VOICES_DIR / "piper"
TOKEN_PATH = CREDENTIALS_DIR / "token.json"
CLIENT_SECRET_PATH = CREDENTIALS_DIR / "client_secret.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
PIPER_VOICES_DIR.mkdir(parents=True, exist_ok=True)

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
VOICE_STYLE_PRESETS = {
    "professional": {"rate_adjust": -5},
    "casual": {"rate_adjust": 5},
    "narrator": {"rate_adjust": -10},
    "energetic": {"rate_adjust": 15},
    "calm": {"rate_adjust": -15},
    "dramatic": {"rate_adjust": -8},
}
VOICE_MODEL_MATRIX = {
    "professional": {
        "male": "en_US-john-medium.onnx",
        "female": "en_US-kristin-medium.onnx",
    },
    "casual": {
        "male": "en_US-joe-medium.onnx",
        "female": "en_US-amy-medium.onnx",
    },
    "narrator": {
        "male": "en_US-norman-medium.onnx",
        "female": "en_US-libritts-high.onnx",
    },
    "energetic": {
        "male": "en_US-sam-medium.onnx",
        "female": "en_US-hfc_female-medium.onnx",
    },
    "calm": {
        "male": "en_US-hfc_male-medium.onnx",
        "female": "en_US-kathleen-low.onnx",
    },
    "dramatic": {
        "male": "en_US-ryan-high.onnx",
        "female": "en_US-ljspeech-high.onnx",
    },
}
VOICE_STYLE_SOUND_PROFILES = {
    "professional": {
        "length_scale": 1.00,
        "noise_scale": 0.40,
        "noise_w_scale": 0.70,
        "volume": 1.00,
        "tempo": 1.00,
        "bass_gain": 1.0,
        "presence_gain": 0.5,
    },
    "casual": {
        "length_scale": 0.92,
        "noise_scale": 0.55,
        "noise_w_scale": 0.85,
        "volume": 1.03,
        "tempo": 1.08,
        "bass_gain": 0.5,
        "presence_gain": 1.5,
    },
    "narrator": {
        "length_scale": 1.08,
        "noise_scale": 0.35,
        "noise_w_scale": 0.65,
        "volume": 1.02,
        "tempo": 0.92,
        "bass_gain": 2.5,
        "presence_gain": 0.0,
    },
    "energetic": {
        "length_scale": 0.86,
        "noise_scale": 0.65,
        "noise_w_scale": 0.90,
        "volume": 1.10,
        "tempo": 1.15,
        "bass_gain": 0.5,
        "presence_gain": 3.0,
    },
    "calm": {
        "length_scale": 1.15,
        "noise_scale": 0.30,
        "noise_w_scale": 0.60,
        "volume": 0.95,
        "tempo": 0.88,
        "bass_gain": 0.0,
        "presence_gain": -2.0,
    },
    "dramatic": {
        "length_scale": 1.12,
        "noise_scale": 0.50,
        "noise_w_scale": 0.80,
        "volume": 1.10,
        "tempo": 0.90,
        "bass_gain": 4.0,
        "presence_gain": 2.0,
    },
}


def _voice_profile(voice_style: str, rate: int) -> dict[str, float]:
    profile = VOICE_STYLE_SOUND_PROFILES.get(
        voice_style, VOICE_STYLE_SOUND_PROFILES["professional"]
    ).copy()
    rate_factor = 175 / max(120, min(260, rate))
    profile["length_scale"] = max(0.70, min(1.45, profile["length_scale"] * rate_factor))
    profile["tempo"] = max(0.75, min(1.25, profile["tempo"]))
    return profile


def _post_process_voice(audio_path: Path, profile: dict[str, float]) -> None:
    processed_path = audio_path.with_name(f"{audio_path.stem}_fx.wav")
    filters = [
        f"atempo={profile['tempo']:.2f}",
        f"equalizer=f=120:t=o:w=1.2:g={profile['bass_gain']:.1f}",
        f"equalizer=f=3200:t=o:w=1.1:g={profile['presence_gain']:.1f}",
        "acompressor=threshold=-18dB:ratio=2.8:attack=18:release=150",
        f"volume={profile['volume']:.2f}",
    ]
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(audio_path),
        "-filter:a",
        ",".join(filters),
        str(processed_path),
    ]
    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode == 0 and processed_path.exists():
        processed_path.replace(audio_path)
app = FastAPI()
app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/library")
def library_catalog() -> JSONResponse:
    return JSONResponse({"videos": _load_video_catalog()})


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
    return _ffmpeg_filter_path(path.resolve())


def _load_video_catalog() -> list[dict[str, str]]:
    if not VIDEO_LIBRARY_CATALOG.exists():
        return []
    try:
        entries = json.loads(VIDEO_LIBRARY_CATALOG.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return [entry for entry in entries if isinstance(entry, dict)]


def _library_video_path(code: str) -> Path | None:
    for entry in _load_video_catalog():
        if entry.get("code") == code:
            filename = entry.get("filename")
            if filename:
                candidate = VIDEO_LIBRARY_DIR / filename
                return candidate if candidate.exists() else None
    return None


def _load_script_from_excel(excel_path: Path, video_code: str) -> str | None:
    workbook = load_workbook(filename=excel_path, read_only=True, data_only=True)
    sheet = workbook.active
    headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]
    try:
        code_index = headers.index("video_code")
    except ValueError:
        code_index = -1
    text_index = headers.index("script_text") if "script_text" in headers else -1
    file_index = headers.index("script_file") if "script_file" in headers else -1
    if code_index == -1:
        return None

    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        current_code = str(row[code_index]).strip() if row[code_index] is not None else ""
        if current_code != video_code:
            continue
        if text_index != -1 and row[text_index]:
            return str(row[text_index]).strip()
        if file_index != -1 and row[file_index]:
            script_name = _safe_filename(str(row[file_index]).strip())
            script_path = SCRIPTS_DIR / script_name
            if script_path.exists():
                return script_path.read_text(encoding="utf-8")
    return None


def _audio_duration_seconds(audio_path: Path) -> float:
    probe_command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]
    process = subprocess.run(probe_command, capture_output=True, text=True)
    if process.returncode == 0:
        try:
            return float(process.stdout.strip())
        except ValueError:
            pass

    with wave.open(str(audio_path), "rb") as wav_file:
        frames = wav_file.getnframes()
        rate = wav_file.getframerate()
        return frames / float(rate)


def _text_to_speech(
    text: str,
    output_path: Path,
    rate: int,
    voice_style: str,
    voice_gender: str,
) -> tuple[str, str]:
    style = VOICE_STYLE_PRESETS.get(voice_style, VOICE_STYLE_PRESETS["professional"])
    profile = _voice_profile(voice_style, rate)
    style_models = VOICE_MODEL_MATRIX.get(voice_style, VOICE_MODEL_MATRIX["professional"])
    model_name = style_models.get(voice_gender, style_models["male"])
    model_path = PIPER_VOICES_DIR / model_name

    piper_executable = shutil.which("piper")
    if not piper_executable:
        candidate = Path(sys.executable).resolve().parent / (
            "piper.exe" if os.name == "nt" else "piper"
        )
        if candidate.exists():
            piper_executable = str(candidate)

    if piper_executable and model_path.exists():
        input_text_path = output_path.with_suffix(".txt")
        input_text_path.write_text(text, encoding="utf-8")
        piper_command = [
            piper_executable,
            "--model",
            str(model_path),
            "--input_file",
            str(input_text_path),
            "--output_file",
            str(output_path),
            "--length_scale",
            f"{profile['length_scale']:.2f}",
            "--noise_scale",
            f"{profile['noise_scale']:.2f}",
            "--noise_w_scale",
            f"{profile['noise_w_scale']:.2f}",
            "--volume",
            f"{profile['volume']:.2f}",
        ]
        process = subprocess.run(piper_command, capture_output=True, text=True)
        input_text_path.unlink(missing_ok=True)
        if process.returncode == 0 and output_path.exists():
            _post_process_voice(output_path, profile)
            return "piper", model_name

    adjusted_rate = max(120, min(260, int(rate * (1 + (style["rate_adjust"] / 100)))))
    engine = pyttsx3.init()
    engine.setProperty("rate", adjusted_rate)
    engine.save_to_file(text, str(output_path))
    engine.runAndWait()
    return "pyttsx3", "pyttsx3-default"


def _format_ass_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_remainder = seconds % 60
    return f"{hours}:{minutes:02d}:{seconds_remainder:05.2f}"


def _hex_to_ass_color(hex_color: str, alpha: str = "00") -> str:
    value = hex_color.strip().lstrip("#")
    if len(value) != 6:
        value = "FFFFFF"
    rr = value[0:2]
    gg = value[2:4]
    bb = value[4:6]
    return f"&H{alpha}{bb}{gg}{rr}".upper()


def _build_ass_style_line(
    text_color: str,
    bg_color: str,
    bold: bool,
    italic: bool,
    alignment: int = 2,  
    font_size: int = 48,
) -> str:
    primary = _hex_to_ass_color(text_color, alpha="00")
    back = _hex_to_ass_color(bg_color, alpha="00")
    
    bold_value = -1 if bold else 0
    italic_value = -1 if italic else 0
 
    return (
        "Style: Default,Arial,"
        f"{font_size},{primary},&H000000FF,{back},{back},"
        f"{bold_value},{italic_value},0,0,100,100,0,0,3,1,0,{alignment},60,60,80,1"
    )


def _build_ass_subtitles(
    text: str,
    total_duration: float,
    output_path: Path,
    text_color: str,
    bg_color: str,
    bold: bool,
    italic: bool,
    alignment: int = 2,  
    font_size: int = 48,
) -> None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        lines = [text.strip()]

    word_counts = [max(1, len(line.split())) for line in lines]
    total_words = sum(word_counts)
    
    style_line = _build_ass_style_line(
        text_color, 
        bg_color, 
        bold, 
        italic, 
        alignment=alignment, 
        font_size=font_size
    )

    header = f"""[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{style_line}

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
    background_video: UploadFile | None = File(None),
    script_file: UploadFile | None = File(None),
    library_code: str = Form(""),
    script_excel: UploadFile | None = File(None),
    tts_rate: int = Form(175),
    text_color: str = Form("#ffffff"),
    bg_color: str = Form("#000000"),
    bold: str = Form("false"),
    italic: str = Form("false"),
    alignment: int = Form(2),
    voice_style: str = Form("professional"),
    voice_gender: str = Form("male"),
) -> JSONResponse:
    text_color = (text_color or "#ffffff").strip()
    bg_color = (bg_color or "#000000").strip()
    
    is_bold = bold.lower() == "true"
    is_italic = italic.lower() == "true"
    voice_style = (voice_style or "professional").strip().lower()
    if voice_style not in VOICE_STYLE_PRESETS:
        voice_style = "professional"
    voice_gender = (voice_gender or "male").strip().lower()
    if voice_gender not in {"male", "female"}:
        voice_gender = "male"

    job_id = uuid.uuid4().hex
    video_path: Path | None = None
    if library_code:
        video_path = _library_video_path(library_code)
        if video_path is None:
            return JSONResponse({"error": "Library video code not found."}, status_code=400)
    elif background_video is not None:
        video_path = UPLOAD_DIR / f"{job_id}_{_safe_filename(background_video.filename)}"
        with video_path.open("wb") as video_buffer:
            shutil.copyfileobj(background_video.file, video_buffer)
    else:
        return JSONResponse({"error": "Provide a background video or select a library code."}, status_code=400)

    text = None
    if script_excel is not None and library_code:
        excel_path = UPLOAD_DIR / f"{job_id}_{_safe_filename(script_excel.filename)}"
        with excel_path.open("wb") as excel_buffer:
            shutil.copyfileobj(script_excel.file, excel_buffer)
        text = _load_script_from_excel(excel_path, library_code)
        if text is None:
            return JSONResponse({"error": "No script found in Excel for this video code."}, status_code=400)

    if text is None:
        if script_file is None:
            return JSONResponse({"error": "Provide a script text file or Excel mapping."}, status_code=400)
        script_path = UPLOAD_DIR / f"{job_id}_{_safe_filename(script_file.filename)}"
        with script_path.open("wb") as script_buffer:
            shutil.copyfileobj(script_file.file, script_buffer)
        text = script_path.read_text(encoding="utf-8")

    voice_path = OUTPUT_DIR / f"{job_id}_voice.wav"
    tts_engine, voice_model = _text_to_speech(
        text, voice_path, tts_rate, voice_style, voice_gender
    )

    duration = _audio_duration_seconds(voice_path)
    subtitles_path = OUTPUT_DIR / f"{job_id}.ass"

    _build_ass_subtitles(
        text,
        duration,
        subtitles_path,
        text_color=text_color,
        bg_color=bg_color,
        bold=is_bold,
        italic=is_italic,
        alignment=alignment, 
        font_size=48,
    )

    output_path = OUTPUT_DIR / f"{job_id}_final.mp4"

    subtitles_filter = f"ass=filename='{_ffmpeg_subtitles_path(subtitles_path)}'"
    ffmpeg_command = [
        "ffmpeg",
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(video_path),
        "-i",
        str(voice_path),
        "-t",
        f"{duration:.2f}",
        "-vf",
        subtitles_filter,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        str(output_path),
    ]

    _run_ffmpeg(ffmpeg_command)

    return JSONResponse(
        {
            "job_id": job_id,
            "output_url": f"/api/download/{output_path.name}",
            "ffmpeg_command": " ".join(ffmpeg_command),
            "tts_engine": tts_engine,
            "voice_style": voice_style,
            "voice_gender": voice_gender,
            "voice_model": voice_model,
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
