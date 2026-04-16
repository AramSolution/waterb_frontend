"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoRcSection from "@/widgets/userWeb/BizInfoRcSection";

/**
 * 지역연계 진로체험 활동(05) 전용 지원사업 상세.
 * bizInfoPr과 분리. 신청하기 옆에 학원목록 대신 회차 버튼.
 */
export default function BizInfoRcPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoRcSection />
      </div>
    </LayoutWrapper>
  );
}
