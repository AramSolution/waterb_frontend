"use client";

import React from "react";

export const PurposeManagePageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">용도관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt; <span>용도관리</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-700">용도관리 화면입니다.</div>
      </div>
    </>
  );
};
