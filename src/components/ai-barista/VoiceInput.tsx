import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  return ctor ?? null;
}

/**
 * Real voice input powered by the Web Speech API. The transcript
 * is placed into the composer for review — nothing is ever
 * fabricated or auto-sent without the customer's confirmation.
 */
export default function VoiceInput({ onTranscript, onInterim, disabled }: Props) {
  const supported = typeof window !== 'undefined' && !!getSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // already stopped
    }
    setListening(false);
    setBusy(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      let finalText = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (interim) onInterim?.(interim);
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        setBusy(false);
        const err = event?.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          toast.error('Microphone access was blocked. Allow it in your browser to use voice input.');
        } else if (err !== 'no-speech' && err !== 'aborted') {
          toast.error('Voice input stopped unexpectedly. You can try again.');
        }
      };
      recognition.onend = () => {
        setListening(false);
        setBusy(false);
        const transcript = finalText.trim();
        if (transcript) onTranscript(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setBusy(true);
    } catch {
      setListening(false);
      setBusy(false);
      toast.error('Voice input could not start in this browser.');
    }
  }, [onTranscript, onInterim]);

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // already stopped
      }
    },
    [],
  );

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      disabled={disabled}
      title={listening ? 'Stop listening' : 'Dictate your message'}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        listening
          ? 'text-destructive bg-destructive/10 animate-pulse'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      }`}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : listening ? (
        <MicOff className="w-3.5 h-3.5" />
      ) : (
        <Mic className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
