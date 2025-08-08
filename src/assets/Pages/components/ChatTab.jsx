import { useState, useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import logo from "../../Images/logo.png";
import "./chat.css";
import { FaRobot } from "react-icons/fa6";
import { MdMultilineChart } from "react-icons/md";
import { MdEventAvailable } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";

const ChatTab = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Enhanced Markdown renderer component
  const MarkdownRenderer = ({ content }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Simplified code block handler
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return (
                <code
                  className="bg-gray-700 px-1 py-0.5 rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre className="bg-[#1A1A1AFF] rounded-lg text-sm p-4 my-3 overflow-x-auto">
                <p className="text-[#ACACACFF]">Code</p>
                <hr className="my-2 mb-5 text-[#3D3D3DFF]" />
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Other markdown components
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold my-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold my-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold my-2" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-2 whitespace-pre-wrap" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-500 pl-4 my-2 italic text-gray-300"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 my-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 my-2" {...props} />
          ),
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-xl">
              <table className="w-full" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="border-b border-[#424242] p-2 text-left"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-[#2C2C2C] p-2" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-[#424242]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        300
      )}px`;
    }
  }, [inputValue]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.some((msg) => msg.sender === "user")) {
      setHasUserSentMessage(true);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    const newUserMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
      isCode: inputValue.includes("```"),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsTyping(true);

    const newAIMessage = {
      id: Date.now() + 1,
      text: "",
      sender: "ai",
    };
    setMessages((prev) => [...prev, newAIMessage]);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: inputValue, id: newUserMessage.id }),
      });

      if (!response.ok) throw new Error("Network error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Clean and format the stream chunk
        const dataChunks = chunk
          .split("data: ")
          .filter(Boolean)
          .map((s) => s.trim());

        for (let chunkText of dataChunks) {
          try {
            const parsed = JSON.parse(chunkText);
            const tokenText = parsed.token?.text || "";
            if (tokenText && !tokenText.includes("\uFFFD")) {
              accumulatedText += tokenText;

              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === newAIMessage.id
                    ? { ...msg, text: accumulatedText }
                    : msg
                )
              );
            }
          } catch (err) {
            console.error("JSON parse error:", err, "for chunk:", chunkText);
          }
        }

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === newAIMessage.id ? { ...msg, text: accumulatedText } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: "Sorry, I'm having trouble connecting to the server.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        height: "95vh",
        background: "rgba(33, 33, 33, 1)",
        color: "rgba(243, 243, 243, 1)",
        width: "100%",
      }}
      className="flex flex-col rounded-3xl p-4 justify-center items-center"
    >
      {hasUserSentMessage && (
        <div
          style={{ borderBottom: "1px solid #424242" }}
          className=" w-[95%] p-4 flex justify-between"
        >
          <div className="text-center flex justify-center items-center">
            <h2
              id="alan"
              style={{ color: "#848484FF" }}
              className="text-3xl md:text-sm text-transparent"
            >
              Qwen3-4B-4bit
            </h2>
          </div>
          <div className="rounded-full flex items-start justify-center text-indigo-600">
            <img src={logo} className="h-6" alt="" />
          </div>
        </div>
      )}

      {/* Messages container */}
      <div
        style={{ overflowY: "scroll", width: "80%" }}
        className="flex-1 relative"
      >
        {!hasUserSentMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
            {/* Existing Welcome Message */}
            <div className="flex items-center justify-center gap-3">
              <h2
                style={{ fontWeight: 100 }}
                className="text-2xl font-light md:text-5xl"
              >
                Welcome to
              </h2>
              <div className="text-center flex justify-center items-center">
                <div className="w-full rounded-full flex items-start justify-center text-indigo-600">
                  <img src={logo} className="h-12" alt="" />
                </div>
                <h2
                  id="alan"
                  style={{ color: "#D9D9D9" }}
                  className="text-3xl md:text-5xl font-bold text-transparent"
                >
                  lan.ai
                </h2>
              </div>
            </div>

            {/* New Animated Info Containers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl px-4">
              {/* Container 1 - Fade In */}
              <div
                className="bg-[#212121] backdrop-blur-sm p-6 rounded-xl border border-[#424242] animate-fade-in opacity-0"
                style={{
                  animationDelay: "0.3s",
                  animationFillMode: "forwards",
                }}
              >
                <FaRobot className="text-3xl text-pink-400" />

                <h3 className="text-xl font-semibold my-2 text-white">
                  Smart AI Assistant
                </h3>

                <p className="text-[#EFEFEF] font-thin">
                  Powered by advanced language models to provide intelligent and
                  contextual responses.
                </p>
              </div>

              {/* Container 2 - Slide Up */}
              <div
                className="bg-[#212121] backdrop-blur-sm p-6 rounded-xl border border-[#424242] animate-slide-up opacity-0"
                style={{
                  animationDelay: "0.6s",
                  animationFillMode: "forwards",
                }}
              >
                <MdEventAvailable className="text-3xl text-blue-400" />
                <h3 className="text-xl font-semibold my-2 text-white">
                  24/7 Availability
                </h3>
                <p className="text-[#EFEFEF] font-thin">
                  Always ready to help with your questions, anytime you need
                  assistance.
                </p>
              </div>

              {/* Container 3 - Scale In */}
              <div
                className="bg-[#212121] backdrop-blur-sm p-6 rounded-xl border border-[#424242] animate-scale-in opacity-0"
                style={{
                  animationDelay: "0.9s",
                  animationFillMode: "forwards",
                }}
              >
                <div>
                  <MdMultilineChart className="text-3xl text-green-400" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Multi-Purpose
                  </h3>
                </div>
                <p className="text-[#EFEFEF] font-thin">
                  From coding help to creative writing, I can assist with
                  diverse topics.
                </p>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginBottom: "160px" }}>
          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex my-4 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  message.sender === "user"
                    ? "bg-[#303030] max-w-xs md:max-w-xs lg:max-w-2xl my-4 px-5 p-3"
                    : "w-full my-3"
                }`}
              >
                {message.sender === "user" ? (
                  message.isCode ? (
                    <pre className="whitespace-pre-wrap bg-gray-800 p-3 rounded-md overflow-x-auto">
                      <code>{message.text}</code>
                    </pre>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )
                ) : (
                  <div className="flex items-start">
                    <div className="mr-2 mt-2">
                      <div className="rounded-full flex items-start justify-center text-indigo-600">
                        <img src={logo} className="h-6" alt="" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <MarkdownRenderer content={message.text} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
      {/* Input area */}
      <div className="flex w-[80%] justify-center">
        <div className="w-full relative bottom-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message here..."
              className="w-full p-4 pr-12 rounded-3xl border border-[#3F3F3FFF] focus:outline-none focus:ring-1 focus:ring-[#828282FF] focus:border-transparent bg-[#303030] resize-none"
              disabled={isTyping}
              rows={1}
              style={{
                minHeight: "60px",
                maxHeight: "300px",
                overflowY: "auto",
                color: "rgba(243, 243, 243, 1)",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={isTyping || !inputValue.trim()}
              className={`absolute right-3 bottom-4 p-2 rounded-full ${
                inputValue.trim()
                  ? "bg-[rgba(243, 243, 243, 1)]"
                  : "text-gray-400"
              }`}
            >
              <FiSend className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
