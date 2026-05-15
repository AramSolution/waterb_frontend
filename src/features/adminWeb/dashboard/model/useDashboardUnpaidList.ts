"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Support,
  postFeePayerUnpaidList,
  mapFeePayerListItemToSupport,
} from "@/entities/adminWeb/support/api";
import { ApiError, TokenUtils } from "@/shared/lib";
import { getCurrentBaseMonth } from "../lib/dashboardFormat";

export function useDashboardUnpaidList() {
  const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<Support[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!TokenUtils.isTokenValid()) {
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      const startIndex = (currentPageRef.current - 1) * pageSize;
      const res = await postFeePayerUnpaidList({
        baseMonth: getCurrentBaseMonth(),
        startIndex,
        lengthPage: pageSize,
      });

      const raw = Array.isArray(res.data) ? res.data : [];
      const mapped = raw.map(mapFeePayerListItemToSupport);
      const total =
        res.recordsTotal ?? res.recordsFiltered ?? mapped.length;

      setRows(mapped);
      setTotalElements(total);
      setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError("미납 목록을 불러오는 중 오류가 발생했습니다.");
      }
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void fetchList();
  }, []);

  useEffect(() => {
    if (!isInitialLoad) {
      void fetchList();
    }
  }, [currentPage, fetchList, isInitialLoad]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    loading,
    isInitialLoad,
    currentPage,
    pageSize,
    rows,
    totalElements,
    totalPages,
    error,
    handlePageChange,
    refetch: fetchList,
  };
}
