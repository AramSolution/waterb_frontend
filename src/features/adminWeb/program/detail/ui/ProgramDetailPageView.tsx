"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProgramDetailForm } from "./ProgramDetailForm";

function ProgramDetailContent() {
  const searchParams = useSearchParams();
  const progrmFileNm = searchParams?.get("progrmFileNm") || "";

  if (!progrmFileNm) {
    return (
      <div className="p-6 text-center text-red-600">
        프로그램명이 필요합니다.
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">프로그램상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt;{" "}
          <span>프로그램관리</span> &gt; <span>프로그램상세</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">프로그램 정보</h5>
        </div>
        <div className="p-0">
          <ProgramDetailForm progrmFileNm={progrmFileNm} />
        </div>
      </div>
    </>
  );
}

export const ProgramDetailPageView: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-6 text-center">로딩 중...</div>}>
      <ProgramDetailContent />
    </Suspense>
  );
};
