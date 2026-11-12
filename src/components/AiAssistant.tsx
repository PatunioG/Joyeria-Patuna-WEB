import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Sparkles, Bot, User, Loader2, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hola, bienvenido a Joyería Patuna México. Soy Patuni, su asistente virtual. Le puedo ayudar de forma directa a consultar catálogo, precios o disponibilidad de nuestras joyas. Si hay algo que no pueda resolver al 100%, con gusto le facilitaré nuestro enlace de WhatsApp para hablar con un asesor.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Alert user with dot animation if a new message comes while closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages.length, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    setInput("");
    setIsLoading(true);

    const userMessage: Message = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      text: userMessageText,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Map messages list to payload structure required by server
      const payloadMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.text
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: payloadMessages })
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setMessages(prev => [
          ...prev,
          {
            id: "msg-" + Date.now() + "-assistant",
            role: "assistant",
            text: data.text,
            timestamp: new Date()
          }
        ]);
      } else {
        const errorMsg = data.error || "Disculpe la molestia, pero nuestro canal privado de comunicación no está disponible temporalmente.";
        setMessages(prev => [
          ...prev,
          {
            id: "msg-" + Date.now() + "-error",
            role: "assistant",
            text: `⚠️ ${errorMsg}`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      console.error("[AiAssistant Error]:", err);
      setMessages(prev => [
        ...prev,
        {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          text: "⚠️ Distinguido cliente, lamentamos informarle que ha ocurrido un error de conexión con nuestro servidor exclusivo. Por favor, compruebe su conexión e inténtelo de nuevo.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: "Hola de nuevo. ¿En qué le puedo ayudar hoy con nuestro catálogo o stock de Joyería Patuna México?",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] font-sans" id="ai-assistant-widget">
      {/* Floating Action Button */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNewMessage(false);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full bg-black border border-[#D4AF37]/50 shadow-2xl flex items-center justify-center cursor-pointer group overflow-hidden"
        style={{ boxShadow: "0 0 20px rgba(212,175,55,0.25)" }}
        aria-label="Abrir asistente de IA"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {isOpen ? (
          <X className="w-6 h-6 text-[#D4AF37] transition-transform duration-300 rotate-0" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
            <Sparkles className="w-3.5 h-3.5 text-white absolute -top-1 -right-1 animate-pulse" />
          </div>
        )}

        {/* Unread dot indicator */}
        {hasNewMessage && !isOpen && (
          <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#D4AF37]"></span>
          </span>
        )}
      </motion.button>

      {/* Expanded Chat Box Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-18 right-0 w-[350px] md:w-[400px] h-[550px] bg-[#080808] border border-[#D4AF37]/40 rounded-sm shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.85), 0 0 30px rgba(212,175,55,0.1)" }}
          >
            {/* Ambient gold top border gradient line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent w-full" />

            {/* Chat Header */}
            <div className="bg-[#0c0c0c] border-b border-neutral-900 px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center relative">
                  <Bot className="w-5 h-5 text-[#D4AF37]" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-[0.18em] font-bold text-white flex items-center gap-1.5">
                    Patuni <span className="text-[9px] px-1.5 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-full lowercase font-mono">ia</span>
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-serif italic">Asesor de Joyería MX</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Clear chat button */}
                <button
                  onClick={clearChat}
                  title="Reiniciar conversación"
                  className="p-1.5 text-neutral-500 hover:text-[#D4AF37] hover:bg-neutral-900 rounded-sm transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {/* Close window button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-sm transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* WhatsApp Direct Banner */}
            <div className="bg-[#121b15]/60 border-b border-emerald-950/80 px-4 py-2 flex items-center justify-between text-[11px]" id="whatsapp-support-banner">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ¿Desea atención directa?
              </span>
              <a
                href="https://wa.me/521"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:text-[#34eb74] font-bold flex items-center gap-1 hover:underline transition-colors font-mono"
              >
                WhatsApp MX
              </a>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-neutral-800">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                      isUser 
                        ? "bg-neutral-900 border-neutral-800 text-neutral-400" 
                        : "bg-[#0f0e0a] border-[#D4AF37]/20 text-[#D4AF37]"
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className="space-y-1">
                      <div className={`px-3.5 py-2.5 rounded-sm text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-neutral-200"
                          : "bg-neutral-950 border border-neutral-900 text-neutral-300"
                      }`}>
                        {m.text}
                      </div>
                      <span className={`block text-[9px] text-neutral-500 font-mono ${isUser ? "text-right" : "text-left"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Server-Side Generating Response State */}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-[#0f0e0a] border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center shrink-0 animate-spin">
                    <Loader2 className="w-4 h-4" />
                  </div>
                  <div className="bg-neutral-950 border border-neutral-900 px-3.5 py-2.5 rounded-sm flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-serif italic">Redactando consulta exclusiva</span>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce delay-75" />
                      <span className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce delay-150" />
                      <span className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce delay-300" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0c0c0c] border-t border-neutral-900 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Escriba su consulta de cortesía..."
                className="flex-grow bg-[#050505] border border-neutral-800 focus:border-[#D4AF37] rounded-sm px-3.5 py-2.5 text-xs text-white outline-none placeholder-neutral-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 bg-[#D4AF37] text-black hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-500 rounded-sm transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                title="Enviar mensaje"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
