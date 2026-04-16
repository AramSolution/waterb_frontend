"use client";

import React from "react";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInfoGcSection from "@/widgets/userWeb/BizInfoGcSection";

/**
 * 글로벌 문화탐방(07) 전용 지원사업 상세.
 * bizInfoRc와 동일 레이아웃. 신청하기 옆에 탐방국가 버튼.
 */
export default function BizInfoGcPage() {
  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <BizInfoGcSection />
      </div>
    </LayoutWrapper>
  );
}
