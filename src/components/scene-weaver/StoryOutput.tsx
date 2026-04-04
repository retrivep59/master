"use client";

import { Download, Film } from "lucide-react";

interface StoryOutputProps {
  videoUrl: string;
  sceneCount: number;
}

export default function StoryOutput({ videoUrl, sceneCount }: StoryOutputProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Film className="w-5 h-5 text-pink-400" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-white text-sm">Your Story</h3>
            <p className="text-gray-500 text-xs">
              {sceneCount} scene{sceneCount !== 1 ? "s" : ""} combined
            </p>
          </div>
        </div>

        <a
          href={videoUrl}
          download="sceneweaver-story.mp4"
          aria-label="Download story video"
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download
        </a>
      </div>

      {/* Video player */}
      <div className="bg-black">
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full max-h-[480px]"
          aria-label="Generated story video"
        />
      </div>
    </div>
  );
}
