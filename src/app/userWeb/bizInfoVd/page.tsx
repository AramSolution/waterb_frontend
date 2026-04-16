"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoVdSection from "@/widgets/userWeb/BizInfoVdSection";

/**
 * 1:1 원어민 화상영어(04) 전용 지원사업 상세.
 * bizInfo / bizInfoPr(지원사업)과 분리된 전용 경로.
 */
export default function BizInfoVdPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoVdSection />
      </div>
    </LayoutWrapper>
  );
}
