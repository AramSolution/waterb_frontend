"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import type { LayoutThemeType } from "@/widgets/userWeb/layout";
import MentorWorkSection from "@/widgets/userWeb/MentorWorkSection";

function badgeLabelFromParams(
  reqGbPosition: number | null,
  typeParam: string | null,
): string {
  if (typeParam === "parent" || reqGbPosition === 2) return "학부모/일반";
  if (typeParam === "school" || reqGbPosition === 5) return "기관";
  if (reqGbPosition === 3) return "학원";
  if (reqGbPosition === 4) return "멘토";
  return "학생";
}

function themeFromParams(
  reqGbPosition: number | null,
  typeParam: string | null,
): LayoutThemeType {
  if (typeParam === "parent" || reqGbPosition === 2) return "parent";
  if (typeParam === "school" || reqGbPosition === 5) return "school";
  if (reqGbPosition === 3) return "academy";
  if (reqGbPosition === 4) return "mentor";
  return "student";
}

/**
 * 멘토업무 (work_mt.html → React)
 * 원본: source/gunsan/work_mt.html
 * 헤더는 LayoutWrapper(MainHeader) 유지, 본문만 조회조건·정보조회 화면
 */
export default function MentorWorkPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const reqGbPositionParam = searchParams.get("reqGbPosition");
  const reqGbPosition =
    reqGbPositionParam != null ? parseInt(reqGbPositionParam, 10) : null;
  const validReqGbPosition =
    reqGbPosition != null && reqGbPosition >= 1 && reqGbPosition <= 5
      ? reqGbPosition
      : null;

  const badgeLabel = useMemo(
    () => badgeLabelFromParams(validReqGbPosition, typeParam),
    [validReqGbPosition, typeParam],
  );
  const themeOverride = useMemo(
    () => themeFromParams(validReqGbPosition, typeParam),
    [validReqGbPosition, typeParam],
  );

  return (
    <LayoutWrapper
      headerType="main"
      badgeLabel={badgeLabel}
      themeOverride={themeOverride}
      mainClassName="bizBg"
    >
      <MentorWorkSection />
    </LayoutWrapper>
  );
}
