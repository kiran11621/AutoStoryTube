import { useState } from "react";
import { motion } from "framer-motion";
import {
	AlertCircle,
	CalendarClock,
	CheckCircle2,
	ExternalLink,
	Eye,
	FileText,
	Film,
	ImagePlus,
	Loader2,
	ShieldCheck,
	Tags,
	Type,
	Upload,
	Video,
} from "lucide-react";

export default function YoutubeUpload() {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		tags: "",
		visibility: "public",
		publishAt: "",
		uploadAsShort: false,
		videoFile: null,
		thumbnail: null,
		logoFile: null,
		logoPosition: "top-right",
		logoScalePercent: "15",
		endCreditsText: "",
		endCreditsDurationSec: "5",
	});
	const [autoThumbnailPreview, setAutoThumbnailPreview] = useState(null);
	const [manualThumbnailPreview, setManualThumbnailPreview] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isAuthorizing, setIsAuthorizing] = useState(false);
	const [authMessage, setAuthMessage] = useState("");
	const [status, setStatus] = useState(null); // success | error
	const [message, setMessage] = useState("");
	const [videoUrl, setVideoUrl] = useState("");
	const [thumbnailStatus, setThumbnailStatus] = useState("");
	const [thumbnailNotice, setThumbnailNotice] = useState("");
	const [logoStatus, setLogoStatus] = useState("");
	const [endCreditsStatus, setEndCreditsStatus] = useState("");
	const [scheduleStatus, setScheduleStatus] = useState("");
	const [shortsStatus, setShortsStatus] = useState("");

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const generateAutoThumbnailPreview = (file) =>
		new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.preload = "metadata";
			video.muted = true;
			video.playsInline = true;
			video.crossOrigin = "anonymous";
			const objectUrl = URL.createObjectURL(file);
			video.src = objectUrl;

			const cleanup = () => {
				URL.revokeObjectURL(objectUrl);
				video.src = "";
			};

			const drawFrame = () => {
				const canvas = document.createElement("canvas");
				canvas.width = video.videoWidth || 640;
				canvas.height = video.videoHeight || 360;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					throw new Error("Canvas context unavailable.");
				}
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				return canvas.toDataURL("image/jpeg", 0.92);
			};

			const seekAndCapture = (seconds) =>
				new Promise((captureResolve, captureReject) => {
					const onSeeked = () => {
						try {
							captureResolve(drawFrame());
						} catch (err) {
							captureReject(err);
						}
					};
					video.addEventListener("seeked", onSeeked, { once: true });
					try {
						video.currentTime = Math.max(0, seconds);
					} catch (err) {
						captureReject(err);
					}
				});

			video.onloadedmetadata = async () => {
				try {
					const duration = Number.isFinite(video.duration) ? video.duration : 0;
					const firstTry = duration > 0.7 ? 0.6 : 0.1;
					const secondTry = duration > 2 ? 1.5 : Math.max(0.2, duration * 0.5);
					let dataUrl;
					try {
						dataUrl = await seekAndCapture(firstTry);
					} catch {
						dataUrl = await seekAndCapture(secondTry);
					}
					cleanup();
					resolve(dataUrl);
				} catch (err) {
					cleanup();
					reject(err);
				}
			};

			video.onerror = () => {
				cleanup();
				reject(new Error("Unable to generate auto thumbnail preview."));
			};
		});

	const handleVideoChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		setFormData((prev) => ({ ...prev, videoFile: file }));
		setAutoThumbnailPreview(null);
		try {
			const preview = await generateAutoThumbnailPreview(file);
			setAutoThumbnailPreview(preview);
		} catch {
			setAutoThumbnailPreview(null);
		}
	};

	const handleThumbnailChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		setFormData((prev) => ({ ...prev, thumbnail: file }));
		const reader = new FileReader();
		reader.onloadend = () => setManualThumbnailPreview(reader.result);
		reader.readAsDataURL(file);
	};

	const handleLogoChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		setFormData((prev) => ({ ...prev, logoFile: file }));
	};

	const handleConnectYouTube = async () => {
		setIsAuthorizing(true);
		setAuthMessage("");
		try {
			const response = await fetch("/api/youtube/auth-url");
			const data = await response.json();
			if (!response.ok || !data?.auth_url) {
				throw new Error(data?.error || "Unable to start YouTube auth.");
			}
			window.open(data.auth_url, "_blank", "noopener,noreferrer");
			setAuthMessage(
				"Authorization page opened. Complete it, then return here.",
			);
		} catch (err) {
			setAuthMessage(err?.message || "Unable to start YouTube auth.");
		} finally {
			setIsAuthorizing(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!formData.videoFile) {
			setStatus("error");
			setMessage("Please select a video file.");
			return;
		}

		setIsUploading(true);
		setStatus(null);
		setMessage("");
		setVideoUrl("");
		setThumbnailStatus("");
		setThumbnailNotice("");
		setLogoStatus("");
		setEndCreditsStatus("");
		setScheduleStatus("");
		setShortsStatus("");
		try {
			const payload = new FormData();
			payload.append("title", formData.title);
			payload.append("description", formData.description);
			payload.append("tags", formData.tags);
			payload.append("visibility", formData.visibility);
			if (formData.uploadAsShort) {
				payload.append("upload_as_short", "true");
			}
			if ((formData.publishAt || "").trim()) {
				const parsed = new Date(formData.publishAt);
				payload.append(
					"publish_at",
					Number.isNaN(parsed.getTime())
						? formData.publishAt
						: parsed.toISOString(),
				);
			}
			payload.append("video_file", formData.videoFile);
			if (formData.thumbnail) {
				payload.append("thumbnail", formData.thumbnail);
			}
			if (formData.logoFile) {
				payload.append("logo_file", formData.logoFile);
				payload.append("logo_position", formData.logoPosition);
				payload.append("logo_scale_percent", formData.logoScalePercent);
			}
			if ((formData.endCreditsText || "").trim()) {
				payload.append("end_credits_text", formData.endCreditsText);
				payload.append(
					"end_credits_duration_sec",
					formData.endCreditsDurationSec || "5",
				);
			}

			const response = await fetch("/api/youtube/upload", {
				method: "POST",
				body: payload,
			});
			const rawResponse = await response.text();
			let data = {};
			if (rawResponse && rawResponse.trim()) {
				try {
					data = JSON.parse(rawResponse);
				} catch {
					throw new Error(rawResponse);
				}
			}
			if (!response.ok) {
				throw new Error(data?.error || "Upload failed.");
			}

			let sourceLabel = "Video uploaded successfully.";
			let sourceStatus = "Thumbnail: Default YouTube thumbnail";
			let sourceNotice = "";
			let scheduleLabel = "";
			if (data.scheduled_publish_at) {
				sourceLabel = "Video uploaded and scheduled successfully.";
				const scheduled = new Date(data.scheduled_publish_at);
				scheduleLabel = Number.isNaN(scheduled.getTime())
					? `Scheduled publish: ${data.scheduled_publish_at} (UTC)`
					: `Scheduled publish: ${scheduled.toLocaleString()} (local time)`;
			}
			if (data.short_mode_enabled) {
				const shortText = data.short_processed
					? "Shorts: Processed to vertical 9:16 and max 59s"
					: "Shorts: Enabled";
				setShortsStatus(shortText);
			}
			if (data.thumbnail_source === "manual") {
				sourceStatus = "Thumbnail: Manual thumbnail applied";
			} else if (data.thumbnail_source === "auto") {
				sourceStatus = "Thumbnail: Auto thumbnail applied from first frame";
			} else if (data.thumbnail_error) {
				const lowerError = String(data.thumbnail_error).toLowerCase();
				if (
					lowerError.includes(
						"doesn't have permissions to upload and set custom video thumbnails",
					) ||
					lowerError.includes("youtube.thumbnail") ||
					lowerError.includes("forbidden")
				) {
					sourceStatus = "Thumbnail: Not set";
					sourceNotice =
						"This channel/account does not currently have custom thumbnail upload permission.";
				} else {
					sourceStatus = "Thumbnail: Not set";
					sourceNotice =
						"Could not apply custom thumbnail due to a YouTube/API limitation.";
				}
			} else if (!formData.thumbnail && autoThumbnailPreview) {
				sourceStatus = "Thumbnail: Default YouTube thumbnail";
				sourceNotice =
					"Preview was generated locally, but YouTube selected its own thumbnail.";
			}
			setStatus("success");
			setMessage(sourceLabel);
			setThumbnailStatus(sourceStatus);
			setThumbnailNotice(sourceNotice);
			setScheduleStatus(scheduleLabel);
			setLogoStatus(
				data.logo_applied
					? "Logo: Applied to uploaded video"
					: "Logo: Not applied",
			);
			if ((formData.endCreditsText || "").trim()) {
				setEndCreditsStatus(
					data.end_credits_applied
						? "End credits: Applied to video ending"
						: data.end_credits_error
							? "End credits: Not applied"
							: "End credits: Not applied",
				);
			}
			setVideoUrl(data.video_url || "");
		} catch (err) {
			setStatus("error");
			setMessage(err?.message || "Upload failed.");
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 md:p-6">
			<div className="max-w-4xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className="space-y-5"
				>
					<div className="text-center">
						<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
							YouTube Upload
						</h2>
						<p className="text-slate-400 text-sm mt-2">
							Upload video with manual thumbnail or auto-generated first frame.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
									disabled={isAuthorizing}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition"
								>
									{isAuthorizing ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<ExternalLink className="w-4 h-4" />
									)}
									{isAuthorizing ? "Opening..." : "Connect YouTube"}
								</button>
							</div>
							{authMessage ? (
								<p className="mt-3 text-xs text-slate-400">{authMessage}</p>
							) : null}
						</div>

						<div className="md:col-span-2">
							<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
								<Video className="w-4 h-4 text-blue-400" />
								Video File
							</label>
							<input
								type="file"
								accept="video/mp4"
								onChange={handleVideoChange}
								className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-slate-100"
								required
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2">
								<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
									<Type className="w-4 h-4 text-pink-400" />
									Video Title
								</label>
								<input
									type="text"
									name="title"
									value={formData.title}
									onChange={handleInputChange}
									placeholder="Enter video title"
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
									required
								/>
							</div>

							<div className="md:col-span-2">
								<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
									<FileText className="w-4 h-4 text-cyan-400" />
									Description
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleInputChange}
									placeholder="Describe your video"
									rows="4"
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 resize-none"
								/>
							</div>

							<div>
								<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
									<Tags className="w-4 h-4 text-violet-400" />
									Tags
								</label>
								<input
									type="text"
									name="tags"
									value={formData.tags}
									onChange={handleInputChange}
									placeholder="tag1, tag2, tag3..."
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70"
								/>
							</div>

							<div>
								<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
									<Eye className="w-4 h-4 text-emerald-400" />
									Visibility
								</label>
								<select
									name="visibility"
									value={formData.visibility}
									onChange={handleInputChange}
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
								>
									<option value="private">Private</option>

									<option value="public">Public</option>
									<option value="unlisted">Unlisted</option>
								</select>
							</div>

						</div>

						<details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
							<summary className="cursor-pointer select-none text-sm font-semibold text-slate-200 flex items-center gap-2 w-full">
								<CalendarClock className="w-4 h-4 text-cyan-300" />
								Publishing Options (Optional)
							</summary>
							<div className="mt-3 space-y-4">
								<div>
									<label className="text-sm font-semibold text-slate-200 mb-2 block">
										Schedule Publish
									</label>
									<input
										type="datetime-local"
										name="publishAt"
										value={formData.publishAt}
										onChange={handleInputChange}
										className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
									/>
									<p className="text-xs text-slate-500 mt-1">
										When set, video uploads as private and auto-publishes at this time.
									</p>
								</div>
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
									<div>
										<p className="text-sm font-semibold text-slate-200 inline-flex items-center gap-2">
											<Film className="w-4 h-4 text-cyan-300" />
											Upload as YouTube Shorts
										</p>
										<p className="text-xs text-slate-500 mt-1">
											Converts to vertical 9:16 and trims to max 59 seconds.
										</p>
									</div>
									<button
										type="button"
										onClick={() =>
											setFormData((prev) => ({
												...prev,
												uploadAsShort: !prev.uploadAsShort,
											}))
										}
										className={`relative inline-flex h-9 w-24 items-center rounded-full border px-2 transition ${
											formData.uploadAsShort
												? "border-cyan-400/60 bg-cyan-500/20"
												: "border-slate-600 bg-slate-800/80"
										}`}
										aria-pressed={formData.uploadAsShort}
									>
										<span
											className={`absolute left-1 top-1 h-7 w-7 rounded-full shadow-sm transition-transform ${
												formData.uploadAsShort
													? "translate-x-14 bg-cyan-300"
													: "translate-x-0 bg-slate-300"
											}`}
										/>
										<span
											className={`w-full text-[11px] font-semibold tracking-wide ${
												formData.uploadAsShort
													? "pr-7 text-cyan-100 text-right"
													: "pl-7 text-slate-200 text-left"
											}`}
										>
											{formData.uploadAsShort ? "ON" : "OFF"}
										</span>
									</button>
								</div>
							</div>
						</details>

						<details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
							<summary className="cursor-pointer select-none text-sm font-semibold text-slate-200 flex items-center gap-2 w-full">
								<ImagePlus className="w-4 h-4 text-amber-300" />
								Thumbnail (Optional)
							</summary>
							<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
									<p className="text-sm font-semibold text-slate-200">
										Auto Thumbnail (first frame)
									</p>
									<p className="text-xs text-slate-500 mt-1">
										Used when manual thumbnail is not uploaded.
									</p>
									<div className="mt-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-800/60 h-28 flex items-center justify-center">
										{autoThumbnailPreview ? (
											<img
												src={autoThumbnailPreview}
												alt="Auto thumbnail preview"
												className="w-full h-full object-cover"
											/>
										) : (
											<span className="text-xs text-slate-500">
												Select a video to preview
											</span>
										)}
									</div>
								</div>
								<div>
									<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
										<ImagePlus className="w-4 h-4 text-amber-400" />
										Manual Thumbnail (Optional)
									</label>
									<input
										type="file"
										accept="image/*"
										onChange={handleThumbnailChange}
										className="hidden"
										id="thumbnail-input"
									/>
									<label
										htmlFor="thumbnail-input"
										className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 min-h-28 px-5 py-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/60 transition"
									>
										<div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2">
											<ImagePlus className="w-5 h-5 text-purple-400" />
										</div>
										<p className="text-sm font-semibold text-slate-100">
											Upload Manual Thumbnail
										</p>
										<p className="text-xs text-slate-500 mt-1">JPG, PNG</p>
										<div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
											<Upload className="w-3.5 h-3.5" />
											Click to browse
										</div>
										{manualThumbnailPreview ? (
											<div className="mt-3 rounded-lg overflow-hidden border border-slate-600">
												<img
													src={manualThumbnailPreview}
													alt="Manual thumbnail preview"
													className="w-36 h-20 object-cover"
												/>
											</div>
										) : null}
									</label>
								</div>
							</div>
						</details>

						<details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
							<summary className="cursor-pointer select-none text-sm font-semibold text-slate-200 flex items-center gap-2 w-full">
								<ShieldCheck className="w-4 h-4 text-emerald-300" />
								Logo Overlay (Optional)
							</summary>
							<div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									<div>
										<label className="text-xs text-slate-400 mb-1 block">Logo File</label>
										<input
											type="file"
											accept="image/png,image/jpeg,image/webp"
											onChange={handleLogoChange}
											className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-slate-100"
										/>
										{formData.logoFile ? (
											<p className="text-[11px] text-slate-400 mt-1 truncate">
												{formData.logoFile.name}
											</p>
										) : null}
									</div>
									<div>
										<label className="text-xs text-slate-400 mb-1 block">Position</label>
										<select
											name="logoPosition"
											value={formData.logoPosition}
											onChange={handleInputChange}
											className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
										>
											<option value="top-right">Top Right</option>
											<option value="top-left">Top Left</option>
											<option value="bottom-right">Bottom Right</option>
											<option value="bottom-left">Bottom Left</option>
											<option value="center">Center</option>
										</select>
									</div>
									<div>
										<label className="text-xs text-slate-400 mb-1 block">Size (%)</label>
										<input
											type="number"
											name="logoScalePercent"
											min="5"
											max="40"
											value={formData.logoScalePercent}
											onChange={handleInputChange}
											className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
										/>
									</div>
								</div>
							</div>
						</details>

						<details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
							<summary className="cursor-pointer select-none text-sm font-semibold text-slate-200 flex items-center gap-2 w-full">
								<FileText className="w-4 h-4 text-pink-300" />
								End Credits (Optional)
							</summary>
							<div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
								<p className="text-xs text-slate-500 mb-3">
									Add a closing message in the last seconds of the video.
								</p>
								<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
									<div className="md:col-span-3">
										<label className="text-xs text-slate-400 mb-1 block">
											Credits Text
										</label>
										<textarea
											name="endCreditsText"
											value={formData.endCreditsText}
											onChange={handleInputChange}
											placeholder={"Checkout this video\\nSubscribe for more"}
											rows="2"
											className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 resize-none"
										/>
									</div>
									<div>
										<label className="text-xs text-slate-400 mb-1 block">
											Duration (sec)
										</label>
										<input
											type="number"
											name="endCreditsDurationSec"
											min="2"
											max="30"
											value={formData.endCreditsDurationSec}
											onChange={handleInputChange}
											className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70"
										/>
									</div>
								</div>
							</div>
						</details>

						{status === "success" ? (
							<div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm">
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div className="space-y-1">
										<p className="inline-flex items-center gap-2 font-semibold">
											<CheckCircle2 className="w-4 h-4" />
											{message}
										</p>
										<p className="text-emerald-100/90">{thumbnailStatus}</p>
										{logoStatus ? (
											<p className="text-emerald-100/90">{logoStatus}</p>
										) : null}
										{endCreditsStatus ? (
											<p className="text-emerald-100/90">{endCreditsStatus}</p>
										) : null}
										{scheduleStatus ? (
											<p className="text-emerald-100/90">{scheduleStatus}</p>
										) : null}
										{shortsStatus ? (
											<p className="text-emerald-100/90">{shortsStatus}</p>
										) : null}
										{thumbnailNotice ? (
											<p className="text-emerald-100/75">{thumbnailNotice}</p>
										) : null}
									</div>
									{videoUrl ? (
										<a
											href={videoUrl}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center justify-center rounded-md border border-emerald-200/40 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-300/20 transition"
										>
											Open Video
										</a>
									) : null}
								</div>
							</div>
						) : null}

						{status === "error" ? (
							<div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm inline-flex items-center gap-2">
								<AlertCircle className="w-4 h-4" />
								<span>{message}</span>
							</div>
						) : null}

						<div className="sticky bottom-3 z-10 pt-2">
							<button
								type="submit"
								disabled={isUploading}
								className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-semibold rounded-xl transition duration-300 shadow-lg shadow-purple-950/40 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								<span className="inline-flex items-center justify-center gap-2">
									{isUploading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : null}
									{isUploading ? "Uploading..." : "Upload to YouTube"}
								</span>
							</button>
						</div>
					</form>
				</motion.div>
			</div>
		</div>
	);
}
