"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ArticleDetailForm } from "./ArticleDetailForm";

export const ArticleDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const articleId = searchParams?.get("articleId") || "";
  const bbsId = searchParams?.get("bbsId") || "";
  const bbsNm = searchParams?.get("bbsNm") || "";

  if (!articleId || !bbsId) {
    return (
      <div className="p-6 text-center text-red-600">
        게시글 ID 또는 게시판 ID가 필요합니다.
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{bbsNm ? `${bbsNm} 상세` : "게시글상세"}</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>{" "}
          &gt; <span>{bbsNm || "게시글"}상세</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">게시글 정보</h5>
        </div>
        <div className="p-0">
          <ArticleDetailForm articleId={articleId} bbsId={bbsId} />
        </div>
      </div>
    </>
  );
};
