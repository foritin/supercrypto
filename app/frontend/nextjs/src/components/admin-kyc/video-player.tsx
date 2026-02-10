"use client";

/**
 * Video Player - KYC Liveness Video Playback
 * 视频播放器 - KYC 活体检测视频播放
 *
 * Features:
 * - HTML5 video with native controls
 * - Play, pause, seek support
 * - Rounded border and title display
 * - Responsive aspect ratio
 */

import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ src, title, className }: VideoPlayerProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-white/10",
        className
      )}
    >
      <video
        src={src}
        controls
        className="w-full aspect-video"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
      {title && (
        <div className="p-2 bg-white/5 text-sm text-white/60 text-center">
          {title}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
