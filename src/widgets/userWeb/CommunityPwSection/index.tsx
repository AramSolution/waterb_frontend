"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import {
  API_ENDPOINTS,
  USER_ARCHIVE_BBS_ID,
  USER_BOARD_BBS_IDS,
  USER_GENERAL_ARCHIVE_BBS_ID,
} from "@/shared/config/apiUser";
import {
  NoticeCommunityChrome,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

const TAB_HEAD: Record<string, string> = {
  notice: "공지사항",
  project: "지원사업",
  eumArchive: "이음 아카이브",
  inquiry: "문의하기",
  guide: "일반 자료실",
};

function listTabToActiveNav(tab: string): CommunityChromeActiveNav {
  if (tab === "guide") return "guide";
  if (tab === "eumArchive") return "eumArchive";
  if (tab === "project") return "project";
  if (tab === "inquiry") return "inquiry";
  return "notice";
}

/**
 * 커뮤니티 비밀글 비밀번호 — notice2 껍데기
 */
export default function CommunityPwSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nttIdParam = searchParams.get("nttId");
  const bbsId = searchParams.get("bbsId");
  const pageParam = searchParams.get("page");
  const page = useMemo(() => {
    const n = pageParam ? parseInt(pageParam, 10) : 1;
    if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) return 1;
    return n;
  }, [pageParam]);
  const listTab = useMemo(() => {
    if (bbsId === USER_BOARD_BBS_IDS.NOTICE) return "notice";
    if (bbsId === USER_BOARD_BBS_IDS.SUPPORT) return "project";
    if (bbsId === USER_ARCHIVE_BBS_ID) return "eumArchive";
    if (bbsId === USER_BOARD_BBS_IDS.INQUIRY) return "inquiry";
    if (
      bbsId === USER_GENERAL_ARCHIVE_BBS_ID ||
      bbsId === USER_BOARD_BBS_IDS.GUIDE
    )
      return "guide";
    return "inquiry";
  }, [bbsId]);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nttId =
    nttIdParam != null && nttIdParam !== "" ? parseInt(nttIdParam, 10) : null;
  const isValidParams =
    nttId != null && !Number.isNaN(nttId) && bbsId != null && bbsId !== "";

  const headTit = TAB_HEAD[listTab] ?? "문의하기";
  const activeNav = listTabToActiveNav(listTab);
  const listHref = `/userWeb/community?tab=${listTab}&page=${page}`;
  const archiveBreadcrumb =
    listTab === "guide"
      ? ("generalArchive" as const)
      : listTab === "eumArchive"
        ? ("eumArchive" as const)
        : ("default" as const);

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
          router.push(
            `/userWeb/community/${nttId}?bbsId=${encodeURIComponent(
              bbsId ?? "",
            )}&page=${page}`,
          );
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

  if (!isValidParams) {
    return (
      <NoticeCommunityChrome
        themeQuery=""
        shell="community"
        headTit={headTit}
        breadcrumbCurrent="비밀번호 입력"
        breadcrumbMode={archiveBreadcrumb}
        activeNav={activeNav}
      >
        <section className="mainViewContent inner">
          <div className="registrationContainer bizInput">
            <div className="qnaPwWrap t_center">
              <p className="bd-18">
                잘못된 접근입니다. 목록에서 글을 선택해 주세요.
              </p>
              <div className="formActions">
                <button
                  type="button"
                  className="btnSubmit"
                  onClick={() => router.push(listHref)}
                >
                  목록으로
                </button>
              </div>
            </div>
          </div>
        </section>
      </NoticeCommunityChrome>
    );
  }

  return (
    <NoticeCommunityChrome
      themeQuery=""
      shell="community"
      headTit={headTit}
      breadcrumbCurrent="비밀번호 입력"
      breadcrumbMode={archiveBreadcrumb}
      activeNav={activeNav}
    >
      <section className="mainViewContent inner">
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
                  style={{ color: "var(--error, #c00)" }}
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
        </div>
      </section>
    </NoticeCommunityChrome>
  );
}
