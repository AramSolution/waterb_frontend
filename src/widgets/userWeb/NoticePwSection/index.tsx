"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import { NoticeCommunityChrome } from "@/widgets/userWeb/NoticeCommunityChrome";

/**
 * 공지사항 비밀글 비밀번호 입력
 * URL: ?nttId=&bbsId=&type= 또는 &reqGbPosition=
 * 비밀번호 확인 성공 시 /userWeb/notice/{nttId} 로 이동
 */
export default function NoticePwSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nttIdParam = searchParams.get("nttId");
  const bbsId = searchParams.get("bbsId");
  const type = searchParams.get("type");
  const reqGbPosition = searchParams.get("reqGbPosition");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nttId =
    nttIdParam != null && nttIdParam !== "" ? parseInt(nttIdParam, 10) : null;
  const isValidParams =
    nttId != null && !Number.isNaN(nttId) && bbsId != null && bbsId !== "";

  const themeQuery = React.useMemo(() => {
    if (type) return `type=${encodeURIComponent(type)}`;
    if (reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
    return "";
  }, [type, reqGbPosition]);

  const listHref = themeQuery
    ? `/userWeb/notice?${themeQuery}`
    : "/userWeb/notice";

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
          const detailPath =
            nttId != null
              ? themeQuery
                ? `/userWeb/notice/${nttId}?${themeQuery}`
                : `/userWeb/notice/${nttId}`
              : listHref;
          router.push(detailPath);
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
      <NoticeCommunityChrome themeQuery={themeQuery} shell="notice">
        <section className="mainViewContent inner">
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
          </div>
        </section>
      </NoticeCommunityChrome>
    );
  }

  return (
    <NoticeCommunityChrome themeQuery={themeQuery} shell="notice">
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
                  style={{ color: "var(--color-error, #c00)" }}
                >
                  {error}
                </p>
              )}
              <div className="formControl">
                <input
                  type="password"
                  id="noticePw"
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
