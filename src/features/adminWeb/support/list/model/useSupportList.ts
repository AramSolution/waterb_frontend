import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportService,
  Support,
  ApplicantListResponse,
  deleteFeePayerDetail,
  postFeePayerList,
  postFeePayerExcelList,
  mapFeePayerListItemToSupport,
  buildSupportFeePayerListBody,
} from "@/entities/adminWeb/support/api";
import { downloadFeePayerListExcel } from "@/entities/adminWeb/support/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";
import { FEE_LIST_MOCK } from "./feeListMockData";

/** `NEXT_PUBLIC_FEE_PAYER_LIST_MOCK=true` 일 때만 목·엑셀을 mock 사용 (기본: 실 API) */
const USE_FEE_LIST_MOCK_DATA =
  process.env.NEXT_PUBLIC_FEE_PAYER_LIST_MOCK === "true";

function filterFeeMockRows(
  rows: Support[],
  notifyFrom?: string,
  notifyTo?: string,
  applicantNm?: string,
  addr?: string,
): Support[] {
  let out = [...rows];
  if (notifyFrom) {
    out = out.filter((r) => {
      const d = String((r as Record<string, unknown>).notifyDd ?? "");
      return !d || d >= notifyFrom;
    });
  }
  if (notifyTo) {
    out = out.filter((r) => {
      const d = String((r as Record<string, unknown>).notifyDd ?? "");
      return !d || d <= notifyTo;
    });
  }
  if (applicantNm) {
    const q = applicantNm.toLowerCase();
    out = out.filter((r) => {
      const rowAny = r as Record<string, unknown>;
      const name = String(
        rowAny.applicantNm ?? r.businessNm ?? "",
      ).toLowerCase();
      return name.includes(q);
    });
  }
  if (addr) {
    const q = addr.toLowerCase();
    out = out.filter((r) => {
      const rowAny = r as Record<string, unknown>;
      const a = String(rowAny.addr ?? rowAny.address ?? "").toLowerCase();
      return a.includes(q);
    });
  }
  return out;
}

export function useSupportList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기
  const urlStartDate = searchParams?.get("startDate") ?? null;
  const urlEndDate = searchParams?.get("endDate") ?? null;
  const urlPage = searchParams?.get("page") ?? null;
  const urlApplicantNm = searchParams?.get("applicantNm") ?? null;
  const urlAddr = searchParams?.get("addr") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDeleteTarget, setSelectedDeleteTarget] = useState<{
    itemId: string;
    seq: number;
    applicantNm: string;
    levyAmtLabel: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState("");
  const [showDeleteFailDialog, setShowDeleteFailDialog] = useState(false);
  const [deleteFailMessage, setDeleteFailMessage] = useState("");
  const [deleteFailDialogType, setDeleteFailDialogType] = useState<
    "danger" | "warning" | "success"
  >("warning");
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showApplicantDialog, setShowApplicantDialog] = useState(false);
  const [selectedApplicantBusinessId, setSelectedApplicantBusinessId] =
    useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantLoading, setApplicantLoading] = useState(false);

  const [supports, setSupports] = useState<Support[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");

  /** 통지일 기준: 해당 연도 1월 1일 ~ 12월 31일 (기본 조회 구간) */
  const getDefaultNotifyStartDate = (): string => {
    const year = new Date().getFullYear();
    return `${year}-01-01`;
  };

  const getDefaultNotifyEndDate = (): string => {
    const year = new Date().getFullYear();
    return `${year}-12-31`;
  };

  // 통지일 구간 (URL 파라미터가 있으면 사용, 없으면 해당 연도 전체)
  const [startDate, setStartDate] = useState<string>(
    urlStartDate || getDefaultNotifyStartDate(),
  );
  const [endDate, setEndDate] = useState<string>(
    urlEndDate || getDefaultNotifyEndDate(),
  );

  const [applicantNm, setApplicantNm] = useState<string>(
    urlApplicantNm ?? "",
  );
  const [addr, setAddr] = useState<string>(urlAddr ?? "");

  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  const applicantNmRef = useRef(applicantNm);
  const addrRef = useRef(addr);
  const currentPageRef = useRef(currentPage);
  const isSearchingRef = useRef(false); // 조회 버튼 클릭 중인지 추적
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 중복 호출 방지용

  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);

  useEffect(() => {
    endDateRef.current = endDate;
  }, [endDate]);

  useEffect(() => {
    applicantNmRef.current = applicantNm;
  }, [applicantNm]);

  useEffect(() => {
    addrRef.current = addr;
  }, [addr]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });
  const tableRef = useRef<HTMLTableElement>(null);
  const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  useResizableColumns(tableRef);

  // URL 파라미터와 상태 동기화
  useEffect(() => {
    if (urlStartDate !== null) {
      setStartDate(urlStartDate || "");
    }
    if (urlEndDate !== null) {
      setEndDate(urlEndDate || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
    if (urlApplicantNm !== null) {
      setApplicantNm(urlApplicantNm);
    }
    if (urlAddr !== null) {
      setAddr(urlAddr);
    }
  }, [urlStartDate, urlEndDate, urlPage, urlApplicantNm, urlAddr]);

  // 지원사업 목록 조회 (서버 사이드 페이징)
  const fetchSupports = useCallback(async () => {
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

      // 서버 사이드 페이징 사용
      const requestLength = pageSize;
      const requestStart = (currentPageRef.current - 1) * pageSize;

      // 날짜 형식 변환: YYYY-MM-DD -> YYYY-MM-DD (백엔드 SQL의 DATE_FORMAT이 YYYY-MM-DD 형식을 기대함)
      // 백엔드 SQL: DATE_FORMAT(#{searchRecToDd}, '%Y-%m-%d')는 YYYY-MM-DD 형식 문자열을 기대함
      const convertDateToYYYYMMDD = (
        dateStr: string | null | undefined,
      ): string | undefined => {
        if (!dateStr || dateStr.trim() === "") return undefined;
        // YYYY-MM-DD 형식 그대로 유지 (백엔드 SQL의 DATE_FORMAT이 이 형식을 기대함)
        return dateStr;
      };

      const notifyFrom = convertDateToYYYYMMDD(startDateRef.current);
      const notifyTo = convertDateToYYYYMMDD(endDateRef.current);
      const nm =
        applicantNmRef.current.trim() !== ""
          ? applicantNmRef.current.trim()
          : undefined;
      const address =
        addrRef.current.trim() !== "" ? addrRef.current.trim() : undefined;

      if (USE_FEE_LIST_MOCK_DATA) {
        const filtered = filterFeeMockRows(
          FEE_LIST_MOCK,
          notifyFrom,
          notifyTo,
          nm,
          address,
        );
        const total = filtered.length;
        const pageSlice = filtered.slice(
          requestStart,
          requestStart + requestLength,
        );
        setSupports(pageSlice);
        setTotalElements(total);
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
        return;
      }

      const feeBody = buildSupportFeePayerListBody({
        reqDateFrom: notifyFrom,
        reqDateTo: notifyTo,
        userNm: nm,
        address,
      });
      const feeRes = await postFeePayerList(feeBody);
      const feeRaw = Array.isArray(feeRes.data) ? feeRes.data : [];
      const feeMapped = feeRaw.map(mapFeePayerListItemToSupport);
      const feeTotal = feeMapped.length;
      const feeSlice = feeMapped.slice(
        requestStart,
        requestStart + requestLength,
      );
      setSupports(feeSlice);
      setTotalElements(feeTotal);
      setTotalPages(Math.max(1, Math.ceil(feeTotal / pageSize)));
    } catch (err) {
      console.error("지원사업 목록 조회 실패:", err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error("❌ 401 Unauthorized - 인증 실패");
          TokenUtils.debugToken();
          setError("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError("지원사업 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize]); // startDate, endDate, filters를 dependency에서 제거

  // fetchSupports의 최신 함수를 참조하기 위한 ref 추가
  const fetchSupportsRef = useRef(fetchSupports);

  // fetchSupports가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchSupportsRef.current = fetchSupports;
  }, [fetchSupports]);

  // 초기 로드
  useEffect(() => {
    startDateRef.current = startDate;
    endDateRef.current = endDate;
    applicantNmRef.current = applicantNm;
    addrRef.current = addr;
    fetchSupports();
  }, []);

  // 페이지 변경 시 API 재호출
  useEffect(() => {
    if (!isInitialLoad && !isSearchingRef.current) {
      fetchSupports();
    }
  }, [currentPage, fetchSupports, isInitialLoad]);

  // 필터(상태 등) 변경 시 자동 조회하지 않음. 조회 버튼 클릭 또는 Enter 입력 시에만 조회.
  // (관리자회원 목록과 동일: 조회조건 변경만으로는 API 호출 없음)

  // 날짜 필터 변경 시 자동 조회 제거 - 조회 버튼 클릭 또는 엔터 키 입력 시에만 조회
  // useEffect(() => {
  //   if (isInitialLoad) return; // 초기 로드 시에는 실행하지 않음

  //   const timer = setTimeout(() => {
  //     setCurrentPage(1);
  //     fetchSupportsRef.current();
  //   }, 800); // 800ms Debounce

  //   return () => clearTimeout(timer);
  // }, [startDate, endDate, isInitialLoad]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (
    itemId: string,
    seq: number,
    applicantNm?: string,
    levyAmtRaw?: unknown,
    isPaid?: boolean,
  ) => {
    if (isPaid) {
      setDeleteFailDialogType("warning");
      setDeleteFailMessage("납부완료 건은 삭제하실 수 없습니다.");
      setShowDeleteFailDialog(true);
      return;
    }

    const id = itemId.trim();
    const n = Number(seq);
    if (!id || !Number.isFinite(n) || n <= 0) {
      setError("삭제 대상 식별값(itemId/seq)이 올바르지 않습니다.");
      return;
    }
    const rawNm = String(applicantNm ?? "").trim();
    const targetNm = rawNm || "-";
    const levyNum = Number(String(levyAmtRaw ?? "").replace(/,/g, ""));
    const levyAmtLabel = Number.isFinite(levyNum)
      ? `${Math.max(0, Math.round(levyNum)).toLocaleString("ko-KR")}원`
      : "-";
    setSelectedDeleteTarget({
      itemId: id,
      seq: Math.trunc(n),
      applicantNm: targetNm,
      levyAmtLabel,
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

      const response = await deleteFeePayerDetail({
        itemId: selectedDeleteTarget.itemId,
        seq: selectedDeleteTarget.seq,
      });

      // 삭제 성공 시 목록 다시 불러오기
      if (response.result === "00") {
        await fetchSupportsRef.current();
        setShowDeleteDialog(false);
        setDeleteSuccessMessage("정상적으로 삭제되었습니다.");
        setShowDeleteSuccessDialog(true);
        setSelectedDeleteTarget(null);
      } else {
        setError(response.message || "오수 원인자부담금 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("오수 원인자부담금 삭제 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setDeleteFailDialogType("danger");
          setDeleteFailMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setShowDeleteFailDialog(true);
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          const failMessage =
            err.message || "오수 원인자부담금 삭제 중 오류가 발생했습니다.";
          setError(failMessage);
          setDeleteFailDialogType("warning");
          setDeleteFailMessage(failMessage);
          setShowDeleteFailDialog(true);
        }
      } else {
        const failMessage = "오수 원인자부담금 삭제 중 오류가 발생했습니다.";
        setError(failMessage);
        setDeleteFailDialogType("danger");
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

  // 조회 버튼 핸들러
  const handleSearch = async () => {
    // 이미 조회 중이면 무시
    if (isSearchingRef.current) {
      console.log("⏸️ 이미 조회 중입니다. 중복 호출 무시");
      return;
    }

    // 이전 타이머가 있으면 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 중복 호출 방지를 위한 debounce (100ms)
    searchTimeoutRef.current = setTimeout(async () => {
      console.log("🔍 handleSearch 호출");
      console.log(
        "📅 조회 전:",
        `통지일 ${startDate}~${endDate}, 성명=${applicantNm}, 주소=${addr}`,
      );

      startDateRef.current = startDate;
      endDateRef.current = endDate;
      applicantNmRef.current = applicantNm;
      addrRef.current = addr;
      currentPageRef.current = 1;
      console.log(
        "📅 ref 동기화 후:",
        `통지일 ${startDateRef.current}~${endDateRef.current}, 성명=${applicantNmRef.current}, 주소=${addrRef.current}, page=${currentPageRef.current}`,
      );

      // 조회 중 플래그 설정 (useEffect 중복 호출 방지)
      isSearchingRef.current = true;
      // 페이지 변경 useEffect가 실행되지 않도록 먼저 조회 실행
      await fetchSupportsRef.current();
      // 그 다음 페이지 state 업데이트 (UI 동기화용)
      setCurrentPage(1);
      // 조회 완료 후 플래그 해제
      isSearchingRef.current = false;
      searchTimeoutRef.current = null;
    }, 100);
  };

  // 신청인 목록 조회 핸들러
  const handleApplicantClick = async (businessId: string) => {
    setSelectedApplicantBusinessId(businessId);
    setShowApplicantDialog(true);
    setApplicantLoading(true);

    try {
      // TODO: 백엔드 API 완료 후 주석 해제
      const response = await SupportService.getApplicantList({ businessId });
      let applicantList: any[] = [];

      if (Array.isArray(response)) {
        applicantList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as ApplicantListResponse;
        if (Array.isArray(responseObj.data)) {
          applicantList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          applicantList = responseObj.Array;
        }
      }

      setApplicants(applicantList);
    } catch (err) {
      console.error("신청인 목록 조회 실패:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(
            err.message || "신청인 목록을 불러오는 중 오류가 발생했습니다.",
          );
        }
      } else {
        setError("신청인 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setApplicantLoading(false);
    }
  };

  const handleApplicantDialogClose = () => {
    setShowApplicantDialog(false);
    setSelectedApplicantBusinessId(null);
    setApplicants([]);
  };

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
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

      const convertDateToYYYYMMDD = (
        dateStr: string | null | undefined,
      ): string | undefined => {
        if (!dateStr) return undefined;
        return dateStr;
      };

      const notifyFrom = convertDateToYYYYMMDD(startDate);
      const notifyTo = convertDateToYYYYMMDD(endDate);
      const nm =
        applicantNm.trim() !== "" ? applicantNm.trim() : undefined;
      const address = addr.trim() !== "" ? addr.trim() : undefined;

      let supportList: Support[] = [];

      if (USE_FEE_LIST_MOCK_DATA) {
        supportList = filterFeeMockRows(
          FEE_LIST_MOCK,
          notifyFrom,
          notifyTo,
          nm,
          address,
        );
      } else {
        const feeBody = buildSupportFeePayerListBody({
          reqDateFrom: notifyFrom,
          reqDateTo: notifyTo,
          userNm: nm,
          address,
        });
        const feeRes = await postFeePayerExcelList(feeBody);
        supportList = (Array.isArray(feeRes.data) ? feeRes.data : []).map(
          mapFeePayerListItemToSupport,
        );
      }

      if (supportList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      await downloadFeePayerListExcel(supportList, "오수원인자부담금목록");
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
    selectedDeleteTarget,
    deleteLoading,
    showDeleteSuccessDialog,
    deleteSuccessMessage,
    showDeleteFailDialog,
    deleteFailMessage,
    deleteFailDialogType,
    showSearchForm,
    showApplicantDialog,
    applicants,
    applicantLoading,
    supports,
    totalElements,
    totalPages,
    error,
    startDate,
    endDate,
    sortConfig,
    tableRef,
    pageSize,
    setCurrentPage,
    setShowDeleteDialog,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleDeleteSuccessDialogClose,
    handleDeleteFailDialogClose,
    handleSort,
    handleSearch,
    handleApplicantClick,
    handleApplicantDialogClose,
    handleExcelDownload,
    setStartDate,
    setEndDate,
    applicantNm,
    setApplicantNm,
    addr,
    setAddr,
  };
}
