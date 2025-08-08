import { useState } from 'react';
import { FiMic, FiVolume2 } from 'react-icons/fi';

const STTTab = () => {
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const toggleListening = () => {
    setIsListening(!isListening);
    // In a real implementation, you would start/stop voice recording here
  };

  return (
    <div style={{height:"100%"}} className="flex flex-col">
      {/* Assistant UI */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative">
          {/* Gradient shadow */}
          <div className={`absolute inset-0 rounded-full ${
            isListening 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 blur-lg opacity-30' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-500 blur-lg opacity-20'
          }`}></div>
          
          {/* Assistant circle */}
          <button
            onClick={toggleListening}
            className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isListening 
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md'
            }`}
          >
            <div className="text-center">
              <div className="flex justify-center mb-3">
                {isListening ? (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <FiMic className="text-white text-xl" />
                  </div>
                )}
              </div>
              <p className="text-white font-medium text-lg mt-2">
                {isListening ? 'Listening...' : 'Click to speak'}
              </p>
            </div>
          </button>
        </div>

        <p className="text-gray-500 mt-8 text-center max-w-md">
          {isListening
            ? 'Speak now - I will convert your speech to text'
            : 'Click the microphone to start speaking to the assistant'}
        </p>
      </div>

      {/* Input area (for demo purposes) */}
      <div>
        <div className="relative">
          <textarea
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Transcript will appear here..."
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
        </div>
      </div>
    </div>
  );
};

export default STTTab;