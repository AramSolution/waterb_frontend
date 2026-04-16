"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS, getNoticeBbsId } from "@/shared/config/apiUser";
import { NoticeCommunityChrome } from "@/widgets/userWeb/NoticeCommunityChrome";

type ArticleListItem = {
  nttId: number | null;
  bbsId: string | null;
  nttSj: string | null;
  ntcrNm: string | null;
  ntcrDt: string | null;
  rdcnt: number | null;
  noticeAt: string | null;
  atchFileId: string | null;
  secretAt?: string | null;
};

type ArticleListResponse = {
  data: ArticleListItem[];
  recordsTotal: number;
  recordsFiltered: number;
};

const NOTICE_LIST_LIMIT = 500;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

type SearchField = "title" | "content" | "writer";

/**
 * 공지 목록 — source/gunsan/notice2.html 구조·클래스
 * BBS: getNoticeBbsId(reqGbPosition | type)
 */
export default function NoticeSection() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<ArticleListItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchField, setSearchField] = useState<SearchField>("title");
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [listPage, setListPage] = useState(1);

  const bbsId = useMemo(
    () =>
      getNoticeBbsId(
        searchParams.get("reqGbPosition"),
        searchParams.get("type"),
      ),
    [searchParams],
  );

  const themeQuery = useMemo(() => {
    const type = searchParams.get("type");
    const reqGbPosition = searchParams.get("reqGbPosition");
    if (type) return `type=${encodeURIComponent(type)}`;
    if (reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
    return "";
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `${API_ENDPOINTS.USER_ARTICLES}?bbsId=${encodeURIComponent(bbsId)}&limit=${NOTICE_LIST_LIMIT}&offset=0`;
    apiClient
      .get<ArticleListResponse>(url)
      .then((res) => {
        if (!cancelled) {
          setList(Array.isArray(res?.data) ? res.data : []);
          setRecordsTotal(res?.recordsTotal ?? 0);
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
  }, [bbsId]);

  const detailHref = (nttId: string) => {
    const base = "/userWeb/notice";
    return themeQuery ? `${base}/${nttId}?${themeQuery}` : `${base}/${nttId}`;
  };

  const pwHref = (nttId: number | null, bbsIdVal: string | null) => {
    if (nttId == null || !bbsIdVal) return "#";
    const q = `nttId=${nttId}&bbsId=${encodeURIComponent(bbsIdVal)}`;
    return themeQuery
      ? `/userWeb/notice/pw?${q}&${themeQuery}`
      : `/userWeb/notice/pw?${q}`;
  };

  const filteredList = useMemo(() => {
    const k = appliedKeyword.trim().toLowerCase();
    if (!k) return list;
    return list.filter((item) => {
      if (searchField === "title") {
        return (item.nttSj ?? "").toLowerCase().includes(k);
      }
      if (searchField === "writer") {
        return (item.ntcrNm ?? "").toLowerCase().includes(k);
      }
      return (item.nttSj ?? "").toLowerCase().includes(k);
    });
  }, [list, appliedKeyword, searchField]);

  const normalOrdered = useMemo(
    () => filteredList.filter((i) => i.noticeAt !== "Y"),
    [filteredList],
  );

  const rowNumberFor = (item: ArticleListItem) => {
    const pos = normalOrdered.findIndex((x) => x.nttId === item.nttId);
    if (pos < 0) return 0;
    return normalOrdered.length - pos;
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredList.length / pageSize) || 1,
  );

  useEffect(() => {
    setListPage(1);
  }, [appliedKeyword, searchField, pageSize, bbsId]);

  useEffect(() => {
    if (listPage > totalPages) setListPage(totalPages);
  }, [listPage, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (listPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, listPage, pageSize]);

  const displayTotal = appliedKeyword.trim() ? filteredList.length : recordsTotal;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(searchInput);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setListPage(p);
  };

  const renderPagination = () => {
    if (filteredList.length === 0) return null;
    const windowSize = 10;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, listPage - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const firstDisabled = listPage <= 1;
    const prevDisabled = listPage <= 1;
    const nextDisabled = listPage >= totalPages;
    const lastDisabled = listPage >= totalPages;

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
            onClick={() => goToPage(listPage - 1)}
            aria-label="이전 페이지"
          >
            {"<"}
          </button>
          <div className="communityPageNumbers" aria-label="페이지 번호">
            {Array.from({ length: end - start + 1 }).map((_, i) => {
              const p = start + i;
              const isActive = p === listPage;
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
            onClick={() => goToPage(listPage + 1)}
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

  return (
    <NoticeCommunityChrome themeQuery={themeQuery} shell="notice">
      <form
        className="filterSearchContainer"
        aria-label="공지사항 검색"
        onSubmit={onSearchSubmit}
      >
        <div className="filterBar">
          <div className="filterGroupWrap">
            <fieldset className="filterGroup" aria-label="검색">
              <div className="filterTitle">검색</div>
              <div className="inputWrap">
                <div className="searchFilter">
                  <label htmlFor="noticeSearchType" className="blind">
                    검색 조건 선택
                  </label>
                  <select
                    id="noticeSearchType"
                    className="input"
                    value={searchField}
                    onChange={(e) =>
                      setSearchField(e.target.value as SearchField)
                    }
                  >
                    <option value="title">제목</option>
                    <option value="content">내용</option>
                    <option value="writer">작성자</option>
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
            총 게시물 <b>{displayTotal}</b>개
          </div>
          <div className="listCountWrap">
            <label htmlFor="noticePageSize" className="blind">
              게시물 출력 개수 선택
            </label>
            <select
              id="noticePageSize"
              className="input inputSelect"
              title="게시물 출력 개수 선택"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </div>
        </div>
        <section id="notice">
          <div className="mainViewTableWrapper">
            <table
              className="mainViewTable"
              summary="공지사항 목록이며 번호, 제목, 작성자, 등록일, 첨부파일, 조회수 정보를 제공합니다."
            >
              <caption className="blind">공지사항 리스트</caption>
              <thead>
                <tr>
                  <th scope="col" className="colNum" style={{ width: "10%" }}>
                    번호
                  </th>
                  <th scope="col" className="colTitle" style={{ width: "40%" }}>
                    제목
                  </th>
                  <th scope="col" className="colAuthor" style={{ width: "15%" }}>
                    작성자
                  </th>
                  <th scope="col" className="colDate" style={{ width: "15%" }}>
                    등록일
                  </th>
                  <th scope="col" className="colAttach" style={{ width: "10%" }}>
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
                      목록을 불러오는 중…
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
                {!loading && !error && pageSlice.length === 0 && (
                  <tr>
                    <td colSpan={6} className="colEmpty">
                      등록된 공지가 없습니다.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  pageSlice.map((item, index) => {
                    const isNotice = item.noticeAt === "Y";
                    const href =
                      item.secretAt === "Y"
                        ? pwHref(item.nttId, item.bbsId ?? bbsId)
                        : detailHref(String(item.nttId ?? ""));
                    const hasAttach =
                      item.atchFileId != null &&
                      String(item.atchFileId).trim() !== "";
                    return (
                      <tr
                        key={item.nttId ?? index}
                        className={isNotice ? "isNotice" : ""}
                      >
                        <td className="colNum">
                          {isNotice ? (
                            <span className="badgeNotice">공지</span>
                          ) : (
                            rowNumberFor(item)
                          )}
                        </td>
                        <td className="colTitle">
                          <Link href={href} className="ellipsis">
                            {item.nttSj ?? ""}
                          </Link>
                        </td>
                        <td className="colAuthor">{item.ntcrNm ?? ""}</td>
                        <td className="colDate">{item.ntcrDt ?? ""}</td>
                        <td className="colAttach">
                          {hasAttach ? (
                            <Link
                              href={href}
                              className="mainViewAttachBtn mainViewAttachCell"
                              aria-label="첨부파일이 있습니다. 상세 보기"
                              title="첨부파일이 있습니다"
                            >
                              <Paperclip size={20} strokeWidth={2} aria-hidden />
                            </Link>
                          ) : (
                            <span className="mainViewAttachEmpty" aria-hidden>
                              —
                            </span>
                          )}
                        </td>
                        <td className="colView">{item.rdcnt ?? 0}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </section>
      </div>
    </NoticeCommunityChrome>
  );
}
