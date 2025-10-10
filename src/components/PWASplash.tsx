import React, { useState, useEffect } from 'react';
import '../styles/pwa-splash.css';

interface PWASplashProps {
  onFinish: () => void;
}

const PWASplash: React.FC<PWASplashProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 300); // Wait for fade out animation
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center transition-opacity duration-300 ease-out opacity-0 pointer-events-none">
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pwa-bg-pattern flex items-center justify-center transition-opacity duration-300 ease-out">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-300 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-16 h-16 bg-blue-100 rounded-full animate-pulse"></div>
      </div>

      {/* Main Content */}
      <div className="text-center z-10">
        {/* Logo Container with Animation */}
        <div className="relative mb-8">
          {/* Outer Ring Animation */}
          <div className="absolute inset-0 w-32 h-32 mx-auto">
            <div className="w-full h-full border-4 border-blue-200 rounded-full animate-spin"></div>
          </div>
          
          {/* Middle Ring Animation */}
          <div className="absolute inset-2 w-28 h-28 mx-auto">
            <div className="w-full h-full border-2 border-blue-300 rounded-full animate-ping"></div>
          </div>
          
          {/* Logo */}
          <div className="relative w-32 h-32 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center animate-pulse">
            <img 
              src="/logodm.png" 
              alt="Logo Darul Ma'arif" 
              className="w-20 h-20 object-contain pwa-splash-gentle-bounce"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3 pwa-splash-fade-in">
          <h1 className="text-2xl font-bold text-gray-800 pwa-splash-slide-up">
            Peminjaman Alat DM
          </h1>
          <p className="text-sm text-gray-600 animate-pulse">
            Sistem Peminjaman Alat Sekolah
          </p>
          <div className="flex items-center justify-center mt-6">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce pwa-bounce-delay-1"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce pwa-bounce-delay-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-gray-500 pwa-fade-delay-1000">
          Darul Ma'arif © 2025
        </p>
      </div>
    </div>
  );
};

export default PWASplash;