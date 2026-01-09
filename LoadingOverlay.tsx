
import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex space-x-2 mb-8">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:0.15s]"></div>
      </div>
      <h2 className="text-lg font-medium text-gray-800">{message}</h2>
      <p className="mt-2 text-gray-500 text-sm">Preparando tu experiencia creativa</p>
    </div>
  );
};

export default LoadingOverlay;
