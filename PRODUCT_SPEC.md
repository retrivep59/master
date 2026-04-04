# SceneWeaver — Product Specification

## Concept
The world's first NSFW **Multi-Image Story Sequencer**. Users upload 2–8 images, arrange them into scenes, pick per-scene motion templates, add captions, choose a story genre/mood, and AI animates + stitches them into a complete short video.

No other NSFW tool does this. Every existing tool is single image → single clip. SceneWeaver creates full narrative short films.

---

## User Flow
1. Click "Story Mode" in the header nav → `/scene-weaver`
2. Upload Images — drop up to 8 images into a scene strip
3. Reorder Scenes — drag-and-drop to sequence the story
4. Configure Each Scene — click a card to set motion template, caption, duration
5. Choose Story Mood — Romantic / Dominant / Playful / Fantasy / Intense
6. Generate — each image animated via SVD → clips stitched into one video
7. Preview & Download — watch and save the full story MP4

---

## TypeScript Interfaces

interface Scene {
  id: string;
  imageUrl: string;
  templateId: string | null;
  caption: string;
  duration: 2 | 4 | 6;
  videoUrl?: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
}

interface Story {
  mood: 'romantic' | 'dominant' | 'playful' | 'fantasy' | 'intense';
  scenes: Scene[];
  finalVideoUrl?: string;
  status: 'idle' | 'generating' | 'stitching' | 'done' | 'error';
}

---

## Components
- src/app/scene-weaver/page.tsx
- src/components/scene-weaver/SceneWeaverApp.tsx
- src/components/scene-weaver/SceneStrip.tsx
- src/components/scene-weaver/SceneCard.tsx
- src/components/scene-weaver/SceneEditor.tsx
- src/components/scene-weaver/MoodSelector.tsx
- src/components/scene-weaver/StoryOutput.tsx
- src/components/scene-weaver/GenerateStoryButton.tsx
- src/components/scene-weaver/SceneProgress.tsx

## API Routes
- POST /api/scene-weaver/generate-scene
- POST /api/scene-weaver/stitch (ffmpeg-wasm client-side)

## Mood Themes
- Romantic: rose (#f43f5e)
- Dominant: deep red (#7f1d1d)
- Playful: violet (#7c3aed)
- Fantasy: purple/teal (#6d28d9)
- Intense: orange (#ea580c)
