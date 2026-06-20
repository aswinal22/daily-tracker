"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AudioPlayer } from "./AudioPlayer";

const MAX_DURATION = 120; // 2 minutes (spec)

type Phase = "idle" | "recording" | "preview" | "saving";

interface VoiceRecorderProps {
  /** Called with the saved task after successful upload. */
  onSaved?: () => void;
  /** Called when user skips/discards. */
  onSkip?: () => void;
  /** Endpoint to POST the audio to (multipart/form-data with 'audio' field). */
  uploadUrl: string;
}

export function VoiceRecorder({ onSaved, onSkip, uploadUrl }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopFlagRef = useRef(false);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ─── Start recording ───
  const startRecording = useCallback(async () => {
    setError(null);
    stopFlagRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPhase("preview");
        stopTracks();
        clearTimer();
      };

      recorder.start();
      setPhase("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_DURATION) {
            // Auto-stop at 2 minutes
            stopFlagRef.current = true;
            if (recorder.state === "recording") recorder.stop();
            clearTimer();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow mic access in your browser settings.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to access microphone");
      }
      stopTracks();
      setPhase("idle");
    }
  }, []);

  // ─── Stop recording (manual) ───
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    clearTimer();
  }, []);

  // ─── Cancel recording ───
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    clearTimer();
    stopTracks();
    setPhase("idle");
    setSeconds(0);
  }, []);

  // ─── Discard preview ───
  const discard = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPhase("idle");
    setSeconds(0);
  }, [previewUrl]);

  // ─── Upload & save ───
  const save = useCallback(async () => {
    if (!previewUrl) return;
    setPhase("saving");

    try {
      const blob = await fetch(previewUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("audio", blob, "voice-note.webm");

      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPhase("idle");
      setSeconds(0);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save voice note");
      setPhase("preview");
    }
  }, [previewUrl, uploadUrl, onSaved]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const remaining = MAX_DURATION - seconds;

  // ─── Render ───
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <p>{error}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setError(null);
              startRecording();
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
          >
            Try again
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // Recording state
  if (phase === "recording") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            Recording... {fmtTime(seconds)}
          </span>
          <span className="ml-auto text-xs text-red-500 dark:text-red-400">
            {remaining <= 10 ? `${remaining}s left` : `${fmtTime(remaining)} left`}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={stopRecording}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition hover:opacity-90"
          >
            ⏹ Stop
          </button>
          <button
            onClick={cancelRecording}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    );
  }

  // Preview state
  if (phase === "preview" && previewUrl) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium">🎤 Voice Note Preview</p>
        <AudioPlayer src={previewUrl} className="mb-4" />
        <div className="flex gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            💾 Save
          </button>
          <button
            onClick={startRecording}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium transition hover:bg-muted"
          >
            🔄 Re-record
          </button>
          <button
            onClick={discard}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            🗑️ Discard
          </button>
        </div>
      </div>
    );
  }

  // Saving state
  if (phase === "saving") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        <p className="animate-pulse">💾 Saving voice note...</p>
      </div>
    );
  }

  // Idle state — record or skip
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={startRecording}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          🎤 Record Voice Note
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Skip
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Max 2 minutes. You can preview and re-record before saving.
      </p>
    </div>
  );
}
