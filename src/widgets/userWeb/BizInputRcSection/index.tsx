"use client";

import React from "react";
import BizInputPrSection from "@/widgets/userWeb/BizInputPrSection";

interface BizInputRcSectionProps {
  proId?: string;
  fromMypage?: boolean;
  fromMentorWork?: boolean;
  initialReqEsntlId?: string;
  initialReqId?: string;
}

/**
 * 지역연계 진로체험 활동(05) 전용 신청/수정 페이지 섹션.
 * 내부 구현은 기존 `BizInputPrSection`의 05 분기 로직을 재사용한다.
 */
const BizInputRcSection: React.FC<BizInputRcSectionProps> = (props) => {
  return <BizInputPrSection {...props} proGb="05" />;
};

export default BizInputRcSection;

