"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader } from "lucide-react";

interface DictateButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DictateButton({
  onTranscription,
  disabled = false,
  className = "",
}: DictateButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        // Create a file from the blob with proper extension
        const extension = audioBlob.type.includes("webm") ? "webm" : "mp4";
        const file = new File([audioBlob], `recording.${extension}`, {
          type: audioBlob.type,
        });
        formData.append("audio", file);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Transcription failed");
        }

        const data = await response.json();
        if (data.text) {
          onTranscription(data.text);
        }
      } catch (err) {
        console.error("Transcription error:", err);
        setError(err instanceof Error ? err.message : "Transcription failed");
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscription]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Send to transcription API
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone. Please grant permission.");
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isDisabled = disabled || isTranscribing;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={
          isTranscribing
            ? "Transcribing..."
            : isRecording
            ? "Stop recording"
            : "Start dictation"
        }
        className={`flex items-center gap-2 p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isRecording
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        } ${className}`}
      >
        {isTranscribing ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded shadow-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
}
