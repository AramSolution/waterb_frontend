"use client";

import React from "react";
import { ProgramRegisterForm } from "./ProgramRegisterForm";

export const ProgramRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">프로그램등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt; <span>프로그램관리</span>{" "}
          &gt; <span>프로그램등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">프로그램 정보</h5>
        </div>
        <div className="p-0">
          <ProgramRegisterForm />
        </div>
      </div>
    </>
  );
};
