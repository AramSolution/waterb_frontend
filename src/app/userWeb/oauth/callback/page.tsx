"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuthService } from "@/entities/auth/api";

/** 학생/학부모/학원/멘토 모두 /userWeb/main. 학원·멘토는 reqGbPosition으로 헤더만 학원(학원정보·가맹신청·통계정보·MY PAGE)·멘토(멘토신청·통계자료·MY PAGE)로 표시 */
const STATE_TO_REDIRECT: Record<
  string,
  { path: string; reqGbPosition: number; typeParent?: boolean }
> = {
  student: { path: "/userWeb/main", reqGbPosition: 1 },
  parent: { path: "/userWeb/main", reqGbPosition: 2, typeParent: true },
  academy: { path: "/userWeb/main", reqGbPosition: 3 },
  mentor: { path: "/userWeb/main", reqGbPosition: 4 },
};

export default function UserWebOAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const accessToken = searchParams.get("access_token");
    const state = searchParams.get("state") ?? "student";

    // 개발 중 OAuth 콜백에서 프론트로 넘어온 쿼리 전체 확인용 로그
    // (access_token은 JWT이므로 운영에서는 노출되지 않도록 NODE_ENV 체크)
    if (process.env.NODE_ENV !== "production") {
      const params = Object.fromEntries(searchParams.entries());
      console.log("[OAuth callback] queryParams =", params);
      console.log("[OAuth callback] access_token =", accessToken);
      console.log("[OAuth callback] state =", state);
    }

    if (accessToken) {
      // 토큰 기반 세션(userSe/uniqId) 동기화
      // - SNS 로그인 후 MY PAGE에서 폼/테마가 정확히 나오도록 보장
      AuthService.applyAccessToken(accessToken);
    }

    const target = STATE_TO_REDIRECT[state] ?? STATE_TO_REDIRECT.student;
    const url =
      target.path +
      "?reqGbPosition=" +
      target.reqGbPosition +
      (target.typeParent ? "&type=parent" : "");
    router.replace(url);
  }, [searchParams, router]);

  return (
    <div className="inner" style={{ padding: "2rem", textAlign: "center" }}>
      <p>로그인 처리 중입니다...</p>
    </div>
  );
}
