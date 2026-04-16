'use client';

import React, { useEffect } from 'react';

interface LayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: string;
  height?: string;
  children: React.ReactNode;
}

export function LayerPopup({ isOpen, onClose, title, width = '800px', height = 'auto', children }: LayerPopupProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Popup */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-h-[90vh] w-full flex flex-col"
        style={{ maxWidth: width, height }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-300">
          <h3 className="text-base md:text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
