import { useState, useRef, useEffect } from "react";
import { FiUpload, FiSend, FiTrash2, FiBook } from "react-icons/fi";
import "./doc.css";
import "./chat.css";
import logo from "../../Images/logo.png";
import { FaRobot } from "react-icons/fa6";
import { MdMultilineChart, MdEventAvailable } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DocTab = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const MarkdownRenderer = ({ content }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");

            if (!inline && match) {
              return (
                <div className="relative my-4">
                  <div className="absolute right-3 top-2 text-xs text-gray-400 bg-[#1A1A1A] px-2 py-1 rounded-bl rounded-tr">
                    {match[1]}
                  </div>
                  <pre className="bg-[#1A1A1A] p-4 text-sm rounded-lg overflow-x-auto">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="bg-[#4A4A4AFF] px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          },
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
              className="border-l-3 border-[#A8A8A8FF] pl-4 my-8 italic text-[#D8D8D8FF]"
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
            <div className="overflow-x-auto my-4 rounded-lg border border-[#424242]">
              <table className="w-full" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#2C2C2C]" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="border-b border-[#424242] p-3 text-left font-semibold"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-[#2C2C2C] p-3" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-[#424242]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.some((msg) => msg.sender === "user")) {
      setHasUserSentMessage(true);
    }
  }, [messages]);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setMessages([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("http://localhost:5006/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setMessages([
            {
              id: Date.now(),
              text: `Document "${result.document}" uploaded successfully with ${result.chunks} chunks processed.`,
              sender: "system",
              docId: result.doc_id,
            },
          ]);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        setMessages([
          {
            id: Date.now(),
            text: `Error uploading document: ${error.message}`,
            sender: "error",
          },
        ]);
        setFile(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || !file) return;

    const newUserMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
    };

    setMessages((prev) => [
      ...prev,
      newUserMessage,
      {
        id: Date.now() + 1,
        text: "", // start empty so "Generating..." appears
        sender: "ai",
      },
    ]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const docId = messages.find((m) => m.sender === "system")?.docId;

      const response = await fetch("http://localhost:5006/api/chat/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputValue,
          doc_id: docId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessage = {
        id: Date.now() + 1,
        text: "",
        sender: "ai",
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.token?.text) {
                aiMessage.text += parsed.token.text;
                setMessages((prev) => [
                  ...prev.slice(0, -1), // remove the last AI placeholder
                  { ...aiMessage },
                ]);
              }
            } catch (e) {
              console.error("Error parsing stream:", e);
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Error: ${error.message}`,
          sender: "error",
        },
      ]);
    } finally {
      setIsProcessing(false);
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
      {file && (
          <div className="w-full flex mb-3 p-1 justify-center items-center shadow-3xl">
            <div className="md:mt-0 lg:mt-0 sm:mt-12 mt-12 w-1/2">
              <div className="flex items-center justify-between bg-[#434343FF] rounded-lg p-3">
                <div className="flex items-center">
                  <FiBook className="text-[#D9D9D9] mr-2" />
                  <span className="font-medium text-sm truncate max-w-xs text-[#D9D9D9]">
                    {file.name}
                  </span>
                </div>
                {isUploading ? (
                  <div className="text-sm text-gray-500">Processing...</div>
                ) : (
                  <button
                    onClick={handleRemoveFile}
                    className="text-[#FF0000FF] font-bold hover:text-red-700"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      <div
        style={{ overflowY: "scroll", width: "87%" }}
        className="flex-1 relative"
      >
        
        {!file ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div>
              <div className="container">
                <div className="folder">
                  <div className="front-side">
                    <div className="tip"></div>
                    <div className="cover"></div>
                  </div>
                  <div className="back-side cover"></div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.txt"
                />
                <button
                  onClick={handleUploadClick}
                  className="custom-file-upload"
                  disabled={isUploading}
                >
                  {isUploading ? "Processing..." : "Choose a file"}
                </button>
              </div>
              <p className="text-center text-[#B8B8B8FF] mt-4">
                Supported formats: PDF, DOCX, TXT
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-12" style={{ marginBottom: "160px" }}>
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
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    ) : (
                      <div className="flex items-start">
                        {message.text ? (
                          <div className="flex gap-0 items-start">
                            <div className="mr-3 mt-2">
                              <div className="rounded-full flex items-start justify-center text-indigo-600">
                                <img src={logo} className="h-6" alt="" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <MarkdownRenderer content={message.text} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4">
                            <p className="text-[#8A8A8AFF]">Generating</p>
                            <div class="spinner">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {file && (
        <div className="flex w-[80%] justify-center">
          <div className="w-full relative bottom-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Ask about ${file.name}`}
                className="w-full p-4 pr-12 rounded-3xl border border-[#3F3F3FFF] focus:outline-none focus:ring-1 focus:ring-[#828282FF] focus:border-transparent bg-[#303030] resize-none"
                disabled={isProcessing || isUploading}
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
                disabled={isProcessing || isUploading || !inputValue.trim()}
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
      )}
    </div>
  );
};

export default DocTab;
