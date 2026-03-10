import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
	Download,
	AlertCircle,
	CheckCircle,
	Loader,
	Briefcase,
	MessageCircle,
	Mic,
	BookOpen,
	Rocket,
	Leaf,
	Clapperboard,
	Video,
	FileText,
	Image,
	SlidersHorizontal,
	Mars,
	Venus,
	ArrowUp,
	Minus,
	ArrowDown,
	Type,
	PaintBucket,
	Bold,
	Italic,
	Eye,
	ChevronDown,
	ChevronUp,
} from "lucide-react";

export default function CreateVideo() {
	const defaultContextCategories = [
		"motivation",
		"mindset",
		"success",
		"business",
		"finance",
		"politics",
		"currentaffairs",
		"socialcommentary",
		"reallifestories",
		"viraltrends",
	];
	const voiceStyles = [
		{
			key: "professional",
			label: "Professional",
			description: "Clear and formal delivery",
			Icon: Briefcase,
			iconClass: "text-sky-400",
		},
		{
			key: "casual",
			label: "Casual",
			description: "Relaxed and conversational",
			Icon: MessageCircle,
			iconClass: "text-amber-400",
		},
		{
			key: "narrator",
			label: "Narrator",
			description: "Storytelling voice tone",
			Icon: BookOpen,
			iconClass: "text-violet-400",
		},
		{
			key: "energetic",
			label: "Energetic",
			description: "Fast and high-energy style",
			Icon: Rocket,
			iconClass: "text-yellow-400",
		},
		{
			key: "calm",
			label: "Calm",
			description: "Soft and steady pacing",
			Icon: Leaf,
			iconClass: "text-emerald-400",
		},
		{
			key: "dramatic",
			label: "Dramatic",
			description: "Bold cinematic emphasis",
			Icon: Clapperboard,
			iconClass: "text-rose-400",
		},
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
		{
			key: "fade",
			label: "Fade",
			description: "Classic fade in/out",
		},
		{
			key: "bold_center",
			label: "Bold Center",
			description: "Centered punch captions",
		},
		{
			key: "karaoke_word_by_word",
			label: "Karaoke",
			description: "Word-by-word highlight",
		},
		{
			key: "bounce_fade",
			label: "Bounce/Fade",
			description: "Scale pop with fade",
		},
		{
			key: "beat_sync",
			label: "Beat Sync",
			description: "Rhythm pulses + keyword emphasis",
		},
	];
	const [videoFile, setVideoFile] = useState(null);
	const [textFile, setTextFile] = useState(null);
	const [libraryCode, setLibraryCode] = useState("");
	const [audioLibraryRef, setAudioLibraryRef] = useState("");
	const [bgmFile, setBgmFile] = useState(null);
	const [bgmVolume, setBgmVolume] = useState(18);
	const [bgmDucking, setBgmDucking] = useState(true);
	const [endLogoFile, setEndLogoFile] = useState(null);
	const [endLogoPosition, setEndLogoPosition] = useState("center");
	const [endLogoScale, setEndLogoScale] = useState(20);
	const [endLogoDuration, setEndLogoDuration] = useState(6);
	const [endLogoAnimated, setEndLogoAnimated] = useState(false);
	const [voiceStyle, setVoiceStyle] = useState("professional");
	const [voiceGender, setVoiceGender] = useState("male");
	const [outputMode, setOutputMode] = useState("youtube");
	const [videoStrategy, setVideoStrategy] = useState("single");
	const [categoryHint, setCategoryHint] = useState("");
	const [contextSceneCount, setContextSceneCount] = useState(6);
	const [availableCategories, setAvailableCategories] = useState([]);
	const [subtitlePreset, setSubtitlePreset] = useState("classic");
	const [subtitleTemplate, setSubtitleTemplate] = useState("fade");
	const [subtitlePosition, setSubtitlePosition] = useState("bottom");
	const [subtitleTextColor, setSubtitleTextColor] = useState("#ffffff");
	const [subtitleBgColor, setSubtitleBgColor] = useState("#000000");
	const [subtitleBold, setSubtitleBold] = useState(false);
	const [subtitleItalic, setSubtitleItalic] = useState(false);
	const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
	const [ttsSpeed, setTtsSpeed] = useState(175);
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [status, setStatus] = useState(null); // 'processing', 'success', 'error'
	const [errorMessage, setErrorMessage] = useState("");
	const [outputUrl, setOutputUrl] = useState("");

	useEffect(() => {
		let isMounted = true;
		const loadCategories = async () => {
			try {
				const response = await fetch("/api/library/categories");
				const data = await response.json();
				if (!response.ok) return;
				const categories = Array.isArray(data?.categories)
					? data.categories
					: [];
				if (isMounted) {
					setAvailableCategories(
						categories.length ? categories : defaultContextCategories,
					);
				}
			} catch {
				// Non-blocking: keep UI usable even if categories API fails.
				if (isMounted) {
					setAvailableCategories(defaultContextCategories);
				}
			}
		};
		loadCategories();
		return () => {
			isMounted = false;
		};
	}, []);

	const applySubtitlePreset = (presetKey) => {
		const preset = subtitlePresets[presetKey] || subtitlePresets.classic;
		const positionMap = {
			"8": "top",
			"5": "middle",
			"2": "bottom",
		};
		setSubtitlePreset(presetKey);
		setSubtitleTextColor(preset.textColor);
		setSubtitleBgColor(preset.bgColor);
		setSubtitleBold(Boolean(preset.bold));
		setSubtitleItalic(Boolean(preset.italic));
		setSubtitlePosition(positionMap[preset.alignment] || "bottom");
	};

	const onVideoDrop = (acceptedFiles) => {
		const file = acceptedFiles[0];
		if (file) setVideoFile(file);
	};

	const onTextDrop = (acceptedFiles) => {
		const file = acceptedFiles[0];
		if (file) setTextFile(file);
	};
	const onBgmDrop = (acceptedFiles) => {
		const file = acceptedFiles[0];
		if (file) setBgmFile(file);
	};

	const {
		getRootProps: getVideoProps,
		getInputProps: getVideoInputProps,
		isDragActive: isVideoDragActive,
	} = useDropzone({
		onDrop: onVideoDrop,
		accept: { "video/mp4": [".mp4"] },
	});

	const {
		getRootProps: getTextProps,
		getInputProps: getTextInputProps,
		isDragActive: isTextDragActive,
	} = useDropzone({
		onDrop: onTextDrop,
		accept: { "text/plain": [".txt"] },
	});
	const {
		getRootProps: getBgmProps,
		getInputProps: getBgmInputProps,
		isDragActive: isBgmDragActive,
	} = useDropzone({
		onDrop: onBgmDrop,
		accept: {
			"audio/mpeg": [".mp3"],
			"audio/wav": [".wav"],
			"audio/x-wav": [".wav"],
			"audio/mp4": [".m4a"],
			"audio/aac": [".aac"],
		},
		multiple: false,
	});
	const {
		getRootProps: getEndLogoProps,
		getInputProps: getEndLogoInputProps,
		isDragActive: isEndLogoDragActive,
	} = useDropzone({
		onDrop: (acceptedFiles) => {
			setEndLogoFile(acceptedFiles[0] || null);
		},
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/webp": [".webp"],
		},
		multiple: false,
	});

	const handleGenerate = async () => {
		const hasLibraryCode = Boolean(libraryCode.trim());
		const needsBaseVideo = videoStrategy !== "context_switch";
		if (!textFile || (needsBaseVideo && !videoFile && !hasLibraryCode)) {
			setStatus("error");
			setErrorMessage(
				needsBaseVideo
					? "Please provide a text file and either upload a video or enter a library code."
					: "Please provide a text file.",
			);
			setTimeout(() => setStatus(null), 3000);
			return;
		}

		setIsProcessing(true);
		setStatus("processing");
		setProgress(0);
		setErrorMessage("");
		setOutputUrl("");

		const progressStartedAt = Date.now();
		const progressInterval = setInterval(() => {
			const elapsedSeconds = (Date.now() - progressStartedAt) / 1000;
			const target = Math.min(95, 8 + elapsedSeconds * 3.2);
			setProgress((prev) => {
				const next = prev + (target - prev) * 0.22;
				return Math.min(95, Math.max(prev, next));
			});
		}, 220);

		try {
			const alignmentMap = {
				top: "8",
				middle: "5",
				bottom: "2",
			};

			const formData = new FormData();
			formData.append("library_code", libraryCode.trim());
			if (videoFile) {
				formData.append("background_video", videoFile);
			}
			formData.append("script_file", textFile);
			formData.append("tts_rate", String(ttsSpeed));
			formData.append("text_color", subtitleTextColor);
			formData.append("bg_color", subtitleBgColor);
			formData.append("bold", subtitleBold ? "true" : "false");
			formData.append("italic", subtitleItalic ? "true" : "false");
			formData.append("alignment", alignmentMap[subtitlePosition]);
			formData.append("subtitle_preset", subtitlePreset);
			formData.append("subtitle_template", subtitleTemplate);
			formData.append("output_mode", outputMode);
			formData.append("video_strategy", videoStrategy);
			formData.append("category_hint", categoryHint.trim());
			formData.append("context_scene_count", String(contextSceneCount));
			formData.append("context_lock_category", "true");
			formData.append("bgm_volume", (bgmVolume / 100).toFixed(2));
			formData.append("bgm_ducking", bgmDucking ? "true" : "false");
			formData.append("audio_library_ref", audioLibraryRef.trim());
			if (bgmFile) {
				formData.append("bgm_file", bgmFile);
			}
			if (endLogoFile) {
				formData.append("end_logo_file", endLogoFile);
				formData.append("end_logo_position", endLogoPosition);
				formData.append("end_logo_scale_percent", String(endLogoScale));
				formData.append("end_logo_duration_sec", String(endLogoDuration));
				formData.append("end_logo_animated", endLogoAnimated ? "true" : "false");
			}
			formData.append("voice_style", voiceStyle);
			formData.append("voice_gender", voiceGender);

			const response = await fetch("/api/process", {
				method: "POST",
				body: formData,
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error || "Render failed.");
			}

			clearInterval(progressInterval);
			setProgress((prev) => Math.max(prev, 98));
			await new Promise((resolve) => setTimeout(resolve, 180));
			setProgress(100);
			setStatus("success");
			setOutputUrl(payload.output_url || "");
			setIsProcessing(false);
		} catch (error) {
			clearInterval(progressInterval);
			setStatus("error");
			setErrorMessage(error.message || "Processing failed. Please try again.");
			setIsProcessing(false);
		}
	};

	const handleDownload = () => {
		if (!outputUrl) return;
		window.open(outputUrl, "_blank", "noopener,noreferrer");
	};

	const endLogoDisabled = !endLogoFile;

	return (
		<div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 md:p-6">
			<div className="max-w-3xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="space-y-6"
				>
					<div className="text-center mb-6">
						<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
							Create Video
						</h1>
						<p className="text-slate-400">
							Upload your content and generate stunning videos
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{/* Video Upload */}
						<motion.div
							{...getVideoProps()}
							className={`rounded-xl p-5 border-2 border-dashed transition-all cursor-pointer ${
								isVideoDragActive
									? "border-purple-400 bg-purple-500/10"
									: "border-slate-600 bg-slate-800/50 hover:border-purple-400"
							}`}
							whileHover={{ scale: 1.01 }}
						>
							<input {...getVideoInputProps()} />
							<div className="text-center">
								<div className="text-2xl mb-2 flex items-center justify-center gap-2">
									<Video className="w-5 h-5 text-purple-400" />
									<span>Video</span>
								</div>
								<p className="text-slate-300 text-sm font-semibold truncate">
									{videoFile ? videoFile.name : "Drag MP4 video here"}
								</p>
								<p className="text-slate-500 text-xs mt-1">
									or click to browse
								</p>
							</div>
						</motion.div>

						{/* Text Upload */}
						<motion.div
							{...getTextProps()}
							className={`rounded-xl p-5 border-2 border-dashed transition-all cursor-pointer ${
								isTextDragActive
									? "border-blue-400 bg-blue-500/10"
									: "border-slate-600 bg-slate-800/50 hover:border-blue-400"
							}`}
							whileHover={{ scale: 1.01 }}
						>
							<input {...getTextInputProps()} />
							<div className="text-center">
								<div className="text-2xl mb-2 flex items-center justify-center gap-2">
									<FileText className="w-5 h-5 text-blue-400" />
									<span>Text</span>
								</div>
								<p className="text-slate-300 text-sm font-semibold truncate">
									{textFile ? textFile.name : "Drag TXT script here"}
								</p>
								<p className="text-slate-500 text-xs mt-1">
									or click to browse
								</p>
							</div>
						</motion.div>

						{/* Optional BGM Upload */}
						<motion.div
							{...getBgmProps()}
							className={`rounded-xl p-5 border-2 border-dashed transition-all cursor-pointer ${
								isBgmDragActive
									? "border-emerald-400 bg-emerald-500/10"
									: "border-slate-600 bg-slate-800/50 hover:border-emerald-400"
							}`}
							whileHover={{ scale: 1.01 }}
						>
							<input {...getBgmInputProps()} />
							<div className="text-center">
								<div className="text-2xl mb-2 flex items-center justify-center gap-2">
									<Mic className="w-5 h-5 text-emerald-400" />
									<span>BGM</span>
								</div>
								<p className="text-slate-300 text-sm font-semibold truncate">
									{bgmFile ? bgmFile.name : "Optional MP3/WAV music upload"}
								</p>
								<p className="text-slate-500 text-xs mt-1">
									drag/drop or click to browse
								</p>
							</div>
						</motion.div>
					</div>

					<motion.div className="space-y-2">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Video className="w-4 h-4 text-purple-400" />
							Library Code (Optional)
						</label>
						<input
							type="text"
							value={libraryCode}
							onChange={(e) => setLibraryCode(e.target.value)}
							placeholder="Use this instead of uploading video (example: motivation_001)"
							className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
						/>
					</motion.div>
					<motion.div className="space-y-2">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Mic className="w-4 h-4 text-emerald-400" />
							Audio Library (Optional)
						</label>
						<input
							type="text"
							value={audioLibraryRef}
							onChange={(e) => setAudioLibraryRef(e.target.value)}
							placeholder="Use this instead of uploading BGM (code/title/filename)"
							className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
						/>
					</motion.div>

					{/* BGM Controls */}
					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex justify-between">
							<span className="flex items-center gap-2">
								<SlidersHorizontal className="w-4 h-4 text-emerald-400" />
								Background Music Volume
							</span>
							<span className="text-emerald-400">{bgmVolume}%</span>
						</label>
						<input
							type="range"
							min="0"
							max="60"
							value={bgmVolume}
							onChange={(e) => setBgmVolume(Number(e.target.value))}
							className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
						/>
						<div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
							<span className="text-slate-300 text-sm font-medium">
								Auto lower music while voice speaks
							</span>
							<button
								type="button"
								onClick={() => setBgmDucking((prev) => !prev)}
								className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
									bgmDucking
										? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
										: "border-slate-700 bg-slate-900/50 text-slate-300"
								}`}
							>
								{bgmDucking ? "On" : "Off"}
							</button>
						</div>
					</motion.div>

					{/* Ending Logo */}
					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Image className="w-4 h-4 text-cyan-400" />
							Ending Logo (Optional)
						</label>
						<motion.div
							{...getEndLogoProps()}
							className={`rounded-xl p-5 border-2 border-dashed transition-all cursor-pointer ${
								isEndLogoDragActive
									? "border-cyan-400 bg-cyan-500/10"
									: "border-slate-600 bg-slate-800/50 hover:border-cyan-400"
							}`}
							whileHover={{ scale: 1.01 }}
						>
							<input {...getEndLogoInputProps()} />
							<div className="text-center">
								<div className="text-2xl mb-2 flex items-center justify-center gap-2">
									<Image className="w-5 h-5 text-cyan-400" />
									<span>Logo</span>
								</div>
								<p className="text-slate-300 text-sm font-semibold truncate">
									{endLogoFile
										? endLogoFile.name
										: "Optional PNG/JPG logo for the ending"}
								</p>
								<p className="text-slate-500 text-xs mt-1">
									drag/drop or click to browse
								</p>
							</div>
						</motion.div>
						<div
							className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${
								endLogoDisabled ? "opacity-60" : ""
							}`}
						>
							<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
								<label className="text-xs text-slate-400 block mb-2">
									Position
								</label>
								<select
									value={endLogoPosition}
									onChange={(e) => setEndLogoPosition(e.target.value)}
									disabled={endLogoDisabled}
									className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-70"
								>
									<option value="center">Center</option>
									<option value="top-left">Top Left</option>
									<option value="top-right">Top Right</option>
									<option value="bottom-left">Bottom Left</option>
									<option value="bottom-right">Bottom Right</option>
								</select>
							</div>
							<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
								<label className="text-xs text-slate-400 block mb-2">
									Scale ({endLogoScale}%)
								</label>
								<input
									type="range"
									min="5"
									max="40"
									value={endLogoScale}
									onChange={(e) => setEndLogoScale(Number(e.target.value))}
									disabled={endLogoDisabled}
									className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
								/>
							</div>
							<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
								<label className="text-xs text-slate-400 block mb-2">
									Duration (sec)
								</label>
								<input
									type="number"
									min="2"
									max="20"
									value={endLogoDuration}
									onChange={(e) =>
										setEndLogoDuration(
											Math.max(2, Math.min(20, Number(e.target.value) || 6)),
										)
									}
									disabled={endLogoDisabled}
									className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-70"
								/>
							</div>
							<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 flex items-center justify-between">
								<span className="text-slate-300 text-sm font-medium">
									Animated fade-in
								</span>
								<button
									type="button"
									onClick={() => setEndLogoAnimated((prev) => !prev)}
									disabled={endLogoDisabled}
									className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
										endLogoAnimated
											? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
											: "border-slate-700 bg-slate-900/50 text-slate-300"
									} disabled:cursor-not-allowed disabled:opacity-70`}
								>
									{endLogoAnimated ? "On" : "Off"}
								</button>
							</div>
						</div>
					</motion.div>

					{/* TTS Speed Slider */}
					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex justify-between">
							<span className="flex items-center gap-2">
								<SlidersHorizontal className="w-4 h-4 text-purple-400" />
								TTS Speed
							</span>
							<span className="text-purple-400">{ttsSpeed}%</span>
						</label>
						<input
							type="range"
							min="100"
							max="250"
							value={ttsSpeed}
							onChange={(e) => setTtsSpeed(Number(e.target.value))}
							className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
						/>
						<div className="flex justify-between text-xs text-slate-500">
							<span>100%</span>
							<span>250%</span>
						</div>
					</motion.div>

					{/* Voice Style Cards */}
					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex items-center gap-2 mb-2">
							<Mic className="w-4 h-4 text-purple-400" />
							Voice Style
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
							{voiceStyles.map(
								({ key, label, description, Icon, iconClass }) => {
									const isActive = voiceStyle === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setVoiceStyle(key)}
											className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
												isActive
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<div className="flex items-start gap-2 text-left">
												<Icon
													className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`}
												/>
												<div>
													<p className="font-semibold leading-tight">{label}</p>
													<p className="text-[11px] text-slate-400 leading-tight mt-1">
														{description}
													</p>
												</div>
											</div>
										</button>
									);
								},
							)}
						</div>
					</motion.div>

					{/* Voice Gender */}
					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Mic className="w-4 h-4 text-purple-400" />
							Voice Gender
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setVoiceGender("male")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									voiceGender === "male"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								<span className="flex items-center justify-center gap-2">
									<Mars className="w-4 h-4 text-sky-400" />
									Male
								</span>
							</button>
							<button
								type="button"
								onClick={() => setVoiceGender("female")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									voiceGender === "female"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								<span className="flex items-center justify-center gap-2">
									<Venus className="w-4 h-4 text-pink-400" />
									Female
								</span>
							</button>
						</div>
					</motion.div>

					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Video className="w-4 h-4 text-purple-400" />
							Output Mode
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<button
								type="button"
								onClick={() => setOutputMode("shorts")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									outputMode === "shorts"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								YouTube Shorts (9:16)
							</button>
							<button
								type="button"
								onClick={() => setOutputMode("reels")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									outputMode === "reels"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								Reels (9:16)
							</button>
							<button
								type="button"
								onClick={() => setOutputMode("square")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									outputMode === "square"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								Square (1:1)
							</button>
							<button
								type="button"
								onClick={() => setOutputMode("youtube")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									outputMode === "youtube"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								Standard YouTube (16:9)
							</button>
						</div>
					</motion.div>

					<motion.div className="space-y-3">
						<label className="text-slate-300 font-semibold flex items-center gap-2">
							<Video className="w-4 h-4 text-purple-400" />
							Video Strategy
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setVideoStrategy("single")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									videoStrategy === "single"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								Single Video
							</button>
							<button
								type="button"
								onClick={() => setVideoStrategy("context_switch")}
								className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
									videoStrategy === "context_switch"
										? "border-purple-400 bg-purple-500/20 text-white"
										: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
								}`}
							>
								Context Switch
							</button>
						</div>
						{videoStrategy === "context_switch" ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
									<label className="text-xs text-slate-400 block mb-2">
										Category Hint (optional)
									</label>
									<select
										value={categoryHint}
										onChange={(e) => setCategoryHint(e.target.value)}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
									>
										<option value="">Any Category</option>
										{availableCategories.map((category) => (
											<option key={category} value={category}>
												{category}
											</option>
										))}
									</select>
								</div>
								<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
									<label className="text-xs text-slate-400 block mb-2">
										Scene Count
									</label>
									<input
										type="number"
										min="1"
										max="12"
										value={contextSceneCount}
										onChange={(e) =>
											setContextSceneCount(
												Math.max(1, Math.min(12, Number(e.target.value) || 6)),
											)
										}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
									/>
								</div>
							</div>
						) : null}
					</motion.div>

					<motion.div className="space-y-3">
						<button
							type="button"
							onClick={() => setShowSubtitleSettings((prev) => !prev)}
							className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 flex items-center justify-between text-left hover:border-purple-500/70 transition"
						>
							<span className="flex items-center gap-2 text-slate-200 font-semibold">
								<FileText className="w-4 h-4 text-purple-400" />
								Subtitle Settings
							</span>
							{showSubtitleSettings ? (
								<ChevronUp className="w-4 h-4 text-slate-300" />
							) : (
								<ChevronDown className="w-4 h-4 text-slate-300" />
							)}
						</button>

						{showSubtitleSettings ? (
							<div className="space-y-4">
								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<Type className="w-4 h-4 text-purple-400" />
										Subtitle Preset
									</label>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
										{Object.entries(subtitlePresets).map(([key, preset]) => (
											<button
												key={key}
												type="button"
												onClick={() => applySubtitlePreset(key)}
												className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
													subtitlePreset === key
														? "border-purple-400 bg-purple-500/20 text-white"
														: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
												}`}
											>
												{preset.label}
											</button>
										))}
									</div>
								</motion.div>

								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<FileText className="w-4 h-4 text-purple-400" />
										Subtitle Animation
									</label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{subtitleTemplates.map(({ key, label, description }) => (
											<button
												key={key}
												type="button"
												onClick={() => setSubtitleTemplate(key)}
												className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
													subtitleTemplate === key
														? "border-purple-400 bg-purple-500/20 text-white"
														: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
												}`}
											>
												<div className="text-left">
													<p className="font-semibold leading-tight">{label}</p>
													<p className="text-[11px] text-slate-400 leading-tight mt-1">
														{description}
													</p>
												</div>
											</button>
										))}
									</div>
								</motion.div>

								{/* Subtitle Position */}
								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<FileText className="w-4 h-4 text-purple-400" />
										Subtitle Position
									</label>
									<div className="grid grid-cols-3 gap-3">
										<button
											type="button"
											onClick={() => setSubtitlePosition("top")}
											className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
												subtitlePosition === "top"
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<ArrowUp className="w-4 h-4 text-cyan-400" />
												Top
											</span>
										</button>
										<button
											type="button"
											onClick={() => setSubtitlePosition("middle")}
											className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
												subtitlePosition === "middle"
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<Minus className="w-4 h-4 text-amber-400" />
												Middle
											</span>
										</button>
										<button
											type="button"
											onClick={() => setSubtitlePosition("bottom")}
											className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
												subtitlePosition === "bottom"
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<ArrowDown className="w-4 h-4 text-emerald-400" />
												Bottom
											</span>
										</button>
									</div>
								</motion.div>

								{/* Subtitle Colors */}
								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<PaintBucket className="w-4 h-4 text-purple-400" />
										Subtitle Colors
									</label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
											<label className="flex items-center justify-between text-sm text-slate-300">
												<span className="flex items-center gap-2">
													<Type className="w-4 h-4 text-cyan-400" />
													Text Color
												</span>
												<span className="text-xs text-slate-400 uppercase">
													{subtitleTextColor}
												</span>
											</label>
											<input
												type="color"
												value={subtitleTextColor}
												onChange={(e) => setSubtitleTextColor(e.target.value)}
												className="mt-3 h-10 w-full cursor-pointer rounded-md border border-slate-700 bg-transparent"
											/>
										</div>

										<div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
											<label className="flex items-center justify-between text-sm text-slate-300">
												<span className="flex items-center gap-2">
													<PaintBucket className="w-4 h-4 text-amber-400" />
													Background Color
												</span>
												<span className="text-xs text-slate-400 uppercase">
													{subtitleBgColor}
												</span>
											</label>
											<input
												type="color"
												value={subtitleBgColor}
												onChange={(e) => setSubtitleBgColor(e.target.value)}
												className="mt-3 h-10 w-full cursor-pointer rounded-md border border-slate-700 bg-transparent"
											/>
										</div>
									</div>
								</motion.div>

								{/* Subtitle Font Style */}
								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<Type className="w-4 h-4 text-purple-400" />
										Subtitle Font Style
									</label>
									<div className="grid grid-cols-2 gap-3">
										<button
											type="button"
											onClick={() => setSubtitleBold((prev) => !prev)}
											className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
												subtitleBold
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<Bold className="w-4 h-4 text-cyan-400" />
												Bold Subtitles
											</span>
										</button>
										<button
											type="button"
											onClick={() => setSubtitleItalic((prev) => !prev)}
											className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
												subtitleItalic
													? "border-purple-400 bg-purple-500/20 text-white"
													: "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-purple-500/70"
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<Italic className="w-4 h-4 text-amber-400" />
												Italic Subtitles
											</span>
										</button>
									</div>
								</motion.div>

								{/* Live Subtitle Preview */}
								<motion.div className="space-y-3">
									<label className="text-slate-300 font-semibold flex items-center gap-2">
										<Eye className="w-4 h-4 text-purple-400" />
										Live Subtitle Preview
									</label>
									<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-2.5">
										<div
											className={`relative h-32 rounded-lg bg-slate-900/80 border border-slate-800 p-3 ${
												subtitlePosition === "top"
													? "flex items-start"
													: subtitlePosition === "middle"
														? "flex items-center"
														: "flex items-end"
											} justify-center`}
										>
											<span
												className="px-4 py-2 rounded-md text-xl leading-tight"
												style={{
													color: subtitleTextColor,
													backgroundColor: subtitleBgColor,
													fontWeight: subtitleBold ? 700 : 400,
													fontStyle: subtitleItalic ? "italic" : "normal",
												}}
											>
												Preview Text
											</span>
										</div>
									</div>
								</motion.div>
							</div>
						) : null}
					</motion.div>

					{/* Progress Bar */}
					{isProcessing && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="space-y-2"
						>
							<div className="flex justify-between text-sm text-slate-400">
								<span>Processing</span>
								<span>{Math.round(progress)}%</span>
							</div>
							<div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
								<motion.div
									className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
									animate={{ width: `${progress}%` }}
									transition={{ duration: 0.3 }}
								/>
							</div>
						</motion.div>
					)}

					{/* Status Indicator */}
					{status === "success" && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="bg-green-500/15 border border-green-400/45 rounded-2xl p-4"
						>
							<div className="flex items-center gap-3">
								<CheckCircle className="w-5 h-5 text-green-300 shrink-0" />
								<div className="flex-1">
									<p className="text-green-100 font-medium">Video ready.</p>
								</div>
								{outputUrl ? (
									<a
										href={outputUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center rounded-lg bg-green-400/20 hover:bg-green-400/30 border border-green-300/40 text-green-100 px-3 py-1.5 text-sm font-medium transition"
									>
										Open Output
									</a>
								) : null}
							</div>
						</motion.div>
					)}

					{status === "error" && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-2xl p-4"
						>
							<AlertCircle className="w-5 h-5 text-red-400" />
							<span className="text-red-300">{errorMessage}</span>
						</motion.div>
					)}

					{status === "processing" && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="flex items-center gap-3 bg-blue-500/20 border border-blue-500/50 rounded-2xl p-4"
						>
							<Loader className="w-5 h-5 text-blue-400 animate-spin" />
							<span className="text-blue-300">Processing your video...</span>
						</motion.div>
					)}

					{/* Generate/Download Button */}
					<motion.button
						onClick={status === "success" ? handleDownload : handleGenerate}
						disabled={isProcessing}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						style={{
							background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
						}}
					>
						<div className="flex items-center justify-center gap-2">
							{status === "success" ? (
								<>
									<Download className="w-5 h-5" />
									Download Video
								</>
							) : isProcessing ? (
								<>
									<Loader className="w-5 h-5 animate-spin" />
									Generating...
								</>
							) : (
								"Generate Video"
							)}
						</div>
					</motion.button>
				</motion.div>
			</div>
		</div>
	);
}
