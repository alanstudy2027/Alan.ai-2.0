import { useState, useEffect } from "react";
import {
  FiMessageSquare,
  FiMic,
  FiVolume2,
  FiUpload,
  FiUser,
  FiMenu,
  FiX,
} from "react-icons/fi";
import ChatTab from "./components/ChatTab";
import STTTab from "./components/STTTab";
import STSTab from "./components/STSTab";
import DocTab from "./components/DocTab";
import "./components/chat.css";
import logo from "../Images/logo.png";

const MultiModelApp = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Mock user data
  const [user] = useState({
    name: "Alan Joshua",
    email: "Alan.ai@corp.com",
    avatar: null,
  });
  // Set initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Open by default on desktop, closed on mobile
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "chat":
        return <ChatTab />;
      case "stt":
        return <STTTab />;
      case "sts":
        return <STSTab />;
      case "doc":
        return <DocTab />;
      default:
        return <ChatTab />;
    }
  };

  return (
    <div
      
      style={{ background: "rgba(24, 24, 24, 1)" }}
      className="flex flex-col min-h-screen bg-gray-50"
    >
      {/* Header with toggle button */}
      <header
        style={{ position: "absolute", width: "100%" }}
        className="py-3 px-4 flex items-center justify-between md:hidden"
      >
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
        <h2 className="text-2xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Vittron.Ai
        </h2>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          style={{
            background: "rgba(24, 24, 24, 1)",
            color: "rgba(243, 243, 243, 1)",
          }}
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 transform transition-transform duration-300 ease-in-out
          fixed md:relative inset-y-0 z-20 w-64 md:w-1/5 bg-white
          flex flex-col`}
        >
          <div className="space-y-6 flex-1 p-4 overflow-y-auto">
            <div
              style={{ borderBottom: "0.1px solid #555555" }}
              className="text-center py-4 flex justify-center items-center"
            >
              <div className=" rounded-full flex items-start justify-center text-indigo-600">
                <img src={logo} className="h-7 mt-0" alt="" />
              </div>
              <h2
              id="alan"
                style={{ color: "#D9D9D9" }}
                className="text-2xl md:text-3xl font-bold text-transparent"
              >
                lan.ai
              </h2>
            </div>

            {/* Navigation Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab("chat");
                  isMobile && setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center p-3 rounded-xl ${
                  activeTab === "chat" ? "bg-[#242424]" : "hover:bg-[#363636]"
                }`}
              >
                <FiMessageSquare className="mr-3" />
                <span>Chat</span>
              </button>
              {/* <button
                onClick={() => {
                  setActiveTab("stt");
                  isMobile && setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center p-3 rounded-lg ${
                  activeTab === "stt" ? "bg-[#242424]" : "hover:bg-[#363636]"
                }`}
              >
                <FiMic className="mr-3" />
                <span>Speech to Text</span>
              </button> */}
              <button
                onClick={() => {
                  setActiveTab("sts");
                  isMobile && setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center p-3 rounded-lg ${
                  activeTab === "sts" ? "bg-[#242424]" : "hover:bg-[#363636]"
                }`}
              >
                <div className="flex mr-3">
                  <FiMic className="text-sm" />
                  <FiVolume2 className="text-sm ml-0.5" />
                </div>
                <span>Speech to Speech</span>
              </button>
              {/* <button
                onClick={() => {
                  setActiveTab("doc");
                  isMobile && setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center p-3 rounded-lg ${
                  activeTab === "doc" ? "bg-[#242424]" : "hover:bg-[#363636]"
                }`}
              >
                <FiUpload className="mr-3" />
                <span>Upload Document</span>
              </button> */}
            </div>
          </div>
          <div className="p-4 mb-6">
            <div className="flex items-center space-x-3 p-2 rounded-lg">
              <div  className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                
                <img src="https://img.freepik.com/premium-photo/fluffy-llama-with-wool-gradient-sunrise-colors-from-golden-yellow-top-soft-pink_868783-74356.jpg" alt="User" style={{resize:"cover"}} className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {isMobile && isSidebarOpen && (
          <div className="fixed inset-0 z-10" onClick={toggleSidebar} />
        )}

        {/* Right Content Area */}
        <div
          style={{ background: "rgba(24, 24, 24, 1)", width: "100%" }}
          className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col overflow-auto"
        >
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default MultiModelApp;
