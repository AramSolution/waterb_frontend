"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiClient,
  ApiError,
  downloadWaterbAttachmentOrOpenView,
  getArticleContentHtml,
} from "@/shared/lib";
import {
  API_CONFIG,
  API_ENDPOINTS,
  FILES,
  getArchiveBbsId,
  getQnaBbsId,
  resolveUserWebBoardParams,
} from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { useUserWebAuth } from "@/features/userWeb/auth/context/UserWebAuthContext";
import {
  NoticeCommunityChrome,
  type CommunityBreadcrumbMode,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

export type TabType = "qna" | "archive";

type ArticleNavItem = {
  nttId: number | null;
  nttSj: string | null;
} | null;

type AttacheFileItem = {
  fileId: string;
  seq: number;
  orgfNm: string | null;
};

type ArticleDetailResponse = {
  nttId: number | null;
  bbsId: string | null;
  nttSj: string | null;
  nttCn: string | null;
  ntcrNm: string | null;
  ntcrDt: string | null;
  rdcnt?: number | null;
  answerAt: string | null;
  answerCnt: number | null;
  atchFileId: string | null;
  attacheFiles?: AttacheFileItem[];
  replyContent?: string | null;
  replyDate?: string | null;
  replyNtcrNm?: string | null;
  prevArticle?: ArticleNavItem;
  nextArticle?: ArticleNavItem;
};

export interface QnaViewSectionProps {
  postId: string;
  tab: TabType;
  /** 목록 쿼리 (tab, page, pageSize, search, type, reqGbPosition ?? */
  listQuery: string;
}

function fileDownloadHref(fileId: string, seq: number): string {
  const base = (API_CONFIG.BASE_URL ?? "").replace(/\/$/, "");
  const path = FILES.VIEW;
  const q = new URLSearchParams();
  q.set("fileId", fileId);
  q.set("seq", String(seq));
  return base ? `${base}${path}?${q.toString()}` : `${path}?${q.toString()}`;
}

function fileExt(name: string | null): string {
  if (!name || !name.includes(".")) return "";
  return name.slice(name.lastIndexOf(".") + 1).toLowerCase();
}

function fileTypeForIcon(ext: string): string {
  const imgExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  if (imgExts.includes(ext)) return "img";
  if (ext === "xlsx") return "xls";
  return ext;
}

function themeQueryFromListQuery(listQuery: string): string {
  const p = new URLSearchParams(listQuery);
  const type = p.get("type");
  const req = p.get("reqGbPosition");
  if (type) return `type=${encodeURIComponent(type)}`;
  if (req) return `reqGbPosition=${encodeURIComponent(req)}`;
  return "";
}

/**
 * 묻고?�하기·자료실 ?�세 ??`qnaView2.html` / `noticeView2.html` ?�이?�웃.
 */
export default function QnaViewSection({
  postId,
  tab,
  listQuery,
}: QnaViewSectionProps) {
  const { isAuthenticated } = useUserWebAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<ArticleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const bbsIdResolved = useMemo(() => {
    const p = listQuery ? new URLSearchParams(listQuery) : new URLSearchParams();
    const urlReq = p.get("reqGbPosition");
    const urlType = p.get("type");
    const userSe = isAuthenticated ? AuthService.getUserSe() : null;
    const resolved = resolveUserWebBoardParams(urlReq, urlType, userSe);
    if (tab === "qna") return getQnaBbsId(resolved.reqGbPosition, resolved.type);
    return getArchiveBbsId(resolved.reqGbPosition, resolved.type);
  }, [tab, listQuery, isAuthenticated]);

  const bbsId =
    searchParams.get("bbsId")?.trim() || bbsIdResolved;

  useEffect(() => {
    if (!postId || postId.trim() === "") {
      setLoading(false);
      setError("?�못???�근?�니??");
      return;
    }
    const nttId = parseInt(postId, 10);
    if (Number.isNaN(nttId)) {
      setLoading(false);
      setError("?�못??게시글 번호?�니??");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `${API_ENDPOINTS.USER_ARTICLE_DETAIL}?bbsId=${encodeURIComponent(bbsId)}&nttId=${nttId}`;
    apiClient
      .get<ArticleDetailResponse>(url)
      .then((res) => {
        if (!cancelled) {
          setDetail(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(
            err instanceof ApiError && err.status === 404
              ? "?�당 게시글??찾을 ???�습?�다."
              : "게시글??불러?��? 못했?�니??",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, bbsId]);

  const themeQuery = useMemo(() => themeQueryFromListQuery(listQuery), [listQuery]);
  const headTit = tab === "qna" ? "1:1 문의" : "?�료??;
  const activeNav: CommunityChromeActiveNav = tab === "qna" ? "qna" : "eumArchive";
  const breadcrumbMode: CommunityBreadcrumbMode =
    tab === "archive" ? "eumArchive" : "default";

  const listHref = listQuery
    ? `/userWeb/qna?${listQuery}`
    : tab === "archive"
      ? "/userWeb/qna?tab=archive"
      : "/userWeb/qna";

  const pageParam = searchParams.get("page") ?? "1";

  const detailPath = useCallback(
    (nttId: number, bbs: string) => {
      const q = new URLSearchParams(listQuery);
      q.set("bbsId", bbs);
      q.set("page", pageParam);
      if (tab === "archive") q.set("tab", "archive");
      return `/userWeb/qna/${nttId}?${q.toString()}`;
    },
    [listQuery, pageParam, tab],
  );

  const handleCopyUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(() => {
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    });
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = document.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      }
    } catch {
      /* 취소 ??*/
    }
  }, []);

  const wrap = (body: React.ReactNode) => (
    <NoticeCommunityChrome
      themeQuery={themeQuery}
      shell="community"
      headTit={headTit}
      breadcrumbCurrent={headTit}
      breadcrumbMode={breadcrumbMode}
      activeNav={activeNav}
    >
      <section className="mainViewContent inner">{body}</section>
    </NoticeCommunityChrome>
  );

  const renderListControl = (key?: string) => {
    if (tab === "archive") {
      return (
        <button
          key={key}
          type="button"
          className="btnList"
          onClick={() => router.push(listHref)}
        >
          목록?�로
        </button>
      );
    }
    return (
      <Link href={listHref} className="btnList" role="button" key={key}>
        목록?�로
      </Link>
    );
  };

  if (loading) {
    return wrap(
      <>
        <p className="loading">?�시�?기다??주세??</p>
        <div className="mainViewBtnArea">{renderListControl("loading")}</div>
      </>,
    );
  }

  if (error || !detail) {
    return wrap(
      <>
        <p className="loading">
          {error ?? "?�당 게시글??찾을 ???�습?�다."}
        </p>
        <div className="mainViewBtnArea">{renderListControl("error")}</div>
      </>,
    );
  }

  const isQna = tab === "qna";
  const answered =
    detail.answerAt === "Y" ||
    (detail.answerCnt != null && detail.answerCnt > 0);
  const title = detail.nttSj ?? "";
  const infoView = detail.rdcnt != null ? String(detail.rdcnt) : "0";
  const bodyHtml = getArticleContentHtml(detail.nttCn);
  const files = (detail.attacheFiles ?? []).map((f) => {
    const ext = fileExt(f.orgfNm ?? "");
    return {
      name: f.orgfNm ?? "?�일",
      fileId: String(f.fileId),
      seq: f.seq,
      type: fileTypeForIcon(ext),
    };
  });
  const hasReply =
    detail.replyContent != null && String(detail.replyContent).trim() !== "";
  const bbsForNav = detail.bbsId ?? bbsId;
  const showNav =
    detail.nextArticle?.nttId != null || detail.prevArticle?.nttId != null;

  return wrap(
    <>
      <div className="mainViewDetailHeader">
        {isQna ? (
          <div className="headerSide mb-16">
            <span
              className={`badge ${answered ? "statusComplete" : "statusWaiting"}`}
            >
              {answered ? "?��??�료" : "?��??��?}
            </span>
          </div>
        ) : null}
        <div
          className="flex-sb"
          style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}
        >
          <div className="mainViewDetailTitle">{title}</div>
          <div className="pageBtnWrap">
            <button
              type="button"
              className="btnAction"
              aria-label="SNS 공유"
              onClick={() => void handleShare()}
            >
              <i className="icoShare" aria-hidden />
            </button>
            <button
              type="button"
              className="btnAction"
              aria-label={copyDone ? "URL 복사?? : "URL 복사"}
              onClick={() => void handleCopyUrl()}
            >
              <i className="icoAttachment" aria-hidden />
            </button>
            <button
              type="button"
              className="btnAction"
              aria-label="?�이지 ?�쇄?�기"
              onClick={handlePrint}
            >
              <i className="icoPrint" aria-hidden />
            </button>
          </div>
        </div>
        <div className="mainViewDetailInfo">
          <dl>
            <dt>?�성??/dt>
            <dd className="infoName">{detail.ntcrNm ?? ""}</dd>
            <dt>?�성??/dt>
            <dd className="infoDate">{detail.ntcrDt ?? ""}</dd>
            <dt>조회??/dt>
            <dd className="infoView">조회 {infoView}</dd>
          </dl>
        </div>
      </div>
      <article className="mainViewDetailBody">
        <div className="bizFile">
          <div className="title" id="qnaViewFileDownloadTitle">
            첨�??�일
          </div>
          {files.length > 0 ? (
            <ul
              className="fileWrap"
              aria-labelledby="qnaViewFileDownloadTitle"
            >
              {files.map((file, i) => {
                const viewUrl = fileDownloadHref(file.fileId, file.seq);
                return (
                  <li key={i} className="fileList">
                    <a
                      href={viewUrl}
                      className={`file ${file.type}`}
                      title={`${file.name} ?�운로드`}
                      onClick={(e) => {
                        e.preventDefault();
                        void downloadWaterbAttachmentOrOpenView(
                          file.fileId,
                          file.seq,
                          viewUrl,
                          file.name || undefined,
                        );
                      }}
                    >
                      <span className="fileIcon" aria-hidden />
                      <span className="fileName">{file.name}</span>
                      <span className="sr-only">(?�운로드)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className="fileWrap"
              role="region"
              aria-labelledby="qnaViewFileDownloadTitle"
            />
          )}
        </div>
        <div className="mainViewDetailText">
          {bodyHtml ? (
            <div
              className="article-content-html"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <p>?�용???�습?�다.</p>
          )}
        </div>
        {isQna && hasReply ? (
          <div className="replyBox">
            <div className="replyHeader">
              <div className="adminLabel">관리자 ?��?</div>
              <div className="replyDate">{detail.replyDate ?? ""}</div>
            </div>
            <div
              className="replyContent article-content-html"
              dangerouslySetInnerHTML={{
                __html: getArticleContentHtml(detail.replyContent ?? ""),
              }}
            />
          </div>
        ) : null}
      </article>
      {showNav ? (
        <div className="mainViewDetailNav">
          {detail.nextArticle?.nttId != null && (
            <div className="navRow next">
              <span className="navLabel">?�음글</span>
              <Link
                href={detailPath(detail.nextArticle.nttId, bbsForNav)}
                className="navTitle"
              >
                {detail.nextArticle.nttSj ?? ""}
              </Link>
            </div>
          )}
          {detail.prevArticle?.nttId != null && (
            <div className="navRow prev">
              <span className="navLabel">?�전글</span>
              <Link
                href={detailPath(detail.prevArticle.nttId, bbsForNav)}
                className="navTitle"
              >
                {detail.prevArticle.nttSj ?? ""}
              </Link>
            </div>
          )}
        </div>
      ) : null}
      <div className="mainViewBtnArea">{renderListControl("main")}</div>
    </>,
  );
}
