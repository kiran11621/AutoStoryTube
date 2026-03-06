# Audio Library

Store reusable background music/audio tracks here.

Optional catalog file: `catalog.json`

Example:
```json
[
  { "code": "calm_intro", "title": "Calm Intro", "filename": "calm_intro.mp3" },
  { "code": "news_loop", "title": "News Loop", "filename": "news/news_loop.wav" }
]
```

Batch Excel columns can reference these entries using `audio_library`,
`audio_library_code`, or `audio_name` (code/title/filename).
