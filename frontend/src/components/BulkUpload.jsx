import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
	AlertCircle,
	CheckCircle2,
	Download,
	ExternalLink,
	FileSpreadsheet,
	Loader2,
} from "lucide-react";

export default function BulkUpload() {
	const [bulkFile, setBulkFile] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");
	const [jobs, setJobs] = useState([]);
	const [progress, setProgress] = useState(0);
	const [status, setStatus] = useState(null); // processing | success | error
	const [templateStatus, setTemplateStatus] = useState("");
	const [isTemplateLoading, setIsTemplateLoading] = useState(false);
	const [uploadToYoutube, setUploadToYoutube] = useState(false);
	const [isAuthorizing, setIsAuthorizing] = useState(false);
	const [authMessage, setAuthMessage] = useState("");
	const progressTimerRef = useRef(null);
	const activeRequestRef = useRef(0);

	const successCount = jobs.filter((job) => !job.error).length;
	const errorCount = jobs.filter((job) => Boolean(job.error)).length;
	const youtubeUploadedCount = jobs.filter((job) => job.youtube_uploaded).length;

	const handleUpload = async (fileToUpload) => {
		if (!fileToUpload || isUploading) return;
		activeRequestRef.current += 1;
		const requestId = activeRequestRef.current;

		if (progressTimerRef.current) {
			clearInterval(progressTimerRef.current);
		}

		setIsUploading(true);
		setStatus("processing");
		setProgress(0);
		setUploadError("");
		setJobs([]);

		const progressStartedAt = Date.now();
		progressTimerRef.current = setInterval(() => {
			const elapsedSeconds = (Date.now() - progressStartedAt) / 1000;
			// Slower curve with lower in-flight cap to avoid hanging at very high percentages.
			const target = Math.min(
				94,
				2 + elapsedSeconds * 1.2 + Math.log1p(elapsedSeconds) * 5.5,
			);
			setProgress((prev) => {
				const next = prev + (target - prev) * 0.1;
				return Math.min(94, Math.max(prev, next));
			});
		}, 220);

		try {
			const formData = new FormData();
			formData.append("excel_file", fileToUpload);
			const endpoint = uploadToYoutube
				? "/api/process-batch-youtube"
				: "/api/process-batch";
			const response = await fetch(endpoint, {
				method: "POST",
				body: formData,
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(
					data?.error ||
						(uploadToYoutube
							? "Batch generation/upload failed."
							: "Batch processing failed."),
				);
			}

			if (requestId !== activeRequestRef.current) return;
			setJobs(Array.isArray(data?.jobs) ? data.jobs : []);

			if (progressTimerRef.current) {
				clearInterval(progressTimerRef.current);
				progressTimerRef.current = null;
			}
			setProgress((prev) => Math.max(prev, 98));
			await new Promise((resolve) => setTimeout(resolve, 180));
			setProgress(100);
			setStatus("success");
		} catch (err) {
			if (progressTimerRef.current) {
				clearInterval(progressTimerRef.current);
				progressTimerRef.current = null;
			}
			if (requestId !== activeRequestRef.current) return;
			setProgress(0);
			setUploadError(
				err?.message ||
					(uploadToYoutube
						? "Batch generation/upload failed."
						: "Batch processing failed."),
			);
			setStatus("error");
		} finally {
			if (requestId === activeRequestRef.current) {
				setIsUploading(false);
			}
		}
	};

	const onDrop = (acceptedFiles) => {
		const file = acceptedFiles[0];
		if (file) {
			setBulkFile(file);
			setUploadError("");
			setJobs([]);
			handleUpload(file);
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.ms-excel": [".xls"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
		},
		multiple: false,
	});

	const handleTemplateDownload = async () => {
		setIsTemplateLoading(true);
		setTemplateStatus("Preparing template...");
		try {
			const response = await fetch("/api/batch/template");
			if (!response.ok) {
				throw new Error("Failed to download template.");
			}
			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") || "";
			const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
			const downloadName = filenameMatch?.[1] || "batch_template.xlsx";
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = downloadName;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
			setTemplateStatus("Template downloaded.");
		} catch (error) {
			setTemplateStatus(error?.message || "Unable to download template.");
		} finally {
			setIsTemplateLoading(false);
		}
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
			setAuthMessage("Authorization page opened. Complete it, then return here.");
		} catch (err) {
			setAuthMessage(err?.message || "Unable to start YouTube auth.");
		} finally {
			setIsAuthorizing(false);
		}
	};

	return (
		<div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 md:p-6">
			<div className="max-w-3xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className="space-y-6"
				>
					<div className="text-center space-y-2">
						<h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
							Bulk Upload
						</h2>
						<p className="text-slate-400">
							Upload a single Excel file and generate multiple videos in one run.
						</p>
					</div>

					<div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 md:p-5">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
							<div>
								<p className="text-sm text-slate-300 font-semibold">Need a starting sheet?</p>
								<p className="text-xs text-slate-500 mt-1">
									Download the latest template with supported headers.
								</p>
							</div>
							<button
								type="button"
								onClick={handleTemplateDownload}
								disabled={isTemplateLoading}
								className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
									isTemplateLoading
										? "bg-slate-800 text-slate-400 cursor-not-allowed"
										: "bg-cyan-600/90 text-cyan-50 hover:bg-cyan-500"
								}`}
							>
								{isTemplateLoading ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Preparing...
									</>
								) : (
									<>
										<Download className="w-4 h-4" />
										Download Batch Template
									</>
								)}
							</button>
						</div>
						{templateStatus ? (
							<div className="mt-3 text-xs text-slate-400">{templateStatus}</div>
						) : null}
					</div>

					<div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 md:p-5 space-y-3">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
							<div>
								<p className="text-sm text-slate-300 font-semibold">Batch Output Mode</p>
								<p className="text-xs text-slate-500 mt-1">
									Pick one mode before uploading your Excel file.
								</p>
							</div>
							<div className="inline-flex rounded-xl border border-slate-700 p-1 bg-slate-950/40">
								<button
									type="button"
									onClick={() => setUploadToYoutube(false)}
									className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
										!uploadToYoutube
											? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
											: "text-slate-300 hover:text-slate-100"
									}`}
								>
									Generate only
								</button>
								<button
									type="button"
									onClick={() => setUploadToYoutube(true)}
									className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
										uploadToYoutube
											? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40"
											: "text-slate-300 hover:text-slate-100"
									}`}
								>
									Generate + YouTube
								</button>
							</div>
						</div>
						{uploadToYoutube ? (
							<div className="rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-3">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div className="text-xs text-cyan-100/90">
										<p>YouTube auth is required. Use `publish_at` in Excel to schedule rows.</p>
									</div>
									<button
										type="button"
										onClick={handleConnectYouTube}
										disabled={isAuthorizing}
										className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition"
									>
										{isAuthorizing ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<ExternalLink className="w-4 h-4" />
										)}
										{isAuthorizing ? "Opening..." : "Connect YouTube"}
									</button>
								</div>
							</div>
						) : null}
						{authMessage ? <p className="text-xs text-slate-400">{authMessage}</p> : null}
					</div>

					<motion.div
						{...getRootProps()}
						className={`rounded-2xl border-2 border-dashed p-10 md:p-12 text-center cursor-pointer transition-all ${
							isDragActive
								? "border-cyan-400 bg-cyan-500/10"
								: "border-slate-700 bg-slate-900/50 hover:border-cyan-500/70"
						}`}
						whileHover={{ scale: 1.01 }}
					>
						<input {...getInputProps()} />
						<div className="mx-auto w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
							<FileSpreadsheet className="w-7 h-7 text-cyan-300" />
						</div>
						<p className="text-white text-xl font-semibold">
							{bulkFile ? "Excel Selected" : "Upload Excel File"}
						</p>
						{bulkFile ? (
							<div className="mt-3">
								<p className="text-slate-200 text-sm font-medium truncate">{bulkFile.name}</p>
								<p className="text-slate-500 text-xs mt-1">
									{Math.max(1, (bulkFile.size / 1024).toFixed(0))} KB
								</p>
							</div>
						) : (
							<>
								<p className="text-slate-400 text-sm mt-2">Drag & drop or click to browse</p>
								<p className="text-slate-500 text-xs mt-1">Supported: .xlsx, .xls</p>
							</>
						)}

						{uploadError ? (
							<div className="mt-4 flex items-center justify-center gap-2 text-sm text-rose-400">
								<AlertCircle className="w-4 h-4" />
								<span>{uploadError}</span>
							</div>
						) : null}
					</motion.div>

					{isUploading ? (
						<div className="space-y-2">
							<div className="flex justify-between text-xs text-slate-400">
								<span className="inline-flex items-center gap-2">
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
									{uploadToYoutube
										? "Generating and uploading batch rows"
										: "Processing batch rows"}
								</span>
								<span>{Math.round(progress)}%</span>
							</div>
							<div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
								<motion.div
									className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
									animate={{ width: `${progress}%` }}
									transition={{ duration: 0.25 }}
								/>
							</div>
						</div>
					) : null}

					{!isUploading && !bulkFile ? (
						<p className="text-xs text-slate-500 text-center">
							Auto-processing starts right after file selection.
						</p>
					) : null}

					{status === "success" && jobs.length ? (
						<motion.div
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm flex items-center gap-2"
						>
							<CheckCircle2 className="w-4 h-4" />
							<span>
								{uploadToYoutube
									? `Batch completed. Uploaded ${youtubeUploadedCount} video(s) to YouTube.`
									: "Batch processing completed."}
							</span>
						</motion.div>
					) : null}

					{status === "error" ? (
						<motion.div
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm flex items-center gap-2"
						>
							<AlertCircle className="w-4 h-4" />
							<span>Batch processing failed.</span>
						</motion.div>
					) : null}

					{jobs.length ? (
						<div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-slate-200 text-sm font-semibold">Batch Results</p>
								<div className="flex items-center gap-2 text-xs">
									<span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">
										{successCount} success
									</span>
									<span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-300">
										{errorCount} failed
									</span>
									{uploadToYoutube ? (
										<span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-300">
											{youtubeUploadedCount} uploaded
										</span>
									) : null}
								</div>
							</div>
							<ul className="space-y-2 text-xs">
								{jobs.map((job, index) => (
									<li
										key={`${job.job_id || job.video_code || "job"}-${index}`}
										className={`rounded-lg border px-3 py-2 ${
											job.error
												? "border-rose-500/40 bg-rose-500/10 text-rose-300"
												: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
										}`}
									>
										{job.error ? (
											<div className="flex items-start gap-2">
												<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
												<div>
													<p className="font-semibold">
														Row {index + 1} failed
													</p>
													<p>
														{job.video_code ? `${job.video_code}: ` : ""}
														{job.error}
													</p>
												</div>
											</div>
										) : (
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
												<div className="flex items-start gap-2 min-w-0">
													<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
													<div className="min-w-0">
														<p className="font-semibold truncate">
															{job.video_name || `Video ${index + 1}`}
														</p>
														<p className="text-emerald-300/80">
															{job.youtube_uploaded
																? "Uploaded to YouTube"
																: "Batch video is ready to download"}
														</p>
														{job.scheduled_publish_at ? (
															<p className="text-emerald-300/80">
																Scheduled: {job.scheduled_publish_at} (UTC)
															</p>
														) : null}
													</div>
												</div>
												<div className="flex items-center gap-2">
													{job.output_url ? (
														<a
															href={job.output_url}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center justify-center rounded-md border border-emerald-300/40 bg-emerald-400/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-400/25 transition"
														>
															Download
														</a>
													) : null}
													{job.youtube_video_url ? (
														<a
															href={job.youtube_video_url}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-400/25 transition"
														>
															Open YouTube
														</a>
													) : null}
													{!job.output_url && !job.youtube_video_url ? (
														<span className="text-[11px]">Output unavailable</span>
													) : null}
												</div>
											</div>
										)}
									</li>
								))}
							</ul>
						</div>
					) : null}
				</motion.div>
			</div>
		</div>
	);
}
