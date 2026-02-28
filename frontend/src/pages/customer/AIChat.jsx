import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Square,
  MessageSquare,
  Headphones,
  PenLine,
  Settings,
  X,
  Check,
} from "lucide-react";
import { customerService } from "../../api/customerService";
import { useCart } from "../../context/CartContext";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import MiniCartPopup from "./MiniCartPopup";

// ==================== CONSTANTS ====================
const CHAT_MODES = {
  TEXT: "text",
  VOICE_TO_VOICE: "v2v",
  DICTATION: "dictation",
};

// ==================== UTILITIES ====================
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ==================== MAIN COMPONENT ====================
export default function AIChat() {
  const { cart, addToCart } = useCart();
  
  // ==================== REFS ====================
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const inputRef = useRef(null);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // CRITICAL: Use ref to track Alexa mode for async callbacks
  const isAlexaModeActiveRef = useRef(false);
  const isRecordingRef = useRef(false);
  const shouldContinueListeningRef = useRef(false);

  // ==================== STATE ====================
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [chatMode, setChatMode] = useState(CHAT_MODES.TEXT);
  const [voiceState, setVoiceState] = useState("idle"); // idle, listening, processing, speaking
  const [isAlexaModeActive, setIsAlexaModeActive] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: `Hello! 👋 I'm your AI Pharmacist Assistant.

🎤 **Voice Commands:**
• "Add 10 Paracetamol to cart"
• "I have a headache"
• "Price of Ibuprofen"

🎧 **Alexa Mode** - Hands-free conversation

What can I help you with today?`,
      suggestions: ["I have a fever", "Add Paracetamol to cart", "Browse medicines"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // ==================== EFFECTS ====================
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, []);

  // Handle auto-add to cart
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      lastMsg?.data?.action === "ADD_TO_CART" &&
      lastMsg?.data?.auto_add &&
      lastMsg?.data?.medicine
    ) {
      handleAutoAddToCart(lastMsg.data.medicine, lastMsg.data.quantity || 1);
    }
  }, [messages]);

  // ==================== CLEANUP FUNCTIONS ====================
  
  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn("MediaRecorder stop error:", e);
      }
      mediaRecorderRef.current = null;
    }
    isRecordingRef.current = false;
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  const stopAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const fullCleanup = useCallback(() => {
    // Set refs first
    isAlexaModeActiveRef.current = false;
    isRecordingRef.current = false;
    shouldContinueListeningRef.current = false;
    
    clearTimers();
    stopMediaRecorder();
    stopStream();
    stopAudioContext();
    stopAudioPlayback();
    
    setAudioLevel(0);
    setRecordingDuration(0);
  }, [clearTimers, stopMediaRecorder, stopStream, stopAudioContext, stopAudioPlayback]);

  // ==================== CART ====================
  
  const handleAutoAddToCart = async (medicine, quantity) => {
    try {
      const result = await addToCart(medicine.id, quantity);
      if (result.success) {
        toast.success(`Added ${quantity}× ${medicine.name} to cart!`, { duration: 2000 });
      }
    } catch (error) {
      console.error("Auto add failed:", error);
    }
  };

  const handleAddToCart = async (medicine) => {
    const result = await addToCart(medicine.id, 1);
    if (!result.success) {
      toast.error("Failed to add");
    }
  };

  // ==================== TEXT CHAT ====================
  
  const sendMessage = async (text = input, isVoice = false) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      isVoice,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await customerService.sendChatMessage(text.trim(), sessionId);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        data: response.data,
        suggestions: response.suggestions,
        intent: response.intent,
        requires_action: response.requires_action,
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (error) {
      toast.error("Failed to send message");
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        suggestions: ["Try again", "Browse medicines"],
      };
      setMessages(prev => [...prev, errorMsg]);
      return errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // ==================== VOICE RECORDING ====================
  
  const startRecording = async () => {
    // Prevent double starts
    if (isRecordingRef.current) {
      console.log("Already recording, ignoring start request");
      return;
    }

    try {
      // Clean up any existing resources
      stopStream();
      stopAudioContext();
      clearTimers();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
      
      streamRef.current = stream;
      isRecordingRef.current = true;

      // Audio visualization
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current && isRecordingRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(avg / 255);
            requestAnimationFrame(updateLevel);
          }
        };
        requestAnimationFrame(updateLevel);
      } catch (e) {
        console.warn("Audio visualization error:", e);
      }

      // Choose MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log("Recording stopped");
        isRecordingRef.current = false;
        
        // Stop stream
        stopStream();
        
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
        console.log("Audio blob size:", audioBlob.size);

        // Check if we should process or ignore
        if (!shouldContinueListeningRef.current && chatMode === CHAT_MODES.VOICE_TO_VOICE) {
          console.log("Alexa mode cancelled, not processing audio");
          setVoiceState("idle");
          return;
        }

        // Get format
        let format = "webm";
        if (selectedMimeType.includes("ogg")) format = "ogg";
        else if (selectedMimeType.includes("mp4")) format = "mp4";

        if (chatMode === CHAT_MODES.DICTATION) {
          await processDictation(audioBlob, format);
        } else {
          await processVoiceMessage(audioBlob, format);
        }
      };

      recorder.onerror = (e) => {
        console.error("Recorder error:", e);
        isRecordingRef.current = false;
        setVoiceState("idle");
      };

      // Start recording
      recorder.start(250);
      setVoiceState("listening");
      setRecordingDuration(0);

      // Duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log("Recording started with:", selectedMimeType);

    } catch (error) {
      console.error("Failed to start recording:", error);
      isRecordingRef.current = false;
      setVoiceState("idle");
      
      if (error.name === "NotAllowedError") {
        toast.error("Microphone access denied");
      } else if (error.name === "NotFoundError") {
        toast.error("No microphone found");
      } else {
        toast.error("Microphone error");
      }
    }
  };

  const stopRecording = useCallback(() => {
    console.log("Stop recording called");
    
    clearTimers();
    setAudioLevel(0);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Stop error:", e);
      }
    }
  }, [clearTimers]);

  // ==================== DICTATION MODE ====================
  
  const processDictation = async (audioBlob, format) => {
    if (audioBlob.size < 1000) {
      toast.error("Recording too short");
      setVoiceState("idle");
      return;
    }

    setVoiceState("processing");

    try {
      const dataUrl = await blobToBase64(audioBlob);

      const response = await customerService.sendVoiceMessage(dataUrl, sessionId, {
        audioFormat: format,
        returnAudio: false,
        voiceType: "female_indian",
      });

      if (response.transcribed_text) {
        setInput(response.transcribed_text);
        toast.success("Transcribed! Edit and send.");
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        toast.error("Could not transcribe");
      }
    } catch (error) {
      console.error("Dictation error:", error);
      toast.error("Transcription failed");
    } finally {
      setVoiceState("idle");
    }
  };

  // ==================== VOICE TO VOICE ====================
  
  const processVoiceMessage = async (audioBlob, format) => {
    if (audioBlob.size < 1000) {
      toast.error("Recording too short");
      setVoiceState("idle");
      
      // Restart if still in Alexa mode
      if (isAlexaModeActiveRef.current) {
        setTimeout(() => {
          if (isAlexaModeActiveRef.current) {
            startRecording();
          }
        }, 1000);
      }
      return;
    }

    setVoiceState("processing");

    const processingId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      { id: processingId, role: "user", content: "🎤 Processing...", isProcessing: true },
    ]);

    try {
      const dataUrl = await blobToBase64(audioBlob);

      const response = await customerService.sendVoiceMessage(dataUrl, sessionId, {
        audioFormat: format,
        returnAudio: voiceEnabled,
        voiceType: "female_indian",
      });

      // Remove processing message
      setMessages(prev => prev.filter(m => m.id !== processingId));

      if (!response.success) {
        throw new Error(response.message || "Failed");
      }

      // Add user message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: response.transcribed_text || "[Voice message]",
          isVoice: true,
          confidence: response.transcription_confidence,
        },
      ]);

      // Add assistant message
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        voiceMessage: response.voice_message,
        data: response.data,
        suggestions: response.suggestions,
        intent: response.intent,
        hasAudio: !!response.audio_base64,
        audioBase64: response.audio_base64,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Play audio response
      if (response.audio_base64 && voiceEnabled) {
        setVoiceState("speaking");
        await playAudio(response.audio_base64);
      }

      // Continue listening in Alexa mode - CHECK REF
      if (isAlexaModeActiveRef.current) {
        setTimeout(() => {
          if (isAlexaModeActiveRef.current) {
            startRecording();
          } else {
            setVoiceState("idle");
          }
        }, 500);
      } else {
        setVoiceState("idle");
      }

    } catch (error) {
      console.error("Voice processing error:", error);
      
      setMessages(prev => prev.filter(m => m.id !== processingId));
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
          suggestions: ["Try again"],
        },
      ]);
      
      toast.error("Voice processing failed");
      setVoiceState("idle");

      // Restart in Alexa mode
      if (isAlexaModeActiveRef.current) {
        setTimeout(() => {
          if (isAlexaModeActiveRef.current) {
            startRecording();
          }
        }, 2000);
      }
    }
  };

  // ==================== AUDIO PLAYBACK ====================
  
  const playAudio = (audioBase64) => {
    return new Promise((resolve) => {
      try {
        stopAudioPlayback();
        
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        currentAudioRef.current = audio;

        audio.onended = () => {
          currentAudioRef.current = null;
          setVoiceState("idle");
          resolve();
        };

        audio.onerror = () => {
          currentAudioRef.current = null;
          setVoiceState("idle");
          resolve();
        };

        audio.play().catch(() => {
          setVoiceState("idle");
          resolve();
        });
      } catch (e) {
        setVoiceState("idle");
        resolve();
      }
    });
  };

  // ==================== ALEXA MODE CONTROLS ====================
  
  const startAlexaMode = () => {
    console.log("Starting Alexa Mode");
    
    // Set refs FIRST
    isAlexaModeActiveRef.current = true;
    shouldContinueListeningRef.current = true;
    
    // Then set state
    setChatMode(CHAT_MODES.VOICE_TO_VOICE);
    setIsAlexaModeActive(true);
    
    toast.success("🎧 Alexa Mode ON!");
    
    // Start recording after a short delay
    setTimeout(() => {
      if (isAlexaModeActiveRef.current) {
        startRecording();
      }
    }, 300);
  };

  const stopAlexaMode = () => {
    console.log("Stopping Alexa Mode");
    
    // Set refs FIRST to prevent any callbacks from restarting
    isAlexaModeActiveRef.current = false;
    shouldContinueListeningRef.current = false;
    
    // Stop all ongoing operations
    clearTimers();
    stopAudioPlayback();
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    
    // Stop stream
    stopStream();
    stopAudioContext();
    
    // Reset state
    setIsAlexaModeActive(false);
    setVoiceState("idle");
    setChatMode(CHAT_MODES.TEXT);
    setAudioLevel(0);
    setRecordingDuration(0);
    
    toast.success("Alexa Mode OFF");
  };

  // ==================== MODE SWITCHING ====================
  
  const switchMode = (mode) => {
    // Stop everything first
    isAlexaModeActiveRef.current = false;
    shouldContinueListeningRef.current = false;
    fullCleanup();
    
    setVoiceState("idle");
    setIsAlexaModeActive(false);
    setShowModeSelector(false);

    if (mode === CHAT_MODES.VOICE_TO_VOICE) {
      setChatMode(mode);
      startAlexaMode();
    } else {
      setChatMode(mode);
      const names = { [CHAT_MODES.TEXT]: "Text Mode", [CHAT_MODES.DICTATION]: "Dictation Mode" };
      toast.success(names[mode]);
    }
  };

  // ==================== UI HELPERS ====================
  
  const handleSuggestionClick = (s) => sendMessage(s);
  
  const clearChat = () => {
    setMessages([messages[0]]);
    toast.success("Chat cleared");
  };
  
  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const renderContent = (msg) => {
    let c = msg.content;
    c = c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    c = c.replace(/\n/g, "<br/>");
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: c }} />;
  };

  const getModeColor = () => {
    if (chatMode === CHAT_MODES.VOICE_TO_VOICE) return "from-green-500 to-emerald-600";
    if (chatMode === CHAT_MODES.DICTATION) return "from-orange-500 to-amber-600";
    return "from-purple-600 to-pink-500";
  };

  // ==================== RENDER ====================
  
  return (
    <div className="h-[calc(100vh-93px)] flex flex-col bg-gray-50 rounded-2xl overflow-hidden border shadow-lg relative">
      
      {/* ==================== HEADER ==================== */}
      <div className={`bg-gradient-to-r ${getModeColor()} text-white px-6 py-4 z-10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {isAlexaModeActive ? <Headphones size={24} /> : <Bot size={24} />}
            </div>
            <div>
              <h1 className="font-bold flex items-center gap-2">
                AI Pharmacist
                {isAlexaModeActive && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full animate-pulse">
                    ALEXA MODE
                  </span>
                )}
              </h1>
              <p className="text-xs opacity-80">
                {chatMode === CHAT_MODES.TEXT && "Text Mode"}
                {chatMode === CHAT_MODES.VOICE_TO_VOICE && "Voice-to-Voice"}
                {chatMode === CHAT_MODES.DICTATION && "Dictation Mode"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <div className="relative">
              <button onClick={() => setShowModeSelector(!showModeSelector)} className="p-2 hover:bg-white/10 rounded-lg">
                <Settings size={18} />
              </button>

              <AnimatePresence>
                {showModeSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border z-50 w-56"
                  >
                    <div className="p-2 space-y-1">
                      {[
                        { mode: CHAT_MODES.TEXT, icon: MessageSquare, label: "Text Mode", sub: "Type messages" },
                        { mode: CHAT_MODES.VOICE_TO_VOICE, icon: Headphones, label: "Alexa Mode", sub: "Hands-free" },
                        { mode: CHAT_MODES.DICTATION, icon: PenLine, label: "Dictation", sub: "Speak & edit" },
                      ].map(({ mode, icon: Icon, label, sub }) => (
                        <button
                          key={mode}
                          onClick={() => switchMode(mode)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                            chatMode === mode ? "bg-purple-100 text-purple-700" : "hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <Icon size={18} />
                          <div className="text-left">
                            <div className="font-medium text-sm">{label}</div>
                            <div className="text-xs text-gray-500">{sub}</div>
                          </div>
                          {chatMode === mode && <Check size={14} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 rounded-lg ${voiceEnabled ? "bg-white/20" : "opacity-50"}`}>
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowCartPopup(!showCartPopup)} className="p-2 hover:bg-white/10 rounded-lg">
                <ShoppingCart size={18} />
              </button>
              {cart?.items?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {cart.items.length}
                </span>
              )}
            </div>

            <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <MiniCartPopup isOpen={showCartPopup} onClose={() => setShowCartPopup(false)} />

      {/* ==================== ALEXA MODE OVERLAY ==================== */}
      {isAlexaModeActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{
            background:
              voiceState === "listening" ? "linear-gradient(135deg, #22c55e, #16a34a)" :
              voiceState === "processing" ? "linear-gradient(135deg, #eab308, #ca8a04)" :
              voiceState === "speaking" ? "linear-gradient(135deg, #3b82f6, #2563eb)" :
              "linear-gradient(135deg, #22c55e, #16a34a)",
          }}
        >
          <div className="text-center text-white px-8">
            {/* Animated Circle */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/30"
                animate={{ scale: voiceState === "listening" ? [1, 1.2 + audioLevel * 0.5, 1] : 1 }}
                transition={{ duration: 0.5, repeat: voiceState === "listening" ? Infinity : 0 }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border-4 border-white/50"
                animate={{ scale: voiceState === "listening" ? [1, 1.1 + audioLevel * 0.3, 1] : 1 }}
                transition={{ duration: 0.5, repeat: voiceState === "listening" ? Infinity : 0, delay: 0.1 }}
              />
              <div className="absolute inset-10 rounded-full bg-white/20 flex items-center justify-center">
                {voiceState === "listening" && <Mic size={48} />}
                {voiceState === "processing" && <Loader2 size={48} className="animate-spin" />}
                {voiceState === "speaking" && <Volume2 size={48} className="animate-pulse" />}
                {voiceState === "idle" && <Mic size={48} />}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {voiceState === "listening" && "Listening..."}
              {voiceState === "processing" && "Processing..."}
              {voiceState === "speaking" && "Speaking..."}
              {voiceState === "idle" && "Ready"}
            </h2>

            <p className="text-white/80 mb-6">
              {voiceState === "listening" && formatDuration(recordingDuration)}
              {voiceState === "processing" && "Understanding your request"}
              {voiceState === "speaking" && "Playing response"}
              {voiceState === "idle" && "Tap to speak"}
            </p>

            <div className="flex justify-center gap-4">
              {voiceState === "listening" && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-white text-green-600 rounded-full font-medium flex items-center gap-2"
                >
                  <Check size={20} />
                  Done
                </button>
              )}

              {voiceState === "speaking" && (
                <button
                  onClick={stopAudioPlayback}
                  className="px-6 py-3 bg-white text-blue-600 rounded-full font-medium flex items-center gap-2"
                >
                  <Square size={20} />
                  Skip
                </button>
              )}

              {voiceState === "idle" && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-white text-green-600 rounded-full font-medium flex items-center gap-2"
                >
                  <Mic size={20} />
                  Speak
                </button>
              )}

              <button
                onClick={stopAlexaMode}
                className="px-6 py-3 bg-white/20 text-white rounded-full font-medium flex items-center gap-2"
              >
                <X size={20} />
                Exit
              </button>
            </div>

            {/* Last message preview */}
            {messages.length > 1 && (
              <div className="mt-8 max-w-md mx-auto">
                <div className="bg-white/10 rounded-xl p-4 text-left">
                  <p className="text-xs text-white/60 mb-1">Last response:</p>
                  <p className="text-white text-sm line-clamp-3">
                    {messages[messages.length - 1].content.substring(0, 150)}...
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ==================== MESSAGES ==================== */}
      {!isAlexaModeActive && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-blue-600 text-white" : `bg-gradient-to-r ${getModeColor()} text-white`
                  }`}>
                    {msg.role === "user" ? (msg.isVoice ? <Mic size={16} /> : <User size={16} />) : <Bot size={16} />}
                  </div>

                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border shadow-sm"
                  } ${msg.isProcessing ? "animate-pulse" : ""}`}>
                    
                    {msg.isVoice && msg.role === "user" && (
                      <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                        <Mic size={12} />
                        <span>Voice</span>
                      </div>
                    )}

                    {renderContent(msg)}

                    {msg.hasAudio && msg.audioBase64 && (
                      <button
                        onClick={() => playAudio(msg.audioBase64)}
                        className="mt-2 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800"
                      >
                        <Volume2 size={14} />
                        <span>Play</span>
                      </button>
                    )}

                    {msg.data?.medicine && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-gray-800">{msg.data.medicine.name}</h4>
                            <p className="text-sm text-gray-600">{msg.data.medicine.brand}</p>
                            <p className="text-lg font-bold text-blue-600 mt-2">
                              ₹{msg.data.medicine.price}
                              {msg.data.quantity > 1 && (
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                  × {msg.data.quantity} = ₹{msg.data.total_price}
                                </span>
                              )}
                            </p>
                          </div>
                          {msg.data.auto_add ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <Check size={20} />
                              <span className="text-sm font-medium">Added!</span>
                            </div>
                          ) : msg.data.medicine.in_stock && (
                            <button
                              onClick={() => handleAddToCart(msg.data.medicine)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Add
                            </button>
                          )}
                        </div>

                        {msg.data.safety?.warnings?.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-1">
                              <AlertTriangle size={16} />
                              Warnings
                            </div>
                            <ul className="text-xs text-yellow-700">
                              {msg.data.safety.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.suggestions?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getModeColor()} flex items-center justify-center text-white`}>
                <Bot size={16} />
              </div>
              <div className="bg-white border shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ==================== INPUT AREA ==================== */}
      {!isAlexaModeActive && (
        <div className="p-4 bg-white border-t">
          {/* Recording/Processing Indicators */}
          {voiceState === "listening" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center justify-center gap-3 py-2 px-4 bg-red-50 rounded-xl border border-red-200"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-medium">Recording...</span>
              <span className="text-red-500 font-mono">{formatDuration(recordingDuration)}</span>
              <button
                onClick={stopRecording}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Check size={14} />
                Done
              </button>
            </motion.div>
          )}

          {voiceState === "processing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center justify-center gap-3 py-2 px-4 bg-yellow-50 rounded-xl border border-yellow-200"
            >
              <Loader2 size={16} className="text-yellow-600 animate-spin" />
              <span className="text-yellow-700 font-medium">Processing...</span>
            </motion.div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-3"
          >
            {/* Alexa Mode Button */}
            {chatMode === CHAT_MODES.TEXT && (
              <button
                type="button"
                onClick={startAlexaMode}
                className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:scale-105 transition"
                title="Start Alexa Mode"
              >
                <Headphones size={20} />
              </button>
            )}

            {/* Dictation Button */}
            {chatMode === CHAT_MODES.DICTATION && (
              <button
                type="button"
                onClick={() => {
                  if (voiceState === "listening") {
                    stopRecording();
                  } else if (voiceState === "idle") {
                    startRecording();
                  }
                }}
                disabled={voiceState === "processing"}
                className={`p-3 rounded-full transition ${
                  voiceState === "listening"
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:shadow-lg"
                }`}
              >
                {voiceState === "listening" ? <MicOff size={20} /> : 
                 voiceState === "processing" ? <Loader2 size={20} className="animate-spin" /> : 
                 <Mic size={20} />}
              </button>
            )}

            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  chatMode === CHAT_MODES.DICTATION
                    ? "🎤 Click mic to dictate..."
                    : "Type your message..."
                }
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading || voiceState !== "idle"}
              />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || loading || voiceState !== "idle"}
              className={`p-3 bg-gradient-to-r ${getModeColor()} text-white rounded-full hover:shadow-lg transition disabled:opacity-50`}
            >
              <Send size={20} />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Sparkles size={12} />
            <span>
              {chatMode === CHAT_MODES.TEXT && "Click 🎧 for hands-free voice"}
              {chatMode === CHAT_MODES.DICTATION && "Speak → Edit → Send"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}