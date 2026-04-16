"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoPrSection from "@/widgets/userWeb/BizInfoPrSection";

/**
 * bizInfo_pr.html → React 변환
 * 원본: source/gunsan/bizInfo_pr.html
 * 공통: #skip, #main_content, MainHeader, Footer, default+main+biz_pr CSS
 * 이미지·클래스·id·접근성 원본 그대로 유지
 */
export default function BizInfoPrPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoPrSection />
      </div>
    </LayoutWrapper>
  );
}
