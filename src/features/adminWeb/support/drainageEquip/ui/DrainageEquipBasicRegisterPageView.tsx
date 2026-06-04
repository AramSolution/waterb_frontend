"use client";

import React from "react";
import { DrainageEquipBasicRegisterForm } from "./DrainageEquipBasicRegisterForm";

export const DrainageEquipBasicRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배수설비 관리 등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>배수설비 관리</span> &gt; <span>기본정보 등록</span>
        </nav>
      </div>

      <DrainageEquipBasicRegisterForm />
    </>
  );
};
