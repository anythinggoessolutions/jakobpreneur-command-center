"use client";

import { useEffect, useRef } from "react";

interface FullscreenPlayerProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

export default function FullscreenPlayer({ videoId, title, onClose }: FullscreenPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);

    // Try to enter fullscreen on the container
    const container = iframeRef.current?.parentElement;
    if (container && container.requestFullscreen) {
      container.requestFullscreen().catch(() => {
        // User interaction may be needed; fullscreen will work after click
      });
    }

    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // YouTube embed with autoplay, loop, mute (required for autoplay), and controls
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&mute=1&controls=1&modestbranding=1&rel=0`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div className="text-white">
          <p className="text-xs uppercase tracking-wider text-zinc-400">Now playing</p>
          <p className="font-semibold">{title}</p>
        </div>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
        >
          ESC to Close
        </button>
      </div>

      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
