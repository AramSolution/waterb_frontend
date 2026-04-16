"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoSection from "@/widgets/userWeb/BizInfoSection";

/**
 * bizInfo2.html → React 변환
 * 원본: source/gunsan/bizInfo2.html
 * 공통: #skip, #main_content, MainHeader, Footer, default+main+biz CSS
 * 헤더 로그인/로그아웃: UserWebAuthProvider에서 일괄 관리
 */
export default function BizInfoPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoSection />
      </div>
    </LayoutWrapper>
  );
}
