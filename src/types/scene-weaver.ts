export interface Scene {
  id: string;
  imageUrl: string;
  templateId: string | null;
  caption: string;
  duration: 2 | 4 | 6;
  videoUrl?: string;
  status: "idle" | "generating" | "done" | "error";
  error?: string;
}

export interface Story {
  mood: "romantic" | "dominant" | "playful" | "fantasy" | "intense";
  scenes: Scene[];
  finalVideoUrl?: string;
  status: "idle" | "generating" | "stitching" | "done" | "error";
}

export type StoryMood = Story["mood"];
export type SceneStatus = Scene["status"];
export type StoryStatus = Story["status"];
