"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutWrapper, type LayoutThemeType } from "@/widgets/userWeb/layout";
import JoinAcSection from "@/widgets/userWeb/JoinAcSection";
import JoinMentorSection from "@/widgets/userWeb/JoinMentorSection";
import JoinParentSection from "@/widgets/userWeb/JoinParentSection";
import JoinStudentSection from "@/widgets/userWeb/JoinStudentSection";

const VALID_JOIN_TYPES: LayoutThemeType[] = [
  "student",
  "parent",
  "academy",
  "mentor",
];

function joinTypeFromParam(type: string | null): LayoutThemeType {
  if (type && VALID_JOIN_TYPES.includes(type as LayoutThemeType)) {
    return type as LayoutThemeType;
  }
  return "student";
}

const BADGE_LABEL_BY_THEME: Record<LayoutThemeType, string> = {
  student: "학생",
  parent: "학부모/일반",
  school: "기관",
  academy: "학원",
  mentor: "멘토",
};

/**
 * join_ac.html → React 변환
 * 원본: source/gunsan/join_ac.html
 * 공통: #skip, #main_content, MainHeader/PortalHeader, Footer, main+join_ac CSS
 * type 쿼리(학생/학부모/학원/멘토)에 따라 data-theme 적용 → header.css 색상(보라/초록 등) 적용
 */
export default function JoinAcPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const themeOverride = useMemo(
    () => joinTypeFromParam(searchParams.get("type")),
    [searchParams],
  );
  const [canEnter, setCanEnter] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const joinType = joinTypeFromParam(searchParams.get("type"));
    let isValid = false;

    try {
      const certRaw = sessionStorage.getItem("joinCertData");
      const termsRaw = sessionStorage.getItem("joinTermsPassed");
      const certData = certRaw ? JSON.parse(certRaw) : null;
      const termsData = termsRaw ? JSON.parse(termsRaw) : null;

      const hasCertData =
        !!certData &&
        typeof certData.userName === "string" &&
        typeof certData.celNo === "string" &&
        typeof certData.birYMD === "string" &&
        certData.userName.trim() !== "" &&
        certData.celNo.trim() !== "" &&
        certData.birYMD.trim() !== "";

      const termsMatchType =
        !!termsData &&
        typeof termsData.type === "string" &&
        termsData.type === joinType;

      isValid = hasCertData && termsMatchType;
    } catch {
      isValid = false;
    }

    setCanEnter(isValid);
    setIsCheckingAccess(false);
    if (!isValid) {
      router.replace(`/userWeb/terms?type=${joinType}`);
    }
  }, [router, searchParams]);

  if (isCheckingAccess || !canEnter) {
    return null;
  }

  return (
    <LayoutWrapper
      headerType="main"
      themeOverride={themeOverride}
      badgeLabel={BADGE_LABEL_BY_THEME[themeOverride]}
      headerBadgeLabel={BADGE_LABEL_BY_THEME[themeOverride]}
      mainClassName="joinBg"
      disableHeaderNav={themeOverride === "academy" || themeOverride === "mentor"}
    >
      <div className="joinBg">
        {themeOverride === "student" && <JoinStudentSection />}
        {themeOverride === "academy" && <JoinAcSection />}
        {themeOverride === "parent" && <JoinParentSection />}
        {themeOverride === "mentor" && <JoinMentorSection mode="join" />}
      </div>
    </LayoutWrapper>
  );
}
