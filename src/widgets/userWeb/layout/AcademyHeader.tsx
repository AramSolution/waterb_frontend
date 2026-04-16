"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const IMG = "/images/userWeb";

const ACADEMY_NAV_ITEMS = [
  { label: "학원소개", href: "#" },
  { label: "교육소개", href: "#" },
  { label: "참여관리", href: "#" },
  { label: "통계", href: "#" },
  { label: "MY PAGE", href: "/userWeb/mypagePr" },
];

/** 배지 라벨 → 회원가입 type 쿼리 (회원가입 링크용) */
const BADGE_LABEL_TO_JOIN_TYPE: Record<string, string> = {
  학생: "student",
  "학부모/일반": "parent",
  학원: "academy",
  멘토: "mentor",
};

interface AcademyHeaderProps {
  /** 배지 문구 (미지정 시 "학원") */
  badgeLabel?: string;
  /** 배지 className (미지정 시 "badgeAcademy", 테마 색상용 "badgeStudent" 등) */
  badgeClassName?: string;
}

const AcademyHeader: React.FC<AcademyHeaderProps> = ({
  badgeLabel = "학원",
  badgeClassName = "badgeAcademy",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  const handleMenuOpen = () => {
    setMobileMenuOpen(true);
    setTimeout(() => {
      const closeBtn = document.querySelector(
        ".menuClose",
      ) as HTMLButtonElement;
      closeBtn?.focus();
    }, 100);
  };

  const handleMenuClose = () => {
    setMobileMenuOpen(false);
    const openBtn = document.querySelector(".menuOpen") as HTMLButtonElement;
    openBtn?.focus();
  };

  return (
    <header className="header">
      <div className="headerTop inner">
        <div className="headerLogo">
          <h1>
            <Link href="/userWeb">
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" />
            </Link>
          </h1>
          <span className={badgeClassName}>{badgeLabel}</span>
        </div>
        <div className="utilMenu">
          <div className="userLinks">
            <a href="#">로그인</a>
            <Link
              href={`/userWeb/terms?type=${BADGE_LABEL_TO_JOIN_TYPE[badgeLabel] ?? "academy"}`}
            >
              회원가입
            </Link>
            <a href="/userWeb" className="btnPortal">
              꿈이음센터포털 바로가기
              <img
                src={`${IMG}/icon/ico_newtab_20_pr.png`}
                alt=""
                aria-hidden="true"
              />
            </a>
          </div>
          <button
            type="button"
            className="menuOpen"
            aria-label="메뉴 열기"
            onClick={handleMenuOpen}
          >
            <img src={`${IMG}/icon/ico_menu_32.png`} alt="메뉴 열기" />
          </button>
        </div>
      </div>
      <nav className="navPc" aria-label="메인 메뉴">
        <div className="inner">
          <ul className="navList">
            {ACADEMY_NAV_ITEMS.map((item, i) => (
              <li key={i}>
                <a href={item.href} className="mainLink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div
        className={`moMenu ${mobileMenuOpen ? "active" : ""}`}
        id="mobileMenu"
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="moMenuBg"
          role="button"
          tabIndex={-1}
          aria-label="메뉴 닫기"
          onClick={handleMenuClose}
          onKeyDown={(e) => e.key === "Enter" && handleMenuClose()}
        />
        <div className="moMenuInner">
          <div className="moMenuHeader">
            <div className="logoArea">
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" height={32} />
              <span className={badgeClassName}>{badgeLabel}</span>
            </div>
            <button
              type="button"
              className="menuClose"
              aria-label="메뉴 닫기"
              onClick={handleMenuClose}
            >
              <img src={`${IMG}/icon/ico_close_32.png`} alt="닫기" />
            </button>
          </div>
          <div className="moMenuContent">
            <nav className="moMenuNav">
              <ul className="moNavList">
                {ACADEMY_NAV_ITEMS.map((item, i) => (
                  <li key={i} className="navItem">
                    <a href={item.href} className="moMainLink">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="moMenuFooter">
                <a href="#" className="btn-login">
                  로그인
                </a>
                <a href="/userWeb" className="btn-portal">
                  꿈이음센터포털 바로가기
                </a>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AcademyHeader;
