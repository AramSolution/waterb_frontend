"use client";

import React from "react";
import "@/shared/styles/admin/gpkiYnCert.css";

/** 사용자 MY PAGE와 동일 인증 버튼·문구 스타일을 관리자 폼에 적용 */
export function AdminGpkiYnCertShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="adminGpkiYnCert joinInput">{children}</div>;
}
