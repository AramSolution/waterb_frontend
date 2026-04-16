"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const IMG = "/images";

const PortalHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileMenuOpen]);

  const handleMenuOpen = () => {
    setIsMobileMenuOpen(true);
    // gunsan index2.html: menuOpen 클릭 시 menuClose로 포커스 이동
    setTimeout(() => {
      const closeBtn = document.querySelector(
        ".menuClose",
      ) as HTMLButtonElement | null;
      closeBtn?.focus();
    }, 0);
  };
  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
    // gunsan index2.html: menuClose 클릭 시 menuOpen으로 포커스 이동
    setTimeout(() => {
      const openBtn = document.querySelector(
        ".menuOpen",
      ) as HTMLButtonElement | null;
      openBtn?.focus();
    }, 0);
  };

  return (
    <header className="header portal">
      <div className="inner web">
        <h1>
          <Link href="/">
            <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" />
          </Link>
        </h1>
        <nav className="nav" aria-label="메인 메뉴">
          <ul className="nav-list">
            <li>
              <Link href="/userWeb/intro">홈페이지 소개</Link>
            </li>
            <li>
              <Link href="/userWeb/schedule">한눈에 일정표</Link>
            </li>
            <li>
              <Link href="/userWeb/community?tab=notice">커뮤니티</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="app" style={{ display: "none" }}>
        <div className="flex-sb">
          <h1>
            <Link href="/">
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" />
            </Link>
          </h1>
          <button
            type="button"
            className="menuOpen"
            aria-controls="mobile-menu"
            aria-expanded={isMobileMenuOpen}
            onClick={handleMenuOpen}
          >
            <img src={`${IMG}/icon/ico_menu_32.png`} alt="메뉴 열기" />
          </button>
        </div>
        <div
          id="mobile-menu"
          className={`moMenu ${isMobileMenuOpen ? "active" : ""}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="flex-sb">
            <div className="logo-area">
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" />
            </div>
            <button
              type="button"
              className="menuClose"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={handleMenuClose}
            >
              <img src={`${IMG}/icon/ico_close_32.png`} alt="메뉴 닫기" />
            </button>
          </div>
          <nav className="nav" aria-label="모바일 메인 메뉴">
            <ul>
              <li>
                <Link href="/userWeb/intro" onClick={handleMenuClose}>
                  홈페이지 소개
                </Link>
              </li>
              <li>
                <Link href="/userWeb/schedule" onClick={handleMenuClose}>
                  한눈에 일정표
                </Link>
              </li>
              <li>
                <Link
                  href="/userWeb/community?tab=notice"
                  onClick={handleMenuClose}
                >
                  커뮤니티
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
