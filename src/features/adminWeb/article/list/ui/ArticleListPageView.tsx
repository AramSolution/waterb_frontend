"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
import { Pagination } from "@/shared/ui/adminWeb";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { useArticleList } from "../model";
import { ArticleListThumbnailCell } from "./ArticleListThumbnailCell";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/search-form.css";

export const ArticleListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    articles,
    totalElements,
    totalPages,
    error,
    tableRef,
    pageSize,
    bbsId,
    bbsNm,
    bbsSe,
    replyYn,
    searchCondition,
    searchKeyword,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    handleDetailClick,
    handleExcelDownload,
    handleMessageDialogClose,
    setSearchCondition,
    setSearchKeyword,
  } = useArticleList();
  /** 갤러리(BBST02)·아카이브(BBST03): 썸네일·이미지 컬럼 목록 레이아웃 */
  const isGalleryStyleList =
    bbsSe === "BBST02" || bbsSe === "BBST03";
  const isArchiveBoard = bbsSe === "BBST03";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{bbsNm || "게시글관리"}</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>{" "}
          &gt; <span>{bbsNm || "게시글관리"}</span>
        </nav>
      </div>

      {/* 모바일 조회조건 토글 버튼 */}
      <div className="md:hidden mb-2">
        <button
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
          onClick={() => setShowSearchForm(!showSearchForm)}
        >
          {showSearchForm ? "▲ 조회조건 닫기" : "▼ 조회조건 열기"}
        </button>
      </div>

      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? "show" : ""
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  검색구분
                </label>
                <div className="w-full md:w-3/4 flex p-2">
                  <select
                    className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="1">전체</option>
                    <option value="2">제목</option>
                    <option value="3">작성자</option>
                    <option value="4">내용</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3 gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={handleSearch}
        >
          🔍 조회
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={() => {
            const params = new URLSearchParams();
            if (bbsId) params.set("bbsId", bbsId);
            if (bbsNm) params.set("bbsNm", bbsNm);
            router.push(
              `/adminWeb/board/list/article/register?${params.toString()}`,
            );
          }}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            게시글 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-[13px] bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExcelDownload}
              disabled={loading}
            >
              {loading ? "⏳ 다운로드 중..." : "📊 엑셀"}
            </button>
          </div>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <>
              {/* 데스크톱 스켈레톤 테이블 */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full mb-0" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    {isGalleryStyleList ? (
                      <>
                        <col style={{ width: "6%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "20%" }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "13%" }} />
                      </>
                    )}
                  </colgroup>
                  <thead className="bg-gray-50">
                    {isGalleryStyleList ? (
                      <tr className="border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          이미지
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          제목
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시자명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시일시
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          조회수
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상태
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    ) : (
                      <tr className="border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          제목
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시자명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시일시
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          조회수
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          답글여부
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상태
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-r">
                          {isGalleryStyleList ? (
                            <div
                              className="skeleton mx-auto rounded"
                              style={{
                                width: "56px",
                                height: "56px",
                              }}
                            />
                          ) : (
                            <div
                              className="skeleton"
                              style={{
                                width: "30px",
                                height: "16px",
                                margin: "0 auto",
                              }}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "200px",
                              height: "16px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "80px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "120px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "50px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "60px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "4px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "60px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "4px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <div
                              className="skeleton"
                              style={{
                                width: "45px",
                                height: "28px",
                                borderRadius: "4px",
                              }}
                            ></div>
                            <div
                              className="skeleton"
                              style={{
                                width: "45px",
                                height: "28px",
                                borderRadius: "4px",
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="overflow-x-auto hidden md:block">
                <table
                  ref={tableRef}
                  className="w-full mb-0"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    {isGalleryStyleList ? (
                      <>
                        <col style={{ width: "6%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "20%" }} />
                      </>
                    ) : (
                      <>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "13%" }} />
                      </>
                    )}
                  </colgroup>
                  <thead className="bg-gray-100">
                    {isGalleryStyleList ? (
                      <tr className="border-t border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          이미지
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          제목
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시자명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시일시
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          조회수
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상태
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    ) : (
                      <tr className="border-t border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          제목
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시자명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          게시일시
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          조회수
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          답글여부
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상태
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {articles.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isGalleryStyleList ? 8 : 8}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "데이터를 불러오는 중..."
                            : "조회된 데이터가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      articles.map((article, index) => {
                        const actualNum =
                          article.rnum ||
                          String((currentPage - 1) * pageSize + index + 1);
                        // 게시글 고유 ID: nttId 사용 (SQL 매퍼에서 NTT_ID로 반환되는 고유 식별자)
                        const articleId =
                          article.nttId || article.parntscttid || "";
                        const nttSj = article.nttSj || "";
                        const ntcrNm = article.ntcrNm || "";
                        const ntcrDt = article.ntcrDt || "";
                        const rdcnt = article.rdcnt || "0";
                        const answerAt = article.answerAt || "";
                        const sttusCode = article.sttusCode || "";
                        const nttData5 = article.nttData5 || "";
                        const nttData6 = article.nttData6 || "";
                        const useImage = article.useImage || "N";
                        const answerCnt = parseInt(
                          article.answerCnt || "0",
                          10,
                        );

                        const getAnswerLabel = (answerAt: string) => {
                          if (answerAt === "Y") return "답글";
                          if (answerAt === "N") return "본문";
                          return "-";
                        };

                        const getStatusLabel = (statusCode: string) => {
                          switch (statusCode) {
                            case "A":
                              return "사용";
                            case "D":
                              return "삭제";
                            default:
                              return "-";
                          }
                        };

                        const getStatusClass = (statusCode: string) => {
                          switch (statusCode) {
                            case "A":
                              return "bg-green-100 text-green-800";
                            case "D":
                              return "bg-red-100 text-red-800";
                            default:
                              return "bg-gray-100 text-gray-800";
                          }
                        };

                        // 날짜 포맷팅: API에서 받은 형식 그대로 반환 (2025-04-07)
                        const formatDate = (dateStr: string) => {
                          if (!dateStr) return "-";
                          // API에서 받은 날짜 형식을 그대로 반환
                          // 이미 "2025-04-07" 형식이므로 변환하지 않음
                          return dateStr;
                        };

                        return isGalleryStyleList ? (
                          <tr
                            key={article.nttId || `article-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {actualNum}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px] align-middle">
                              <div className="flex justify-center">
                                <ArticleListThumbnailCell article={article} />
                              </div>
                            </td>
                            <td className="px-4 py-2 border-r text-left text-[13px] overflow-hidden">
                              <div className="min-w-0">
                                <span
                                  className="block truncate min-w-0"
                                  title={nttSj || undefined}
                                >
                                  {nttSj}
                                </span>
                                {isArchiveBoard && (
                                  <div className="mt-1 text-[12px] text-gray-600 leading-5 truncate">
                                    {`소개:${nttData6 || "-"} | 자료출처:${nttData5 || "-"}`}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 border-r text-left text-[13px] overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={ntcrNm || undefined}
                              >
                                {ntcrNm}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {formatDate(ntcrDt)}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {rdcnt}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  sttusCode,
                                )}`}
                              >
                                {getStatusLabel(sttusCode)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                  onClick={() => handleDetailClick(articleId)}
                                >
                                  상세
                                </button>
                                <button
                                  className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleDeleteClick(articleId)}
                                  disabled={deleteLoading}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={article.nttId || `article-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {actualNum}
                            </td>
                            <td className="px-4 py-2 border-r text-left text-[13px] overflow-hidden">
                              <div className="flex items-center gap-1 min-w-0">
                                {answerAt === "Y" && (
                                  <MessageSquare
                                    className="w-4 h-4 text-blue-600 flex-shrink-0"
                                    aria-label="답글"
                                  />
                                )}
                                {useImage === "Y" && answerAt !== "Y" && (
                                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                )}
                                <span
                                  className="block truncate min-w-0"
                                  title={nttSj || undefined}
                                >
                                  {nttSj}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 border-r text-left text-[13px] overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={ntcrNm || undefined}
                              >
                                {ntcrNm}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {formatDate(ntcrDt)}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {rdcnt}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              {getAnswerLabel(answerAt)}
                            </td>
                            <td className="px-4 py-2 border-r text-center text-[13px]">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  sttusCode,
                                )}`}
                              >
                                {getStatusLabel(sttusCode)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex justify-center gap-1">
                                {replyYn === "Y" && answerCnt === 1 && (
                                  <button
                                    className="px-3 py-1 text-[13px] text-orange-600 border border-orange-600 rounded hover:bg-orange-50 transition-colors"
                                    onClick={() => {
                                      const params = new URLSearchParams({
                                        bbsId: bbsId,
                                        bbsNm: bbsNm || "",
                                        parntscttid: articleId,
                                      });
                                      router.push(
                                        `/adminWeb/board/list/article/reply?${params.toString()}`,
                                      );
                                    }}
                                  >
                                    답글
                                  </button>
                                )}
                                <button
                                  className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                  onClick={() => handleDetailClick(articleId)}
                                >
                                  상세
                                </button>
                                <button
                                  className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleDeleteClick(articleId)}
                                  disabled={deleteLoading}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view md:hidden">
                {articles.length === 0 ? (
                  <div className="mobile-card">
                    <div className="mobile-card-body">
                      <div className="text-center text-gray-500 py-8">
                        {loading
                          ? "데이터를 불러오는 중..."
                          : "조회된 데이터가 없습니다."}
                      </div>
                    </div>
                  </div>
                ) : (
                  articles.map((article, index) => {
                    const actualNum =
                      article.rnum ||
                      String((currentPage - 1) * pageSize + index + 1);
                    // 게시글 고유 ID: nttId 사용 (SQL 매퍼에서 NTT_ID로 반환되는 고유 식별자)
                    const articleId =
                      article.nttId || article.parntscttid || "";
                    const nttSj = article.nttSj || "";
                    const ntcrNm = article.ntcrNm || "";
                    const ntcrDt = article.ntcrDt || "";
                    const rdcnt = article.rdcnt || "0";
                    const answerAt = article.answerAt || "";
                    const sttusCode = article.sttusCode || "";
                    const nttData5 = article.nttData5 || "";
                    const nttData6 = article.nttData6 || "";
                    const useImage = article.useImage || "N";
                    const answerCnt = parseInt(article.answerCnt || "0", 10);

                    const getAnswerLabel = (answerAt: string) => {
                      if (answerAt === "Y") return "답글";
                      if (answerAt === "N") return "본문";
                      return "-";
                    };

                    const getStatusLabel = (statusCode: string) => {
                      switch (statusCode) {
                        case "A":
                          return "정상";
                        case "D":
                          return "삭제";
                        default:
                          return "-";
                      }
                    };

                    const getStatusClass = (statusCode: string) => {
                      switch (statusCode) {
                        case "A":
                          return "bg-green-100 text-green-800";
                        case "D":
                          return "bg-red-100 text-red-800";
                        default:
                          return "bg-gray-100 text-gray-800";
                      }
                    };

                    // 날짜 포맷팅: API에서 받은 형식 그대로 반환 (2025-04-07)
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return "-";
                      // API에서 받은 날짜 형식을 그대로 반환
                      // 이미 "2025-04-07" 형식이므로 변환하지 않음
                      return dateStr;
                    };

                    return (
                      <div
                        key={article.nttId || `article-${index}`}
                        className="mobile-card"
                      >
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id flex items-center gap-1 min-w-0"
                            title={nttSj || undefined}
                          >
                            #{actualNum} -{" "}
                            {!isGalleryStyleList && answerAt === "Y" && (
                              <MessageSquare
                                className="w-4 h-4 text-blue-600 flex-shrink-0"
                                aria-label="답글"
                              />
                            )}
                            {!isGalleryStyleList &&
                              useImage === "Y" &&
                              answerAt !== "Y" && (
                                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                            <span className="block truncate min-w-0">
                              {nttSj}
                            </span>
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          {isGalleryStyleList && (
                            <div className="mobile-card-row">
                              <span className="mobile-card-label">제목</span>
                              <span
                                className="mobile-card-value block truncate min-w-0"
                                title={nttSj || undefined}
                              >
                                {nttSj}
                              </span>
                            </div>
                          )}
                          {isArchiveBoard && (
                            <>
                              <div className="mobile-card-row">
                                <span className="mobile-card-label">소개</span>
                                <span className="mobile-card-value">{nttData6 || "-"}</span>
                              </div>
                              <div className="mobile-card-row">
                                <span className="mobile-card-label">자료출처</span>
                                <span className="mobile-card-value">{nttData5 || "-"}</span>
                              </div>
                            </>
                          )}
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">게시자명</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={ntcrNm || undefined}
                            >
                              {ntcrNm}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">게시일시</span>
                            <span className="mobile-card-value">
                              {formatDate(ntcrDt)}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">조회수</span>
                            <span className="mobile-card-value">{rdcnt}</span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              {isGalleryStyleList ? "이미지" : "답글여부"}
                            </span>
                            <span className="mobile-card-value flex justify-end">
                              {isGalleryStyleList ? (
                                <ArticleListThumbnailCell
                                  article={article}
                                  sizeClassName="w-12 h-12"
                                />
                              ) : (
                                getAnswerLabel(answerAt)
                              )}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">상태</span>
                            <span className="mobile-card-value">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  sttusCode,
                                )}`}
                              >
                                {getStatusLabel(sttusCode)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          <div className="flex gap-1">
                            {!isGalleryStyleList &&
                              replyYn === "Y" &&
                              answerCnt === 1 && (
                                <button
                                  className="px-3 py-1 text-[13px] text-orange-600 border border-orange-600 rounded hover:bg-orange-50 transition-colors"
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      bbsId: bbsId,
                                      bbsNm: bbsNm || "",
                                      parntscttid: articleId,
                                    });
                                    router.push(
                                      `/adminWeb/board/list/article/reply?${params.toString()}`,
                                    );
                                  }}
                                >
                                  답글
                                </button>
                              )}
                            <button
                              className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                              onClick={() => handleDetailClick(articleId)}
                            >
                              상세
                            </button>
                            <button
                              className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleDeleteClick(articleId)}
                              disabled={deleteLoading}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
        {totalPages > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="게시글 삭제"
        message="정말로 이 게시글을 삭제하시겠습니까?"
        type="danger"
        confirmText={deleteLoading ? "삭제 중..." : "삭제"}
        cancelText="닫기"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* 삭제 성공/실패 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        type={messageDialogType}
        confirmText="확인"
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
      />

    </>
  );
};
