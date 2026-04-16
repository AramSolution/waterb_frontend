"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import BizInputPrSection from "@/widgets/userWeb/BizInputPrSection";
import { AuthService } from "@/entities/auth/api";

/**
 * 사전지원 신청정보·수강확인증 화면 (gunsan apply_pr.html 대응).
 * 실제 폼·첨부·API는 BizInputPrSection의 fromMypage 모드와 동일하게 사용합니다.
 * 쿼리는 bizInputPr와 동일하게 전달 (proId, reqEsntlId, reqId, proGb, from=mypage 등).
 */
function ApplyPrPageContent() {
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? undefined;
  const proGb = searchParams.get("proGb") ?? "02";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const reqId = searchParams.get("reqId") ?? undefined;

  const userSe = AuthService.getUserSe();
  const isAuthenticated = AuthService.isAuthenticated();

  const reqGbPosition = searchParams.get("reqGbPosition");
  const typeParam = searchParams.get("type");

  let badgeLabel: string | undefined;
  let themeOverride: "student" | "parent" | undefined;

  if (isAuthenticated && userSe === "SNR") {
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (isAuthenticated && userSe === "PNR") {
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else if (reqGbPosition === "1") {
    badgeLabel = "학생";
    themeOverride = "student";
  } else if (reqGbPosition === "2" || typeParam === "parent") {
    badgeLabel = "학부모/일반";
    themeOverride = "parent";
  } else {
    badgeLabel = undefined;
    themeOverride = undefined;
  }

  return (
    <LayoutWrapper
      headerType="main"
      mainClassName="bizBg"
      badgeLabel={badgeLabel}
      themeOverride={themeOverride}
    >
      <BizInputPrSection
        proId={proId}
        proGb={proGb}
        fromMypage
        initialReqEsntlId={reqEsntlId}
        initialReqId={reqId}
      />
    </LayoutWrapper>
  );
}

export default function ApplyPrPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <ApplyPrPageContent />
    </Suspense>
  );
}
