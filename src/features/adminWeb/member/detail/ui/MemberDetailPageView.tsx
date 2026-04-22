"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MemberDetailView } from "./MemberDetailView";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function MemberDetailContent() {
  const searchParams = useSearchParams();
  const esntlId = searchParams.get("esntlId");

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">관리자회원상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>회원관리</span> &gt;{" "}
          <span>관리자회원상세</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">회원 정보</h5>
        </div>
        <div className="p-0">
          {!esntlId ? (
            <div className="p-6 text-center text-red-600">
              관리자 코드가 필요합니다.
            </div>
          ) : (
            <MemberDetailView esntlId={esntlId} />
          )}
        </div>
      </div>
    </>
  );
}

export const MemberDetailPageView: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MemberDetailContent />
    </Suspense>
  );
};
