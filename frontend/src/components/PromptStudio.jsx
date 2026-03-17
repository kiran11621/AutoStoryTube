import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
	Sparkles,
	FileText,
	Tags,
	UploadCloud,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Download,
	Mic,
	SlidersHorizontal,
	Clapperboard,
	Film,
	Type,
	Palette,
	Music,
	Globe2,
	Sliders,
	Clock,
	AlignLeft,
} from "lucide-react";

export default function PromptStudio() {
	const voiceStyles = [
		{ key: "professional", label: "Professional" },
		{ key: "casual", label: "Casual" },
		{ key: "narrator", label: "Narrator" },
		{ key: "energetic", label: "Energetic" },
		{ key: "calm", label: "Calm" },
		{ key: "dramatic", label: "Dramatic" },
	];
	const subtitlePresets = {
		classic: {
			label: "Classic",
			textColor: "#ffffff",
			bgColor: "#000000",
			bold: false,
			italic: false,
			alignment: "2",
		},
		viral: {
			label: "Viral",
			textColor: "#ffffff",
			bgColor: "#ff4d00",
			bold: true,
			italic: false,
			alignment: "2",
		},
		reels: {
			label: "Reels",
			textColor: "#f5f7fa",
			bgColor: "#1f2937",
			bold: true,
			italic: false,
			alignment: "2",
		},
		cinematic: {
			label: "Cinematic",
			textColor: "#f7e7c6",
			bgColor: "#101010",
			bold: false,
			italic: false,
			alignment: "2",
		},
	};
	const subtitleTemplates = [
		{ key: "fade", label: "Fade" },
		{ key: "bold_center", label: "Bold Center" },
		{ key: "karaoke_word_by_word", label: "Karaoke" },
		{ key: "bounce_fade", label: "Bounce/Fade" },
		{ key: "beat_sync", label: "Beat Sync" },
	];
	const [prompt, setPrompt] = useState("");
	const [mode, setMode] = useState("generate_video");
	const [language, setLanguage] = useState("English");
	const [tone, setTone] = useState("Dramatic");
	const [length, setLength] = useState("2 minutes");
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [status, setStatus] = useState(null);
	const [message, setMessage] = useState("");
	const [result, setResult] = useState(null);
	const [storyText, setStoryText] = useState("");
	const [titleText, setTitleText] = useState("");
	const [descriptionText, setDescriptionText] = useState("");
	const [tagsText, setTagsText] = useState("");
	const [isAuthorized, setIsAuthorized] = useState(true);
	const [authMessage, setAuthMessage] = useState("");
	const [clientSecretFile, setClientSecretFile] = useState(null);
	const [clientSecretStatus, setClientSecretStatus] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [voiceStyle, setVoiceStyle] = useState("professional");
	const [voiceGender, setVoiceGender] = useState("male");
	const [ttsSpeed, setTtsSpeed] = useState(175);
	const [outputMode, setOutputMode] = useState("youtube");
	const [videoStrategy, setVideoStrategy] = useState("context_switch");
	const [categoryHint, setCategoryHint] = useState("");
	const [libraryRef, setLibraryRef] = useState("");
	const [contextSceneCount, setContextSceneCount] = useState(6);
	const [contextLibraryRefs, setContextLibraryRefs] = useState("");
	const [subtitlePreset, setSubtitlePreset] = useState("classic");
	const [subtitleTemplate, setSubtitleTemplate] = useState("beat_sync");
	const [subtitlePosition, setSubtitlePosition] = useState("bottom");
	const [subtitleTextColor, setSubtitleTextColor] = useState("#ffffff");
	const [subtitleBgColor, setSubtitleBgColor] = useState("#000000");
	const [subtitleBold, setSubtitleBold] = useState(false);
	const [subtitleItalic, setSubtitleItalic] = useState(false);
	const [audioLibraryRef, setAudioLibraryRef] = useState("");
	const [bgmVolume, setBgmVolume] = useState(18);
	const [bgmDucking, setBgmDucking] = useState(true);
	const videoUrl =
		result?.video?.outputUrl ||
		result?.video?.output_url ||
		result?.outputUrl ||
		result?.output_url ||
		"";

	useEffect(() => {
		setStatus(null);
		setMessage("");
		setResult(null);
		setStoryText("");
		setTitleText("");
		setDescriptionText("");
		setTagsText("");
		setAuthMessage("");
		setClientSecretStatus("");
		if (mode === "generate_upload") {
			fetch("/api/youtube/status")
				.then((res) => res.json())
				.then((data) => setIsAuthorized(Boolean(data?.authorized)))
				.catch(() => setIsAuthorized(false));
		}
	}, [mode]);

	const handleClientSecretChange = (event) => {
		const file = event.target.files[0];
		setClientSecretStatus("");
		setClientSecretFile(file || null);
	};

	const handleClientSecretUpload = async () => {
		if (!clientSecretFile) {
			setClientSecretStatus("Select a client_secret.json file first.");
			return;
		}
		setClientSecretStatus("Uploading client secret...");
		try {
			const payload = new FormData();
			payload.append("client_secret", clientSecretFile);
			const response = await fetch("/api/youtube/client-secret", {
				method: "POST",
				body: payload,
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.error || "Upload failed.");
			}
			setClientSecretStatus(
				"Client secret saved. Please connect YouTube to authorize.",
			);
		} catch (err) {
			setClientSecretStatus(err?.message || "Upload failed.");
		}
	};

	const handleConnectYouTube = async () => {
		setAuthMessage("");
		try {
			const response = await fetch("/api/youtube/auth-url");
			const data = await response.json();
			if (!response.ok || !data?.auth_url) {
				throw new Error(data?.error || "Unable to start YouTube auth.");
			}
			window.open(data.auth_url, "_blank", "noopener,noreferrer");
			setAuthMessage("Authorization page opened. Complete it, then retry.");
		} catch (err) {
			setAuthMessage(err?.message || "Unable to start YouTube auth.");
		}
	};

	const handlePreview = async (event) => {
		event.preventDefault();
		if (!prompt.trim()) {
			setStatus("error");
			setMessage("Please enter a prompt for the story.");
			return;
		}

		setIsLoading(true);
		setProgress(0);
		setStatus(null);
		setMessage("");
		setResult(null);

		const startedAt = Date.now();
		const expectedTotalSeconds = 50;
		const progressInterval = setInterval(() => {
			const elapsedSeconds = (Date.now() - startedAt) / 1000;
			const target = Math.min(
				95,
				(elapsedSeconds / expectedTotalSeconds) * 95,
			);
			setProgress((prev) => Math.max(prev, target));
		}, 250);

		try {
			const response = await fetch("/api/story/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: prompt.trim(),
					language,
					tone,
					length,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.error || "Story generation failed.");
			}

			clearInterval(progressInterval);
			setProgress(98);
			await new Promise((resolve) => setTimeout(resolve, 180));
			setProgress(100);
			setResult(data);
			setStoryText(data?.story || "");
			setTitleText(data?.title || "");
			setDescriptionText(data?.description || "");
			setTagsText(Array.isArray(data?.tags) ? data.tags.join(", ") : data?.tags || "");
			setStatus("success");
			setMessage("Preview generated. You can edit before creating the video.");
		} catch (error) {
			clearInterval(progressInterval);
			setStatus("error");
			setMessage(error?.message || "Story generation failed.");
		} finally {
			setTimeout(() => setProgress(0), 800);
			setIsLoading(false);
		}
	};

	const handleGenerateVideo = async () => {
		if (!storyText.trim()) {
			setStatus("error");
			setMessage("Story is required before generating video.");
			return;
		}
		setIsLoading(true);
		setProgress(0);
		setStatus(null);
		setMessage("");

		const startedAt = Date.now();
		const expectedTotalSeconds = 50;
		const progressInterval = setInterval(() => {
			const elapsedSeconds = (Date.now() - startedAt) / 1000;
			const target = Math.min(
				95,
				(elapsedSeconds / expectedTotalSeconds) * 95,
			);
			setProgress((prev) => Math.max(prev, target));
		}, 250);

		try {
			const alignmentMap = {
				top: "8",
				middle: "5",
				bottom: "2",
			};
			const response = await fetch("/api/story/render", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					mode,
					title: titleText.trim(),
					story: storyText.trim(),
					description: descriptionText.trim(),
					tags: tagsText,
					settings: {
						voice_style: voiceStyle,
						voice_gender: voiceGender,
						tts_rate: ttsSpeed,
						output_mode: outputMode,
						video_strategy: videoStrategy,
						category_hint: categoryHint.trim(),
						library_ref: libraryRef.trim(),
						context_scene_count: contextSceneCount,
						context_lock_category: "true",
						context_library_refs: contextLibraryRefs,
						subtitle_preset: subtitlePreset,
						subtitle_template: subtitleTemplate,
						alignment: alignmentMap[subtitlePosition],
						text_color: subtitleTextColor,
						bg_color: subtitleBgColor,
						bold: subtitleBold,
						italic: subtitleItalic,
						audio_library_ref: audioLibraryRef.trim(),
						bgm_volume: (bgmVolume / 100).toFixed(2),
						bgm_ducking: bgmDucking,
					},
				}),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.error || "Video generation failed.");
			}
			clearInterval(progressInterval);
			setProgress(98);
			await new Promise((resolve) => setTimeout(resolve, 180));
			setProgress(100);
			setResult((prev) => ({ ...(prev || {}), ...data }));
			if (mode === "generate_upload" && data?.upload?.status === "failed") {
				setStatus("error");
				setMessage(data?.upload?.error || "Upload failed.");
			} else if (mode === "generate_video" && data?.video?.status === "failed") {
				setStatus("error");
				setMessage(data?.video?.error || "Video generation failed.");
			} else {
				setStatus("success");
				setMessage(
					mode === "generate_upload" && data?.upload?.youtubeUrl
						? "Video uploaded successfully."
						: "Video generated successfully.",
				);
			}
		} catch (error) {
			clearInterval(progressInterval);
			setStatus("error");
			setMessage(error?.message || "Video generation failed.");
		} finally {
			setTimeout(() => setProgress(0), 800);
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 md:p-6">
			<div className="max-w-5xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className="space-y-5"
				>
					<div className="text-center">
						<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
							Prompt Studio
						</h2>
						<p className="text-slate-400 text-sm mt-2">
							Generate a narrated story, description, and tags from a single prompt.
						</p>
					</div>

					<form onSubmit={handlePreview} className="space-y-4">
						<div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-4">
							<div className="flex items-center gap-2 text-slate-200 font-semibold">
								<Sparkles className="w-4 h-4 text-purple-300" />
								Prompt
							</div>
							<textarea
								value={prompt}
								onChange={(event) => setPrompt(event.target.value)}
								placeholder="Describe the video you want and the story to narrate..."
								rows="6"
								className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 resize-none"
							/>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
									<label className="text-xs text-slate-400 mb-2 flex items-center gap-2">
										<Globe2 className="h-3.5 w-3.5 text-purple-300" />
										Language
									</label>
									<input
										type="text"
										value={language}
										onChange={(event) => setLanguage(event.target.value)}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
									/>
								</div>
								<div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
									<label className="text-xs text-slate-400 mb-2 flex items-center gap-2">
										<Sliders className="h-3.5 w-3.5 text-blue-300" />
										Tone
									</label>
									<input
										type="text"
										value={tone}
										onChange={(event) => setTone(event.target.value)}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
									/>
								</div>
								<div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
									<label className="text-xs text-slate-400 mb-2 flex items-center gap-2">
										<Clock className="h-3.5 w-3.5 text-emerald-300" />
										Length
									</label>
									<input
										type="text"
										value={length}
										onChange={(event) => setLength(event.target.value)}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
									/>
								</div>
							</div>
						</div>

						<div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-3">
							<div className="flex items-center gap-2 text-slate-200 font-semibold">
								<Clapperboard className="w-4 h-4 text-blue-300" />
								Output Mode
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => setMode("generate_video")}
									className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
										mode === "generate_video"
											? "border-purple-400 bg-purple-500/20 text-white"
											: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
									}`}
								>
									Generate
								</button>
								<button
									type="button"
									onClick={() => setMode("generate_upload")}
									className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
										mode === "generate_upload"
											? "border-purple-400 bg-purple-500/20 text-white"
											: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
									}`}
								>
									Generate + Upload
								</button>
							</div>
							<p className="text-xs text-slate-500">
								Upload uses generated title, description, and tags.
							</p>
						</div>

						<div className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950/70 via-slate-900/70 to-slate-950/70 p-4 md:p-5 shadow-[0_12px_40px_rgba(15,23,42,0.45)] space-y-4">
							<button
								type="button"
								onClick={() => setShowAdvanced((prev) => !prev)}
								className="w-full flex flex-wrap items-center justify-between gap-2 text-left"
							>
								<div className="flex items-center gap-3">
									<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 border border-purple-500/30">
										<SlidersHorizontal className="h-5 w-5 text-purple-200" />
									</span>
									<div>
										<p className="text-sm font-semibold text-slate-100">
											Advanced Render Settings
										</p>
										<p className="text-xs text-slate-400">
											Tune narration, visuals, subtitles, and audio mix.
										</p>
									</div>
								</div>
								<span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
									{showAdvanced ? "Collapse" : "Customize"}
								</span>
							</button>

							{showAdvanced ? (
								<div className="space-y-5">
									<div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
										<div className="flex items-center gap-2">
											<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/30">
												<Mic className="h-4 w-4 text-purple-200" />
											</span>
											<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
												Voice & Timing
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Voice Style
												</label>
												<select
													value={voiceStyle}
													onChange={(event) => setVoiceStyle(event.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													{voiceStyles.map((style) => (
														<option key={style.key} value={style.key}>
															{style.label}
														</option>
													))}
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Voice Gender
												</label>
												<select
													value={voiceGender}
													onChange={(event) => setVoiceGender(event.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													<option value="male">Male</option>
													<option value="female">Female</option>
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													TTS Speed
												</label>
												<input
													type="number"
													min="120"
													max="240"
													value={ttsSpeed}
													onChange={(event) =>
														setTtsSpeed(Number(event.target.value) || 175)
													}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												/>
												<p className="text-[11px] text-slate-500 mt-2">
													120–240 words/min for natural pacing.
												</p>
											</div>
										</div>
									</div>

									<div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
										<div className="flex items-center gap-2">
											<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/30">
												<Clapperboard className="h-4 w-4 text-blue-200" />
											</span>
											<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
												Format & Strategy
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Output Format
												</label>
												<select
													value={outputMode}
													onChange={(event) => setOutputMode(event.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													<option value="youtube">YouTube (16:9)</option>
													<option value="shorts">Shorts (9:16)</option>
													<option value="reels">Reels (9:16)</option>
													<option value="square">Square (1:1)</option>
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Video Strategy
												</label>
												<select
													value={videoStrategy}
													onChange={(event) => setVideoStrategy(event.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													<option value="single">Single Background</option>
													<option value="context_switch">Context Switch</option>
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Category Hint
												</label>
												<input
													type="text"
													value={categoryHint}
													onChange={(event) => setCategoryHint(event.target.value)}
													placeholder="motivation, finance, politics..."
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												/>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 md:col-span-2">
												<label className="text-xs text-slate-400 mb-2 block">
													Library Code (Optional)
												</label>
												<input
													type="text"
													value={libraryRef}
													onChange={(event) => setLibraryRef(event.target.value)}
													placeholder="use a specific library clip"
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												/>
											</div>
										</div>
									</div>

									<div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
										<div className="flex items-center gap-2">
											<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30">
												<Film className="h-4 w-4 text-cyan-200" />
											</span>
											<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
												Context & Library
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Context Scene Count
												</label>
												<input
													type="number"
													min="2"
													max="12"
													value={contextSceneCount}
													onChange={(event) =>
														setContextSceneCount(Number(event.target.value) || 6)
													}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												/>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Context Library Refs
												</label>
												<input
													type="text"
													value={contextLibraryRefs}
													onChange={(event) =>
														setContextLibraryRefs(event.target.value)
													}
													placeholder="comma-separated codes"
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												/>
											</div>
										</div>
									</div>

									<div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
										<div className="flex items-center gap-2">
											<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
												<Type className="h-4 w-4 text-amber-200" />
											</span>
											<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
												Subtitles
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Subtitle Preset
												</label>
												<select
													value={subtitlePreset}
													onChange={(event) => {
														const presetKey = event.target.value;
														setSubtitlePreset(presetKey);
														const preset = subtitlePresets[presetKey];
														if (preset) {
															setSubtitleTextColor(preset.textColor);
															setSubtitleBgColor(preset.bgColor);
															setSubtitleBold(preset.bold);
															setSubtitleItalic(preset.italic);
														}
													}}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													{Object.entries(subtitlePresets).map(
														([key, preset]) => (
															<option key={key} value={key}>
																{preset.label}
															</option>
														),
													)}
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Subtitle Template
												</label>
												<select
													value={subtitleTemplate}
													onChange={(event) =>
														setSubtitleTemplate(event.target.value)
													}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													{subtitleTemplates.map((template) => (
														<option key={template.key} value={template.key}>
															{template.label}
														</option>
													))}
												</select>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Subtitle Position
												</label>
												<select
													value={subtitlePosition}
													onChange={(event) =>
														setSubtitlePosition(event.target.value)
													}
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
												>
													<option value="top">Top</option>
													<option value="middle">Middle</option>
													<option value="bottom">Bottom</option>
												</select>
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Text Color
												</label>
												<input
													type="color"
													value={subtitleTextColor}
													onChange={(event) =>
														setSubtitleTextColor(event.target.value)
													}
													className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900/80"
												/>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Background Color
												</label>
												<input
													type="color"
													value={subtitleBgColor}
													onChange={(event) =>
														setSubtitleBgColor(event.target.value)
													}
													className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900/80"
												/>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-2">
												<label className="text-xs text-slate-400 block">
													Style Flags
												</label>
												<label className="flex items-center gap-2 text-xs text-slate-400">
													<input
														type="checkbox"
														checked={subtitleBold}
														onChange={(event) =>
															setSubtitleBold(event.target.checked)
														}
														className="h-4 w-4 rounded border-slate-600 bg-slate-900"
													/>
													Bold
												</label>
												<label className="flex items-center gap-2 text-xs text-slate-400">
													<input
														type="checkbox"
														checked={subtitleItalic}
														onChange={(event) =>
															setSubtitleItalic(event.target.checked)
														}
														className="h-4 w-4 rounded border-slate-600 bg-slate-900"
													/>
													Italic
												</label>
											</div>
										</div>
									</div>

									<div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
										<div className="flex items-center gap-2">
											<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
												<Music className="h-4 w-4 text-emerald-200" />
											</span>
											<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
												Audio Bed
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
												<label className="text-xs text-slate-400 mb-2 block">
													Audio Library Ref
												</label>
												<input
													type="text"
													value={audioLibraryRef}
													onChange={(event) =>
														setAudioLibraryRef(event.target.value)
													}
													placeholder="code/title/filename"
													className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
												/>
											</div>
											<div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-2">
												<div className="flex items-center justify-between">
													<label className="text-xs text-slate-400">
														BGM Volume
													</label>
													<span className="text-xs text-slate-500">
														{bgmVolume}%
													</span>
												</div>
												<input
													type="range"
													min="0"
													max="100"
													value={bgmVolume}
													onChange={(event) =>
														setBgmVolume(Number(event.target.value) || 0)
													}
													className="w-full accent-emerald-400"
												/>
												<label className="flex items-center gap-2 text-xs text-slate-400">
													<input
														type="checkbox"
														checked={bgmDucking}
														onChange={(event) =>
															setBgmDucking(event.target.checked)
														}
														className="h-4 w-4 rounded border-slate-600 bg-slate-900"
													/>
													Auto duck voice-over
												</label>
											</div>
										</div>
									</div>
								</div>
							) : null}
						</div>

						{status === "success" ? (
							<div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm inline-flex items-center gap-2">
								<CheckCircle2 className="w-4 h-4" />
								<span>{message}</span>
							</div>
						) : null}

						{mode === "generate_upload" ? (
							<div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-200">
											Client Secret (JSON)
										</p>
										<p className="text-xs text-slate-500 mt-1">
											Upload your Google OAuth client secret to enable YouTube auth.
										</p>
									</div>
									<div className="flex flex-col sm:flex-row gap-2">
										<input
											type="file"
											accept="application/json,.json"
											onChange={handleClientSecretChange}
											className="w-full sm:w-auto px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-slate-100"
										/>
										<button
											type="button"
											onClick={handleClientSecretUpload}
											className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition"
										>
											Upload JSON
										</button>
									</div>
								</div>
								{clientSecretStatus ? (
									<p className="text-xs text-slate-400">{clientSecretStatus}</p>
								) : null}

								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
									<div>
										<p className="text-sm font-semibold text-slate-200">
											YouTube Authorization
										</p>
										<p className="text-xs text-slate-500 mt-1">
											Connect once before uploading videos.
										</p>
									</div>
									<button
										type="button"
										onClick={handleConnectYouTube}
										className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition"
									>
										Connect YouTube
									</button>
								</div>
								{authMessage ? (
									<p className="text-xs text-slate-400">{authMessage}</p>
								) : null}
								{!isAuthorized ? (
									<p className="text-xs text-amber-300">
										YouTube not authorized. Complete the connect step above.
									</p>
								) : null}
							</div>
						) : null}

						{status === "error" && !(mode === "generate_video" && message.toLowerCase().includes("youtube")) ? (
							<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm inline-flex items-center gap-2">
								<AlertCircle className="w-4 h-4" />
								<span>{message}</span>
							</div>
						) : null}
						{result?.video?.status === "failed" ? (
							<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm inline-flex items-center gap-2">
								<AlertCircle className="w-4 h-4" />
								<span>{result?.video?.error || "Video generation failed."}</span>
							</div>
						) : null}

						{isLoading ? (
							<div className="space-y-2">
								<div className="flex justify-between text-sm text-slate-400">
									<span>Generating</span>
									<span>{Math.round(progress)}%</span>
								</div>
								<div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
									<motion.div
										className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
										animate={{ width: `${progress}%` }}
										transition={{ duration: 0.3 }}
									/>
								</div>
							</div>
						) : null}

						{videoUrl ? (
							<div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm flex items-center justify-between gap-3">
								<span>Video ready.</span>
								<a
									href={videoUrl}
									download
									className="inline-flex items-center justify-center rounded-md border border-emerald-200/40 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-300/20 transition"
								>
									Download
								</a>
							</div>
						) : null}

						<div className="flex flex-col sm:flex-row gap-3">
							<button
								type="submit"
								disabled={isLoading}
								className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-semibold rounded-xl transition duration-300 shadow-lg shadow-purple-950/40 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								<span className="inline-flex items-center justify-center gap-2">
									{isLoading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<UploadCloud className="w-4 h-4" />
									)}
									{isLoading ? "Generating..." : "Generate Preview"}
								</span>
							</button>
							<button
								type="button"
								onClick={handleGenerateVideo}
								disabled={isLoading || !storyText.trim()}
								className="flex-1 px-6 py-3.5 border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-white font-semibold rounded-xl transition duration-300 shadow-lg shadow-slate-950/40 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{mode === "generate_upload"
									? "Generate + Upload"
									: "Generate Video"}
							</button>
						</div>
					</form>

					<div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
						<div className="flex items-center gap-2 text-slate-200 font-semibold">
							<FileText className="w-4 h-4 text-cyan-300" />
							Generated Story
						</div>
						<textarea
							value={storyText}
							onChange={(event) => setStoryText(event.target.value)}
							placeholder="Your story will appear here."
							rows="6"
							className="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
									<Type className="w-4 h-4 text-purple-300" />
									Title
								</label>
								<input
									value={titleText}
									onChange={(event) => setTitleText(event.target.value)}
									placeholder="Generated title"
									className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
									<Tags className="w-4 h-4 text-violet-300" />
									Tags
								</label>
								<input
									value={tagsText}
									onChange={(event) => setTagsText(event.target.value)}
									placeholder="Generated tags"
									className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
								<AlignLeft className="w-4 h-4 text-cyan-300" />
								Description
							</label>
							<textarea
								value={descriptionText}
								onChange={(event) => setDescriptionText(event.target.value)}
								placeholder="Generated description"
								rows="4"
								className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
							/>
						</div>

						{result?.video?.outputUrl ? null : null}
						{result?.upload?.youtubeUrl ? (
							<a
								href={result.upload.youtubeUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
							>
								<UploadCloud className="w-4 h-4" />
								Open Uploaded Video
							</a>
						) : null}
					</div>
				</motion.div>
			</div>
		</div>
	);
}
