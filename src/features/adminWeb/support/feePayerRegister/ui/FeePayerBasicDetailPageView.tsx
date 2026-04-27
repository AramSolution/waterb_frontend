"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { FeePayerBasicRegisterForm } from "./FeePayerBasicRegisterForm";

export const FeePayerBasicDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? "";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">오수 원인자부담금 상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>오수 원인자부담금 관리</span> &gt;{" "}
          <span>기본정보 상세</span>
        </nav>
      </div>

      <div key={proId || "none"}>
        <FeePayerBasicRegisterForm seedProId={proId} />
      </div>
    </>
  );
};
