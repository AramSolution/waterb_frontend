"use client";

import React from "react";
import { MemberRegisterForm } from "./MemberRegisterForm";

export const MemberRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">관리자회원등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt;{" "}
          <span>관리자회원등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">회원 정보</h5>
        </div>
        <div className="p-0">
          <MemberRegisterForm />
        </div>
      </div>
    </>
  );
};
