"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Scene } from "@/types/scene-weaver";
import SceneCard from "./SceneCard";
import { Plus } from "lucide-react";

interface SceneStripProps {
  scenes: Scene[];
  onAddScene: (scene: Scene) => void;
  onRemoveScene: (id: string) => void;
  onReorder: (scenes: Scene[]) => void;
  onSelectScene: (id: string | null) => void;
  selectedSceneId: string | null;
}

export default function SceneStrip({
  scenes, onAddScene, onRemoveScene, onReorder, onSelectScene, selectedSceneId,
}: SceneStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10MB."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json() as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "Upload failed");
      const scene: Scene = {
        id: crypto.randomUUID(),
        imageUrl: data.url,
        templateId: null,
        caption: "",
        duration: 4,
        status: "idle",
      };
      onAddScene(scene);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;
    const reordered = [...scenes];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder(reordered);
    dragIndexRef.current = null;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[220px] items-start">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="flex-shrink-0 w-36 relative group/wrap">
            <SceneCard
              scene={scene}
              index={index}
              isSelected={selectedSceneId === scene.id}
              onClick={() => onSelectScene(scene.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            />
            <button
              aria-label={`Remove scene ${index + 1}`}
              onClick={() => onRemoveScene(scene.id)}
              className="absolute -top-2 -right-2 w-5 h-5 text-white rounded-full text-xs items-center justify-center hidden group-hover/wrap:flex transition-colors z-10"
              style={{ background: "#c0006a" }}
            >
              ×
            </button>
          </div>
        ))}

        {scenes.length < 8 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Add scene"
            className="flex-shrink-0 w-36 min-h-[192px] flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: "rgba(192,0,106,0.25)", color: "#7a4a7a" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(192,0,106,0.6)"; e.currentTarget.style.color = "#c0006a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(192,0,106,0.25)"; e.currentTarget.style.color = "#7a4a7a"; }}
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#c0006a", borderTopColor: "transparent" }} />
            ) : (
              <Plus className="w-6 h-6" />
            )}
            <span className="text-xs font-medium">{uploading ? "Uploading…" : "Add Scene"}</span>
            <span className="text-[10px]" style={{ color: "#4a2a4a" }}>{scenes.length}/8</span>
          </button>
        )}

        {scenes.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm py-8" style={{ color: "#4a2a4a" }}>
            Add at least 2 scenes to create your story
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
