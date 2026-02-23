import { useState } from "react"
import { motion, AnimatePresence }
  from "framer-motion"
import {
  Mic,
  Volume2,
  X
} from "lucide-react"

export default function VoiceAgentPopup({
  isOpen,
  onClose
}) {

  const [listening, setListening] =
    useState(false)

  const [text, setText] = useState("")
  const [reply, setReply] = useState("")

  /* 🎤 Speech Recognition */

const startListening = () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.start();
  setListening(true);

  recognition.onresult = async (e) => {
    try {
      const transcript = e.results[0][0].transcript;
      setText(transcript);

      // 🔥 FIXED BACKEND URL
      const res = await fetch(
        "http://localhost:8000/api/v1/voice/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: transcript,
          }),
        }
      );

      const data = await res.json();

      if (data.reply) {
        setReply(data.reply);
        speak(data.reply);
      } else {
        setReply("No response from AI");
      }

    } catch (error) {
      setReply("Voice agent error");
      console.error(error);
    }

    setListening(false);
  };

  recognition.onerror = () => {
    setListening(false);
  };

  recognition.onend = () => {
    setListening(false);
  };
};
  /* 🔊 Text → Speech */

const speak = (msg) => {
  if (!window.speechSynthesis) return;

  const speech = new SpeechSynthesisUtterance(msg);
  speech.lang = "en-IN";
  speech.rate = 1;

  window.speechSynthesis.cancel(); // stop previous
  window.speechSynthesis.speak(speech);
};

  if (!isOpen) return null

  return (

    <AnimatePresence>

      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >

        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.7 }}
          className="bg-white w-[420px] rounded-2xl p-6 shadow-xl"
        >

          {/* Header */}

          <div className="flex justify-between mb-4">

            <h2 className="font-bold">
              🎤 AI Voice Pharmacist
            </h2>

            <X
              onClick={onClose}
              className="cursor-pointer"
            />

          </div>

          {/* Mic Button */}

          <div className="flex flex-col items-center gap-4">

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={!listening ? startListening : null}
              className={`h-20 w-20 rounded-full flex items-center justify-center text-white shadow-lg
              ${
              listening
              ? "bg-red-500"
              : "bg-gradient-to-r from-cyan-500 to-blue-600"
              }`}
              >
            <Mic size={32} />
            </motion.button>

            <p className="text-sm text-gray-500">
              {listening
                ? "Listening..."
                : "Tap to Speak"}
            </p>

          </div>

          {/* User Text */}

          {text && (
            <div className="mt-6 bg-gray-50 p-3 rounded-xl">
              <p className="text-sm font-medium">
                You: {text}
              </p>
            </div>
          )}

          {/* AI Reply */}

          {reply && (
            <div className="mt-4 bg-blue-50 p-3 rounded-xl flex gap-2">

              <Volume2 size={18} />

              <p className="text-sm">
                {reply}
              </p>

            </div>
          )}

        </motion.div>

      </motion.div>

    </AnimatePresence>
  )
}