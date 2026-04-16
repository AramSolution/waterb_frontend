"use client";

import React, { useEffect, useState } from "react";

/** 학원회원 등록/수정과 동일한 object URL 미리보기 */
export function BannerPhotoPreviewImage({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return null;
  return (
    <img src={src} alt="배너 미리보기" className="w-full h-full object-cover" />
  );
}
