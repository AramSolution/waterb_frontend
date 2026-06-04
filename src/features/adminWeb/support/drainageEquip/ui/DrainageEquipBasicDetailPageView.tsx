"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { DrainageEquipBasicRegisterForm } from "./DrainageEquipBasicRegisterForm";

/**
 * 배수설비 대장 상세 — 등록 화면과 동일 폼·API(`GET /{itemId}/detail`, 저장은 register POST).
 */
export const DrainageEquipBasicDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const itemId = searchParams?.get("itemId") ?? "";
  const idTrim = itemId.trim();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배수설비 대장 상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>배수설비 대장</span> &gt; <span>기본정보 상세</span>
        </nav>
      </div>

      {!idTrim ? (
        <div className="bg-white rounded-lg shadow px-6 py-8 text-sm text-gray-600">
          상세 조회에 필요한 ITEM_ID가 없습니다. 목록에서 다시 들어와주세요.
        </div>
      ) : (
        <DrainageEquipBasicRegisterForm seedItemId={idTrim} />
      )}
    </>
  );
};
