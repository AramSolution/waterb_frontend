"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoDmSection from "@/widgets/userWeb/BizInfoDmSection";

/**
 * 꿈틀꿈틀 우리아이 꿈탐험(06) 전용 지원사업 상세.
 * bizInfo / bizInfoPr(지원사업)과 분리된 전용 경로.
 */
export default function BizInfoDmPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoDmSection />
      </div>
    </LayoutWrapper>
  );
}
