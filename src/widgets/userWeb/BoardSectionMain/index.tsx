"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getArchiveArticleList } from "@/entities/userWeb/article/api";
import { apiClient } from "@/shared/lib";
import {
  API_ENDPOINTS,
  getArchiveBbsId,
  getQnaBbsId,
  resolveUserWebBoardParams,
} from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { useUserWebAuth } from "@/features/userWeb/auth/context/UserWebAuthContext";

const IMG = "/images/userWeb";

export interface ArchiveItem {
  id: string;
  subject: string;
  date: string;
}

type ArticleListItem = {
  nttId: number | null;
  nttSj: string | null;
  ntcrDt: string | null;
  /** 묻고답하기만: 답글 개수(0이면 답변대기, 1 이상이면 답변완료) */
  answerCnt?: number | null;
  /** 비밀글 여부 (Y: 비밀글 → 상세 대신 /userWeb/qna/pw로 이동) */
  secretAt?: string | null;
};

type ArticleListResponse = {
  data: ArticleListItem[];
  recordsTotal: number;
  recordsFiltered: number;
};

/** 메인 페이지 묻고 답하기/자료실 노출 개수 (자료실 높이 기준, 양쪽 동일 행 수) */
const MAIN_DISPLAY_LIMIT = 5;

/** 항상 MAIN_DISPLAY_LIMIT개 슬롯 유지: 부족분은 null로 채워 높이·구조 통일 */
function padToLimit<T>(list: T[]): (T | null)[] {
  const out: (T | null)[] = [...list];
  while (out.length < MAIN_DISPLAY_LIMIT) out.push(null);
  return out.slice(0, MAIN_DISPLAY_LIMIT);
}

export interface BoardSectionMainProps {
  /** 묻고 답하기/자료실 더보기 링크에 붙일 쿼리 (reqGbPosition 또는 type) - 진입 유형 유지 */
  themeQuery?: string;
}

const BoardSectionMain: React.FC<BoardSectionMainProps> = ({ themeQuery }) => {
  const { isAuthenticated } = useUserWebAuth();
  const [qnaList, setQnaList] = useState<ArticleListItem[]>([]);
  const [qnaLoading, setQnaLoading] = useState(true);
  const [archiveList, setArchiveList] = useState<ArticleListItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);

  const themeParams = React.useMemo(() => {
    if (!themeQuery) return { reqGbPosition: null, type: null };
    const p = new URLSearchParams(themeQuery);
    return {
      reqGbPosition: p.get("reqGbPosition"),
      type: p.get("type"),
    };
  }, [themeQuery]);

  const boardParams = React.useMemo(() => {
    const userSe = isAuthenticated ? AuthService.getUserSe() : null;
    return resolveUserWebBoardParams(
      themeParams.reqGbPosition,
      themeParams.type,
      userSe,
    );
  }, [themeParams.reqGbPosition, themeParams.type, isAuthenticated]);

  const qnaBbsId = React.useMemo(
    () => getQnaBbsId(boardParams.reqGbPosition, boardParams.type),
    [boardParams.reqGbPosition, boardParams.type],
  );

  const archiveBbsId = React.useMemo(
    () => getArchiveBbsId(boardParams.reqGbPosition, boardParams.type),
    [boardParams.reqGbPosition, boardParams.type],
  );

  /** 메인에 themeQuery 없어도 로그인 시 링크에 reqGbPosition/type 유지 */
  const effectiveLinkQuery = React.useMemo(() => {
    if (themeQuery) return themeQuery;
    if (boardParams.type)
      return `type=${encodeURIComponent(boardParams.type)}`;
    if (boardParams.reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(boardParams.reqGbPosition)}`;
    return "";
  }, [themeQuery, boardParams]);

  useEffect(() => {
    let cancelled = false;
    const url = `${API_ENDPOINTS.USER_ARTICLES}?bbsId=${encodeURIComponent(qnaBbsId)}&limit=${MAIN_DISPLAY_LIMIT}&offset=0`;
    apiClient
      .get<ArticleListResponse>(url)
      .then((res) => {
        if (!cancelled) setQnaList(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setQnaList([]);
      })
      .finally(() => {
        if (!cancelled) setQnaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qnaBbsId]);

  useEffect(() => {
    let cancelled = false;
    getArchiveArticleList({
      bbsId: archiveBbsId,
      limit: MAIN_DISPLAY_LIMIT,
      offset: 0,
    })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setArchiveList(
          rows.map((r) => ({
            nttId: r.nttId ?? null,
            nttSj: r.nttSj ?? null,
            ntcrDt: null,
            secretAt: undefined,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setArchiveList([]);
      })
      .finally(() => {
        if (!cancelled) setArchiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [archiveBbsId]);

  const qnaHref = effectiveLinkQuery
    ? `/userWeb/qna?${effectiveLinkQuery}`
    : "/userWeb/qna";
  const archiveHref = effectiveLinkQuery
    ? `/userWeb/qna?tab=archive&${effectiveLinkQuery}`
    : "/userWeb/qna?tab=archive";

  const qnaDetailHref = (id: string) =>
    effectiveLinkQuery
      ? `/userWeb/qna/${id}?${effectiveLinkQuery}`
      : `/userWeb/qna/${id}`;
  const archiveDetailHref = (id: string) =>
    effectiveLinkQuery
      ? `/userWeb/qna/${id}?tab=archive&${effectiveLinkQuery}`
      : `/userWeb/qna/${id}?tab=archive`;

  /** 비밀글일 때 비밀번호 입력 페이지 링크 */
  const qnaPwHref = (nttId: number | null) => {
    if (nttId == null) return "#";
    const q = `nttId=${nttId}&bbsId=${encodeURIComponent(qnaBbsId)}&tab=qna`;
    return `/userWeb/qna/pw?${q}${effectiveLinkQuery ? `&${effectiveLinkQuery}` : ""}`;
  };
  const archivePwHref = (nttId: number | null) => {
    if (nttId == null) return "#";
    const q = `nttId=${nttId}&bbsId=${encodeURIComponent(archiveBbsId)}&tab=archive`;
    return `/userWeb/qna/pw?${q}${effectiveLinkQuery ? `&${effectiveLinkQuery}` : ""}`;
  };

  return (
    <section className="boardSection">
      <div className="inner">
        <div className="boardContainer">
          <div className="boardHeader">
            <div className="tit">
              <span className="icon" aria-hidden="true">
                <img src={`${IMG}/icon/ico_tit2.png`} alt="" />
              </span>
              묻고 답하기
            </div>
            <Link href={qnaHref} className="btnMore" title="묻고 답하기 더보기">
              더보기{" "}
              <span className="plus" aria-hidden="true">
                <img src={`${IMG}/icon/ico_next_40_w.png`} alt="" />
              </span>
            </Link>
          </div>
          <div className="boardCard">
            <ul className="boardList">
              {qnaLoading &&
                Array.from({ length: MAIN_DISPLAY_LIMIT }).map((_, i) => (
                  <li key={`qna-skeleton-${i}`}>
                    <span className="badge" />
                    <span className="subject" />
                    <span className="date" />
                  </li>
                ))}
              {!qnaLoading &&
                padToLimit(qnaList).map((item, i) => {
                  if (item == null) {
                    return (
                      <li key={`qna-ph-${i}`}>
                        <Link
                          href="#"
                          style={{
                            pointerEvents: "none",
                            cursor: "default",
                          }}
                        >
                          <span className="subject" />
                          <span className="date" />
                        </Link>
                      </li>
                    );
                  }
                  const answered = item.answerCnt != null && item.answerCnt > 0;
                  const href =
                    item.secretAt === "Y"
                      ? qnaPwHref(item.nttId)
                      : qnaDetailHref(String(item.nttId ?? ""));
                  return (
                    <li key={item.nttId ?? i}>
                      <Link href={href}>
                        <span
                          className={answered ? "badge complete" : "badge wait"}
                        >
                          {answered ? "답변완료" : "답변대기"}
                        </span>
                        <span className="subject">{item.nttSj ?? ""}</span>
                        <span className="date">{item.ntcrDt ?? ""}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        <div className="boardContainer">
          <div className="boardHeader">
            <h2 className="tit">
              <span className="icon" aria-hidden="true">
                <img src={`${IMG}/icon/ico_tit3.png`} alt="" />
              </span>
              자료실
            </h2>
            <Link href={archiveHref} className="btnMore" title="자료실 더보기">
              더보기{" "}
              <span className="plus" aria-hidden="true">
                <img src={`${IMG}/icon/ico_next_40_w.png`} alt="" />
              </span>
            </Link>
          </div>
          <div className="boardCard">
            <ul className="boardList">
              {archiveLoading &&
                Array.from({ length: MAIN_DISPLAY_LIMIT }).map((_, i) => (
                  <li key={`skeleton-${i}`}>
                    <span className="subject" />
                    <span className="date" />
                  </li>
                ))}
              {!archiveLoading &&
                padToLimit(archiveList).map((item, i) => {
                  if (item == null) {
                    return (
                      <li key={`archive-ph-${i}`}>
                        <Link
                          href="#"
                          style={{
                            pointerEvents: "none",
                            cursor: "default",
                          }}
                        >
                          <span className="subject" />
                          <span className="date" />
                        </Link>
                      </li>
                    );
                  }
                  const href =
                    item.secretAt === "Y"
                      ? archivePwHref(item.nttId)
                      : archiveDetailHref(String(item.nttId ?? ""));
                  return (
                    <li key={item.nttId ?? i}>
                      <Link href={href}>
                        <span className="subject">{item.nttSj ?? ""}</span>
                        <span className="date">
                          {(item.ntcrDt ?? "").trim()
                            ? item.ntcrDt
                            : "\u00A0"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoardSectionMain;

// hmr

// hmr

// hmr

// hmr
