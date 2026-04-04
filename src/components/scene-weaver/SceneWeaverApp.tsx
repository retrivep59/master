"use client";

import { useReducer, useState } from "react";
import type { Scene, StoryMood, StoryStatus } from "@/types/scene-weaver";
import SceneStrip from "./SceneStrip";
import SceneEditor from "./SceneEditor";
import GenerateStoryButton from "./GenerateStoryButton";
import MoodSelector from "./MoodSelector";
import StoryOutput from "./StoryOutput";
import SceneProgress from "./SceneProgress";
import SingleImageStory from "./SingleImageStory";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface StoryState {
  scenes: Scene[];
  mood: StoryMood;
  status: StoryStatus;
  finalVideoUrl: string | null;
  selectedSceneId: string | null;
}

const initialState: StoryState = {
  scenes: [],
  mood: "romantic",
  status: "idle",
  finalVideoUrl: null,
  selectedSceneId: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type StoryAction =
  | { type: "ADD_SCENE"; scene: Scene }
  | { type: "REMOVE_SCENE"; id: string }
  | { type: "REORDER_SCENES"; scenes: Scene[] }
  | { type: "UPDATE_SCENE"; id: string; updates: Partial<Scene> }
  | { type: "SET_MOOD"; mood: StoryMood }
  | { type: "SET_STATUS"; status: StoryStatus }
  | { type: "SET_FINAL_VIDEO"; url: string }
  | { type: "SELECT_SCENE"; id: string | null };

function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case "ADD_SCENE":
      if (state.scenes.length >= 8) return state;
      return { ...state, scenes: [...state.scenes, action.scene] };

    case "REMOVE_SCENE":
      return {
        ...state,
        scenes: state.scenes.filter((s) => s.id !== action.id),
        selectedSceneId:
          state.selectedSceneId === action.id ? null : state.selectedSceneId,
      };

    case "REORDER_SCENES":
      return { ...state, scenes: action.scenes };

    case "UPDATE_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) =>
          s.id === action.id ? { ...s, ...action.updates } : s
        ),
      };

    case "SET_MOOD":
      return { ...state, mood: action.mood };

    case "SET_STATUS":
      return { ...state, status: action.status };

    case "SET_FINAL_VIDEO":
      return { ...state, finalVideoUrl: action.url, status: "done" };

    case "SELECT_SCENE":
      return { ...state, selectedSceneId: action.id };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Mode = "single" | "multi";

export default function SceneWeaverApp() {
  const [mode, setMode] = useState<Mode>("single");
  const [state, dispatch] = useReducer(storyReducer, initialState);

  const selectedScene =
    state.scenes.find((s) => s.id === state.selectedSceneId) ?? null;

  const handleAddScene = (scene: Scene) => dispatch({ type: "ADD_SCENE", scene });
  const handleRemoveScene = (id: string) => dispatch({ type: "REMOVE_SCENE", id });
  const handleReorderScenes = (scenes: Scene[]) =>
    dispatch({ type: "REORDER_SCENES", scenes });
  const handleSelectScene = (id: string | null) =>
    dispatch({ type: "SELECT_SCENE", id });
  const handleUpdateScene = (id: string, updates: Partial<Scene>) =>
    dispatch({ type: "UPDATE_SCENE", id, updates });
  const handleSetMood = (mood: StoryMood) => dispatch({ type: "SET_MOOD", mood });
  const handleSetStatus = (status: StoryStatus) =>
    dispatch({ type: "SET_STATUS", status });
  const handleSetFinalVideo = (url: string) =>
    dispatch({ type: "SET_FINAL_VIDEO", url });

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-none">SceneWeaver</h1>
            <p className="text-gray-500 text-xs mt-0.5">AI Story Video Creator</p>
          </div>
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode("single")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "single"
                  ? "bg-pink-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              📸 1 Photo
            </button>
            <button
              onClick={() => setMode("multi")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "multi"
                  ? "bg-purple-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              🎞️ Multi-Scene
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Mode description */}
        <div className="mb-6">
          {mode === "single" ? (
            <div>
              <h2 className="text-xl font-bold mb-1">
                One Photo →{" "}
                <span className="bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Full Story Video
                </span>
              </h2>
              <p className="text-gray-400 text-sm">
                Upload a single image and AI generates multiple animated scenes with different motion styles,
                then stitches them into one complete video.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold mb-1">
                Multi-Image{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Story Sequencer
                </span>
              </h2>
              <p className="text-gray-400 text-sm">
                Upload 2–8 different images, arrange them into scenes, configure each one, and AI
                stitches them into your own short film.
              </p>
            </div>
          )}
        </div>

        {mode === "single" ? (
          /* ── Single Image Mode ── */
          <div className="space-y-6">
            {/* Mood selector shared by both modes */}
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Story Mood</p>
              <MoodSelector mood={state.mood} onMoodChange={handleSetMood} />
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <SingleImageStory mood={state.mood} />
            </div>
          </div>
        ) : (
          /* ── Multi-Image Mode ── */
          <div className="space-y-8">
            {/* Mood */}
            <section aria-label="Story mood">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Story Mood</p>
              <MoodSelector mood={state.mood} onMoodChange={handleSetMood} />
            </section>

            {/* Scene Strip */}
            <section aria-label="Scene strip">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Scenes</p>
              <SceneStrip
                scenes={state.scenes}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
                onReorder={handleReorderScenes}
                onSelectScene={handleSelectScene}
                selectedSceneId={state.selectedSceneId}
              />
            </section>

            {/* Generate */}
            <section aria-label="Generate story" className="space-y-4">
              <GenerateStoryButton
                scenes={state.scenes}
                mood={state.mood}
                onSceneUpdate={handleUpdateScene}
                onFinalVideo={handleSetFinalVideo}
                onStatusChange={handleSetStatus}
              />
              {(state.status === "generating" || state.status === "stitching") && (
                <SceneProgress scenes={state.scenes} status={state.status} />
              )}
            </section>

            {/* Output */}
            {state.finalVideoUrl && (
              <section aria-label="Story output">
                <StoryOutput videoUrl={state.finalVideoUrl} sceneCount={state.scenes.length} />
              </section>
            )}
          </div>
        )}
      </main>

      {/* Scene Editor slide-out (multi mode only) */}
      {selectedScene && mode === "multi" && (
        <SceneEditor
          scene={selectedScene}
          onUpdate={(updates) => handleUpdateScene(selectedScene.id, updates)}
          onClose={() => handleSelectScene(null)}
        />
      )}
    </div>
  );
}
