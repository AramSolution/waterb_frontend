"use client";

import React from "react";
import BizInputPrSection from "@/widgets/userWeb/BizInputPrSection";

interface BizInputGcSectionProps {
  proId?: string;
  fromMypage?: boolean;
  fromMentorWork?: boolean;
  initialReqEsntlId?: string;
  initialReqId?: string;
}

/**
 * 글로벌 문화탐방(07) 전용 신청/수정 페이지 섹션.
 * 내부 구현은 `BizInputPrSection`의 05·07 공통 분기(proGb=07)를 사용한다.
 */
const BizInputGcSection: React.FC<BizInputGcSectionProps> = (props) => {
  return <BizInputPrSection {...props} proGb="07" />;
};

export default BizInputGcSection;
