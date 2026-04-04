"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";

interface ImageUploaderProps {
  onImageSelected: (url: string) => void;
  currentImage: string | null;
}

export default function ImageUploader({
  onImageSelected,
  currentImage,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

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
      <label className="block text-sm font-medium text-gray-300">
        Source Image
      </label>

      {currentImage ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage}
            alt="Selected"
            className="w-full max-h-64 object-contain bg-gray-900"
          />
          <button
            onClick={() => onImageSelected("")}
            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-purple-500 bg-purple-500/10"
              : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
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
              <p className="text-gray-300 font-medium">
                {uploading ? "Uploading..." : "Drop image here or click to browse"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!currentImage && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-950 px-2 text-gray-500">or paste URL</span>
          </div>
        </div>
      )}

      {!currentImage && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
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
              const input = (
                e.currentTarget.parentElement?.querySelector(
                  "input"
                ) as HTMLInputElement
              )?.value?.trim();
              if (input) onImageSelected(input);
            }}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-700"
          >
            Use
          </button>
        </div>
      )}
    </div>
  );
}
