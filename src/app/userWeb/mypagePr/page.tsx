"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import MypageSection from "@/widgets/userWeb/MypageSection";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";

/**
 * mypage_pr.html → React 변환
 * 원본: source/gunsan/mypage_pr.html
 * 공통: #skip, #main_content, 헤더(학부모 배지), 푸터, main + mypage_pr CSS
 * 클래스명·id·접근성 원본 유지
 * 미로그인 시 이동하지 않음: MY PAGE 링크는 헤더에서 막고 모달만 표시. 직접 접근 시 main으로 리다이렉트 후 모달 표시.
 */
export default function MypagePrPage() {
  const router = useRouter();
  const auth = useUserWebAuthOptional();
  const isAuthReady = auth?.isAuthReady ?? false;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  /** Hydration 방지: 마운트 전에는 항상 placeholder. 서버·클라이언트 첫 렌더가 동일해야 함 */
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !isAuthReady) return;
    if (!isAuthenticated) {
      router.replace("/userWeb");
    }
  }, [mounted, isAuthReady, isAuthenticated, router]);

  /* 마운트 전이거나 인증 전: placeholder만 렌더 → 서버와 클라이언트 첫 렌더 일치 */
  if (!mounted || !isAuthReady || !isAuthenticated) {
    return (
      <div className="bizBg" aria-live="polite" aria-busy="true">
        <p className="loading">잠시만 기다려 주세요.</p>
      </div>
    );
  }

  return (
    <LayoutWrapper headerType="mypage">
      <div className="bizBg">
        <MypageSection />
      </div>
    </LayoutWrapper>
  );
}
