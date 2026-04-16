"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { SupportApplicationRegisterForm } from "./SupportApplicationRegisterForm";

export const SupportApplicationRegisterPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || undefined;
  const programTitle = searchParams.get("programTitle") || "";
  const modeParam = searchParams.get("mode");
  const mode = modeParam === "detail" ? "detail" : "register";
  const reqId = searchParams.get("reqId") || undefined;

  const pageTitle =
    mode === "detail"
      ? "샘플업무 신청 상세"
      : "샘플업무 신청 등록";
  const breadcrumbLast = mode === "detail" ? "신청 상세" : "신청 등록";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{pageTitle}</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt; <span>지원사업</span>{" "}
          &gt; <span>신청목록</span> &gt; <span>{breadcrumbLast}</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">신청 정보</h5>
        </div>
        <div className="p-0">
          <SupportApplicationRegisterForm
            businessId={businessId}
            programTitle={programTitle}
            mode={mode}
            reqId={reqId}
          />
        </div>
      </div>
    </>
  );
};
