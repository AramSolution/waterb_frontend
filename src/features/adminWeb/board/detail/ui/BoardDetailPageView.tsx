"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { BoardDetailForm } from "./BoardDetailForm";

export const BoardDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const bbsid = searchParams?.get("bbsid") || "";

  if (!bbsid) {
    return (
      <div className="p-6 text-center text-red-600">
        게시판 ID가 필요합니다.
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">게시판상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>{" "}
          &gt; <span>게시판상세</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">게시판 정보</h5>
        </div>
        <div className="p-0">
          <BoardDetailForm bbsid={bbsid} />
        </div>
      </div>
    </>
  );
};

