import { motion } from "framer-motion";
import { useState } from "react";
import { Play, FileSpreadsheet } from "lucide-react";
import CreateVideo from "../components/CreateVideo";
import YoutubeUpload from "../components/YoutubeUpload";
import BulkUpload from "../components/BulkUpload";

export default function Dashboard() {
	const [tab, setTab] = useState("create");

	return (
		<div className="min-h-screen bg-slate-950 flex">
			{/* Left Branding Panel */}
			<motion.div
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6 }}
				className="relative overflow-hidden hidden lg:flex lg:w-[30%] xl:w-[24%] lg:min-w-[280px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/60 flex-col justify-start items-center pt-14 pb-10 px-7 xl:px-9"
			>
				<motion.div
					aria-hidden
					animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
					transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
					className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl"
				/>
				<motion.div
					aria-hidden
					animate={{ x: [0, -12, 0], y: [0, 10, 0] }}
					transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
					className="absolute -bottom-20 -right-16 w-56 h-56 rounded-full bg-cyan-500/20 blur-3xl"
				/>

				<div className="relative z-10 text-center space-y-5 w-full max-w-xs">
					<div className="mx-auto w-[4.5rem] h-[4.5rem] rounded-3xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-purple-900/50 border border-white/10">
						<Play className="w-8 h-8 text-white fill-white ml-0.5" />
					</div>
					<div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] tracking-wide uppercase text-slate-300">
						Studio Suite
					</div>
					<h1 className="text-3xl xl:text-4xl font-black bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent leading-tight">
						AutoStoryTube
					</h1>
					<p className="text-slate-300/85 text-sm xl:text-base max-w-xs mx-auto leading-relaxed">
						Create narrated videos with animated subtitles and upload to
						YouTube.
					</p>
				</div>
			</motion.div>

			{/* Right Main Content */}
			<motion.div
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
				className="flex-1 flex items-center justify-center p-8 lg:p-16"
			>
				<div className="w-full max-w-5xl">
					{/* Tabs */}
					<div className="flex mb-8 bg-slate-900 rounded-xl p-1 border border-slate-800 gap-1">
						<button
							onClick={() => setTab("create")}
							className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
								tab === "create"
									? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Create Video
						</button>

						<button
							onClick={() => setTab("bulk")}
							className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
								tab === "bulk"
									? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<FileSpreadsheet className="w-4 h-4" />
							Bulk Upload
						</button>

						<button
							onClick={() => setTab("youtube")}
							className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
								tab === "youtube"
									? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
									: "text-slate-400 hover:text-white"
							}`}
						>
							Upload to YouTube
						</button>
					</div>

					{/* Card Container */}
					<motion.div
						key={tab}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
						className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl"
					>
						{tab === "create" ? <CreateVideo /> : tab === "bulk" ? <BulkUpload /> : <YoutubeUpload />}
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
}
