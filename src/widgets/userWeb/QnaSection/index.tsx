"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getUserArticleList,
  type UserArticleListItem,
  type UserArticleListResponse,
} from "@/entities/userWeb/article/api";
import {
  API_ENDPOINTS,
  getArchiveBbsId,
  getQnaBbsId,
  resolveUserWebBoardParams,
} from "@/shared/config/apiUser";
import { apiClient, downloadWaterbAttachment } from "@/shared/lib";
import { AuthService } from "@/entities/auth/api";
import { useUserWebAuth } from "@/features/userWeb/auth/context/UserWebAuthContext";
import {
  NoticeCommunityChrome,
  type CommunityBreadcrumbMode,
  type CommunityChromeActiveNav,
} from "@/widgets/userWeb/NoticeCommunityChrome";

type TabId = "qna" | "archive";

type ArticleDetailFilesResponse = {
  attacheFiles?: { fileId: string; seq: number; orgfNm: string | null }[];
};

/** `qna2.html` 검색 셀렉트 — 제목·내용·작성자 */
const QNA_SEARCH_CONDITIONS = [
  { value: "title" as const, label: "제목" },
  { value: "content" as const, label: "내용" },
  { value: "author" as const, label: "작성자" },
];
type SearchCondition = (typeof QNA_SEARCH_CONDITIONS)[number]["value"];

const UI_TO_API_SEARCH_CONDITION: Record<
  SearchCondition,
  "1" | "2" | "3" | "4"
> = {
  title: "2",
  author: "3",
  content: "4",
};

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

function mergeThemeIntoQs(qs: URLSearchParams, themeQuery: string) {
  if (!themeQuery.trim()) return;
  const p = new URLSearchParams(themeQuery);
  p.forEach((v, k) => qs.set(k, v));
}

function buildQnaListUrl(
  tab: TabId,
  page: number,
  themeQuery: string,
  opts?: { searchCnd?: SearchCondition; searchWrd?: string; pageSize?: number },
): string {
  const qs = new URLSearchParams();
  if (tab === "archive") qs.set("tab", "archive");
  qs.set("page", String(page));
  const ps = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  if (ps !== DEFAULT_PAGE_SIZE) {
    qs.set("pageSize", String(ps));
  }
  const kw = opts?.searchWrd?.trim() ?? "";
  if (kw) {
    qs.set("searchCnd", opts?.searchCnd ?? "title");
    qs.set("searchWrd", kw);
  }
  mergeThemeIntoQs(qs, themeQuery);
  return `/userWeb/qna?${qs.toString()}`;
}

function parseRecordsTotal(
  res: UserArticleListResponse | null | undefined,
): number {
  const raw = res?.recordsTotal ?? res?.recordsFiltered;
  if (raw == null) return 0;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && !Number.isNaN(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * 묻고답하기·자료실 — `qna2.html` / 커뮤니티 `mainViewTable` 레이아웃.
 * ?tab=archive → 이음 아카이브(BBS) 목록. ?tab= 생략 → 1:1 문의.
 */
export default function QnaSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useUserWebAuth();

  const boardParams = useMemo(() => {
    const userSe = isAuthenticated ? AuthService.getUserSe() : null;
    return resolveUserWebBoardParams(
      searchParams.get("reqGbPosition"),
      searchParams.get("type"),
      userSe,
    );
  }, [searchParams, isAuthenticated]);

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = useMemo(() => {
    if (tabParam === "archive") return "archive";
    return "qna";
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

  const themeQuery = useMemo(() => {
    if (boardParams.type)
      return `type=${encodeURIComponent(boardParams.type)}`;
    if (boardParams.reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(boardParams.reqGbPosition)}`;
    return "";
  }, [boardParams]);

  const qnaBbsId = useMemo(
    () => getQnaBbsId(boardParams.reqGbPosition, boardParams.type),
    [boardParams],
  );
  const archiveBbsId = useMemo(
    () => getArchiveBbsId(boardParams.reqGbPosition, boardParams.type),
    [boardParams],
  );

  const bbsId = activeTab === "qna" ? qnaBbsId : archiveBbsId;

  const [list, setList] = useState<UserArticleListItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [listOffset, setListOffset] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SearchCondition>("title");
  const [searchInput, setSearchInput] = useState("");
  const [attachDownloadingNttId, setAttachDownloadingNttId] = useState<
    number | null
  >(null);

  const searchWrdParam = searchParams.get("searchWrd") ?? "";
  const searchCndParam = searchParams.get("searchCnd") ?? "";
  const initialSearchCondition: SearchCondition = useMemo(() => {
    if (
      searchCndParam === "title" ||
      searchCndParam === "content" ||
      searchCndParam === "author"
    ) {
      return searchCndParam;
    }
    if (searchWrdParam.trim()) return "title";
    return "title";
  }, [searchCndParam, searchWrdParam]);

  const offset = (currentPage - 1) * pageSizeParam;
  const totalPages = useMemo(() => {
    if (recordsTotal <= 0) return 0;
    return Math.ceil(recordsTotal / pageSizeParam);
  }, [recordsTotal, pageSizeParam]);

  const goToPage = (page: number) => {
    if (loading) return;
    const next = page < 1 ? 1 : page;
    router.push(
      buildQnaListUrl(activeTab, next, themeQuery, {
        searchCnd: initialSearchCondition,
        searchWrd: searchWrdParam,
        pageSize: pageSizeParam,
      }),
      { scroll: false },
    );
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = searchInput.trim();
    router.push(
      buildQnaListUrl(activeTab, 1, themeQuery, {
        searchCnd: searchField,
        searchWrd: kw,
        pageSize: pageSizeParam,
      }),
      { scroll: false },
    );
  };

  const onPageSizeChange = (n: number) => {
    if (loading) return;
    router.push(
      buildQnaListUrl(activeTab, 1, themeQuery, {
        searchCnd: initialSearchCondition,
        searchWrd: searchWrdParam,
        pageSize: n,
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

  useEffect(() => {
    setSearchField(initialSearchCondition);
    setSearchInput(searchWrdParam);
  }, [initialSearchCondition, searchWrdParam]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserArticleList({
      bbsId,
      limit: pageSizeParam,
      offset,
      ...(searchWrdParam.trim()
        ? {
            searchCondition: UI_TO_API_SEARCH_CONDITION[initialSearchCondition],
            searchKeyword: searchWrdParam.trim(),
          }
        : {}),
    })
      .then((res) => {
        if (!cancelled) {
          setList(Array.isArray(res?.data) ? res.data : []);
          setListOffset(offset);
          setListPage(currentPage);
          setRecordsTotal(parseRecordsTotal(res));
          setError(null);
        }
      })
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

    return () => {
      cancelled = true;
    };
  }, [bbsId, offset, pageSizeParam, searchWrdParam, initialSearchCondition]);

  useEffect(() => {
    if (loading || error) return;
    if (totalPages > 0 && currentPage > totalPages) {
      router.replace(
        buildQnaListUrl(activeTab, totalPages, themeQuery, {
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
    themeQuery,
    initialSearchCondition,
    searchWrdParam,
    pageSizeParam,
  ]);

  const detailHref = (tab: TabId, postId: string) => {
    const q = new URLSearchParams();
    q.set("bbsId", tab === "qna" ? qnaBbsId : archiveBbsId);
    q.set("page", String(listPage));
    if (tab === "archive") q.set("tab", "archive");
    if (pageSizeParam !== DEFAULT_PAGE_SIZE) {
      q.set("pageSize", String(pageSizeParam));
    }
    if (searchWrdParam.trim()) {
      q.set("searchCnd", initialSearchCondition);
      q.set("searchWrd", searchWrdParam);
    }
    mergeThemeIntoQs(q, themeQuery);
    return `/userWeb/qna/${postId}?${q.toString()}`;
  };

  const pwHref = (tab: TabId, nttId: number | null, bbs: string | null) => {
    if (nttId == null || !bbs) return "#";
    const q = new URLSearchParams();
    q.set("nttId", String(nttId));
    q.set("bbsId", bbs);
    q.set("tab", tab);
    q.set("page", String(listPage));
    if (pageSizeParam !== DEFAULT_PAGE_SIZE) {
      q.set("pageSize", String(pageSizeParam));
    }
    if (searchWrdParam.trim()) {
      q.set("searchCnd", initialSearchCondition);
      q.set("searchWrd", searchWrdParam);
    }
    mergeThemeIntoQs(q, themeQuery);
    return `/userWeb/qna/pw?${q.toString()}`;
  };

  const headTit = activeTab === "qna" ? "1:1 문의" : "자료실";
  const activeNav: CommunityChromeActiveNav =
    activeTab === "qna" ? "qna" : "eumArchive";
  const breadcrumbMode: CommunityBreadcrumbMode =
    activeTab === "archive" ? "eumArchive" : "default";

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

  const tableSummaryQna =
    "1:1문의 목록이며 번호,처리상태,질문,작성자,작성일,첨부파일 정보를 제공합니다.";
  const tableSummaryArchive = `${headTit} 목록이며 번호, 제목, 작성자, 등록일, 첨부파일, 조회수 정보를 제공합니다.`;

  return (
    <NoticeCommunityChrome
      themeQuery={themeQuery}
      shell="community"
      headTit={headTit}
      breadcrumbCurrent={headTit}
      breadcrumbMode={breadcrumbMode}
      activeNav={activeNav}
    >
      <form
        className="filterSearchContainer"
        aria-label={`${headTit} 검색`}
        onSubmit={applySearch}
      >
        <div className="filterBar">
          <div className="filterGroupWrap">
            <fieldset className="filterGroup" aria-label="검색">
              <div className="filterTitle">검색</div>
              <div className="inputWrap">
                <div className="searchFilter">
                  <label htmlFor="qnaSearchType" className="blind">
                    검색 조건 선택
                  </label>
                  <select
                    id="qnaSearchType"
                    className="input"
                    value={searchField}
                    onChange={(e) =>
                      setSearchField(e.target.value as SearchCondition)
                    }
                  >
                    {QNA_SEARCH_CONDITIONS.map((o) => (
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
        <div className="headInfo flex-sb mb-24">
          <div className="count">
            총 게시물 <b>{recordsTotal}</b>개
          </div>
          <div className="listCountWrap">
            <label htmlFor="qnaPageSize" className="blind">
              게시물 출력 개수 선택
            </label>
            <select
              id="qnaPageSize"
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
        <section id={activeTab === "qna" ? "content_qna" : "content_archive"}>
          <div className="mainViewTableWrapper">
            <table
              className="mainViewTable"
              summary={activeTab === "qna" ? tableSummaryQna : tableSummaryArchive}
            >
              <caption className="blind">
                {activeTab === "qna" ? "묻고답하기 리스트" : `${headTit} 리스트`}
              </caption>
              {activeTab === "qna" ? (
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
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          목록을 불러오는 중입니다.
                        </td>
                      </tr>
                    )}
                    {!loading && error && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          {error}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && list.length === 0 && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          등록된 글이 없습니다.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !error &&
                      list.map((item, index) => {
                        const isNotice = item.noticeAt === "Y";
                        const rowNum = isNotice
                          ? null
                          : recordsTotal - (listOffset + index);
                        const isSecret = item.secretAt === "Y";
                        const href = isSecret
                          ? pwHref("qna", item.nttId, item.bbsId ?? qnaBbsId)
                          : detailHref("qna", String(item.nttId ?? ""));
                        const answered =
                          item.answerCnt != null && item.answerCnt > 0;
                        const hasAttach =
                          item.atchFileId != null &&
                          String(item.atchFileId).trim() !== "";
                        return (
                          <tr
                            key={item.nttId ?? index}
                            className={isNotice ? "isNotice" : ""}
                          >
                            <td className="cellNum">
                              {isNotice ? (
                                <span className="badgeNotice">공지</span>
                              ) : (
                                rowNum
                              )}
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
                                  disabled={
                                    attachDownloadingNttId === item.nttId
                                  }
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
                      })}
                  </tbody>
                </>
              ) : (
                <>
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
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          목록을 불러오는 중입니다.
                        </td>
                      </tr>
                    )}
                    {!loading && error && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          {error}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && list.length === 0 && (
                      <tr>
                        <td colSpan={6} className="colEmpty">
                          등록된 자료가 없습니다.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !error &&
                      list.map((item, index) => {
                        const isNotice = item.noticeAt === "Y";
                        const rowNum = isNotice
                          ? null
                          : recordsTotal - (listOffset + index);
                        const isSecret = item.secretAt === "Y";
                        const href = isSecret
                          ? pwHref(
                              "archive",
                              item.nttId,
                              item.bbsId ?? archiveBbsId,
                            )
                          : detailHref("archive", String(item.nttId ?? ""));
                        const hasAttach =
                          item.atchFileId != null &&
                          String(item.atchFileId).trim() !== "";
                        return (
                          <tr
                            key={item.nttId ?? index}
                            className={isNotice ? "isNotice" : ""}
                          >
                            <td className="cellNum">
                              {isNotice ? (
                                <span className="badgeNotice">공지</span>
                              ) : (
                                rowNum
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
                                  disabled={
                                    attachDownloadingNttId === item.nttId
                                  }
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
                      })}
                  </tbody>
                </>
              )}
            </table>
          </div>
          {renderPagination()}
        </section>
      </div>
    </NoticeCommunityChrome>
  );
}
