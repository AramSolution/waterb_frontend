"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { FeePayerBasicRegisterForm } from "./FeePayerBasicRegisterForm";

export const FeePayerBasicDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? "";
  const idTrim = proId.trim();

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

      {!idTrim ? (
        <div className="bg-white rounded-lg shadow px-6 py-8 text-sm text-gray-600">
          상세 조회에 필요한 ITEM_ID(proId)가 없습니다. 목록에서 다시
          들어와주세요.
        </div>
      ) : (
        <div key={idTrim}>
          <FeePayerBasicRegisterForm seedProId={idTrim} />
        </div>
      )}
    </>
  );
};
