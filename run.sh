#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg not found. Attempting to install..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y ffmpeg
  else
    echo "Please install FFmpeg manually and re-run ./run.sh"
    exit 1
  fi
fi

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data/uploads data/outputs data/credentials

export PYTHONPATH="$PROJECT_ROOT"

uvicorn app.main:app --host 0.0.0.0 --port 8000
