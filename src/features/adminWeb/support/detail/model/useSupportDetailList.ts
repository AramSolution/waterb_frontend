import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportService,
  SupportDetailItem,
  SupportDetailListParams,
  SupportDetailListResponse,
  SupportDetailDeleteParams,
  SupportDetailParams,
} from "@/entities/adminWeb/support/api";
import {
  downloadGstudyDetailListExcel,
  downloadSupportDetailListExcel,
} from "@/entities/adminWeb/support/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";
import {
  SupportApplicationService,
  type ArtappsApplicationListRow,
} from "@/entities/adminWeb/support/application/api/supportApplicationApi";

/** reqId 1건 삭제(기본) | 공부의 명수 ARTAPPS/ARTAPPM 삭제(동일 reqId, 전용 API) */
export type SupportDetailListDeleteMode = "reqId" | "artappsByReqId";

/** 기본(artappm 목록) | 공부의 명수 전용 POST /api/admin/artapps/application-list */
export type SupportDetailListMode = "default" | "artappsApplicationList";

const GSTUDY_EXCEL_FETCH_LENGTH = 50_000;

function mapArtappsApplicationRowToSupportDetailItem(
  row: ArtappsApplicationListRow,
): SupportDetailItem {
  const resultGb =
    (row as unknown as { resultGb?: string; RESULT_GB?: string }).resultGb ??
    (row as unknown as { resultGb?: string; RESULT_GB?: string }).RESULT_GB ??
    "";

  return {
    rnum: String(row.rnum ?? ""),
    reqId: row.reqId ?? "",
    applicationId: "",
    status: row.sttusCode ?? "",
    type: row.proGbn ?? "",
    resultGb,
    parentNm: row.pUserNm ?? "",
    parentPhone: row.mbtlnum ?? "",
    schoolNm: row.schoolNm ?? "",
    gradeInfo: row.schoolClass ?? "",
    studentNm: row.userNm ?? "",
    studentPhone: row.cmbtlnum ?? "",
    address: "",
    businessId: row.proId ?? "",
    businessNm: "",
    proSeq: row.proSeq ?? "",
    ...row,
  } as SupportDetailItem;
}

export interface SupportDetailListOptions {
  deleteMode?: SupportDetailListDeleteMode;
  listMode?: SupportDetailListMode;
}

export function useSupportDetailList(options?: SupportDetailListOptions) {
  const deleteMode: SupportDetailListDeleteMode =
    options?.deleteMode ?? "reqId";
  const listMode: SupportDetailListMode = options?.listMode ?? "default";
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기
  const businessId = searchParams?.get("businessId") || "";

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);

  const [items, setItems] = useState<SupportDetailItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [businessNm, setBusinessNm] = useState(""); // 사업명 (읽기 전용)

  // 조회 필터
  const [applicantNm, setApplicantNm] = useState(""); // 신청자명(학생명)

  const applicantNmRef = useRef(applicantNm);

  useEffect(() => {
    applicantNmRef.current = applicantNm;
  }, [applicantNm]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });
  /** 공부의 명수 application-list 엑셀 다운로드 중 (목록 로딩과 분리) */
  const [excelExportLoading, setExcelExportLoading] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  useResizableColumns(tableRef);

  // 사업명 조회 (businessId로 사업 상세 정보 조회)
  const fetchBusinessNm = useCallback(async () => {
    if (!businessId) return;

    try {
      const detailParams: SupportDetailParams = {
        proId: businessId,
      };
      const detailResponse =
        await SupportService.getSupportDetail(detailParams);
      if (detailResponse.detail?.businessNm) {
        setBusinessNm(detailResponse.detail.businessNm);
      }
    } catch (err) {
      console.error("사업명 조회 실패:", err);
      // 사업명 조회 실패는 무시 (리스트는 계속 조회)
    }
  }, [businessId]);

  // 신청목록 상세 리스트 조회
  const fetchDetailList = useCallback(async () => {
    if (!businessId) {
      setError("사업코드가 필요합니다.");
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        console.error("토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.");
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const currentApplicantNm = applicantNmRef.current;

      let itemList: SupportDetailItem[] = [];
      let total = 0;

      if (listMode === "artappsApplicationList") {
        const artRes = await SupportApplicationService.getArtappsApplicationList(
          {
            searchProId: businessId,
            searchUserNm: currentApplicantNm || undefined,
            start: startIndex,
            length: pageSize,
          },
        );
        if (artRes.result != null && artRes.result !== "00") {
          setError("신청목록 조회에 실패했습니다.");
          setItems([]);
          setTotalElements(0);
          setTotalPages(1);
          return;
        }
        const rows = artRes.data ?? [];
        total =
          Number(artRes.recordsTotal) ||
          Number(artRes.recordsFiltered) ||
          rows.length;
        itemList = rows.map(mapArtappsApplicationRowToSupportDetailItem);
      } else {
        const params: SupportDetailListParams = {
          businessId: businessId,
          applicantNm: currentApplicantNm || undefined,
          length: pageSize.toString(),
          start: startIndex.toString(),
        };

        const response = await SupportService.getSupportDetailList(params);

        if (Array.isArray(response)) {
          itemList = response;
          total = response.length;
        } else if (response && typeof response === "object") {
          const responseObj = response as SupportDetailListResponse;

          if (Array.isArray(responseObj.data)) {
            itemList = responseObj.data;
          } else if (Array.isArray(responseObj.Array)) {
            itemList = responseObj.Array;
          }

          total =
            Number(responseObj.recordsTotal) ||
            Number(responseObj.recordsFiltered) ||
            itemList.length;
        }
      }

      setItems(itemList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error("신청목록 상세 리스트 조회 실패:", err);

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
        setError("신청목록 상세 리스트를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize, businessId, listMode]);

  const fetchDetailListRef = useRef(fetchDetailList);

  useEffect(() => {
    fetchDetailListRef.current = fetchDetailList;
  }, [fetchDetailList]);

  // 초기 로드: 사업명 조회
  useEffect(() => {
    if (businessId) {
      fetchBusinessNm();
    }
  }, [businessId, fetchBusinessNm]);

  // 초기 로드: 리스트 조회
  useEffect(() => {
    if (businessId) {
      fetchDetailList();
    }
  }, [businessId]);

  // 페이지 변경 시 API 재호출
  useEffect(() => {
    if (!isInitialLoad && businessId) {
      fetchDetailList();
    }
  }, [currentPage, fetchDetailList, isInitialLoad, businessId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (row: SupportDetailItem) => {
    setSelectedReqId(row.reqId ?? null);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReqId || !selectedReqId.trim()) {
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      const response =
        deleteMode === "artappsByReqId"
          ? await SupportApplicationService.deleteApplicationsByReqId(
              selectedReqId.trim(),
            )
          : await SupportService.deleteSupportDetail({
              reqId: selectedReqId,
            });

      if (response.result === "00") {
        await fetchDetailListRef.current();
        setShowDeleteDialog(false);
        setSelectedReqId(null);
      } else {
        setError(response.message || "삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("삭제 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "삭제 중 오류가 발생했습니다.");
        }
      } else {
        setError("삭제 중 오류가 발생했습니다.");
      }
      setShowDeleteDialog(false);
      setSelectedReqId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedReqId(null);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";

    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    setSortConfig({ key, direction });
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDetailListRef.current();
  };

  const refetchDetailList = useCallback(() => {
    return fetchDetailListRef.current();
  }, []);

  const handleDetailClick = (item: SupportDetailItem) => {
    if (!businessId) {
      setError("사업코드가 필요합니다.");
      return;
    }
    if (!item.reqId) {
      setError("신청 상세 조회를 위한 REQ_ID가 없습니다.");
      return;
    }

    router.push(
      `/adminWeb/support/application/register?businessId=${encodeURIComponent(
        businessId,
      )}&programTitle=${encodeURIComponent(
        businessNm || "",
      )}&mode=detail&reqId=${encodeURIComponent(item.reqId)}`,
    );
  };

  // 엑셀 다운로드
  const deleteConfirmTitle = "신청목록 삭제";

  const deleteConfirmMessage = "해당 신청목록을 삭제하시겠습니까?";

  const handleExcelDownload = async () => {
    if (listMode === "artappsApplicationList") {
      try {
        setExcelExportLoading(true);
        setError("");

        if (!businessId?.trim()) {
          setError("사업ID가 필요합니다.");
          return;
        }

        if (!TokenUtils.isTokenValid()) {
          setError("로그인이 필요합니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
          return;
        }

        const currentApplicantNm = applicantNmRef.current;
        const artRes = await SupportApplicationService.getArtappsApplicationList({
          searchProId: businessId,
          searchUserNm: currentApplicantNm || undefined,
          start: 0,
          length: GSTUDY_EXCEL_FETCH_LENGTH,
        });

        if (artRes.result != null && artRes.result !== "00") {
          setError("엑셀용 데이터 조회에 실패했습니다.");
          return;
        }

        const rows = artRes.data ?? [];
        if (rows.length === 0) {
          setError("다운로드할 데이터가 없습니다.");
          return;
        }

        const itemList = rows.map(mapArtappsApplicationRowToSupportDetailItem);
        await downloadGstudyDetailListExcel(
          itemList,
          "공부의 명수 신청목록",
          businessNm,
        );
      } catch (err) {
        console.error("공부의 명수 엑셀 다운로드 실패:", err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("인증에 실패했습니다. 다시 로그인해주세요.");
            setTimeout(() => {
              window.location.href = "/adminWeb/login";
            }, 2000);
          } else {
            setError(err.message || "엑셀 다운로드 중 오류가 발생했습니다.");
          }
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "엑셀 다운로드 중 오류가 발생했습니다.",
          );
        }
      } finally {
        setExcelExportLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!TokenUtils.isTokenValid()) {
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      const currentApplicantNm = applicantNmRef.current;

      const params = {
        businessId: businessId,
        applicantNm: currentApplicantNm || undefined,
      };

      const response = await SupportService.getSupportDetailListExcel(params);

      let itemList: SupportDetailItem[] = [];

      if (Array.isArray(response)) {
        itemList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as SupportDetailListResponse;

        if (Array.isArray(responseObj.data)) {
          itemList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          itemList = responseObj.Array;
        }
      }

      if (itemList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      const resultOrder = (row: SupportDetailItem) => {
        const v = String((row as any).resultGb ?? (row as any).RESULT_GB ?? "")
          .trim()
          .toUpperCase();
        if (v === "Y") return 0;
        if (v === "R") return 1;
        if (v === "N") return 2;
        return 3;
      };
      const sortedItemList = [...itemList].sort((a, b) => {
        const byResult = resultOrder(a) - resultOrder(b);
        if (byResult !== 0) return byResult;
        const aKey = String((a as any).reqId ?? (a as any).REQ_ID ?? "");
        const bKey = String((b as any).reqId ?? (b as any).REQ_ID ?? "");
        return aKey.localeCompare(bKey);
      });

      await downloadSupportDetailListExcel(
        sortedItemList,
        businessNm || "신청목록상세",
        businessNm,
        true,
      );
    } catch (err) {
      console.error("엑셀 다운로드 실패:", err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "엑셀 다운로드 중 오류가 발생했습니다.");
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "엑셀 다운로드 중 오류가 발생했습니다.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    items,
    totalElements,
    totalPages,
    error,
    setError,
    businessId,
    businessNm,
    applicantNm,
    sortConfig,
    tableRef,
    pageSize,
    setShowSearchForm,
    setApplicantNm,
    handlePageChange,
    deleteMode,
    deleteConfirmTitle,
    deleteConfirmMessage,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleSearch,
    refetchDetailList,
    handleDetailClick,
    handleExcelDownload,
    listMode,
    excelExportLoading,
  };
}
