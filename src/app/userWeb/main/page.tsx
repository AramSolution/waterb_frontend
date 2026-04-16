"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import type { LayoutThemeType } from "@/widgets/userWeb/layout";
import EduListSection from "@/widgets/userWeb/EduListSection";
import AcademyInfoSection from "@/widgets/userWeb/AcademyInfoSection";
import { useUserWebAuth } from "@/features/userWeb/auth/context/UserWebAuthContext";
import {
  userWebBadgeLabelFromUrl,
  userWebThemeTypeFromUrl,
} from "@/shared/lib/userWebEntryFromUrl";

const BIZINFO_PATH = "/userWeb/bizInfo";

export default function MainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const reqGbPositionParam = searchParams.get("reqGbPosition");
  const reqGbPosition =
    reqGbPositionParam != null ? parseInt(reqGbPositionParam, 10) : null;
  const validReqGbPosition =
    reqGbPosition != null && reqGbPosition >= 1 && reqGbPosition <= 5
      ? reqGbPosition
      : null;

  const { handleRequireLogin, openLoginRequiredForMypageModal, isAuthenticated, badgeLabel: authBadgeLabel, themeType: authThemeType } =
    useUserWebAuth();

  const hasExplicitEntry = validReqGbPosition != null || typeParam != null;
  /** reqGbPosition=1이면 type=parent와 함께 와도 학생 진입으로 본다(LayoutWrapper·EduListSection과 동일) */
  const entryType =
    validReqGbPosition === 1
      ? "student"
      : typeParam === "parent" || validReqGbPosition === 2
        ? "parent"
        : typeParam === "school" || validReqGbPosition === 5
          ? "school"
          : "student";
  
  /** 배지 라벨: 로그인 상태가 있으면 로그인 사용자 타입 우선, 없으면 URL 파라미터로 결정 */
  const badgeLabel = useMemo(
    () => {
      // 로그인 상태가 있으면 로그인 사용자 타입 우선
      if (isAuthenticated && authBadgeLabel) {
        return authBadgeLabel;
      }
      // URL에 진입 유형이 있으면 URL 파라미터로 결정
      if (hasExplicitEntry) {
        return userWebBadgeLabelFromUrl(validReqGbPosition, typeParam);
      }
      // 둘 다 없으면 undefined (LayoutWrapper가 기본값 사용)
      return undefined;
    },
    [isAuthenticated, authBadgeLabel, hasExplicitEntry, validReqGbPosition, typeParam],
  );
  
  /** 테마: 로그인 상태가 있으면 로그인 사용자 타입 우선, 없으면 URL 파라미터로 결정 */
  const themeOverride = useMemo(
    () => {
      // 로그인 상태가 있으면 로그인 사용자 타입 우선
      if (isAuthenticated && authThemeType) {
        return authThemeType;
      }
      // URL에 진입 유형이 있으면 URL 파라미터로 결정
      if (hasExplicitEntry) {
        return userWebThemeTypeFromUrl(validReqGbPosition, typeParam);
      }
      // 둘 다 없으면 undefined (LayoutWrapper가 기본값 사용)
      return undefined;
    },
    [isAuthenticated, authThemeType, hasExplicitEntry, validReqGbPosition, typeParam],
  );
  
  /** mypagePr 미로그인 직접 접근 후 리다이렉트 시: 현재 페이지(main)에서 로그인 안내 모달 표시 */
  useEffect(() => {
    if (searchParams.get("loginRequired") === "mypage") {
      openLoginRequiredForMypageModal();
      const next = new URLSearchParams(searchParams.toString());
      next.delete("loginRequired");
      const q = next.toString();
      router.replace(q ? `/userWeb/main?${q}` : "/userWeb/main");
    }
  }, [searchParams, openLoginRequiredForMypageModal, router]);

  const redirectPath =
    entryType === "parent" ? `${BIZINFO_PATH}?type=parent` : BIZINFO_PATH;

  const onRequireLogin = useCallback(
    (path?: string) => {
      handleRequireLogin(path ?? redirectPath);
    },
    [handleRequireLogin, redirectPath],
  );

  /** 학원(reqGbPosition=3): 교육 목록 없음 — 학원소개만(gunsan·기존 학원 메인). 그 외 유형은 교육 목록+visual */
  const isAcademyMain = validReqGbPosition === 3;

  return (
    <div data-entry-type={entryType}>
      <LayoutWrapper
        headerType="main"
        badgeLabel={badgeLabel}
        themeOverride={themeOverride}
      >
        {isAcademyMain ? (
          <AcademyInfoSection />
        ) : (
          <EduListSection onRequireLogin={onRequireLogin} layoutMainHtml />
        )}
      </LayoutWrapper>
    </div>
  );
}
