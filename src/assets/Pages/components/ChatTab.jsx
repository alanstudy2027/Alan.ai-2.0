import { useState, useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import logo from "../../Images/logo.png";
import "./chat.css";
import { FaRobot } from "react-icons/fa6";
import { MdMultilineChart } from "react-icons/md";
import { MdEventAvailable } from "react-icons/md";

const ChatTab = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Function to render formatted text with bold support
  const renderFormattedText = (text) => {
    if (!text) return null;

    // First handle code blocks
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    // Split text into code blocks and non-code parts
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "code",
        language: match[1],
        content: match[2],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        return (
          <pre
            key={`code-${index}`}
            className="bg-[#141414FF] rounded-xl p-6 my-4 overflow-x-auto"
          >
            <code className={`language-${part.language}`}>{part.content}</code>
          </pre>
        );
      }

      // Process non-code parts with existing markdown formatting
      const lines = part.content.split("\n");
      let inBlockquote = false;

      return lines.map((line, lineIndex) => {
        if (line.trim() === "---") {
          return (
            <hr
              key={`hr-${index}-${lineIndex}`}
              className="my-4 border-[#424242]"
            />
          );
        }

        if (line.trim().startsWith(">")) {
          if (!inBlockquote) {
            inBlockquote = true;
            return (
              <blockquote
                key={`block-${index}-${lineIndex}`}
                className="border-l-4 border-[#424242] pl-4 my-2 text-gray-300"
              >
                {line.replace(/^>\s*/, "")}
              </blockquote>
            );
          }
          return (
            <span key={`block-cont-${index}-${lineIndex}`}>
              {line.replace(/^>\s*/, "")}
            </span>
          );
        } else if (inBlockquote) {
          inBlockquote = false;
        }

        const elements = [];
        let remaining = line;

        if (remaining.startsWith("## ")) {
          return (
            <h2
              key={`h2-${index}-${lineIndex}`}
              className="text-xl font-bold mt-4 mb-2"
            >
              {remaining.substring(3)}
            </h2>
          );
        } else if (remaining.startsWith("### ")) {
          return (
            <h3
              key={`h3-${index}-${lineIndex}`}
              className="text-lg font-semibold mt-3 mb-1"
            >
              {remaining.substring(4)}
            </h3>
          );
        }

        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
          const italicMatch = remaining.match(/\*(.*?)\*/);

          if (
            boldMatch &&
            (!italicMatch || boldMatch.index < italicMatch.index)
          ) {
            if (boldMatch.index > 0) {
              elements.push(remaining.substring(0, boldMatch.index));
            }
            elements.push(
              <strong key={`bold-${index}-${lineIndex}-${elements.length}`}>
                {boldMatch[1]}
              </strong>
            );
            remaining = remaining.substring(
              boldMatch.index + boldMatch[0].length
            );
          } else if (italicMatch) {
            if (italicMatch.index > 0) {
              elements.push(remaining.substring(0, italicMatch.index));
            }
            elements.push(
              <em key={`italic-${index}-${lineIndex}-${elements.length}`}>
                {italicMatch[1]}
              </em>
            );
            remaining = remaining.substring(
              italicMatch.index + italicMatch[0].length
            );
          } else {
            elements.push(remaining);
            remaining = "";
          }
        }

        return (
          <p key={`line-${index}-${lineIndex}`} className="whitespace-pre-wrap">
            {elements}
          </p>
        );
      });
    });
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
      className="flex flex-col rounded-3xl p-2 justify-center items-center"
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

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex my-6  ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                message.sender === "user"
                  ? "bg-[#303030] max-w-xs md:max-w-xs lg:max-w-2xl my-4 px-5 p-3"
                  : " w-full my-3"
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
                  <div className="mr-2 mt-1">
                    <div className="rounded-full flex items-start justify-center text-indigo-600">
                      <img src={logo} className="h-6" alt="" />
                    </div>
                  </div>
                  <p className="flex-1 whitespace-pre-wrap">
                    {renderFormattedText(message.text)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

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
