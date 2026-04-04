import type { Metadata } from "next";
import SceneWeaverApp from "@/components/scene-weaver/SceneWeaverApp";

export const metadata: Metadata = {
  title: "SceneWeaver — Story Mode | ImageMotion AI",
  description:
    "Upload 2–8 images, sequence them into scenes, choose moods and motion templates, then AI stitches them into a full narrative short film.",
};

export default function SceneWeaverPage() {
  return <SceneWeaverApp />;
}
