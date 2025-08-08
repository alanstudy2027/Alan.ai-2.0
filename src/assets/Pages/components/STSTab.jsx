import { useState } from 'react';
import { FiMic, FiVolume2 } from 'react-icons/fi';
import "./chat.css";

const STSTab = () => {
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const toggleListening = () => {
    setIsListening(!isListening);
    // In a real implementation, you would start/stop voice recording here
  };

  return (
    <div style={{background: "rgba(33, 33, 33, 1)"}} className="flex-1 flex flex-col rounded-3xl">
      {/* Assistant UI */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative">
          {/* Gradient shadow */}
          <div className={`absolute inset-0 rounded-full ${
            isListening 
              ? 'bg-[#D9D9D9] blur-lg opacity-30' 
              : 'bg-[#777777FF] blur-lg opacity-20'
          }`}></div>
          
          {/* Assistant circle */}
          <button
            onClick={toggleListening}
            className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isListening 
                ? 'bg-[#D9D9D9] shadow-lg' 
                : 'bg-[#434343FF] shadow-md'
            }`}
          >
            <div className="text-center">
              <div className="flex justify-center mb-3">
                {isListening ? (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#171717] animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-[#171717] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#171717] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <FiMic className="text-white text-xl" />
                  </div>
                )}
              </div>
              <p style={{fontWeight:300}} className={`font-medium text-lg mt-2 ${isListening ? `text-[#171717]`:`text-[#D9D9D9]`}`}>
                {isListening ? 'Listening...' : 'Click to speak'}
              </p>
            </div>
          </button>
        </div>

        <p style={{ color: "#D9D9D9" }} className="mt-8 text-center font-thin max-w-md">
          {isListening
            ? 'Speak now - I will convert your speech to speech response'
            : 'Click the microphone to start speaking to the assistant'}
        </p>
      </div>
    </div>
  );
};

export default STSTab;