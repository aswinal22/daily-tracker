"use client";

import { useRef, useState, useEffect } from "react";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

/**
 * Inline audio player with a play/pause button and a progress bar.
 * Uses a native <audio> element under the hood for broad compatibility.
 *
 * Handles the known "Infinity duration" bug with blob URLs (from
 * MediaRecorder) by seeking to the end to force the browser to compute
 * the real duration.
 */
export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrent(audio.currentTime);
      if (isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        // Blob URLs (MediaRecorder) report Infinity — force the browser
        // to compute the real duration by seeking to a huge timestamp.
        audio.currentTime = 1e101;
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        // Reset playback position after the seek-trick
        if (audio.currentTime > audio.duration) {
          audio.currentTime = 0;
        }
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={className}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:opacity-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{fmt(current)}</span>
            <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
