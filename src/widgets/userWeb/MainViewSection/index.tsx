"use client";

import React from "react";
import { LoginItem } from "@/shared/ui/userWeb";

const IMG = "/images/userWeb";

interface MainViewSectionProps {
  onLoginItemClick?: (
    e: React.MouseEvent,
    type: "student" | "parent" | "school" | "academy" | "mentor",
  ) => void;
}

const MainViewSection: React.FC<MainViewSectionProps> = ({
  onLoginItemClick,
}) => {
  const loginItems = [
    {
      type: "student" as const,
      label: "학생",
      img: `${IMG}/img_profile_student.png`,
    },
    {
      type: "parent" as const,
      label: "학부모/일반",
      img: `${IMG}/img_profile_parent_96.png`,
    },
    {
      type: "school" as const,
      label: "기관",
      img: `${IMG}/img_profile_school_96.png`,
    },
    {
      type: "academy" as const,
      label: "학원",
      img: `${IMG}/img_profile_academy_96.png`,
    },
    {
      type: "mentor" as const,
      label: "멘토",
      img: `${IMG}/img_profile_mentor_96.png`,
    },
  ];

  return (
    <section className="mainView">
      <div className="inner">
        <div className="content">
          <div className="textWrap">
            <p className="subTxt bd-20">
              Designing the Future of Learning Together
            </p>
            <h2>
              함께 만들어가는 열린 교육의 장
              <br />
              누구나 배우고 성장하는 교육 커뮤니티
            </h2>
          </div>
          <div className="visImg" role="img" aria-label="교육 캐릭터 이미지" />
        </div>
        <div className="loginWrap">
          <h3 className="loginTitle">로그인</h3>
          <ul className="loginList">
            {loginItems.map((item, index) => (
              <LoginItem
                key={index}
                type={item.type}
                label={item.label}
                img={item.img}
                onClick={(e, type) => onLoginItemClick?.(e, type)}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MainViewSection;
