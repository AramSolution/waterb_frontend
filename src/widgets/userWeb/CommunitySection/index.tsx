"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  resolveArticleImageUrl,
  USER_EUM_ARCHIVE_LIST_THUMB_SIZE,
} from "@/entities/adminWeb/article/lib/resolveArticleThumbnailUrl";
import {
  getArchiveArticleList,
  getUserArticleList,
  type ArchiveArticleListResponse,
  type UserArticleListItem,
  type UserArticleListResponse,
} from "@/entities/userWeb/article/api";
import {
  API_ENDPOINTS,
  USER_ARCHIVE_BBS_ID,
  USER_BOARD_BBS_IDS,
  USER_GENERAL_ARCHIVE_BBS_ID,
} from "@/shared/config/apiUser";
import { apiClient, downloadWaterbAttachment } from "@/shared/lib";
import {
  NoticeCommunityChrome,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

type ArticleDetailFilesResponse = {
  attacheFiles?: { fileId: string; seq: number; orgfNm: string | null }[];
};

const TAB_IDS = ["notice", "project", "eumArchive", "inquiry", "guide"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_HEAD: Record<TabId, string> = {
  notice: "공지사항",
  project: "지원사업",
  eumArchive: "이음 아카이브",
  inquiry: "1:1 문의",
  guide: "일반 자료실",
};

const SEARCH_CONDITIONS = [
  { value: "all" as const, label: "전체" },
  { value: "title" as const, label: "제목" },
  { value: "author" as const, label: "작성자" },
  { value: "content" as const, label: "내용" },
];
/** `archive2.html` 검색 셀렉트 — 전체 없음 */
const GUIDE_SEARCH_CONDITIONS = [
  { value: "title" as const, label: "제목" },
  { value: "content" as const, label: "내용" },
  { value: "author" as const, label: "작성자" },
];
/** 이음 아카이브 — 셀렉트는 유지, 옵션은 제목만(API `searchCondition` 2) */
const EUM_ARCHIVE_SEARCH_CONDITIONS = [
  { value: "title" as const, label: "제목" },
];
type SearchCondition = (typeof SEARCH_CONDITIONS)[number]["value"];

const UI_TO_API_SEARCH_CONDITION: Record<
  SearchCondition,
  "1" | "2" | "3" | "4"
> = {
  all: "1",
  title: "2",
  author: "3",
  content: "4",
};

function toApiSearchCondition(c: SearchCondition): "1" | "2" | "3" | "4" {
  return UI_TO_API_SEARCH_CONDITION[c];
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

function parsePageSizeParam(raw: string | null): PageSizeOption {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return DEFAULT_PAGE_SIZE;
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? (n as PageSizeOption)
    : DEFAULT_PAGE_SIZE;
}

function buildCommunityListUrl(
  tab: TabId,
  page: number,
  opts?: { searchCnd?: SearchCondition; searchWrd?: string; pageSize?: number },
): string {
  const qs = new URLSearchParams();
  qs.set("tab", tab);
  qs.set("page", String(page));
  const ps = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  if (ps !== DEFAULT_PAGE_SIZE) {
    qs.set("pageSize", String(ps));
  }
  const kw = opts?.searchWrd?.trim() ?? "";
  if (kw) {
    /* 이음 아카이브는 제목 검색만 — 조건 쿼리 없음 */
    if (tab !== "eumArchive") {
      qs.set("searchCnd", opts?.searchCnd ?? "all");
    }
    qs.set("searchWrd", kw);
  }
  return `/userWeb/community?${qs.toString()}`;
}

function parseRecordsTotal(
  res:
    | UserArticleListResponse
    | ArchiveArticleListResponse
    | null
    | undefined,
): number {
  const raw = res?.recordsTotal ?? res?.recordsFiltered;
  if (raw == null) return 0;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && !Number.isNaN(n) ? Math.max(0, Math.floor(n)) : 0;
}

function getBbsIdForTab(tab: TabId): string {
  switch (tab) {
    case "notice":
      return USER_BOARD_BBS_IDS.NOTICE;
    case "project":
      return USER_BOARD_BBS_IDS.SUPPORT;
    case "eumArchive":
      return USER_ARCHIVE_BBS_ID;
    case "inquiry":
      return USER_BOARD_BBS_IDS.INQUIRY;
    case "guide":
      return USER_GENERAL_ARCHIVE_BBS_ID;
    default:
      return USER_BOARD_BBS_IDS.NOTICE;
  }
}

function tabToActiveNav(tab: TabId): CommunityChromeActiveNav {
  if (tab === "guide") return "guide";
  if (tab === "eumArchive") return "eumArchive";
  if (tab === "project") return "project";
  if (tab === "inquiry") return "inquiry";
  return "notice";
}

/**
 * 커뮤니티 목록 — `notice2.html` 레이아웃; `tab=guide`는 `archive2.html`, `tab=eumArchive`는 `eumArchive2.html` 카드 그리드·검색·브레드크럼 패리티.
 * ?tab=notice | project | eumArchive | inquiry | guide
 */
export default function CommunitySection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = useMemo(() => {
    if (tabParam && TAB_IDS.includes(tabParam as TabId))
      return tabParam as TabId;
    return "notice";
  }, [tabParam]);
  const pageParam = searchParams.get("page");
  const currentPage = useMemo(() => {
    const n = pageParam ? parseInt(pageParam, 10) : 1;
    if (!Number.isFinite(n) || Number.isNaN(n) || n < 1) return 1;
    return n;
  }, [pageParam]);

  const pageSizeRaw = searchParams.get("pageSize");
  const pageSizeParam = useMemo(
    () => parsePageSizeParam(pageSizeRaw),
    [pageSizeRaw],
  );

  const [list, setList] = useState<UserArticleListItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [listOffset, setListOffset] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SearchCondition>("all");
  const [searchInput, setSearchInput] = useState("");
  const [attachDownloadingNttId, setAttachDownloadingNttId] = useState<
    number | null
  >(null);

  const searchWrdParam = searchParams.get("searchWrd") ?? "";
  const searchCndParam = searchParams.get("searchCnd") ?? "";
  const initialSearchCondition: SearchCondition = useMemo(() => {
    if (activeTab === "eumArchive") {
      return "title";
    }
    if (activeTab === "guide") {
      if (
        searchCndParam === "title" ||
        searchCndParam === "content" ||
        searchCndParam === "author"
      ) {
        return searchCndParam;
      }
      if (searchWrdParam.trim()) return "title";
      return "title";
    }
    if (
      searchCndParam === "all" ||
      searchCndParam === "title" ||
      searchCndParam === "author" ||
      searchCndParam === "content"
    ) {
      return searchCndParam;
    }
    if (searchCndParam === "titleContent") return "title";
    if (searchWrdParam.trim()) return "title";
    return "all";
  }, [searchCndParam, searchWrdParam, activeTab]);

  const searchConditionOptions =
    activeTab === "guide"
      ? GUIDE_SEARCH_CONDITIONS
      : activeTab === "eumArchive"
        ? EUM_ARCHIVE_SEARCH_CONDITIONS
        : SEARCH_CONDITIONS;

  const bbsId = useMemo(() => getBbsIdForTab(activeTab), [activeTab]);
  const offset = (currentPage - 1) * pageSizeParam;
  const totalPages = useMemo(() => {
    if (recordsTotal <= 0) return 0;
    return Math.ceil(recordsTotal / pageSizeParam);
  }, [recordsTotal, pageSizeParam]);

  const goToPage = (page: number) => {
    if (loading) return;
    const next = page < 1 ? 1 : page;
    router.push(
      buildCommunityListUrl(activeTab, next, {
        searchCnd: initialSearchCondition,
        searchWrd: searchWrdParam,
        pageSize: pageSizeParam,
      }),
      { scroll: false },
    );
  };

  const handleAttachmentDownload = async (item: UserArticleListItem) => {
    if (item.nttId == null || !item.bbsId?.trim()) return;
    setAttachDownloadingNttId(item.nttId);
    try {
      const url = `${API_ENDPOINTS.USER_ARTICLE_DETAIL}?bbsId=${encodeURIComponent(item.bbsId)}&nttId=${item.nttId}`;
      const detail = await apiClient.get<ArticleDetailFilesResponse>(url);
      const files = detail.attacheFiles ?? [];
      if (files.length === 0) return;
      const f = files[0];
      await downloadWaterbAttachment(
        String(f.fileId),
        f.seq,
        f.orgfNm ?? undefined,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "파일을 다운로드하지 못했습니다.";
      alert(msg);
    } finally {
      setAttachDownloadingNttId(null);
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = searchInput.trim();
    const qs = new URLSearchParams();
    qs.set("tab", activeTab);
    qs.set("page", "1");
    if (pageSizeParam !== DEFAULT_PAGE_SIZE) {
      qs.set("pageSize", String(pageSizeParam));
    }
    if (kw) {
      if (activeTab !== "eumArchive") {
        qs.set("searchCnd", searchField);
      }
      qs.set("searchWrd", kw);
    }
    router.push(`/userWeb/community?${qs.toString()}`, { scroll: false });
  };

  const onPageSizeChange = (n: number) => {
    if (loading) return;
    router.push(
      buildCommunityListUrl(activeTab, 1, {
        searchCnd: initialSearchCondition,
        searchWrd: searchWrdParam,
        pageSize: n,
      }),
      { scroll: false },
    );
  };

  useEffect(() => {
    setSearchField(initialSearchCondition);
    setSearchInput(searchWrdParam);
  }, [initialSearchCondition, searchWrdParam, activeTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const kw = searchWrdParam.trim();

    const pEumArchive =
      activeTab === "eumArchive"
        ? getArchiveArticleList({
            bbsId,
            limit: pageSizeParam,
            offset,
            ...(kw
              ? { searchKeyword: kw, searchCondition: "2" }
              : {}),
          }).then((res) => {
            if (cancelled) return;
            const rows = Array.isArray(res?.data) ? res.data : [];
            const mapped: UserArticleListItem[] = rows.map((row) => ({
              nttId: row.nttId ?? null,
              bbsId: row.bbsId ?? null,
              nttSj: row.nttSj ?? null,
              ntcrNm: null,
              ntcrDt: null,
              rdcnt: null,
              noticeAt: null,
              atchFileId: null,
              nttImgFileId: row.nttImgFileId ?? null,
              nttImgSaveNm: row.nttImgSaveNm ?? null,
            }));
            setList(mapped);
            setListOffset(offset);
            setListPage(currentPage);
            setRecordsTotal(parseRecordsTotal(res));
            setError(null);
          })
        : null;

    const pStandard =
      activeTab !== "eumArchive"
        ? getUserArticleList({
            bbsId,
            limit: pageSizeParam,
            offset,
            ...(kw
              ? {
                  searchCondition: toApiSearchCondition(initialSearchCondition),
                  searchKeyword: kw,
                }
              : {}),
          }).then((res) => {
            if (cancelled) return;
            const raw = Array.isArray(res?.data) ? res.data : [];
            setList(raw);
            setListOffset(offset);
            setListPage(currentPage);
            setRecordsTotal(parseRecordsTotal(res));
            setError(null);
          })
        : null;

    const promise = pEumArchive ?? pStandard;
    if (promise) {
      promise
        .catch(() => {
          if (!cancelled) {
            setList([]);
            setRecordsTotal(0);
            setError("목록을 불러오지 못했습니다.");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    bbsId,
    offset,
    pageSizeParam,
    searchWrdParam,
    initialSearchCondition,
    currentPage,
  ]);

  useEffect(() => {
    if (loading || error) return;
    if (totalPages > 0 && currentPage > totalPages) {
      router.replace(
        buildCommunityListUrl(activeTab, totalPages, {
          searchCnd: initialSearchCondition,
          searchWrd: searchWrdParam,
          pageSize: pageSizeParam,
        }),
        { scroll: false },
      );
    }
  }, [
    loading,
    error,
    totalPages,
    currentPage,
    activeTab,
    router,
    pageSizeParam,
    searchWrdParam,
    initialSearchCondition,
  ]);

  const renderPagination = () => {
    if (recordsTotal <= 0 || totalPages < 1) return null;

    const activePageForUi = loading ? listPage : currentPage;

    const windowSize = 10;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, activePageForUi - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const firstDisabled = activePageForUi <= 1;
    const prevDisabled = activePageForUi <= 1;
    const nextDisabled = activePageForUi >= totalPages;
    const lastDisabled = activePageForUi >= totalPages;

    return (
      <div className="communityPaginationWrap">
        <div
          className="communityPagination"
          role="navigation"
          aria-label="페이지 네비게이션"
        >
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || firstDisabled}
            onClick={() => goToPage(1)}
            aria-label="첫 페이지"
          >
            {"<<"}
          </button>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || prevDisabled}
            onClick={() => goToPage(activePageForUi - 1)}
            aria-label="이전 페이지"
          >
            {"<"}
          </button>
          <div className="communityPageNumbers" aria-label="페이지 번호">
            {Array.from({ length: end - start + 1 }).map((_, i) => {
              const p = start + i;
              const isActive = p === activePageForUi;
              return (
                <button
                  key={p}
                  type="button"
                  className={`communityPageBtn ${isActive ? "active" : ""}`}
                  onClick={() => goToPage(p)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || nextDisabled}
            onClick={() => goToPage(activePageForUi + 1)}
            aria-label="다음 페이지"
          >
            {">"}
          </button>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || lastDisabled}
            onClick={() => goToPage(totalPages)}
            aria-label="마지막 페이지"
          >
            {">>"}
          </button>
        </div>
      </div>
    );
  };

  const renderStandardThead = () => (
    <thead>
      <tr>
        <th scope="col" className="colNum" style={{ width: "10%" }}>
          번호
        </th>
        <th scope="col" className="colTitle" style={{ width: "40%" }}>
          제목
        </th>
        <th scope="col" className="colName" style={{ width: "15%" }}>
          작성자
        </th>
        <th scope="col" className="colDate" style={{ width: "15%" }}>
          등록일
        </th>
        <th scope="col" className="colFile" style={{ width: "10%" }}>
          첨부파일
        </th>
        <th scope="col" className="colView" style={{ width: "10%" }}>
          조회
        </th>
      </tr>
    </thead>
  );

  const renderTbodyStandard = () => {
    if (error && list.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="colEmpty">
            {error}
          </td>
        </tr>
      );
    }
    if (list.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="colEmpty">
            {loading ? "잠시만 기다려 주세요." : "등록된 글이 없습니다."}
          </td>
        </tr>
      );
    }
    return list.map((item, index) => {
      const isNotice = item.noticeAt === "Y";
      const rowNum = isNotice ? null : recordsTotal - (listOffset + index);
      const href = `/userWeb/community/${item.nttId ?? ""}?bbsId=${encodeURIComponent(
        item.bbsId ?? "",
      )}&page=${listPage}`;
      const hasAttach =
        item.atchFileId != null && String(item.atchFileId).trim() !== "";
      return (
        <tr key={item.nttId ?? index} className={isNotice ? "isNotice" : ""}>
          <td className="cellNum">
            {isNotice ? <span className="badgeNotice">공지</span> : rowNum}
          </td>
          <td className="cellTitle">
            <Link href={href} className="ellipsis">
              {item.nttSj ?? ""}
            </Link>
          </td>
          <td className="cellName">{item.ntcrNm ?? ""}</td>
          <td className="cellDate">{item.ntcrDt ?? ""}</td>
          <td className="cellFile">
            {hasAttach ? (
              <button
                type="button"
                className="mainViewCellFileButton"
                aria-label="첨부파일 다운로드"
                title="첨부파일 다운로드"
                disabled={attachDownloadingNttId === item.nttId}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleAttachmentDownload(item);
                }}
              >
                <div className="fileIcon" aria-hidden />
              </button>
            ) : null}
          </td>
          <td className="cellView">{item.rdcnt ?? 0}</td>
        </tr>
      );
    });
  };

  const renderTbodyInquiry = () => {
    if (error && list.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="colEmpty">
            {error}
          </td>
        </tr>
      );
    }
    if (list.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="colEmpty">
            {loading ? "잠시만 기다려 주세요." : "등록된 글이 없습니다."}
          </td>
        </tr>
      );
    }
    return list.map((item, index) => {
      const isNotice = item.noticeAt === "Y";
      const rowNum = isNotice ? null : recordsTotal - (listOffset + index);
      const isSecret = item.secretAt === "Y";
      const href = isSecret
        ? `/userWeb/community/pw?nttId=${item.nttId ?? ""}&bbsId=${encodeURIComponent(
            item.bbsId ?? "",
          )}&page=${listPage}`
        : `/userWeb/community/${item.nttId ?? ""}?bbsId=${encodeURIComponent(
            item.bbsId ?? "",
          )}&page=${listPage}`;
      const answered = item.answerCnt != null && item.answerCnt > 0;
      const hasAttach =
        item.atchFileId != null && String(item.atchFileId).trim() !== "";
      return (
        <tr key={item.nttId ?? index} className={isNotice ? "isNotice" : ""}>
          <td className="cellNum">
            {isNotice ? <span className="badgeNotice">공지</span> : rowNum}
          </td>
          <td className="cellStatus">
            {isNotice ? (
              <span className="sr-only">공지</span>
            ) : (
              <div
                className={`badge ${answered ? "statusComplete" : "statusWaiting"}`}
              >
                {answered ? "답변완료" : "답변대기"}
              </div>
            )}
          </td>
          <td className="cellTitle">
            <Link href={href} className="ellipsis">
              {item.nttSj ?? ""}
            </Link>
          </td>
          <td className="cellName">{item.ntcrNm ?? ""}</td>
          <td className="cellDate">{item.ntcrDt ?? ""}</td>
          <td className="cellFile">
            {hasAttach ? (
              <button
                type="button"
                className="mainViewCellFileButton"
                aria-label="첨부파일 다운로드"
                title="첨부파일 다운로드"
                disabled={attachDownloadingNttId === item.nttId}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleAttachmentDownload(item);
                }}
              >
                <div className="fileIcon" aria-hidden />
              </button>
            ) : null}
          </td>
        </tr>
      );
    });
  };

  const activeNav = tabToActiveNav(activeTab);
  const headTit = TAB_HEAD[activeTab];

  const EUM_ARCHIVE_PLACEHOLDER_IMG = "/images/userWeb/img_noImg.png";

  const renderEumArchiveGrid = () => {
    if (error && list.length === 0) {
      return (
        <div className="archiveContainer">
          <p className="colEmpty" style={{ textAlign: "center", padding: 40 }}>
            {error}
          </p>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="archiveContainer">
          <p
            className="colEmpty"
            style={{ textAlign: "center", padding: 40 }}
          >
            {loading ? "잠시만 기다려 주세요." : "등록된 글이 없습니다."}
          </p>
        </div>
      );
    }
    return (
      <div className="archiveContainer">
        <ul className="archiveList">
          {list.map((item, index) => {
            const href = `/userWeb/community/${item.nttId ?? ""}?bbsId=${encodeURIComponent(
              item.bbsId ?? "",
            )}&page=${listPage}`;
            return (
              <li key={item.nttId ?? index} className="archiveItem">
                <Link href={href} className="archiveLink">
                  <article>
                    <div className="thumbBox">
                      <img
                        src={(() => {
                          const cacheBust =
                            item.nttImgSaveNm != null &&
                            String(item.nttImgSaveNm).trim() !== ""
                              ? String(item.nttImgSaveNm)
                              : undefined;
                          const url = resolveArticleImageUrl(
                            item.nttImgFileId ?? "",
                            {
                              thumbSize: USER_EUM_ARCHIVE_LIST_THUMB_SIZE,
                              cacheBust,
                            },
                          );
                          return url || EUM_ARCHIVE_PLACEHOLDER_IMG;
                        })()}
                        alt=""
                        className="archiveThumb"
                        onError={(e) => {
                          e.currentTarget.src = EUM_ARCHIVE_PLACEHOLDER_IMG;
                        }}
                      />
                    </div>
                    <div className="infoBox">
                      <div className="archiveTitle">{item.nttSj ?? ""}</div>
                    </div>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const tableSummary =
    activeTab === "inquiry"
      ? "1:1 문의 목록이며 번호, 처리상태, 질문, 작성자, 작성일, 첨부파일 정보를 제공합니다."
      : `${headTit} 목록이며 번호, 제목, 작성자, 등록일, 첨부파일, 조회수 정보를 제공합니다.`;

  return (
    <NoticeCommunityChrome
      themeQuery=""
      shell="community"
      headTit={headTit}
      breadcrumbCurrent={headTit}
      breadcrumbMode={
        activeTab === "guide"
          ? "generalArchive"
          : activeTab === "eumArchive"
            ? "eumArchive"
            : "default"
      }
      activeNav={activeNav}
    >
      <form
        className="filterSearchContainer"
        aria-label={
          activeTab === "guide"
            ? "프로그램 검색 및 필터"
            : `${headTit} 검색`
        }
        onSubmit={applySearch}
      >
        <div className="filterBar">
          <div className="filterGroupWrap">
            <fieldset className="filterGroup" aria-label="검색">
              <div className="filterTitle">검색</div>
              <div className="inputWrap">
                <div className="searchFilter">
                  <label htmlFor="communitySearchType" className="blind">
                    검색 조건 선택
                  </label>
                  <select
                    id="communitySearchType"
                    className="input"
                    value={searchField}
                    onChange={(e) =>
                      setSearchField(e.target.value as SearchCondition)
                    }
                    aria-label={
                      activeTab === "eumArchive"
                        ? "검색 조건(제목만)"
                        : undefined
                    }
                  >
                    {searchConditionOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="search"
                  name="q"
                  placeholder="검색어를 입력해 주세요"
                  title="검색어 입력"
                  className="searchInput"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="btnSearch">
                  검색
                </button>
              </div>
            </fieldset>
          </div>
        </div>
      </form>
      <div>
        <div
          className={
            activeTab === "eumArchive" ? "headInfo flex-sb" : "headInfo flex-sb mb-24"
          }
        >
          <div className="count">
            총 게시물 <b>{recordsTotal}</b>개
          </div>
          <div className="listCountWrap">
            <label htmlFor="communityPageSize" className="blind">
              게시물 출력 개수 선택
            </label>
            <select
              id="communityPageSize"
              className="input inputSelect"
              title="게시물 출력 개수 선택"
              value={pageSizeParam}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </div>
        </div>
        <section id={activeTab}>
          {activeTab === "eumArchive" ? (
            <>
              {renderEumArchiveGrid()}
              {renderPagination()}
            </>
          ) : (
            <>
              <div className="mainViewTableWrapper">
                <table className="mainViewTable" summary={tableSummary}>
                  <caption className="blind">{headTit} 리스트</caption>
                  {activeTab === "inquiry" ? (
                    <>
                      <thead>
                        <tr>
                          <th scope="col" className="colNum" style={{ width: "10%" }}>
                            번호
                          </th>
                          <th scope="col" className="colStatus" style={{ width: "10%" }}>
                            처리상태
                          </th>
                          <th scope="col" className="colTitle" style={{ width: "45%" }}>
                            질문
                          </th>
                          <th scope="col" className="colName" style={{ width: "10%" }}>
                            작성자
                          </th>
                          <th scope="col" className="colDate" style={{ width: "15%" }}>
                            작성일
                          </th>
                          <th scope="col" className="colFile" style={{ width: "10%" }}>
                            첨부파일
                          </th>
                        </tr>
                      </thead>
                      <tbody>{renderTbodyInquiry()}</tbody>
                    </>
                  ) : (
                    <>
                      {renderStandardThead()}
                      <tbody>{renderTbodyStandard()}</tbody>
                    </>
                  )}
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </section>
      </div>
    </NoticeCommunityChrome>
  );
}
