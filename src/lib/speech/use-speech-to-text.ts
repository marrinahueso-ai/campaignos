"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionConstructor());
}

type UseSpeechToTextOptions = {
  /** Snapshot of existing text when listening starts. */
  getBaseText: () => string;
  /** Called with base + spoken text as recognition updates. */
  onTextChange: (text: string) => void;
  lang?: string;
};

type UseSpeechToTextResult = {
  voiceSupported: boolean;
  isListening: boolean;
  error: string | null;
  toggleVoice: () => void;
  stopListening: () => void;
  clearError: () => void;
};

/**
 * Browser speech-to-text via the Web Speech API (Chrome / Edge).
 * Continuous + interim results; restarts after Chrome pause-ends sessions.
 */
export function useSpeechToText({
  getBaseText,
  onTextChange,
  lang = "en-US",
}: UseSpeechToTextOptions): UseSpeechToTextResult {
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const voiceBaseTextRef = useRef("");
  const voiceFinalTranscriptRef = useRef("");
  const getBaseTextRef = useRef(getBaseText);
  const onTextChangeRef = useRef(onTextChange);

  useEffect(() => {
    getBaseTextRef.current = getBaseText;
    onTextChangeRef.current = onTextChange;
  }, [getBaseText, onTextChange]);

  useEffect(() => {
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  const stopListening = useCallback(() => {
    keepListeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.stop();
    } catch {
      // already stopped
    }
    setIsListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn’t supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    voiceBaseTextRef.current = getBaseTextRef.current().trim();
    voiceFinalTranscriptRef.current = "";

    const applySpokenText = (finalText: string, interimText: string) => {
      const spoken = [finalText, interimText].filter(Boolean).join(" ").trim();
      const base = voiceBaseTextRef.current;
      onTextChangeRef.current(base ? `${base} ${spoken}`.trim() : spoken);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript?.trim() ?? "";
        if (!piece) continue;
        if (result.isFinal) {
          voiceFinalTranscriptRef.current = [
            voiceFinalTranscriptRef.current,
            piece,
          ]
            .filter(Boolean)
            .join(" ");
        } else {
          interim = interim ? `${interim} ${piece}` : piece;
        }
      }
      applySpokenText(voiceFinalTranscriptRef.current, interim);
    };
    recognition.onerror = (event) => {
      const code = event.error ?? "";
      // Benign / recoverable — keep session going when possible.
      if (code === "aborted" || code === "no-speech") {
        return;
      }
      keepListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      setError("Couldn’t capture voice. Try typing instead.");
    };
    recognition.onend = () => {
      // Chrome often ends continuous sessions after a pause — restart while mic is on.
      if (keepListeningRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to stop
        }
      }
      keepListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    setError(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      keepListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      setError("Couldn’t start voice input.");
    }
  }, [isListening, lang, stopListening]);

  const clearError = useCallback(() => setError(null), []);

  return {
    voiceSupported,
    isListening,
    error,
    toggleVoice,
    stopListening,
    clearError,
  };
}
