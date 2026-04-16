"use client";

import React from "react";
import { SupportRegisterForm } from "./SupportRegisterForm";

export const SupportRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">샘플업무 등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt;{" "}
          <span>샘플업무</span> &gt;{" "}
          <span>샘플업무 등록</span>
        </nav>
      </div>

      <SupportRegisterForm />
    </>
  );
};
