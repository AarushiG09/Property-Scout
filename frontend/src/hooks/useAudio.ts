import { useState, useEffect, useRef, useCallback } from "react";

export interface UseAudioReturn {
  isListening: boolean;
  transcript: string;
  setTranscript: (text: string) => void;
  resetTranscript: () => void;
  audioVolume: number;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speakText: (text: string, onEndedCallback?: () => void) => Promise<void>;
  stopSpeaking: () => void;
  speechSupported: boolean;
  micError: string | null;
  activeSpeaker: string;
  autoListenAfterSpeech: boolean;
  setAutoListenAfterSpeech: (enabled: boolean) => void;
  unlockAudioForSafari: () => void;
}

export function useAudio(): UseAudioReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioVolume, setAudioVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<string>("Neerja (Neural Edge TTS)");
  const [autoListenAfterSpeech, setAutoListenAfterSpeech] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const recognitionIdRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  
  // DEDICATED SEPARATE AUDIO ELEMENTS
  const primingAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isAudioPrimedRef = useRef<boolean>(false);
  const hasInitializedAudioRef = useRef<boolean>(false);
  const playbackCheckIntervalRef = useRef<any>(null);

  // SINGLE REF GATING ASSISTANT SPEECH STATE
  const isSpeakingRef = useRef<boolean>(false);

  // MASTER USER MANUAL STOP REF (BLOCKS AUTO-RESTART LOOPS WHEN USER CLICKS STOP)
  const isManualStopRef = useRef<boolean>(false);

  // EXPONENTIAL BACKOFF & CIRCUIT BREAKER REFS
  const consecutiveAbortsRef = useRef<number>(0);
  const successResetTimerRef = useRef<any>(null);

  const updateIsSpeaking = useCallback((newValue: boolean, locationLabel: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[FLAG MUTATION] isSpeakingRef set to ${newValue} at ${timestamp} (Location: ${locationLabel})`);
    isSpeakingRef.current = newValue;
    setIsSpeaking(newValue);
  }, []);

  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const transcriptRef = useRef("");
  const autoListenAfterSpeechRef = useRef(true);
  const consecutiveErrorsRef = useRef(0);
  const onEndedCallbackRef = useRef<(() => void) | null>(null);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
  }, []);

  // Initialize dedicated Audio elements EXACTLY ONCE per session
  useEffect(() => {
    if (typeof window !== "undefined" && !hasInitializedAudioRef.current) {
      hasInitializedAudioRef.current = true;
      primingAudioRef.current = new Audio();
      ttsAudioRef.current = new Audio();
      console.log("[AUDIO PLAYER INIT] Dedicated priming & TTS HTMLAudioElements initialized.");
      console.log(`[PROTOCOL CHECK] Origin: ${window.location.protocol}//${window.location.host}, isSecureContext: ${window.isSecureContext}`);
    }
  }, []);

  useEffect(() => {
    autoListenAfterSpeechRef.current = autoListenAfterSpeech;
  }, [autoListenAfterSpeech]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // COMPLETE AUDIO ANALYZER SHUTDOWN & TRACK RELEASE
  const stopAudioAnalyzer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {}
      analyserRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.suspend().catch(() => {});
    }

    setAudioVolume(0);
  }, []);

  // Audio Context & Frequency Visualizer with Strict MediaStream Null-Guards
  const startAudioAnalyzer = async () => {
    try {
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!stream || !stream.active) {
            console.warn("[AUDIO ANALYZER NOTICE] getUserMedia returned inactive or null stream.");
            return;
          }
          mediaStreamRef.current = stream;
        } catch (err) {
          console.warn("[AUDIO ANALYZER NOTICE] getUserMedia error:", err);
          return;
        }
      }

      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        console.warn("[AUDIO ANALYZER NOTICE] mediaStreamRef is null or inactive prior to createMediaStreamSource.");
        return;
      }

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtxClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        console.warn("[AUDIO ANALYZER NOTICE] mediaStreamRef invalidated during AudioContext resume.");
        return;
      }

      if (!analyserRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        const source = audioCtxRef.current.createMediaStreamSource(mediaStreamRef.current);
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioVolume(Math.min(100, Math.round((avg / 255) * 100 * 2.5)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e: any) {
      console.warn("Microphone audio analyzer notice:", e);
    }
  };

  // Teardown existing recognition instance cleanly
  const destroyCurrentRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  // CREATE A COMPLETELY FRESH SPEECHRECOGNITION INSTANCE ON DEMAND
  const createFreshRecognition = useCallback(() => {
    destroyCurrentRecognition();

    if (typeof window === "undefined") return null;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return null;
    }

    try {
      const recId = "stt-" + Math.random().toString(36).substring(2, 9);
      recognitionIdRef.current = recId;
      console.log(`[FRESH SPEECH RECOGNITION INSTANCE id=${recId}] Created brand new SpeechRecognition object.`);

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onstart = () => {
        const now = new Date().toISOString();
        console.log(`[STT START id=${recId}] Microphone active at ${now}`);
        resetTranscript();
        setIsListening(true);
        isListeningRef.current = true;
        isStartingRef.current = false;
        consecutiveErrorsRef.current = 0;
        setMicError(null);

        // Start waveform visualizer only once SpeechRecognition is confirmed active
        startAudioAnalyzer();

        if (successResetTimerRef.current) {
          clearTimeout(successResetTimerRef.current);
        }
        successResetTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            console.log(`[STT STABLE id=${recId}] Sustained active listening for 5s. Resetting consecutive abort count.`);
            consecutiveAbortsRef.current = 0;
          }
        }, 5000);
      };

      rec.onresult = (event: any) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        console.log(`[STT RESULT id=${recId}] Transcribed text: "${text}"`);
        setTranscript(text);
        transcriptRef.current = text;
        consecutiveAbortsRef.current = 0;
      };

      rec.onerror = (event: any) => {
        const now = new Date().toISOString();
        console.log(`[STT ERROR/ABORT DETECTED id=${recId}] event.error="${event.error}", isSpeakingRef.current=${isSpeakingRef.current} at ${now}`);

        if (event.error === "aborted") {
          isStartingRef.current = false;

          if (isManualStopRef.current) {
            console.log(`[STT MANUAL STOP] Abort error ignored because user manually turned off listening.`);
            isListeningRef.current = false;
            setIsListening(false);
            stopAudioAnalyzer();
            return;
          }

          if (!isSpeakingRef.current) {
            console.log(`[STT ABORT NOTED id=${recId}] isSpeakingRef is FALSE. Managing recovery via fresh instance.`);
          } else {
            console.log(`[STT ABORT CONFIRMED id=${recId}] Recognition paused for active TTS speech output.`);
            isListeningRef.current = false;
            setIsListening(false);
            stopAudioAnalyzer();
            return;
          }
        } else {
          console.warn(`[STT ERROR id=${recId}] Code: ${event.error}`);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setMicError("Microphone permission denied. Please allow microphone access in your browser.");
          }
        }

        isStartingRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
        stopAudioAnalyzer();
      };

      rec.onend = () => {
        console.log(`[STT END id=${recId}] Microphone session ended at ${new Date().toISOString()}`);
        isStartingRef.current = false;
        if (successResetTimerRef.current) {
          clearTimeout(successResetTimerRef.current);
        }

        // RESPECT MANUAL USER STOP: IF USER CLICKED STOP, STAY OFF COMPLETELY
        if (isManualStopRef.current) {
          console.log(`[STT MANUAL STOP CONFIRMED id=${recId}] Microphone stopped by user gesture. Staying turned off.`);
          isListeningRef.current = false;
          setIsListening(false);
          stopAudioAnalyzer();
          return;
        }

        if (!isSpeakingRef.current && autoListenAfterSpeechRef.current) {
          consecutiveAbortsRef.current += 1;
          const attempt = consecutiveAbortsRef.current;

          if (attempt >= 5) {
            console.error(`[STT CIRCUIT BREAKER TRIPPED id=${recId}] ${attempt} consecutive speech recognition aborts detected. Halting auto-recovery to protect browser performance.`);
            setMicError("Speech recognition paused due to repeated browser errors. Tap microphone button to retry.");
            isListeningRef.current = false;
            setIsListening(false);
            stopAudioAnalyzer();
            return;
          }

          const backoffDelay = Math.min(5000, Math.round(1000 * Math.pow(1.5, attempt - 1)));
          console.log(`[STT EXPONENTIAL BACKOFF id=${recId}] Attempt ${attempt}/5. Scheduling recovery in ${backoffDelay}ms...`);

          isListeningRef.current = false;
          setIsListening(false);
          
          setTimeout(() => {
            if (!isManualStopRef.current && !isSpeakingRef.current && !isListeningRef.current && !isStartingRef.current) {
              console.log(`[STT AUTO-RECOVER id=${recId}] Executing recovery attempt ${attempt}/5 after ${backoffDelay}ms delay with FRESH instance.`);
              try {
                stopAudioAnalyzer();
                isStartingRef.current = true;
                const freshInstance = createFreshRecognition();
                if (freshInstance) {
                  freshInstance.start();
                }
              } catch (e) {
                isStartingRef.current = false;
              }
            }
          }, backoffDelay);
        } else {
          isListeningRef.current = false;
          setIsListening(false);
          stopAudioAnalyzer();
        }
      };

      recognitionRef.current = rec;
      return rec;
    } catch (e: any) {
      console.warn("Failed to initialize Speech Recognition:", e);
      setSpeechSupported(false);
      return null;
    }
  }, [destroyCurrentRecognition, resetTranscript, stopAudioAnalyzer]);

  const getOrCreateRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    return createFreshRecognition();
  }, [createFreshRecognition]);

  // Eagerly instantiate recognition on mount & cleanup on unmount
  useEffect(() => {
    getOrCreateRecognition();
    return () => {
      stopAudioAnalyzer();
      destroyCurrentRecognition();
    };
  }, [destroyCurrentRecognition, getOrCreateRecognition, stopAudioAnalyzer]);

  // STRICT ONE-TIME SESSION PRIMING UNLOCK
  const unlockAudioForSafari = useCallback(() => {
    if (isAudioPrimedRef.current) return;
    isAudioPrimedRef.current = true;

    try {
      if (typeof window !== "undefined") {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtxClass();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().then(() => {
            console.log(`[AUDIO CONTEXT STATE] AudioContext unlocked state: ${audioCtxRef.current?.state}`);
          });
        }
      }

      if (ttsAudioRef.current) {
        ttsAudioRef.current.muted = false;
        ttsAudioRef.current.volume = 1.0;
        ttsAudioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        ttsAudioRef.current.load();
        ttsAudioRef.current.play().then(() => {
          console.log("[TTS AUDIO PRIMED SUCCESS] ttsAudioRef unlocked permanently on user gesture.");
        }).catch((e) => {
          console.warn("[TTS AUDIO PRIMING NOTICE]", e);
        });
      }

      if (primingAudioRef.current) {
        primingAudioRef.current.muted = false;
        primingAudioRef.current.volume = 1.0;
        primingAudioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        primingAudioRef.current.load();
        primingAudioRef.current.play().catch(() => {});
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
        const silent = new SpeechSynthesisUtterance("");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
        console.log("[SPEECH SYNTHESIS PRIMED] Throwaway silent utterance spoken to unlock browser SpeechSynthesis.");
      }
    } catch (e) {}
  }, []);

  const startListening = () => {
    // RESET MANUAL STOP FLAG WHEN USER EXPLICITLY INVOKES START
    isManualStopRef.current = false;

    if (consecutiveAbortsRef.current >= 5 || micError) {
      console.log(`[STT MANUAL RETRY RESET id=${recognitionIdRef.current}] User initiated manual retry. Resetting consecutive abort count from ${consecutiveAbortsRef.current} to 0.`);
      consecutiveAbortsRef.current = 0;
      setMicError(null);
    }

    console.log(`[FLAG CHECK id=${recognitionIdRef.current}] startListening checking isSpeakingRef=${isSpeakingRef.current}, isListeningRef=${isListeningRef.current}, isStartingRef=${isStartingRef.current} at ${new Date().toISOString()}`);

    if (isSpeakingRef.current || isListeningRef.current || isStartingRef.current) {
      console.log(`[STT START BLOCKED id=${recognitionIdRef.current}] startListening aborted because isSpeakingRef=${isSpeakingRef.current}, isListeningRef=${isListeningRef.current}, isStartingRef=${isStartingRef.current}`);
      return;
    }

    stopAudioAnalyzer();
    stopSpeaking();
    resetTranscript();

    setMicError(null);

    const rec = createFreshRecognition();

    if (!rec) {
      console.error(`[STT FATAL ERROR] SpeechRecognition instance is NULL. Browser does not support speech recognition.`);
      setMicError("Speech recognition is unavailable in this browser. Please use text input.");
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    try {
      isStartingRef.current = true;
      console.log(`[STT INVOKING START id=${recognitionIdRef.current}] Executing fresh recognition.start() at ${new Date().toISOString()}`);
      rec.start();
    } catch (e: any) {
      isStartingRef.current = false;
      console.error(`[STT START EXCEPTION id=${recognitionIdRef.current}] ${e?.name || e}: ${e?.message || e}`);
      
      if (e?.name === "InvalidStateError" || String(e).includes("already started")) {
        console.log(`[STT RE-SYNC id=${recognitionIdRef.current}] SpeechRecognition in busy state. Resetting recognition state and re-attempting in 150ms...`);
        try { rec.abort(); } catch (ign) {}
        setTimeout(() => {
          if (!isManualStopRef.current && !isSpeakingRef.current && !isListeningRef.current) {
            try {
              stopAudioAnalyzer();
              isStartingRef.current = true;
              console.log(`[STT RE-TRY START id=${recognitionIdRef.current}] Executing retry recognition.start() with fresh instance`);
              const retryInstance = createFreshRecognition();
              if (retryInstance) retryInstance.start();
            } catch (retryErr) {
              isStartingRef.current = false;
              console.error(`[STT RETRY START EXCEPTION id=${recognitionIdRef.current}]`, retryErr);
            }
          }
        }, 150);
      }
    }
  };

  const stopListening = () => {
    console.log("[STT USER STOP COMMAND] Manual stop requested by user. Disabling microphone and locking auto-restart.");
    isManualStopRef.current = true;
    isListeningRef.current = false;
    isStartingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    setIsListening(false);
    stopAudioAnalyzer();
  };

  const stopSpeaking = () => {
    if (playbackCheckIntervalRef.current) {
      clearInterval(playbackCheckIntervalRef.current);
      playbackCheckIntervalRef.current = null;
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.onplay = null;
      ttsAudioRef.current.onended = null;
      ttsAudioRef.current.onerror = null;
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }

    if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    updateIsSpeaking(false, "stopSpeaking called");
  };

  // High Quality Text-To-Speech Execution
  const speakText = async (text: string, onEndedCallback?: () => void): Promise<void> => {
    if (!text.trim()) return;

    // Do NOT invoke full stopListening if user explicitly clicked stop, just pause recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    stopSpeaking();

    updateIsSpeaking(true, "speakText requested");

    onEndedCallbackRef.current = onEndedCallback || null;
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\[.*?\]/g, "").trim();
    const fetchStartTime = Date.now();
    console.log(`[TTS START] Requesting synthesis for: "${cleanText.slice(0, 60)}..." at ${new Date().toISOString()}`);

    let completedHandled = false;
    const handleSpeechComplete = (sourceLabel: string) => {
      if (completedHandled) return;
      completedHandled = true;

      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }

      updateIsSpeaking(false, `handleSpeechComplete from ${sourceLabel}`);
      console.log(`[TTS COMPLETE] Speech output completed in ${Date.now() - fetchStartTime}ms (Source: ${sourceLabel})`);

      consecutiveAbortsRef.current = 0;

      if (onEndedCallbackRef.current) {
        const cb = onEndedCallbackRef.current;
        onEndedCallbackRef.current = null;
        cb();
      } else if (autoListenAfterSpeechRef.current && !isManualStopRef.current) {
        console.log(`[TTS -> STT] Re-enabling microphone automatically after speech.`);
        startListening();
      } else if (isManualStopRef.current) {
        console.log(`[TTS -> STT SUPPRESSED] User manually stopped listening. Microphone will stay off.`);
      }
    };

    try {
      let res: Response;
      try {
        res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText })
        });
      } catch (e) {
        res = await fetch("http://localhost:4000/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText })
        });
      }

      const fetchDoneTime = Date.now();
      const data = await res.json();
      console.log(`[TTS PAYLOAD RECEIVED] Base64 audio payload received in ${fetchDoneTime - fetchStartTime}ms`);

      if (data.success && data.audioBase64) {
        const speakerName = data.speaker || (data.engine === "edge-tts" ? "Neerja (Neural Edge TTS)" : "Ritu (Sarvam AI)");
        const format = data.format || "audio/mp3";
        setActiveSpeaker(speakerName);

        if (!ttsAudioRef.current) {
          ttsAudioRef.current = new Audio();
        }
        const audio = ttsAudioRef.current;

        audio.muted = false;
        audio.volume = 1.0;

        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }

        audio.src = `data:${format};base64,${data.audioBase64}`;
        audio.load();

        audio.onplay = () => {
          updateIsSpeaking(true, "audio.onplay event fired");
          const playStartTime = Date.now();
          console.log(`[TTS PLAYBACK STARTED] Audio playing via ${speakerName}. Delay from fetch response: ${playStartTime - fetchDoneTime}ms, Total pipeline: ${playStartTime - fetchStartTime}ms`);
        };

        audio.onended = () => {
          console.log(`[TTS AUDIO REAL ENDED EVENT] HTMLAudioElement fired ended event at currentTime=${audio.currentTime.toFixed(2)}s / duration=${audio.duration.toFixed(2)}s`);
          handleSpeechComplete("HTMLAudioElement.onended");
        };

        audio.onerror = (e) => {
          console.warn("[TTS AUDIO ERROR] Playback error, falling back:", e);
          handleSpeechComplete("HTMLAudioElement.onerror");
        };

        try {
          await audio.play();

          console.log(`[TTS VERIFY REALITY] paused: ${audio.paused}, muted: ${audio.muted}, volume: ${audio.volume}, currentTime: ${audio.currentTime.toFixed(2)}s, duration: ${audio.duration.toFixed(2)}s`);

          let lastTime = -1;
          let stalledCount = 0;

          if (playbackCheckIntervalRef.current) {
            clearInterval(playbackCheckIntervalRef.current);
          }

          playbackCheckIntervalRef.current = setInterval(() => {
            if (!audio || audio.ended || audio.paused) return;

            const curr = audio.currentTime;

            if (curr === lastTime && curr < (audio.duration || 100)) {
              stalledCount++;
              if (stalledCount >= 3) {
                console.error(`[TTS SILENT PLAYBACK DETECTED] currentTime is stuck at ${curr.toFixed(2)}s for 1.5s! Triggering fallback...`);
                clearInterval(playbackCheckIntervalRef.current);
                playbackCheckIntervalRef.current = null;
                audio.pause();
                handleSpeechComplete("500ms stalled detector");
              }
            } else {
              stalledCount = 0;
            }
            lastTime = curr;
          }, 500);

          return;
        } catch (playError: any) {
          console.warn("[TTS PLAY PROMISE REJECTED] Replay error:", playError);
        }
      } else {
        console.warn(`[TTS NOTICE] Server returned fallback signal: ${data.message || data.error}`);
      }
    } catch (e) {
      console.warn("[TTS API NOTICE] Exception during server TTS call:", e);
    }

    // Client-Side Speech Synthesis Fallback
    if (!("speechSynthesis" in window)) {
      handleSpeechComplete("speechSynthesis not available");
      return;
    }

    setActiveSpeaker("Ritu (Client Female Profile)");
    console.warn(`[TTS FALLBACK NOTICE] Switched to client-side speech synthesis fallback.`);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtteranceRef.current = utterance;
    utterance.rate = 1.0;
    utterance.pitch = 1.25;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoices = voices.filter(v => {
      const name = v.name.toLowerCase();
      return !name.includes("rishi") && !name.includes("male") && !name.includes("alex") && !name.includes("daniel") && !name.includes("fred") && !name.includes("george") && !name.includes("oliver");
    });

    let rituVoice = femaleVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes("veena") || name.includes("heera") || name.includes("ritu") || name.includes("sangeeta") || name.includes("kalpana");
    });

    if (!rituVoice) {
      rituVoice = femaleVoices.find(v => (v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.lang.includes("en_IN")));
    }

    if (!rituVoice) {
      rituVoice = femaleVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes("samantha") || name.includes("victoria") || name.includes("karen") || name.includes("female") || name.includes("zaria");
      });
    }

    if (!rituVoice && femaleVoices.length > 0) {
      rituVoice = femaleVoices[0];
    }

    if (rituVoice) {
      utterance.voice = rituVoice;
    }

    utterance.onstart = () => updateIsSpeaking(true, "SpeechSynthesisUtterance.onstart");
    utterance.onend = () => handleSpeechComplete("SpeechSynthesisUtterance.onend");
    utterance.onerror = () => handleSpeechComplete("SpeechSynthesisUtterance.onerror");

    window.speechSynthesis.speak(utterance);
  };

  return {
    isListening,
    transcript,
    setTranscript,
    resetTranscript,
    audioVolume,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    speechSupported,
    micError,
    activeSpeaker,
    autoListenAfterSpeech,
    setAutoListenAfterSpeech,
    unlockAudioForSafari
  };
}
