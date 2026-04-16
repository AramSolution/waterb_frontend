"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PortalHeader from "./PortalHeader";
import MainHeader from "./MainHeader";
import type { MainHeaderNavVariant } from "./MainHeader";
import AcademyHeader from "./AcademyHeader";
import Footer from "./Footer";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import {
  userWebBadgeLabelFromUrl,
  userWebThemeTypeFromUrl,
  type UserWebEntryThemeType,
} from "@/shared/lib/userWebEntryFromUrl";

/** data-theme 값: header.css의 학생/학부모/school(기관)/학원/멘토 색상 적용용 */
export type LayoutThemeType = UserWebEntryThemeType;

interface LayoutWrapperProps {
  children: React.ReactNode;
  headerType?: "portal" | "main" | "academy" | "mypage";
  /** main 요소에 적용할 추가 className (예: bizBg) - 원본 HTML 구조 유지용 */
  mainClassName?: string;
  badgeLabel?: string;
  /** 미로그인 시 테마 강제 (예: 회원가입 페이지에서 type 쿼리 기준 색상) */
  themeOverride?: LayoutThemeType;
  /** academy 헤더: 배지 문구 (예: 회원가입 페이지에서 학생/학부모/학원/멘토) */
  headerBadgeLabel?: string;
  /** academy 헤더: 배지 className (테마 색상용 badgeStudent 등) */
  headerBadgeClassName?: string;
  /** main 헤더 로그인 버튼 클릭 시 호출 (userWeb Context 미사용 시) */
  onLoginClick?: () => void;
  /** main 헤더: 로그인 여부 (userWeb Context 미사용 시) */
  isAuthenticated?: boolean;
  /** main 헤더: 로그아웃 시 호출 (userWeb Context 미사용 시) */
  onLogout?: () => void;
  /** 약관/회원가입 등에서 학원·멘토 네비(학원정보, 가맹신청, 통계정보, 공지사항) 클릭 이동 비활성화 */
  disableHeaderNav?: boolean;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  children,
  headerType = "portal",
  mainClassName,
  badgeLabel: badgeLabelProp,
  themeOverride,
  headerBadgeLabel,
  headerBadgeClassName,
  onLoginClick: onLoginClickProp,
  isAuthenticated: isAuthenticatedProp,
  onLogout: onLogoutProp,
  disableHeaderNav,
}) => {
  const auth = useUserWebAuthOptional();
  const searchParams = useSearchParams();

  /** Hydration 방지: 서버·클라이언트 첫 렌더는 data-theme 없이, 마운트 후에만 적용 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /** main / mypage일 때 URL을 읽어 배지·테마·네비 적용 (mypage에서도 학원/멘토 헤더 유지) */
  const isMainOrMypageForUrl = headerType === "main" || headerType === "mypage";
  const urlReqGbPositionParam = isMainOrMypageForUrl
    ? searchParams.get("reqGbPosition")
    : null;
  const urlReqGbPosition =
    urlReqGbPositionParam != null ? parseInt(urlReqGbPositionParam, 10) : null;
  const urlValidReqGbPosition =
    urlReqGbPosition != null && urlReqGbPosition >= 1 && urlReqGbPosition <= 5
      ? urlReqGbPosition
      : null;
  const urlTypeParam = isMainOrMypageForUrl ? searchParams.get("type") : null;
  const urlHasEntry =
    isMainOrMypageForUrl &&
    (urlValidReqGbPosition != null || urlTypeParam != null);
  const urlBadgeLabel = urlHasEntry
    ? userWebBadgeLabelFromUrl(urlValidReqGbPosition, urlTypeParam)
    : null;
  const urlThemeOverride = urlHasEntry
    ? userWebThemeTypeFromUrl(urlValidReqGbPosition, urlTypeParam)
    : null;
  const urlEntryIsStudentOrParent =
    urlValidReqGbPosition === 1 ||
    urlValidReqGbPosition === 2 ||
    urlValidReqGbPosition === 5 ||
    urlTypeParam === "parent" ||
    urlTypeParam === "school";

  /** main / mypage: 진입 경로(URL)가 학생/학부모면 항상 그쪽 배지·테마·네비. 학원/멘토는 URL(reqGbPosition=3|4) 또는 로그인 계정 기준 */
  const isMainOrMypage = headerType === "main" || headerType === "mypage";
  const entryIsStudentOrParentFromProps =
    themeOverride === "student" ||
    themeOverride === "parent" ||
    themeOverride === "school" ||
    badgeLabelProp === "학생" ||
    badgeLabelProp === "학부모/일반" ||
    badgeLabelProp === "기관";
  const entryIsStudentOrParent = urlHasEntry
    ? urlEntryIsStudentOrParent
    : entryIsStudentOrParentFromProps;
  /** main 또는 mypage에서 학원/멘토면 해당 네비·배지·테마 유지 (학원이 MY PAGE 들어가도 학원정보·가맹신청·통계정보·MY PAGE 유지). 약관/회원가입에서 type=academy|mentor일 때도 동일 헤더 적용 */
  const isAcademyOrMentorOnMain =
    isMainOrMypage &&
    (auth?.themeType === "academy" ||
      auth?.themeType === "mentor" ||
      urlValidReqGbPosition === 3 ||
      urlValidReqGbPosition === 4 ||
      themeOverride === "academy" ||
      themeOverride === "mentor") &&
    !entryIsStudentOrParent;
  const navVariant: MainHeaderNavVariant | undefined = isAcademyOrMentorOnMain
    ? themeOverride === "academy"
      ? "academy"
      : themeOverride === "mentor"
        ? "mentor"
        : urlValidReqGbPosition === 3
          ? "academy"
          : urlValidReqGbPosition === 4
            ? "mentor"
            : auth?.themeType === "academy"
              ? "academy"
              : "mentor"
    : undefined;
  /** 배지: URL에 3/4가 있으면 URL 우선(깜빡임 방지). themeOverride로 학원/멘토일 때는 headerBadgeLabel/badgeLabelProp, 그 외 props/auth */
  const badgeLabel = !mounted
    ? (urlBadgeLabel ?? badgeLabelProp ?? headerBadgeLabel ?? "학생")
    : isAcademyOrMentorOnMain
      ? ((urlValidReqGbPosition === 3 || urlValidReqGbPosition === 4
          ? urlBadgeLabel
          : null) ?? (themeOverride === "academy" || themeOverride === "mentor" ? (badgeLabelProp ?? headerBadgeLabel ?? "학원") : (auth?.badgeLabel ?? "학원")))
      : (urlBadgeLabel ??
        badgeLabelProp ??
        headerBadgeLabel ??
        (isMainOrMypage && auth?.isAuthenticated ? auth.badgeLabel : "학생"));
  const onLoginClick =
    isMainOrMypage && auth ? auth.handleHeaderLoginClick : onLoginClickProp;
  const isAuthenticated =
    isMainOrMypage && auth
      ? auth.isAuthenticated
      : (isAuthenticatedProp ?? false);
  const onLogout = isMainOrMypage && auth ? auth.handleLogout : onLogoutProp;

  /** 테마: URL에 3/4가 있으면 URL 우선(깜빡임 방지). themeOverride로 학원/멘토일 때는 themeOverride, 그 외 auth */
  /** 포털(PortalHeader): 원본 HTML 색상(default.css --primary) 유지 — 로그인 계정 테마로 본문을 빨강 등으로 바꾸지 않음 */
  const themeAttr = isAcademyOrMentorOnMain
    ? ((urlValidReqGbPosition === 3 || urlValidReqGbPosition === 4
        ? urlThemeOverride
        : null) ?? (themeOverride === "academy" || themeOverride === "mentor" ? themeOverride : auth?.themeType))
    : headerType === "portal"
      ? (themeOverride ?? undefined)
      : (urlThemeOverride ??
        themeOverride ??
        auth?.themeType ??
        (headerType === "main" ? "student" : undefined));
  /**
   * data-theme 적용 시점:
   * - URL에 reqGbPosition/type 등으로 진입 유형이 있으면(urlThemeOverride) 서버·클라이언트가 동일하게 계산되므로
   *   마운트 전에도 즉시 적용 → 포털에서 router로 /userWeb/main?… 진입 시 본문(.eduListWrap .visual 등) 여백·색 변수 깜빡임 완화.
   * - URL로 테마가 정해지지 않고 auth·기본값에만 의존하는 경우는 기존처럼 mounted 후 적용(hydration 안전).
   */
  const themeSpread =
    themeAttr &&
    (mounted || urlThemeOverride != null)
      ? { "data-theme": themeAttr }
      : {};

  return (
    <div className="userWebLayoutShell" {...themeSpread}>
      <div id="skip">
        <a href="#main_content">본문 바로가기</a>
      </div>
      {headerType === "portal" && <PortalHeader />}
      {headerType === "main" && (
        <MainHeader
          badgeLabel={badgeLabel}
          navVariant={navVariant}
          onLoginClick={onLoginClick}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          onMypageClickWhenUnauth={auth?.openLoginRequiredForMypageModal}
          navLinksDisabled={disableHeaderNav}
        />
      )}
      {headerType === "academy" && (
        <AcademyHeader
          badgeLabel={headerBadgeLabel}
          badgeClassName={headerBadgeClassName}
        />
      )}
      {headerType === "mypage" && (
        <MainHeader
          badgeLabel={badgeLabel}
          navVariant={navVariant}
          onLoginClick={onLoginClick}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          onMypageClickWhenUnauth={auth?.openLoginRequiredForMypageModal}
        />
      )}
      <main id="main_content" className={mainClassName}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default LayoutWrapper;
