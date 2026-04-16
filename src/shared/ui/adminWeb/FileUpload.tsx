'use client';

import React, {useState} from 'react';
import {createPortal} from "react-dom";

interface FileUploadProps {
  label?: string;
  name: string;
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload?: () => void;
  onDelete?: () => void;
  widthOpt?: string;
}

interface ImageUploadProps {
  label?: string;
  name: string;
  previewWidth?: number;
  previewHeight?: number;
  onDownload?: () => void;
  onDelete?: () => void;
  widthOpt?: string;
}

export function FileUpload({
    label = '파일업로드',
    name,
    accept = '*/*',
    onChange,
    onDownload,
    onDelete,
    widthOpt
}: FileUploadProps) {
  return (
    <div className="flex flex-wrap">
      <div className={`w-full ${widthOpt === 'half' ? 'md:w-1/2' : ''} register-form-mobile-row`}>
        <div className="register-form-mobile-wrapper md:flex md:items-stretch" style={{ minHeight: '45px' }}>
          <label className={`w-full ${widthOpt === 'half' ? 'md:w-1/4' : ''} flex items-center m-0 register-form-label bg-gray-100`} style={{ border: '1px solid #dee2e6', borderTop: 'none', padding: '5px', ...(widthOpt === 'full' && {flex: '0 0 12.5%'}) }}>
            {label}
          </label>
          <div className={`register-form-mobile-field w-full ${widthOpt === 'half' ? 'md:w-3/4' : ''} flex flex-col gap-2`} style={{ border: '1px solid #dee2e6', borderLeft: 'none', borderTop: 'none', padding: '5px', ...(widthOpt === 'full' && {flex: '1' }) }}>
            <input
              type="file"
              className="w-full border rounded-none px-3 py-2"
              name={name}
              accept={accept}
              style={{ border: '1px solid #e0e0e0' }}
              onChange={onChange}
            />
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                type="button"
                onClick={onDownload}
              >
                다운로드
              </button>
              <button
                className="px-3 py-1 text-sm border border-red-500 text-red-600 hover:bg-red-50 rounded-none whitespace-nowrap"
                type="button"
                onClick={onDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImageUpload({
    label = '이미지업로드',
    name,
    previewWidth = 100,
    previewHeight = 120,
    onDownload,
    onDelete,
    widthOpt
}: ImageUploadProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setModalImage(imageSrc);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImage(null);
  };

  return (
    <>
      <div className="flex flex-wrap">
        <div className={`w-full ${widthOpt === 'half' ? 'md:w-1/2' : ''} register-form-mobile-row`}>
          <div className="register-form-mobile-wrapper md:flex md:items-stretch" style={{ minHeight: '45px' }}>
            <label className={`w-full ${widthOpt === 'half' ? 'md:w-1/4' : ''} flex items-center m-0 register-form-label bg-gray-100`} style={{ border: '1px solid #dee2e6', borderTop: 'none', padding: '5px', ...(widthOpt === 'full' && {flex: '0 0 12.5%'}) }}>
              {label}
            </label>
            <div className="register-form-mobile-field w-full flex gap-2" style={{ border: '1px solid #dee2e6', borderLeft: 'none', borderTop: 'none', padding: '5px', flex: '1' }}>
              <div className="flex items-center justify-center bg-gray-100" style={{ width: `${previewWidth}px`, height: `${previewHeight}px`, border: '1px solid #dee2e6', flexShrink: 0 }}>
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="미리보기"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleImageClick(previewImage)}
                  />
                ) : (
                  <span className="text-gray-400 text-xs">미리보기</span>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full border rounded-none px-3 py-2"
                  name={name}
                  style={{ border: '1px solid #e0e0e0' }}
                />
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                    type="button"
                    onClick={onDownload}
                  >
                    다운로드
                  </button>
                  <button
                    className="px-3 py-1 text-sm border border-red-500 text-red-600 hover:bg-red-50 rounded-none whitespace-nowrap"
                    type="button"
                    onClick={onDelete}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && modalImage && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={closeModal}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage}
              alt="확대 이미지"
              className="object-contain"
              style={{
                maxHeight: 'calc(100vh - 120px)',
                maxWidth: 'calc(100vw - 120px)'
              }}
            />
            <button
              onClick={closeModal}
              className="absolute bg-white text-gray-800 w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              style={{
                top: '-50px',
                right: '-50px'
              }}
              aria-label="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}