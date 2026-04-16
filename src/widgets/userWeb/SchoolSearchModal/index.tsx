"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

const SCHOOL_PAGE_SIZE = 15;

export interface SchoolItem {
  schulNm?: string;
  sdSchulCode?: string;
  schulKndScNm?: string;
  orgRdnma?: string;
  [key: string]: unknown;
}

interface SchoolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 관리자페이지처럼: 학교 클릭 시 학교 정보만 전달하고 모달 닫힘. 학년/반은 폼에서 해당 학교 class-info로 선택 */
  onSelect: (school: SchoolItem) => void;
}

/**
 * 학교검색 모달: 군산시 학교 검색 → 학교 클릭 시 onSelect(school) 호출 후 모달 닫힘.
 * 학년/반은 폼에서 해당 학교의 class-info API로 선택.
 */
const SchoolSearchModal: React.FC<SchoolSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [keyword, setKeyword] = useState("");
  const keywordRef = useRef(keyword);
  const [schoolList, setSchoolList] = useState<SchoolItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  keywordRef.current = keyword;

  const fetchSchools = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("size", String(SCHOOL_PAGE_SIZE));
      const text = keywordRef.current?.trim();
      if (text) params.set("text", text);
      const res = await apiClient.get<{
        content?: SchoolItem[];
        totalElements?: number;
        totalPages?: number;
      }>(`${API_ENDPOINTS.NEIS.GUNSAN_SCHOOLS}?${params}`);
      const content = Array.isArray(res?.content) ? res.content : [];
      const total = Number(res?.totalElements) ?? 0;
      setSchoolList(content);
      setTotalPages(
        Math.max(
          1,
          Number(res?.totalPages) ?? Math.ceil(total / SCHOOL_PAGE_SIZE),
        ),
      );
    } catch {
      setSchoolList([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      setPage(0);
      fetchSchools(0);
    }
  }, [isOpen, fetchSchools]);

  useEffect(() => {
    if (isOpen) fetchSchools(page);
  }, [isOpen, page, fetchSchools]);

  const handleSearch = () => {
    setPage(0);
    fetchSchools(0);
  };

  const handleSchoolClick = useCallback(
    (school: SchoolItem) => {
      onSelect(school);
      onClose();
    },
    [onSelect, onClose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modalOverlay schoolSearchModal active"
      aria-hidden={!isOpen}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modalContent"
        role="dialog"
        aria-labelledby="schoolModalTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div id="schoolModalTitle">학교목록</div>
          <button
            type="button"
            className="closeBtn"
            onClick={onClose}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>
        <div className="modalBody">
          <div className="schoolSearchBar">
            <input
              type="text"
              className="inputField"
              placeholder="학교명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleSearch())
              }
              aria-label="학교명 검색"
            />
            <button
              type="button"
              className="btnSearch"
              onClick={handleSearch}
              disabled={loading}
            >
              검색
            </button>
          </div>
          {loading ? (
            <p className="schoolListEmpty">불러오는 중...</p>
          ) : schoolList.length === 0 ? (
            <p className="schoolListEmpty">검색 결과가 없습니다.</p>
          ) : (
            <>
              <ul className="schoolList">
                {schoolList.map((school, index) => (
                  <li
                    key={school.sdSchulCode ?? index}
                    className="schoolItem"
                    onClick={() => handleSchoolClick(school)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      (e.preventDefault(), handleSchoolClick(school))
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <div className="schoolInfo">
                      <strong className="schoolName">
                        {school.schulNm ?? ""}{" "}
                        <span className="categoryTag">
                          {school.schulKndScNm ?? ""}
                        </span>
                      </strong>
                      <p className="schoolAddr">
                        <span className="iconLocBg" aria-hidden="true" />
                        <span className="sr-only">주소:</span>{" "}
                        {school.orgRdnma ?? ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="schoolModalPagination">
                  <button
                    type="button"
                    className="btnWhite"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    이전
                  </button>
                  <span className="schoolPageInfo">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btnWhite"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolSearchModal;
