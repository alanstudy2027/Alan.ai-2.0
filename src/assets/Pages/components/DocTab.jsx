import { useState, useRef, useEffect } from 'react';
import { FiUpload, FiFileText, FiSend, FiTrash2 } from 'react-icons/fi';
import { LiquidGlass } from "@specy/liquid-glass-react";

const DocTab = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [documentText, setDocumentText] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200 // Max height in pixels
      )}px`;
    }
  }, [inputValue]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsUploading(true);
      setTimeout(() => {
        setDocumentText(`Extracted text from ${selectedFile.name} (simulated)`);
        setIsUploading(false);
        setMessages([
          {
            id: 1,
            text: `Document "${selectedFile.name}" uploaded successfully. You can now ask questions about it.`,
            sender: 'system'
          }
        ]);
      }, 1500);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setDocumentText('');
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;
    
    const newUserMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user'
    };
    
    setMessages([...messages, newUserMessage]);
    setInputValue('');
    
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: `This is a simulated response about your document. In a real implementation, this would contain relevant information extracted from: ${file?.name || 'the document'}`,
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Document upload area */}
      <div className={messages.length > 0 ? 'h-1/3' : 'flex-1'}>
        {!file ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl mb-4">
                <FiFileText className="text-2xl" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload Document</h3>
              <p className="text-gray-500 mb-6">
                Upload PDFs, Word docs, or text files to chat with them.
              </p>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={handleUploadClick}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop files here, or click to browse
                </p>
                <button 
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  onClick={handleUploadClick}
                >
                  Select Files
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Supported formats: PDF, DOCX, TXT (max 10MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="md:mt-0 lg:mt-0 sm:mt-12 mt-12">
            <div className="flex items-center justify-between bg-indigo-50 rounded-lg p-3">
              <div className="flex items-center">
                <FiFileText className="text-indigo-600 mr-2" />
                <span className="font-medium text-sm truncate max-w-xs">{file.name}</span>
              </div>
              {isUploading ? (
                <div className="text-sm text-gray-500">Processing...</div>
              ) : (
                <button 
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat area (only shown when document is uploaded) */}
      {file && (
        <div className="flex flex-col h-full">
          {/* Scrollable chat content with padding bottom for floating input */}
          <div 
          style={{height:"83vh", overflowY:"scroll"}}
            ref={chatContainerRef}
            className="p-4 pb-24 space-y-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-indigo-500 text-white'
                      : message.sender === 'ai'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-green-50 text-green-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating input area */}
          
          <div  className="absolute bottom-0 left-0 right-0 border-t border-gray-200 rounded-xl">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Chat with document..."
                className="w-full p-4 pr-12 rounded-xl border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                disabled={isUploading}
                rows={1}
                style={{
                  minHeight: '60px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isUploading || !inputValue.trim()}
                className={`absolute right-3 bottom-4 p-1 rounded-full ${
                  inputValue.trim() ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <FiSend className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
              Ask questions about the uploaded document
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocTab;