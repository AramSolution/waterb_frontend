"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import {
  NoticeCommunityChrome,
  type CommunityBreadcrumbMode,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

/**
 * 비밀글 비밀번호 — 커뮤니티 껍데기(`qna2` 계열)와 동일.
 * URL: ?nttId=&bbsId=&tab=qna|archive&type= 또는 &reqGbPosition=
 */
export default function QnaPwSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nttIdParam = searchParams.get("nttId");
  const bbsId = searchParams.get("bbsId");
  const tab = searchParams.get("tab") ?? "qna";
  const type = searchParams.get("type");
  const reqGbPosition = searchParams.get("reqGbPosition");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nttId =
    nttIdParam != null && nttIdParam !== "" ? parseInt(nttIdParam, 10) : null;
  const isValidParams =
    nttId != null && !Number.isNaN(nttId) && bbsId != null && bbsId !== "";

  const themeQuery = useMemo(() => {
    if (type) return `type=${encodeURIComponent(type)}`;
    if (reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
    return "";
  }, [type, reqGbPosition]);

  const isArchive = tab === "archive";
  const headTit = isArchive ? "자료실" : "1:1 문의";
  const activeNav: CommunityChromeActiveNav = isArchive ? "eumArchive" : "qna";
  const breadcrumbMode: CommunityBreadcrumbMode = isArchive
    ? "eumArchive"
    : "default";

  const listHref = useMemo(() => {
    const q = new URLSearchParams();
    if (isArchive) q.set("tab", "archive");
    for (const k of ["page", "pageSize", "searchCnd", "searchWrd"] as const) {
      const v = searchParams.get(k);
      if (v != null && v !== "") q.set(k, v);
    }
    if (themeQuery) {
      const t = new URLSearchParams(themeQuery);
      t.forEach((v, k) => q.set(k, v));
    }
    const s = q.toString();
    if (s) return `/userWeb/qna?${s}`;
    return isArchive ? "/userWeb/qna?tab=archive" : "/userWeb/qna";
  }, [isArchive, searchParams, themeQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidParams) {
      setError("잘못된 접근입니다. 목록에서 다시 시도해 주세요.");
      return;
    }
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    apiClient
      .post<{ success: boolean }>(API_ENDPOINTS.USER_ARTICLE_CONFIRM_PASSWORD, {
        bbsId,
        nttId,
        password: password.trim(),
      })
      .then((res) => {
        if (res?.success) {
          const q = new URLSearchParams();
          q.set("bbsId", bbsId);
          const pageRaw = searchParams.get("page");
          const pageOk =
            pageRaw != null && pageRaw !== "" && /^\d+$/.test(pageRaw);
          q.set("page", pageOk ? pageRaw : "1");
          if (tab === "archive") q.set("tab", "archive");
          const ps = searchParams.get("pageSize");
          if (ps) q.set("pageSize", ps);
          const sc = searchParams.get("searchCnd");
          const sw = searchParams.get("searchWrd");
          if (sw != null && sw.trim() !== "") {
            if (sc) q.set("searchCnd", sc);
            q.set("searchWrd", sw);
          }
          if (themeQuery) {
            const t = new URLSearchParams(themeQuery);
            t.forEach((v, k) => q.set(k, v));
          }
          router.push(`/userWeb/qna/${nttId}?${q.toString()}`);
        } else {
          setError("비밀번호가 일치하지 않습니다.");
          setSubmitting(false);
        }
      })
      .catch(() => {
        setError("확인 중 오류가 발생했습니다. 다시 시도해 주세요.");
        setSubmitting(false);
      });
  };

  const wrap = (body: React.ReactNode) => (
    <NoticeCommunityChrome
      themeQuery={themeQuery}
      shell="community"
      headTit={headTit}
      breadcrumbCurrent={headTit}
      breadcrumbMode={breadcrumbMode}
      activeNav={activeNav}
    >
      <section className="mainViewContent mt-40 inner">{body}</section>
    </NoticeCommunityChrome>
  );

  if (!isValidParams) {
    return wrap(
      <div className="registrationContainer bizInput">
        <div className="qnaPwWrap t_center">
          <p className="bd-18">
            잘못된 접근입니다. 목록에서 글을 선택해 주세요.
          </p>
          <button
            type="button"
            className="btnSubmit"
            onClick={() => router.push(listHref)}
          >
            목록으로
          </button>
        </div>
      </div>,
    );
  }

  return wrap(
    <div className="registrationContainer bizInput">
      <div className="qnaPwWrap t_center">
        <form onSubmit={handleSubmit}>
          <div className="bd-24 mb-24">비밀번호 입력</div>
          <div className="bd-18 mb-40">
            글 작성시 설정한 비밀번호를 입력해 주세요
          </div>
          {error && (
            <p
              className="bd-18 mb-24"
              style={{ color: "var(--color-error, #c00)" }}
            >
              {error}
            </p>
          )}
          <div className="formControl">
            <input
              type="password"
              id="writePw"
              className="inputField"
              placeholder="비밀번호를 입력해주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          <div className="formActions">
            <button
              type="submit"
              className="btnSubmit"
              disabled={submitting}
            >
              {submitting ? "확인 중…" : "확인하기"}
            </button>
          </div>
        </form>
      </div>
    </div>,
  );
}
