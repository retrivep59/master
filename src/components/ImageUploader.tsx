"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Camera } from "lucide-react";

interface ImageUploaderProps {
  onImageSelected: (url: string) => void;
  currentImage: string | null;
}

export default function ImageUploader({ onImageSelected, currentImage }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        onImageSelected(data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">Source Image</label>

      {currentImage ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImage} alt="Selected" className="w-full max-h-64 object-contain bg-gray-900" />
          <button
            onClick={() => onImageSelected("")}
            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-2 transition-colors"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Upload zone — tap on mobile, drag on desktop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors active:scale-[0.98] ${
              dragging ? "border-purple-500 bg-purple-500/10" : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="bg-gray-800 p-3 rounded-full">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-gray-300 font-medium text-sm">
                  {uploading ? "Uploading..." : "Tap to choose photo"}
                </p>
                <p className="text-gray-500 text-xs mt-1">PNG, JPG, WEBP up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Camera button — visible on mobile */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden w-full flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium py-3 rounded-xl transition-colors active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            Take a Photo
          </button>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {/* Camera-specific input (capture=environment uses rear camera) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {/* URL input */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-950 px-2 text-gray-600">or paste URL</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) onImageSelected(val);
                  }
                }}
              />
            </div>
            <button
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement;
                const v = input?.value?.trim();
                if (v) onImageSelected(v);
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 rounded-xl text-sm font-medium border border-gray-700 transition-colors"
            >
              Use
            </button>
          </div>
        </>
      )}
    </div>
  );
}
