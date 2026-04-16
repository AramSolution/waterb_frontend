"use client";

import React from "react";
import { ServiceCard } from "@/shared/ui/userWeb";

const IMG = "/images/userWeb";

const MainBtmSection: React.FC = () => {
  const quickMenuItems = [
    {
      img: `${IMG}/img_myungsoo.png`,
      imgAlt: "공부의 명수 군산시 공공학습 플랫폼",
      linkText: "바로가기",
      linkHref: "https://study.gunsan.go.kr/",
      isChat: false,
    },
    {
      img: `${IMG}/img_kakao.png`,
      imgAlt: "카카오톡 아이콘",
      linkText: "AI 챗봇상담",
      linkHref: "#",
      isChat: true,
    },
  ];

  return (
    <section className="mainBtm">
      <div className="serviceSection inner">
        <div className="innerContainer">
          <ServiceCard
            type="infoGuide"
            title="이용안내"
            desc="학생·학부모/일반·교육기관이 함께 참여하는<br>제안형 학습 서비스 이용 방법을 안내합니다"
            charImg={`${IMG}/img_char_guide.png`}
          />
          <ServiceCard
            type="inquiryContact"
            title="문의하기"
            desc="서비스 이용과 관련된 문의를 남겨주시면<br>신속히 안내해 드리겠습니다"
            charImg={`${IMG}/img_char_inquiry.png`}
          />
          <ServiceCard type="quickMenu" quickItems={quickMenuItems} />
        </div>
      </div>
    </section>
  );
};

export default MainBtmSection;
