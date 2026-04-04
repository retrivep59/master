import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImageMotion AI — NSFW Image to Video Generator",
  description:
    "AI-powered image to video generator for adults. Animate any image into a fluid video using Stable Video Diffusion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans overscroll-none">{children}</body>
    </html>
  );
}
