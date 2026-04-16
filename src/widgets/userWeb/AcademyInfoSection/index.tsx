"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AuthService } from "@/entities/auth/api";
import type { ArmuserDetailResponse } from "@/entities/adminWeb/armuser/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { API_CONFIG, FILES } from "@/shared/config/apiUser";
import {
  formatBizRegNo,
  formatPhoneWithHyphen,
} from "@/shared/lib/inputValidation";

const IMG = "/images/userWeb";

/**
 * 학원 메인(reqGbPosition=3): 교육 목록 대신 학원 정보 표시.
 * 래퍼는 다른 유형 메인과 동일하게 eduListWrap--mainHtml + 하단 .visual (main.css).
 * 폼 블록: main_ac.html / main_ac.css (.eduListWrap.bizInput)
 */
export interface AcademyInfoSectionProps {
  /** 학원명 (미전달 시 목업) */
  academyName?: string;
  /** 대표자 */
  ceoName?: string;
  /** 사업자등록번호 */
  bizNo?: string;
  /** 연락처 */
  tel?: string;
  /** FAX */
  fax?: string;
  /** 휴대폰 */
  mobile?: string;
  /** 이메일 */
  email?: string;
  /** 주소 */
  address?: string;
  /** 취급과목 */
  subjects?: string;
  /** 학원소개 */
  intro?: string;
  /** 로고 이미지 URL (미전달 시 목업) */
  logoUrl?: string;
}

const DEFAULT_INFO = {
  academyName: "러셀 과학학원",
  ceoName: "김아람",
  bizNo: "123-456-7890",
  tel: "02-1234-5678",
  fax: "02-1234-5679",
  mobile: "010-1234-5678",
  email: "russel@science.com",
  address: "전북특별자치도 군산시 나운동 1234-5",
  subjects: "통합과학, 물리Ⅰ, 화학Ⅰ, 생명과학Ⅰ, 지구과학Ⅰ",
  intro:
    "러셀과학학원은 학생들의 과학적 사고력을 증진시키고, 변화하는 입시 환경에 최적화된 맞춤형 교육 솔루션을 제공합니다.",
  logoUrl: `${IMG}/img_logo_ex.png`,
};

const AcademyInfoSection: React.FC<AcademyInfoSectionProps> = ({
  academyName = DEFAULT_INFO.academyName,
  ceoName = DEFAULT_INFO.ceoName,
  bizNo = DEFAULT_INFO.bizNo,
  tel = DEFAULT_INFO.tel,
  fax = DEFAULT_INFO.fax,
  mobile = DEFAULT_INFO.mobile,
  email = DEFAULT_INFO.email,
  address = DEFAULT_INFO.address,
  subjects = DEFAULT_INFO.subjects,
  intro = DEFAULT_INFO.intro,
  logoUrl = DEFAULT_INFO.logoUrl,
}) => {
  const fallbackInfo = useMemo<AcademyInfoSectionProps>(
    () => ({
      academyName,
      ceoName,
      bizNo,
      tel,
      fax,
      mobile,
      email,
      address,
      subjects,
      intro,
      logoUrl,
    }),
    [
      academyName,
      ceoName,
      bizNo,
      tel,
      fax,
      mobile,
      email,
      address,
      subjects,
      intro,
      logoUrl,
    ],
  );

  const [info, setInfo] = useState<AcademyInfoSectionProps>(fallbackInfo);

  const getFileViewUrl = (file?: {
    fileId?: number;
    seq?: number;
  }): string | null => {
    const fileId = file?.fileId;
    const seq = file?.seq;
    if (fileId === undefined || fileId === null) return null;
    if (seq === undefined || seq === null) return null;

    const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
    if (!base) return null;

    return `${base}${FILES.VIEW}?fileId=${encodeURIComponent(
      String(fileId),
    )}&seq=${encodeURIComponent(String(seq))}`;
  };

  useEffect(() => {
    let mounted = true;

    async function fetchAcademy() {
      try {
        if (!AuthService.isAuthenticated()) return;

        const res: ArmuserDetailResponse =
          await UserArmuserService.getAcademyDetailForMain();
        const detail: any = res?.detail;
        if (!mounted) return;
        if (!detail) return;

        const userPicFiles = res?.userPicFiles ?? [];
        const logoFromApi = userPicFiles.length
          ? getFileViewUrl(userPicFiles[0])
          : null;

        const computedAddress = [detail?.adres, detail?.detailAdres]
          .filter((v: any) => v != null && String(v).trim() !== "")
          .join(" ");

        setInfo({
          academyName: detail?.userNm ?? fallbackInfo.academyName,
          ceoName: detail?.cxfc ?? fallbackInfo.ceoName,
          bizNo: formatBizRegNo(detail?.bizrno ?? fallbackInfo.bizNo ?? ""),
          tel: detail?.offmTelno ?? fallbackInfo.tel,
          fax: formatPhoneWithHyphen(detail?.fxnum ?? fallbackInfo.fax ?? ""),
          mobile: detail?.mbtlnum ?? fallbackInfo.mobile,
          email: detail?.emailAdres ?? fallbackInfo.email,
          address: computedAddress || fallbackInfo.address,
          subjects: detail?.subjectDesc ?? fallbackInfo.subjects,
          intro: detail?.profileDesc ?? fallbackInfo.intro,
          logoUrl: logoFromApi ?? fallbackInfo.logoUrl,
        });
      } catch (e) {
        console.error("AcademyInfoSection: 학원 상세 조회 실패", e);
        if (!mounted) return;
        setInfo(fallbackInfo);
      }
    }

    fetchAcademy();
    return () => {
      mounted = false;
    };
  }, [fallbackInfo]);

  return (
    <section className="eduListWrap bizInput eduListWrap--mainHtml">
      <div className="inner">
        <div className="tit" id="sectionTitle">
          {info.academyName}
        </div>
        <section className="formSection" aria-labelledby="sectionTitle">
          <div className="academyContainer">
            <div className="logoArea">
              <div className="logoBox">
                <img
                  src={info.logoUrl}
                  alt={`${info.academyName} 로고`}
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.src = `${IMG}/img_noImg.png`;
                    el.alt = "";
                  }}
                />
              </div>
            </div>
            <div className="formGrid">
              <div className="formRow split">
                <div className="fieldUnit">
                  <span className="formLabel">대표자</span>
                  <div className="formControl">
                    <span className="viewText">{info.ceoName}</span>
                  </div>
                </div>
                <div className="fieldUnit">
                  <span className="formLabel">사업자등록번호</span>
                  <div className="formControl">
                    <span className="viewText">{info.bizNo}</span>
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <span className="formLabel">연락처</span>
                  <div className="formControl">
                    <span className="viewText">{info.tel}</span>
                  </div>
                </div>
                <div className="fieldUnit">
                  <span className="formLabel">FAX</span>
                  <div className="formControl">
                    <span className="viewText">{info.fax}</span>
                  </div>
                </div>
              </div>
              <div className="formRow split">
                <div className="fieldUnit">
                  <span className="formLabel">휴대폰</span>
                  <div className="formControl">
                    <span className="viewText">{info.mobile}</span>
                  </div>
                </div>
                <div className="fieldUnit">
                  <span className="formLabel">이메일</span>
                  <div className="formControl">
                    <span className="viewText">{info.email}</span>
                  </div>
                </div>
              </div>
              <div className="formRow">
                <span className="formLabel">주소</span>
                <div className="formControl">
                  <span className="viewText">{info.address}</span>
                </div>
              </div>
              <div className="formRow">
                <span className="formLabel">취급과목</span>
                <div className="formControl">
                  <span className="viewText">{info.subjects}</span>
                </div>
              </div>
              <div className="formRow introRow">
                <span className="formLabel">학원소개</span>
                <div className="formControl">
                  <div className="introBox">{info.intro}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="visual" aria-hidden="true" />
    </section>
  );
};

export default AcademyInfoSection;
