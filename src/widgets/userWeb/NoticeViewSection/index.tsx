"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  getNoticeBbsId,
} from "@/shared/config/apiUser";
import { NoticeCommunityChrome } from "@/widgets/userWeb/NoticeCommunityChrome";

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
  atchFileId: string | null;
  attacheFiles?: AttacheFileItem[];
  prevArticle?: ArticleNavItem;
  nextArticle?: ArticleNavItem;
};

export interface NoticeViewSectionProps {
  postId: string;
  /** 목록?�로 링크??붙일 쿼리 (type=, reqGbPosition=) */
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

/**
 * 공�? ?�세 ??source/gunsan/noticeView2.html 구조·?�래??
 */
export default function NoticeViewSection({
  postId,
  listQuery,
}: NoticeViewSectionProps) {
  const [detail, setDetail] = useState<ArticleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const bbsId = React.useMemo(() => {
    const reqGbPosition = listQuery
      ? new URLSearchParams(listQuery).get("reqGbPosition")
      : null;
    const type = listQuery ? new URLSearchParams(listQuery).get("type") : null;
    return getNoticeBbsId(reqGbPosition, type);
  }, [listQuery]);

  const themeQuery = listQuery;

  const listHref = listQuery
    ? `/userWeb/notice?${listQuery}`
    : "/userWeb/notice";

  const detailPath = useCallback(
    (nttId: number) =>
      listQuery
        ? `/userWeb/notice/${nttId}?${listQuery}`
        : `/userWeb/notice/${nttId}`,
    [listQuery],
  );

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
              : err instanceof ApiError && err.status === 403
                ? "비�?글?� 비�?번호 ?�인 ???�람?????�습?�다. 목록?�서 ?�당 글???�릭??주세??"
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
      /* ?�용??취소 ??무시 */
    }
  }, []);

  const innerBlock = (body: React.ReactNode) => (
    <NoticeCommunityChrome themeQuery={themeQuery} shell="notice">
      <section className="mainViewContent inner">{body}</section>
    </NoticeCommunityChrome>
  );

  if (loading) {
    return innerBlock(
      <>
        <p className="loading">?�시�?기다??주세??</p>
        <div className="mainViewBtnArea">
          <Link href={listHref} className="btnList" role="button">
            목록?�로
          </Link>
        </div>
      </>,
    );
  }

  if (error || !detail) {
    return innerBlock(
      <>
        <p className="loading">
          {error ?? "?�당 게시글??찾을 ???�습?�다."}
        </p>
        <div className="mainViewBtnArea">
          <Link href={listHref} className="btnList" role="button">
            목록?�로
          </Link>
        </div>
      </>,
    );
  }

  const attacheFiles = detail.attacheFiles ?? [];
  const files = attacheFiles.map((f) => {
    const ext = fileExt(f.orgfNm ?? "");
    return {
      name: f.orgfNm ?? "",
      fileId: String(f.fileId),
      seq: f.seq,
      type: fileTypeForIcon(ext),
    };
  });

  const bodyHtml = getArticleContentHtml(detail.nttCn);
  const infoView = detail.rdcnt != null ? String(detail.rdcnt) : "0";

  const showNav =
    detail.nextArticle?.nttId != null || detail.prevArticle?.nttId != null;

  return innerBlock(
    <>
      <div className="mainViewDetailHeader">
        <div className="flex-sb" style={{ alignItems: "flex-start", gap: 16 }}>
          <div className="mainViewDetailTitle">{detail.nttSj ?? ""}</div>
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
          <div className="title" id="noticeFileDownloadTitle">
            첨�??�일
          </div>
          {files.length > 0 ? (
            <ul
              className="fileWrap"
              aria-labelledby="noticeFileDownloadTitle"
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
              aria-labelledby="noticeFileDownloadTitle"
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
      </article>
      {showNav && (
        <div className="mainViewDetailNav">
          {detail.nextArticle?.nttId != null && (
            <div className="navRow next">
              <span className="navLabel">?�음글</span>
              <Link
                href={detailPath(detail.nextArticle.nttId)}
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
                href={detailPath(detail.prevArticle.nttId)}
                className="navTitle"
              >
                {detail.prevArticle.nttSj ?? ""}
              </Link>
            </div>
          )}
        </div>
      )}
      <div className="mainViewBtnArea">
        <Link href={listHref} className="btnList">
          목록?�로
        </Link>
      </div>
    </>,
  );
}
