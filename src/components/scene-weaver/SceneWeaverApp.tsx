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
        selectedSceneId: state.selectedSceneId === action.id ? null : state.selectedSceneId,
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

  const selectedScene = state.scenes.find((s) => s.id === state.selectedSceneId) ?? null;

  const handleAddScene    = (scene: Scene) => dispatch({ type: "ADD_SCENE", scene });
  const handleRemoveScene = (id: string)   => dispatch({ type: "REMOVE_SCENE", id });
  const handleReorderScenes = (scenes: Scene[]) => dispatch({ type: "REORDER_SCENES", scenes });
  const handleSelectScene = (id: string | null) => dispatch({ type: "SELECT_SCENE", id });
  const handleUpdateScene = (id: string, updates: Partial<Scene>) => dispatch({ type: "UPDATE_SCENE", id, updates });
  const handleSetMood     = (mood: StoryMood)   => dispatch({ type: "SET_MOOD", mood });
  const handleSetStatus   = (status: StoryStatus) => dispatch({ type: "SET_STATUS", status });
  const handleSetFinalVideo = (url: string) => dispatch({ type: "SET_FINAL_VIDEO", url });

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: "#080008", color: "#fff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-sm"
        style={{ borderBottom: "1px solid rgba(192,0,106,0.25)", background: "rgba(8,0,8,0.92)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" style={{ color: "#7a4a7a" }} className="hover:text-white transition-colors p-1 text-lg">←</a>
            <div>
              <h1 className="font-black text-base leading-none" style={{ color: "#ff69b4" }}>SceneWeaver 🔞</h1>
              <p className="text-[10px] mt-0.5 hidden sm:block" style={{ color: "#7a4a7a" }}>AI Adult Story Sequencer</p>
            </div>
          </div>
          {/* Mode Toggle */}
          <div
            className="flex items-center rounded-xl p-1 gap-1"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(192,0,106,0.3)" }}
          >
            <button
              onClick={() => setMode("single")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: mode === "single" ? "linear-gradient(135deg,#c0006a,#7a00c0)" : "transparent",
                color: mode === "single" ? "#fff" : "#7a4a7a",
                boxShadow: mode === "single" ? "0 0 12px rgba(192,0,106,0.5)" : "none",
              }}
            >
              📸 1 Photo
            </button>
            <button
              onClick={() => setMode("multi")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: mode === "multi" ? "linear-gradient(135deg,#c0006a,#7a00c0)" : "transparent",
                color: mode === "multi" ? "#fff" : "#7a4a7a",
                boxShadow: mode === "multi" ? "0 0 12px rgba(192,0,106,0.5)" : "none",
              }}
            >
              🎞️ Multi
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 md:py-8">
        {/* Mode description */}
        <div className="mb-6">
          {mode === "single" ? (
            <div>
              <h2 className="text-xl font-black mb-1">
                One Photo →{" "}
                <span style={{ background: "linear-gradient(90deg,#ff2d78,#c0006a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Full XXX Story
                </span>
              </h2>
              <p className="text-sm" style={{ color: "#7a4a7a" }}>
                Upload a single photo and AI generates multiple explicit animated scenes with different motion styles, stitched into one hot video.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-black mb-1">
                Multi-Image{" "}
                <span style={{ background: "linear-gradient(90deg,#7a00c0,#c0006a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Story Sequencer
                </span>
              </h2>
              <p className="text-sm" style={{ color: "#7a4a7a" }}>
                Upload 2–8 photos, arrange them into scenes, and AI stitches them into your own explicit short film.
              </p>
            </div>
          )}
        </div>

        {mode === "single" ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#7a4a7a" }}>Scene Mood</p>
              <MoodSelector mood={state.mood} onMoodChange={handleSetMood} />
            </div>
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(192,0,106,0.15)" }}>
              <SingleImageStory mood={state.mood} />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#7a4a7a" }}>Scene Mood</p>
              <MoodSelector mood={state.mood} onMoodChange={handleSetMood} />
            </section>

            <section>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#7a4a7a" }}>Scenes</p>
              <SceneStrip
                scenes={state.scenes}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
                onReorder={handleReorderScenes}
                onSelectScene={handleSelectScene}
                selectedSceneId={state.selectedSceneId}
              />
            </section>

            <section className="space-y-4">
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

            {state.finalVideoUrl && (
              <section>
                <StoryOutput videoUrl={state.finalVideoUrl} sceneCount={state.scenes.length} />
              </section>
            )}
          </div>
        )}
      </main>

      {selectedScene && mode === "multi" && (
        <SceneEditor
          scene={selectedScene}
          onUpdate={(updates) => handleUpdateScene(selectedScene.id, updates)}
          onClose={() => handleSelectScene(null)}
        />
      )}

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 backdrop-blur-sm"
        style={{
          background: "rgba(8,0,8,0.95)",
          borderTop: "1px solid rgba(192,0,106,0.25)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex">
          <a href="/" className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5" style={{ color: "#7a4a7a" }}>
            <span className="text-lg leading-none">🎬</span>
            <span className="text-[10px] font-medium">Generator</span>
          </a>
          <div className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5" style={{ color: "#ff69b4", borderTop: "2px solid #c0006a" }}>
            <span className="text-lg leading-none">🎞️</span>
            <span className="text-[10px] font-medium">Story Mode</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
