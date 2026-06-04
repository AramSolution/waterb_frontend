import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildSupportDrainageEquipListBody,
  deleteDrainageEquipDetail,
  mapDrainageEquipListItem,
  postDrainageEquipExcelList,
  postDrainageEquipList,
  type DrainageEquipListRow,
  isDrainageEquipListRowPaid,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { downloadDrainageEquipListExcel } from "@/entities/adminWeb/support/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";

const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

function getDefaultReqStartDate(): string {
  const year = new Date().getFullYear();
  return `${year}-01-01`;
}

function getDefaultReqEndDate(): string {
  const year = new Date().getFullYear();
  return `${year}-12-31`;
}

export function useDrainageEquipList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlStartDate = searchParams?.get("reqDateFrom") ?? null;
  const urlEndDate = searchParams?.get("reqDateTo") ?? null;
  const urlPage = searchParams?.get("page") ?? null;
  const urlUserNm = searchParams?.get("userNm") ?? null;
  const urlAddr = searchParams?.get("address") ?? null;
  const urlPaySta = searchParams?.get("paySta") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) || 1 : 1,
  );
  const [rows, setRows] = useState<DrainageEquipListRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState("");
  const [showSearchForm, setShowSearchForm] = useState(false);

  const [startDate, setStartDate] = useState(
    urlStartDate || getDefaultReqStartDate(),
  );
  const [endDate, setEndDate] = useState(urlEndDate || getDefaultReqEndDate());
  const [userNm, setUserNm] = useState(urlUserNm ?? "");
  const [address, setAddress] = useState(urlAddr ?? "");
  const [paySta, setPaySta] = useState(urlPaySta ?? "");

  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  const userNmRef = useRef(userNm);
  const addressRef = useRef(address);
  const payStaRef = useRef(paySta);
  const currentPageRef = useRef(currentPage);
  const isSearchingRef = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDoneRef = useRef(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDeleteTarget, setSelectedDeleteTarget] = useState<{
    itemId: string;
    seq: number;
    userNm: string;
    equipCostLabel: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState("");
  const [showDeleteFailDialog, setShowDeleteFailDialog] = useState(false);
  const [deleteFailMessage, setDeleteFailMessage] = useState("");
  const [deleteFailDialogType, setDeleteFailDialogType] = useState<
    "danger" | "warning" | "success"
  >("warning");
  const [excelDownloading, setExcelDownloading] = useState(false);
  const [showExcelFailDialog, setShowExcelFailDialog] = useState(false);
  const [excelFailMessage, setExcelFailMessage] = useState("");

  const tableRef = useRef<HTMLTableElement>(null);
  useResizableColumns(tableRef);

  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);
  useEffect(() => {
    endDateRef.current = endDate;
  }, [endDate]);
  useEffect(() => {
    userNmRef.current = userNm;
  }, [userNm]);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);
  useEffect(() => {
    payStaRef.current = paySta;
  }, [paySta]);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const syncUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (startDateRef.current) params.set("reqDateFrom", startDateRef.current);
      if (endDateRef.current) params.set("reqDateTo", endDateRef.current);
      if (userNmRef.current.trim())
        params.set("userNm", userNmRef.current.trim());
      if (addressRef.current.trim())
        params.set("address", addressRef.current.trim());
      if (payStaRef.current.trim()) params.set("paySta", payStaRef.current);
      params.set("page", String(page));
      router.replace(
        `/adminWeb/support/drainage-equip?${params.toString()}`,
        { scroll: false },
      );
    },
    [router],
  );

  const fetchList = useCallback(async () => {
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

      const startIndex = (currentPageRef.current - 1) * pageSize;
      const body = buildSupportDrainageEquipListBody({
        reqDateFrom: startDateRef.current || undefined,
        reqDateTo: endDateRef.current || undefined,
        userNm: userNmRef.current.trim() || undefined,
        address: addressRef.current.trim() || undefined,
        paySta: payStaRef.current.trim() || undefined,
        startIndex,
        lengthPage: pageSize,
      });

      const res = await postDrainageEquipList(body);
      const raw = Array.isArray(res.data) ? res.data : [];
      setRows(raw.map(mapDrainageEquipListItem));
      const total =
        Number(res.recordsTotal) || Number(res.recordsFiltered) || 0;
      setTotalElements(total);
    } catch (err) {
      console.error("배수설비 대장 목록 조회 실패:", err);
      setRows([]);
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
        setError("배수설비 대장 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      initialFetchDoneRef.current = true;
    }
  }, []);

  const fetchListRef = useRef(fetchList);
  useEffect(() => {
    fetchListRef.current = fetchList;
  }, [fetchList]);

  useEffect(() => {
    if (urlStartDate !== null) setStartDate(urlStartDate || "");
    if (urlEndDate !== null) setEndDate(urlEndDate || "");
    if (urlUserNm !== null) setUserNm(urlUserNm);
    if (urlAddr !== null) setAddress(urlAddr);
    if (urlPaySta !== null) setPaySta(urlPaySta);
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) setCurrentPage(pageNum);
    }
  }, [urlStartDate, urlEndDate, urlUserNm, urlAddr, urlPaySta, urlPage]);

  useEffect(() => {
    startDateRef.current = startDate;
    endDateRef.current = endDate;
    userNmRef.current = userNm;
    addressRef.current = address;
    payStaRef.current = paySta;
    void fetchListRef.current();
  }, []);

  useEffect(() => {
    if (!initialFetchDoneRef.current) return;
    if (isSearchingRef.current) return;
    void fetchListRef.current();
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    syncUrl(page);
  };

  const handleSearch = () => {
    if (isSearchingRef.current) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      startDateRef.current = startDate;
      endDateRef.current = endDate;
      userNmRef.current = userNm;
      addressRef.current = address;
      payStaRef.current = paySta;
      currentPageRef.current = 1;
      isSearchingRef.current = true;
      syncUrl(1);
      setCurrentPage(1);
      try {
        await fetchListRef.current();
      } finally {
        isSearchingRef.current = false;
      }
    }, 100);
  };

  const handleDeleteClick = (
    itemId: string,
    seq: number | null,
    name?: string,
    equipCost?: number,
    paid?: boolean,
  ) => {
    if (paid) {
      setDeleteFailDialogType("warning");
      setDeleteFailMessage("납부완료 건은 삭제하실 수 없습니다.");
      setShowDeleteFailDialog(true);
      return;
    }
    const id = itemId.trim();
    const n = seq != null ? Number(seq) : NaN;
    if (!id || !Number.isFinite(n) || n <= 0) {
      setDeleteFailDialogType("warning");
      setDeleteFailMessage("삭제 대상 식별값(itemId/seq)이 올바르지 않습니다.");
      setShowDeleteFailDialog(true);
      return;
    }
    const costNum = equipCost != null ? Number(equipCost) : NaN;
    const equipCostLabel = Number.isFinite(costNum)
      ? `${Math.max(0, Math.round(costNum)).toLocaleString("ko-KR")}원`
      : "-";
    setSelectedDeleteTarget({
      itemId: id,
      seq: Math.trunc(n),
      userNm: String(name ?? "").trim() || "-",
      equipCostLabel,
    });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeleteTarget) {
      setShowDeleteDialog(false);
      return;
    }
    try {
      setDeleteLoading(true);
      setError("");
      await deleteDrainageEquipDetail({
        itemId: selectedDeleteTarget.itemId,
        seq: selectedDeleteTarget.seq,
      });
      await fetchListRef.current();
      setShowDeleteDialog(false);
      setDeleteSuccessMessage("삭제 되었습니다.");
      setShowDeleteSuccessDialog(true);
      setSelectedDeleteTarget(null);
    } catch (err) {
      console.error("배수설비 삭제 오류:", err);
      if (err instanceof ApiError && err.status === 401) {
        setDeleteFailDialogType("danger");
        setDeleteFailMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
        setShowDeleteFailDialog(true);
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
      } else {
        const failMessage =
          err instanceof ApiError
            ? err.message
            : "배수설비 삭제 중 오류가 발생했습니다.";
        setDeleteFailDialogType("warning");
        setDeleteFailMessage(failMessage);
        setShowDeleteFailDialog(true);
      }
      setShowDeleteDialog(false);
      setSelectedDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedDeleteTarget(null);
  };

  const handleDeleteSuccessDialogClose = () => {
    setShowDeleteSuccessDialog(false);
    setDeleteSuccessMessage("");
  };

  const handleDeleteFailDialogClose = () => {
    setShowDeleteFailDialog(false);
    setDeleteFailMessage("");
    setDeleteFailDialogType("warning");
  };

  const showExcelFail = (message: string) => {
    setExcelFailMessage(message);
    setShowExcelFailDialog(true);
  };

  const handleExcelFailDialogClose = () => {
    setShowExcelFailDialog(false);
    setExcelFailMessage("");
  };

  const handleExcelDownload = async () => {
    if (excelDownloading) return;
    try {
      setExcelDownloading(true);
      setError("");

      if (!TokenUtils.isTokenValid()) {
        showExcelFail("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      const body = buildSupportDrainageEquipListBody({
        reqDateFrom: startDateRef.current || undefined,
        reqDateTo: endDateRef.current || undefined,
        userNm: userNmRef.current.trim() || undefined,
        address: addressRef.current.trim() || undefined,
        paySta: payStaRef.current.trim() || undefined,
      });

      const res = await postDrainageEquipExcelList(body);
      const excelRows = (Array.isArray(res.data) ? res.data : []).map(
        mapDrainageEquipListItem,
      );

      if (excelRows.length === 0) {
        showExcelFail("다운로드할 데이터가 없습니다.");
        return;
      }

      await downloadDrainageEquipListExcel(excelRows, "배수설비대장목록");
    } catch (err) {
      console.error("배수설비 대장 엑셀 다운로드 실패:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          showExcelFail("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          showExcelFail(
            err.message || "엑셀 다운로드 중 오류가 발생했습니다.",
          );
        }
      } else {
        showExcelFail(
          err instanceof Error
            ? err.message
            : "엑셀 다운로드 중 오류가 발생했습니다.",
        );
      }
    } finally {
      setExcelDownloading(false);
    }
  };

  return {
    loading,
    isInitialLoad,
    currentPage,
    totalPages,
    totalElements,
    rows,
    error,
    showSearchForm,
    setShowSearchForm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    userNm,
    setUserNm,
    address,
    setAddress,
    paySta,
    setPaySta,
    pageSize,
    tableRef,
    handleSearch,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    showDeleteDialog,
    selectedDeleteTarget,
    deleteLoading,
    showDeleteSuccessDialog,
    deleteSuccessMessage,
    showDeleteFailDialog,
    deleteFailMessage,
    deleteFailDialogType,
    handleDeleteSuccessDialogClose,
    handleDeleteFailDialogClose,
    handleExcelDownload,
    excelDownloading,
    showExcelFailDialog,
    excelFailMessage,
    handleExcelFailDialogClose,
    isDrainageEquipListRowPaid,
  };
}
