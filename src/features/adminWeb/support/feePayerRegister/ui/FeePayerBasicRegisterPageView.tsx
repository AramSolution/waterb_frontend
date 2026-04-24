"use client";

import React from "react";
import { FeePayerBasicRegisterForm } from "./FeePayerBasicRegisterForm";

export const FeePayerBasicRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">오수 원인자부담금 등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>오수 원인자부담금 관리</span> &gt;{" "}
          <span>기본정보 등록</span>
        </nav>
      </div>

      <FeePayerBasicRegisterForm />
    </>
  );
};
