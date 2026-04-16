import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminBannerRow } from "@/entities/adminWeb/banner/model/types";
import { BannerService } from "@/entities/adminWeb/banner/api/bannerApi";
import { mapBannerItemToAdminRow } from "@/entities/adminWeb/banner/lib/mapBannerItemToRow";
import { useResizableColumns } from "@/shared/hooks";
import { ApiError, TokenUtils } from "@/shared/lib";

const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

/** URL/레거시 검색구분 → API `title` | `body` */
export function normalizeBannerSearchCondition(raw: string | null): string {
  if (!raw) return "title";
  if (raw === "1") return "title";
  if (raw === "2") return "body";
  if (raw === "title" || raw === "body") return raw;
  return "title";
}

export function useBannerList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSearchCondition = searchParams?.get("searchCondition") ?? null;
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? null;
  const urlPage = searchParams?.get("page") ?? null;

  const initialCond = normalizeBannerSearchCondition(urlSearchCondition);
  const initialKw = urlSearchKeyword ?? "";
  const initialPage = urlPage ? parseInt(urlPage, 10) : 1;

  const [bannerRows, setBannerRows] = useState<AdminBannerRow[]>([]);
  const [currentPage, setCurrentPage] = useState(
    !isNaN(initialPage) && initialPage > 0 ? initialPage : 1,
  );
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchCondition, setSearchCondition] = useState(initialCond);
  const [searchKeyword, setSearchKeyword] = useState(initialKw);
  const [appliedCondition, setAppliedCondition] = useState(initialCond);
  const [appliedKeyword, setAppliedKeyword] = useState(initialKw);

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  const tableRef = useRef<HTMLTableElement>(null);
  useResizableColumns(tableRef);

  const appliedConditionRef = useRef(appliedCondition);
  const appliedKeywordRef = useRef(appliedKeyword);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    appliedConditionRef.current = appliedCondition;
  }, [appliedCondition]);
  useEffect(() => {
    appliedKeywordRef.current = appliedKeyword;
  }, [appliedKeyword]);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const syncUrl = useCallback(
    (page: number, cond: string, keyword: string) => {
      const params = new URLSearchParams();
      params.set("searchCondition", cond);
      params.set("searchKeyword", keyword);
      params.set("page", String(page));
      router.replace(`/adminWeb/banner/list?${params.toString()}`, {
        scroll: false,
      });
    },
    [router],
  );

  const loadPage = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError("");

      TokenUtils.debugToken();
      if (!TokenUtils.isTokenValid()) {
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      const startIndex = (page - 1) * pageSize;

      const response = await BannerService.getBannerList({
        startIndex,
        lengthPage: pageSize,
        searchCondition: appliedConditionRef.current,
        searchKeyword: appliedKeywordRef.current?.trim() ?? "",
        banrGb: "",
        userGbn: "",
      });

      if (response.result && response.result !== "00") {
        setError("배너 목록 조회에 실패했습니다.");
        setBannerRows([]);
        setTotalElements(0);
        return;
      }

      const raw = response.data ?? [];
      const rows = raw.map(mapBannerItemToAdminRow);
      setBannerRows(rows);

      const total =
        Number(response.recordsTotal) ||
        Number(response.recordsFiltered) ||
        0;
      setTotalElements(total);
    } catch (err) {
      console.error("배너 목록 조회 실패:", err);
      setBannerRows([]);
      setTotalElements(0);
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
        setError("배너 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const loadPageRef = useRef(loadPage);
  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

  useEffect(() => {
    if (urlSearchCondition !== null) {
      const c = normalizeBannerSearchCondition(urlSearchCondition);
      setSearchCondition(c);
      setAppliedCondition(c);
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
      setAppliedKeyword(urlSearchKeyword || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlSearchCondition, urlSearchKeyword, urlPage]);

  useEffect(() => {
    void loadPage(currentPage);
  }, [currentPage, loadPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalElements > 0) {
      setCurrentPage(totalPages);
      syncUrl(totalPages, appliedCondition, appliedKeyword);
    }
  }, [
    currentPage,
    totalPages,
    totalElements,
    appliedCondition,
    appliedKeyword,
    syncUrl,
  ]);

  const handleSearch = useCallback(() => {
    const cond = normalizeBannerSearchCondition(searchCondition);
    const kw = searchKeyword;
    setSearchCondition(cond);
    setAppliedCondition(cond);
    setAppliedKeyword(kw);
    appliedConditionRef.current = cond;
    appliedKeywordRef.current = kw;
    syncUrl(1, cond, kw);
    setCurrentPage((prev) => {
      if (prev === 1) {
        queueMicrotask(() => void loadPageRef.current(1));
      }
      return 1;
    });
  }, [searchCondition, searchKeyword, syncUrl]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      syncUrl(page, appliedCondition, appliedKeyword);
    },
    [appliedCondition, appliedKeyword, syncUrl],
  );

  const handleDeleteClick = useCallback((bannerId: string) => {
    setSelectedBannerId(bannerId);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedBannerId) return;
    try {
      setDeleteLoading(true);
      const res = await BannerService.deleteBanner(selectedBannerId);
      if (res.result && res.result !== "00") {
        setError(res.message || "배너 삭제에 실패했습니다.");
        return;
      }
      setShowDeleteDialog(false);
      setSelectedBannerId(null);
      await loadPageRef.current(currentPageRef.current);
    } catch (err) {
      console.error("배너 삭제 오류:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("배너 삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedBannerId]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
    setSelectedBannerId(null);
  }, []);

  const handleDetailClick = useCallback(
    (bannerId: string) => {
      const params = new URLSearchParams({
        bannerId,
        searchCondition: appliedCondition,
        searchKeyword: appliedKeyword,
        page: String(safePage),
      });
      router.push(`/adminWeb/banner/list/detail?${params.toString()}`);
    },
    [router, appliedCondition, appliedKeyword, safePage],
  );

  return {
    loading,
    isInitialLoad,
    currentPage: safePage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    banners: bannerRows,
    totalElements,
    totalPages,
    error,
    tableRef,
    pageSize,
    searchCondition,
    searchKeyword,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    setSearchCondition,
    setSearchKeyword,
    handleDetailClick,
  };
}
