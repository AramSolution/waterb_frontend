"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { resolveArticleImageUrl } from "@/entities/adminWeb/article/lib/resolveArticleThumbnailUrl";
import {
  getArchiveArticleDetailNav,
  type ArchiveArticleDetailNavApi,
} from "@/entities/userWeb/article/api";
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
  USER_ARCHIVE_BBS_ID,
  USER_BOARD_BBS_IDS,
  USER_GENERAL_ARCHIVE_BBS_ID,
} from "@/shared/config/apiUser";
import {
  NoticeCommunityChrome,
  type CommunityBreadcrumbMode,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

type ArticleNavItem = {
  nttId: number | null;
  nttSj: string | null;
} | null;

type AttacheFileItem = {
  fileId: string;
  seq: number;
  orgfNm: string | null;
  saveNm?: string | null;
};

type DetailState = {
  nttId: number | null;
  bbsId: string | null;
  bbsNm: string | null;
  nttSj: string | null;
  nttCn: string | null;
  rdcnt: number | null;
  ntcrNm: string | null;
  ntcrDt: string | null;
  noticeAt: string | null;
  maskNtcrNm: string | null;
  atchFileId: string | null;
  answerCnt: number | null;
  prevArticle: ArticleNavItem;
  nextArticle: ArticleNavItem;
  attacheFiles?: AttacheFileItem[];
  replyContent?: string | null;
  replyDate?: string | null;
  replyNtcrNm?: string | null;
  /** ?¥Ïùå ?ÑÏπ¥?¥Î∏å ???Ä???¥Î?ÏßÄ ?åÏùº Í∑∏Î£π ID (`nttImgFiles` ?ÜÏùÑ ???®Ïùº URL?? */
  nttImgFileId?: string | null;
  /** ?¥Ïùå ?ÑÏπ¥?¥Î∏å ??Í∑∏Î£π ???¥Î?ÏßÄ Î™©Î°ù(?¨Îùº?¥Îçî, seq ?§Î¶ÑÏ∞®Ïàú) */
  nttImgFiles?: AttacheFileItem[];
  /** ?¥Ïùå ?ÑÏπ¥?¥Î∏å infoTable: Î™ÖÏπ≠ NTT_DATA1¬∑?åÍ∞ú NTT_DATA6¬∑?êÎ£åÏ∂úÏ≤ò NTT_DATA5 */
  nttData1?: string | null;
  nttData5?: string | null;
  nttData6?: string | null;
};

const TAB_HEAD: Record<string, string> = {
  notice: "Í≥µÏ??¨Ìï≠",
  project: "ÏßÄ?êÏÇ¨??,
  eumArchive: "?¥Ïùå ?ÑÏπ¥?¥Î∏å",
  inquiry: "1:1 Î¨∏Ïùò",
  guide: "?ºÎ∞ò ?êÎ£å??,
};

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
  return ext || "file";
}

const EUM_ARCHIVE_PLACEHOLDER_IMG = "/images/userWeb/img_noImg.png";

/** ?¥Ïùå ?ÑÏπ¥?¥Î∏å ?ÅÎã® ?¥Î?ÏßÄ ?¨Îùº?¥Îìú URL Î™©Î°ù(1???¥ÏÉÅ). */
function buildEumArchiveImageSlides(detail: DetailState): string[] {
  const files = detail.nttImgFiles ?? [];
  const urls = files
    .map((f) => {
      const id = String(f.fileId ?? "").trim();
      if (!id) return "";
      const seq = Number(f.seq ?? 0);
      const cacheBust =
        f.saveNm != null && String(f.saveNm).trim() !== ""
          ? String(f.saveNm)
          : undefined;
      return resolveArticleImageUrl(`${id}:${seq}`, { cacheBust });
    })
    .filter((u) => u !== "");
  if (urls.length > 0) return urls;
  const single = resolveArticleImageUrl(detail.nttImgFileId ?? "");
  if (single) return [single];
  return [EUM_ARCHIVE_PLACEHOLDER_IMG];
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  const t = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

function displayArchiveMeta(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t === "" ? "?? : t;
}

/**
 * ?¥Ïùå ?ÑÏπ¥?¥Î∏å infoTable ?åÍ∞ú¬∑?êÎ£åÏ∂úÏ≤ò: trim ??Î¨∏Ïûê???ÑÏ≤¥Í∞Ä ?∏Î? URL???åÎßå href.
 * `http:` / `https:`Îß??àÏö©(`javascript:` ??Ï∞®Îã®). `www.`¬∑?§ÌÇ¥ ?ÜÎäî host.tld??`https://` Î≥¥Í∞ï.
 */
const ARCHIVE_WHOLE_STRING_WWW = /^www\.[^\s]+$/i;
const ARCHIVE_WHOLE_STRING_HOST =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?)+(?:\/[^\s]*)?$/i;

function safeExternalHrefFromWholeDisplayText(displayText: string): string | null {
  if (!displayText || displayText === "??) return null;
  const t = displayText.trim();
  if (!t) return null;

  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    if (ARCHIVE_WHOLE_STRING_WWW.test(candidate)) {
      candidate = `https://${candidate}`;
    } else if (ARCHIVE_WHOLE_STRING_HOST.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function renderArchiveMetaWithOptionalLink(displayText: string): React.ReactNode {
  const href = safeExternalHrefFromWholeDisplayText(displayText);
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="archiveExternalLink"
      >
        {displayText}
      </a>
    );
  }
  return displayText;
}

function mapArchiveNavToDetailState(nav: ArchiveArticleDetailNavApi): DetailState | null {
  const cur = nav.currentArchive;
  if (!cur || cur.nttId == null) return null;
  const prev = nav.prevArchive;
  const next = nav.nextArchive;
  const files: AttacheFileItem[] = (cur.attacheFiles ?? []).map((f) => ({
    fileId: String(f.fileId),
    seq: f.seq,
    orgfNm: f.orgfNm ?? null,
    saveNm: f.saveNm ?? null,
  }));
  return {
    nttId: cur.nttId ?? null,
    bbsId: cur.bbsId ?? null,
    bbsNm: cur.bbsNm ?? null,
    nttSj: cur.nttSj ?? null,
    nttCn: cur.nttCn ?? null,
    rdcnt: cur.rdcnt ?? null,
    ntcrNm: cur.ntcrNm ?? null,
    ntcrDt: cur.ntcrDt ?? null,
    noticeAt: cur.noticeAt ?? null,
    maskNtcrNm: cur.maskNtcrNm ?? null,
    atchFileId: cur.atchFileId ?? null,
    answerCnt: cur.answerCnt ?? null,
    prevArticle:
      prev?.nttId != null
        ? { nttId: prev.nttId, nttSj: prev.nttSj ?? null }
        : null,
    nextArticle:
      next?.nttId != null
        ? { nttId: next.nttId, nttSj: next.nttSj ?? null }
        : null,
    attacheFiles: files,
    replyContent: null,
    replyDate: null,
    replyNtcrNm: null,
    nttImgFileId: cur.nttImgFileId ?? null,
    nttImgFiles: (cur.nttImgFiles ?? []).map((f) => ({
      fileId: String(f.fileId ?? ""),
      seq: typeof f.seq === "number" ? f.seq : Number(f.seq ?? 0),
      orgfNm: f.orgfNm ?? null,
      saveNm: f.saveNm ?? null,
    })),
    nttData1: cur.nttData1 ?? null,
    nttData5: cur.nttData5 ?? null,
    nttData6: cur.nttData6 ?? null,
  };
}

function getListTabFromBbsId(bbsId: string | null): string {
  if (!bbsId) return "notice";
  if (bbsId === USER_BOARD_BBS_IDS.NOTICE) return "notice";
  if (bbsId === USER_BOARD_BBS_IDS.SUPPORT) return "project";
  if (bbsId === USER_ARCHIVE_BBS_ID) return "eumArchive";
  if (bbsId === USER_BOARD_BBS_IDS.INQUIRY) return "inquiry";
  if (
    bbsId === USER_GENERAL_ARCHIVE_BBS_ID ||
    bbsId === USER_BOARD_BBS_IDS.GUIDE
  )
    return "guide";
  return "notice";
}

function listTabToActiveNav(tab: string): CommunityChromeActiveNav {
  if (tab === "guide") return "guide";
  if (tab === "eumArchive") return "eumArchive";
  if (tab === "project") return "project";
  if (tab === "inquiry") return "inquiry";
  return "notice";
}

/**
 * Ïª§Î??àÌã∞ ?ÅÏÑ∏ ??source/gunsan/noticeView2.html ?àÏù¥?ÑÏõÉ
 */
export default function CommunityViewSection() {
  const params = useParams();
  const searchParams = useSearchParams();
  const nttIdParam = params?.id as string | undefined;
  const bbsIdParam = searchParams?.get("bbsId") ?? null;
  const pageParam = searchParams?.get("page");
  const page = (() => {
    const n = pageParam ? parseInt(pageParam, 10) : 1;
    if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) return 1;
    return n;
  })();

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [eumArchiveImgIdx, setEumArchiveImgIdx] = useState(0);

  const listTab = getListTabFromBbsId(detail?.bbsId ?? bbsIdParam);
  const listHref = `/userWeb/community?tab=${listTab}&page=${page}`;
  const headTit = TAB_HEAD[listTab] ?? "Í≥µÏ??¨Ìï≠";
  const activeNav = listTabToActiveNav(listTab);

  const detailPath = useCallback(
    (nttId: number, bbs: string) =>
      `/userWeb/community/${nttId}?bbsId=${encodeURIComponent(bbs)}&page=${page}`,
    [page],
  );

  useEffect(() => {
    if (!nttIdParam || !bbsIdParam) {
      setLoading(false);
      setError("?òÎ™ª???ëÍ∑º?ÖÎãà??");
      return;
    }
    const nttId = parseInt(nttIdParam, 10);
    if (Number.isNaN(nttId)) {
      setLoading(false);
      setError("?òÎ™ª??Í≤åÏãúÍ∏Ä Î≤àÌò∏?ÖÎãà??");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const isEumArchive = bbsIdParam === USER_ARCHIVE_BBS_ID;

    const req = isEumArchive
      ? getArchiveArticleDetailNav(bbsIdParam, nttId).then((nav) => {
          const mapped = mapArchiveNavToDetailState(nav);
          if (!mapped) {
            throw new ApiError(404, "Í≤åÏãúÍ∏Ä??Ï∞æÏùÑ ???ÜÏäµ?àÎã§.");
          }
          return mapped;
        })
      : apiClient.get<DetailState>(
          `${API_ENDPOINTS.USER_ARTICLE_DETAIL}?bbsId=${encodeURIComponent(bbsIdParam)}&nttId=${nttId}`,
        );

    req
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
              ? "Í≤åÏãúÍ∏Ä??Ï∞æÏùÑ ???ÜÏäµ?àÎã§."
              : "Í≤åÏãúÍ∏Ä??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nttIdParam, bbsIdParam]);

  useEffect(() => {
    setEumArchiveImgIdx(0);
  }, [nttIdParam, bbsIdParam]);

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
      /* Ï∑®ÏÜå ??*/
    }
  }, []);

  const breadcrumbMode: CommunityBreadcrumbMode =
    listTab === "guide"
      ? "generalArchive"
      : listTab === "eumArchive"
        ? "eumArchive"
        : "default";

  const wrap = (body: React.ReactNode) => (
    <NoticeCommunityChrome
      themeQuery=""
      shell="community"
      headTit={headTit}
      breadcrumbCurrent={headTit}
      breadcrumbMode={breadcrumbMode}
      activeNav={activeNav}
    >
      <section className="mainViewContent inner">{body}</section>
    </NoticeCommunityChrome>
  );

  if (loading) {
    return wrap(
      <>
        <p className="loading">?†ÏãúÎß?Í∏∞Îã§??Ï£ºÏÑ∏??</p>
        <div className="mainViewBtnArea">
          <Link href={listHref} className="btnList">
            Î™©Î°ù?ºÎ°ú
          </Link>
        </div>
      </>,
    );
  }

  if (error || !detail) {
    return wrap(
      <>
        <p className="loading">{error ?? "Í≤åÏãúÍ∏Ä??Ï∞æÏùÑ ???ÜÏäµ?àÎã§."}</p>
        <div className="mainViewBtnArea">
          <Link href={listHref} className="btnList">
            Î™©Î°ù?ºÎ°ú
          </Link>
        </div>
      </>,
    );
  }

  const badgeLabel = detail.noticeAt === "Y" ? "Í≥µÏ?" : "";
  const title = detail.nttSj ?? "";
  const infoView = detail.rdcnt != null ? String(detail.rdcnt) : "0";
  const bodyHtml = getArticleContentHtml(detail.nttCn);
  const attacheFiles = detail.attacheFiles ?? [];
  const files = attacheFiles.map((f) => {
    const ext = fileExt(f.orgfNm ?? "");
    return {
      name: f.orgfNm ?? "?åÏùº",
      fileId: String(f.fileId),
      seq: f.seq,
      type: fileTypeForIcon(ext),
    };
  });
  const hasReply =
    detail.replyContent != null && String(detail.replyContent).trim() !== "";
  const bbsForNav = detail.bbsId ?? bbsIdParam ?? "";
  const showNav =
    detail.nextArticle?.nttId != null || detail.prevArticle?.nttId != null;

  if (listTab === "eumArchive") {
    const nameDisplay =
      (detail.nttData1 ?? "").trim() !== ""
        ? (detail.nttData1 ?? "").trim()
        : displayArchiveMeta(detail.nttSj);
    const introDisplay = displayArchiveMeta(stripHtml(detail.nttData6 ?? ""));
    const sourceDisplay = displayArchiveMeta(detail.nttData5);

    const imageSlides = buildEumArchiveImageSlides(detail);
    const lastImgIdx = Math.max(0, imageSlides.length - 1);
    const safeImgIdx = Math.min(eumArchiveImgIdx, lastImgIdx);
    const heroSrc = imageSlides[safeImgIdx] ?? EUM_ARCHIVE_PLACEHOLDER_IMG;
    const canPrevImg = safeImgIdx > 0;
    const canNextImg = safeImgIdx < lastImgIdx;

    return wrap(
      <div className="archiveViewContainer">
        <div className="pageBtnWrap mt-40">
          <button
            type="button"
            className="btnAction"
            aria-label="SNS Í≥µÏú†"
            onClick={() => void handleShare()}
          >
            <i className="icoShare" aria-hidden />
          </button>
          <button
            type="button"
            className="btnAction"
            aria-label={copyDone ? "URL Î≥µÏÇ¨?? : "URL Î≥µÏÇ¨"}
            onClick={() => void handleCopyUrl()}
          >
            <i className="icoAttachment" aria-hidden />
          </button>
          <button
            type="button"
            className="btnAction"
            aria-label="?òÏù¥ÏßÄ ?∏ÏáÑ?òÍ∏∞"
            onClick={handlePrint}
          >
            <i className="icoPrint" aria-hidden />
          </button>
        </div>
        <div className="archiveDetail">
          <div className="detailTop">
            <div className="sliderArea">
              <div className="archiveSwiper swiper archiveImageNav">
                <button
                  type="button"
                  className="swiper-button-prev"
                  aria-label="?¥Ï†Ñ ?¥Î?ÏßÄ"
                  disabled={!canPrevImg}
                  onClick={() =>
                    setEumArchiveImgIdx((i) => (i > 0 ? i - 1 : i))
                  }
                />
                <div className="archiveMainImageWrap">
                  <img
                    src={heroSrc}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = EUM_ARCHIVE_PLACEHOLDER_IMG;
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="swiper-button-next"
                  aria-label="?§Ïùå ?¥Î?ÏßÄ"
                  disabled={!canNextImg}
                  onClick={() =>
                    setEumArchiveImgIdx((i) =>
                      i < lastImgIdx ? i + 1 : i,
                    )
                  }
                />
              </div>
            </div>
            <div className="infoArea">
              <table className="infoTable">
                <caption className="blind">
                  ?†Î¨º ?ÅÏÑ∏ ?ïÎ≥¥: Î™ÖÏπ≠, ?åÍ∞ú, ?êÎ£åÏ∂úÏ≤ò ?¨Ìï®
                </caption>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "70%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th scope="row">Î™ÖÏπ≠</th>
                    <td>{nameDisplay}</td>
                  </tr>
                  <tr>
                    <th scope="row">?åÍ∞ú</th>
                    <td className="archiveIntroCell">
                      {renderArchiveMetaWithOptionalLink(introDisplay)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">?êÎ£åÏ∂úÏ≤ò</th>
                    <td>
                      {renderArchiveMetaWithOptionalLink(sourceDisplay)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <section className="detailContent">
            <div className="contentTitle">?¥Ïö©</div>
            <div className="contentText">
              {bodyHtml ? (
                <div
                  className="article-content-html"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p>?¥Ïö©???ÜÏäµ?àÎã§.</p>
              )}
            </div>
          </section>
        </div>
        {showNav ? (
          <div className="mainViewDetailNav">
            {detail.nextArticle?.nttId != null && (
              <div className="navRow next">
                <span className="navLabel">?§ÏùåÍ∏Ä</span>
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
                <span className="navLabel">?¥Ï†ÑÍ∏Ä</span>
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
        <div className="mainViewBtnArea">
          <Link href={listHref} className="btnList">
            Î™©Î°ù?ºÎ°ú
          </Link>
        </div>
      </div>,
    );
  }

  return wrap(
    <>
      <div className="mainViewDetailHeader">
        {badgeLabel ? (
          <div className="mainViewDetailBadge">
            <span className="badgeNotice">{badgeLabel}</span>
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
              aria-label="SNS Í≥µÏú†"
              onClick={() => void handleShare()}
            >
              <i className="icoShare" aria-hidden />
            </button>
            <button
              type="button"
              className="btnAction"
              aria-label={copyDone ? "URL Î≥µÏÇ¨?? : "URL Î≥µÏÇ¨"}
              onClick={() => void handleCopyUrl()}
            >
              <i className="icoAttachment" aria-hidden />
            </button>
            <button
              type="button"
              className="btnAction"
              aria-label="?òÏù¥ÏßÄ ?∏ÏáÑ?òÍ∏∞"
              onClick={handlePrint}
            >
              <i className="icoPrint" aria-hidden />
            </button>
          </div>
        </div>
        <div className="mainViewDetailInfo">
          <dl>
            <dt>?ëÏÑ±??/dt>
            <dd className="infoName">{detail.ntcrNm ?? ""}</dd>
            <dt>?ëÏÑ±??/dt>
            <dd className="infoDate">{detail.ntcrDt ?? ""}</dd>
            <dt>Ï°∞Ìöå??/dt>
            <dd className="infoView">Ï°∞Ìöå {infoView}</dd>
          </dl>
        </div>
      </div>
      <article className="mainViewDetailBody">
        <div className="bizFile">
          <div className="title" id="communityFileDownloadTitle">
            Ï≤®Î??åÏùº
          </div>
          {files.length > 0 ? (
            <ul
              className="fileWrap"
              aria-labelledby="communityFileDownloadTitle"
            >
              {files.map((file, i) => {
                const viewUrl = fileDownloadHref(file.fileId, file.seq);
                return (
                  <li key={i} className="fileList">
                    <a
                      href={viewUrl}
                      className={`file ${file.type}`}
                      title={`${file.name} ?§Ïö¥Î°úÎìú`}
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
                      <span className="sr-only">(?§Ïö¥Î°úÎìú)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className="fileWrap"
              role="region"
              aria-labelledby="communityFileDownloadTitle"
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
            <p>?¥Ïö©???ÜÏäµ?àÎã§.</p>
          )}
        </div>
      </article>
      {hasReply && (
        <div className="replyBox">
          <div className="replyHeader">
            <div className="adminLabel">Í¥ÄÎ¶¨Ïûê ?µÎ?</div>
            <div className="replyDate">{detail.replyDate ?? ""}</div>
          </div>
          <div
            className="replyContent"
            dangerouslySetInnerHTML={{
              __html: (detail.replyContent ?? "").replace(/\n/g, "<br>"),
            }}
          />
        </div>
      )}
      {showNav && (
        <div className="mainViewDetailNav">
          {detail.nextArticle?.nttId != null && (
            <div className="navRow next">
              <span className="navLabel">?§ÏùåÍ∏Ä</span>
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
              <span className="navLabel">?¥Ï†ÑÍ∏Ä</span>
              <Link
                href={detailPath(detail.prevArticle.nttId, bbsForNav)}
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
          Î™©Î°ù?ºÎ°ú
        </Link>
      </div>
    </>,
  );
}
