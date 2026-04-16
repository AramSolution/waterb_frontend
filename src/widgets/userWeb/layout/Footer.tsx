"use client";

import Link from "next/link";
import React from "react";

const Footer: React.FC = () => {
  const handleFamilySiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && value !== "") {
      window.open(value, "_blank");
    }
  };

  return (
    <footer className="footer">
      <div className="innerContainer inner">
        <div className="footerInfoWrap">
          <div className="footerLogo">
            <img src="/images/logo_w.png" alt="군산시 꿈이음센터" />
          </div>
          <div className="addressArea">
            <address>
              [54080] 전북특별자치도 군산시 조촌로 22 <span>|</span> 대표전화 : 063)450-2600{" "}
              <span>|</span>{" "}
              <Link
                href="/adminWeb"
                className="goLink"
                target="_blank"
                rel="noopener noreferrer"
              >
                관리자페이지
              </Link>
            </address>
            <p className="copyright">
              Copyright ⓒ 2026 GUNSAN COUNTY. All Rights Reserved.
            </p>
          </div>
        </div>
        <div className="footerLinkWrap">
          <div className="siteSelectBox">
            <select
              id="familySite"
              title="관련 사이트 선택"
              className="customSelect"
              onChange={handleFamilySiteChange}
            >
              <option value="https://www.gunsan.go.kr">군산시청</option>
            </select>
          </div>
          <div className="siteSelectBox">
            <select
              id="familySite"
              title="관련 사이트 선택"
              className="customSelect"
              onChange={handleFamilySiteChange}
            >
              <option value="">개인정보 처리방침</option>
              <option value="#">교육지원사업</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
