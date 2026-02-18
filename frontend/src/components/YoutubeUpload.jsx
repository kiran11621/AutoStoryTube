import { useState } from "react";
import { motion } from "framer-motion";
import { Type, FileText, Tags, Eye, ImagePlus, Upload } from "lucide-react";

export default function YoutubeUpload() {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		tags: "",
		visibility: "public",
		thumbnail: null,
	});

	const [thumbnailPreview, setThumbnailPreview] = useState(null);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleThumbnailChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setFormData((prev) => ({ ...prev, thumbnail: file }));
			const reader = new FileReader();
			reader.onloadend = () => setThumbnailPreview(reader.result);
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Uploading:", formData);
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
							Set your metadata and upload with optional thumbnail.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
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
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-transparent transition"
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
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-transparent transition resize-none"
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
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-transparent transition"
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
									className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-transparent transition"
								>
									<option value="public">Public</option>
									<option value="private">Private</option>
									<option value="unlisted">Unlisted</option>
								</select>
							</div>
						</div>

						<div>
							<label className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
								<ImagePlus className="w-4 h-4 text-amber-400" />
								Thumbnail (Optional)
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
								className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 min-h-52 px-5 py-7 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/60 transition"
							>
								<div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
									<ImagePlus className="w-6 h-6 text-purple-400" />
								</div>
								<p className="text-lg font-semibold text-slate-100">
									Upload Thumbnail
								</p>
								<p className="text-xs text-slate-400 mt-1">
									JPG, PNG up to 2MB
								</p>
								<div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
									<Upload className="w-4 h-4" />
									Drag & drop or click to browse
								</div>

								{thumbnailPreview ? (
									<div className="mt-4 rounded-lg overflow-hidden border border-slate-600">
										<img
											src={thumbnailPreview}
											alt="Thumbnail preview"
											className="w-36 h-20 object-cover"
										/>
									</div>
								) : null}
							</label>
						</div>

						<div className="pt-2">
							<button
								type="submit"
								className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-semibold rounded-xl transition duration-300 shadow-lg shadow-purple-950/40"
							>
								Upload to YouTube
							</button>
						</div>
					</form>
				</motion.div>
			</div>
		</div>
	);
}
