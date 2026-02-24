import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Plus
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function AIChat() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! 👋 I'm your AI Pharmacist Assistant.

I can help you with:
🩺 **Find medicines for symptoms** - "I have a headache"
💰 **Check prices** - "Price of Paracetamol"
🔍 **Search medicines** - "Do you have Amoxicillin?"
💊 **Medicine information** - "Side effects of Metformin"

What can I help you with today?`,
      suggestions: ['I have a fever', 'Price of Paracetamol', 'I need allergy medicine']
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await customerService.sendChatMessage(text.trim(), sessionId);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        data: response.data,
        suggestions: response.suggestions,
        intent: response.intent,
        requires_action: response.requires_action
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        suggestions: ['Try again', 'Browse medicines']
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (medicine) => {
    const result = await addToCart(medicine.id, 1);
    if (result.success) {
      toast.success(`${medicine.name} added to cart!`);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([messages[0]]);
    toast.success('Chat cleared');
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition failed');
    };

    recognition.start();
  };

  const renderMessageContent = (message) => {
    let content = message.content;
    
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    content = content.replace(/\n/g, '<br/>');

    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col bg-gray-50 rounded-2xl overflow-hidden border shadow-lg">
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="font-bold">AI Pharmacist</h1>
              <p className="text-xs opacity-80">Powered by GPT-4</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Clear chat"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                }`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                }`}>
                  {renderMessageContent(message)}

                  {message.data?.medicine && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800">{message.data.medicine.name}</h4>
                          <p className="text-sm text-gray-600">{message.data.medicine.brand}</p>
                          <p className="text-lg font-bold text-blue-600 mt-2">
                            ₹{message.data.medicine.price}
                          </p>
                        </div>
                        {message.data.medicine.in_stock && (
                          <button
                            onClick={() => handleAddToCart(message.data.medicine)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add to Cart
                          </button>
                        )}
                      </div>

                      {message.data.safety?.warnings?.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-1">
                            <AlertTriangle size={16} />
                            Warnings
                          </div>
                          <ul className="text-xs text-yellow-700 space-y-1">
                            {message.data.safety.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition"
                        >
                          {suggestion}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white border shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="text-sm text-gray-500">AI is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-3"
        >
          <button
            type="button"
            onClick={startListening}
            className={`p-3 rounded-full transition ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about medicines..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full hover:shadow-lg transition disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Sparkles size={12} />
          <span>AI-powered responses may not be medical advice</span>
        </div>
      </div>
    </div>
  );
}