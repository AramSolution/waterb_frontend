"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoCtSection from "@/widgets/userWeb/BizInfoCtSection";

/**
 * 공공형 진로진학 컨설팅(03) 전용 지원사업 상세.
 * bizInfo / bizInfoPr(지원사업)과 분리된 전용 경로.
 */
export default function BizInfoCtPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoCtSection />
      </div>
    </LayoutWrapper>
  );
}
