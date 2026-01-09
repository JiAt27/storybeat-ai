
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-gray-200 py-3 px-8 bg-white sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-lg font-medium tracking-tight text-[#3c4043]">
            HEY <span className="text-[#1a73e8] font-bold">labs</span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
