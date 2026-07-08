// NovaMind — frontend/src/hooks/useVoiceInput.js

import { useState, useEffect, useRef } from "react";

export function useVoiceInput(onTranscript) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onstart = () => setIsRecording(true);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onTranscriptRef.current) {
          onTranscriptRef.current(transcript);
        }
      };
      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
      rec.onend = () => setIsRecording(false);

      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return {
    isRecording,
    hasVoiceSupport: !!recognition,
    toggleRecording
  };
}
export default useVoiceInput;
