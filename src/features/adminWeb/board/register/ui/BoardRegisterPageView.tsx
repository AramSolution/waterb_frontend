"use client";

import React from "react";
import { BoardRegisterForm } from "./BoardRegisterForm";

export const BoardRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">게시판등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>{" "}
          &gt; <span>게시판등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">게시판 정보</h5>
        </div>
        <div className="p-0">
          <BoardRegisterForm />
        </div>
      </div>
    </>
  );
};
