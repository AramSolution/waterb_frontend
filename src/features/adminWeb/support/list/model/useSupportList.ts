import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportService,
  Support,
  SupportListParams,
  SupportListResponse,
  SupportDeleteParams,
  ApplicantListResponse,
} from "@/entities/adminWeb/support/api";
import { downloadSupportsExcel } from "@/entities/adminWeb/support/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";

export function useSupportList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기
  const urlStartDate = searchParams?.get("startDate") ?? null;
  const urlEndDate = searchParams?.get("endDate") ?? null;
  const urlPage = searchParams?.get("page") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  // 현재 년도 기준으로 기본 날짜 설정 (1월 1일 ~ 12월 31일)
  const getDefaultStartDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-01-01`;
  };

  const getDefaultEndDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-12-31`;
  };

  // 검색기간 날짜 필터 (URL 파라미터가 있으면 사용, 없으면 현재 년도 기본값)
  const [startDate, setStartDate] = useState<string>(
    urlStartDate || getDefaultStartDate(),
  );
  const [endDate, setEndDate] = useState<string>(
    urlEndDate || getDefaultEndDate(),
  );

  // 조회조건: 상태 (서버 사이드 필터링용)
  const [searchStatus, setSearchStatus] = useState<string>("");

  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  const searchStatusRef = useRef(searchStatus);
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
    searchStatusRef.current = searchStatus;
  }, [searchStatus]);

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
  }, [urlStartDate, urlEndDate, urlPage]);

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

      const searchRecFromDd = convertDateToYYYYMMDD(startDateRef.current);
      const searchRecToDd = convertDateToYYYYMMDD(endDateRef.current);

      // 상태 필터 값 확인 및 처리 (서버 사이드 필터링)
      const statusFilter =
        searchStatusRef.current && searchStatusRef.current.trim() !== ""
          ? searchStatusRef.current
          : undefined;

      console.log("📊 fetchSupports 실행:");
      console.log(`  - startDateRef: ${startDateRef.current}`);
      console.log(`  - endDateRef: ${endDateRef.current}`);
      console.log(`  - searchRecFromDd: ${searchRecFromDd}`);
      console.log(`  - searchRecToDd: ${searchRecToDd}`);
      console.log(`  - currentPageRef: ${currentPageRef.current}`);
      console.log(`  - requestStart: ${requestStart}`);
      console.log(`  - requestLength: ${requestLength}`);
      console.log(`  - searchStatusRef: ${searchStatusRef.current}`);
      console.log(`  - statusFilter: ${statusFilter}`);

      const params: SupportListParams = {
        start: requestStart,
        length: requestLength,
        searchRecFromDd, // 모집기간 시작일 (YYYYMMDD)
        searchRecToDd, // 모집기간 종료일 (YYYYMMDD)
        // 샘플업무: proGb = "01"만 조회
        proGb: "01",
        filterStatus: statusFilter, // 상태 필터 (서버 사이드 필터링)
      };

      console.log("📤 API 요청 파라미터:", params);

      // ── 샘플업무 목록 API 비활성화 (다시 쓰려면 아래 블록 주석 해제) ──
      // const response = await SupportService.getSupportList(params);
      //
      // let supportList: Support[] = [];
      // let total = 0;
      //
      // if (Array.isArray(response)) {
      //   supportList = response;
      //   total = response.length;
      // } else if (response && typeof response === "object") {
      //   const responseObj = response as SupportListResponse;
      //
      //   if (Array.isArray(responseObj.data)) {
      //     supportList = responseObj.data;
      //   } else if (Array.isArray(responseObj.Array)) {
      //     supportList = responseObj.Array;
      //   } else if (Array.isArray(responseObj.list)) {
      //     supportList = responseObj.list;
      //   } else if (Array.isArray(responseObj.content)) {
      //     supportList = responseObj.content;
      //   }
      //
      //   total =
      //     Number(responseObj.recordsTotal) ||
      //     Number(responseObj.recordsFiltered) ||
      //     supportList.length;
      // }
      //
      // setSupports(supportList);
      // setTotalElements(total);
      // setTotalPages(Math.ceil(total / pageSize) || 1);

      const supportList: Support[] = [];
      const total = 0;
      setSupports(supportList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
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
    // 초기 로드 시 ref를 최신 값으로 동기화
    startDateRef.current = startDate;
    endDateRef.current = endDate;
    searchStatusRef.current = searchStatus;
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

  const handleDeleteClick = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBusinessId) {
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      // sessionStorage에서 user 객체를 가져와서 uniqId 추출
      const userStr = sessionStorage.getItem("user");
      let uniqId = "";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || "";
        } catch (error) {
          console.error("user 객체 파싱 오류:", error);
        }
      }

      const deleteParams: SupportDeleteParams = {
        businessId: selectedBusinessId,
        uniqId: uniqId,
      };

      // TODO: 백엔드 API 완료 후 주석 해제
      const response = await SupportService.deleteSupport(deleteParams);

      // 삭제 성공 시 목록 다시 불러오기
      if (response.result === "00") {
        await fetchSupportsRef.current();
        setShowDeleteDialog(false);
        setSelectedBusinessId(null);
      } else {
        setError(response.message || "지원사업 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("지원사업 삭제 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "지원사업 삭제 중 오류가 발생했습니다.");
        }
      } else {
        setError("지원사업 삭제 중 오류가 발생했습니다.");
      }
      setShowDeleteDialog(false);
      setSelectedBusinessId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedBusinessId(null);
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
        "📅 조회 전 날짜:",
        `startDate: ${startDate}, endDate: ${endDate}, searchStatus: ${searchStatus}`,
      );

      // ref를 최신 값으로 동기화
      startDateRef.current = startDate;
      endDateRef.current = endDate;
      searchStatusRef.current = searchStatus;
      // 조회 시 첫 페이지로 이동하고 ref도 업데이트
      currentPageRef.current = 1;
      console.log(
        "📅 ref 동기화 후:",
        `startDateRef: ${startDateRef.current}, endDateRef: ${endDateRef.current}, searchStatusRef: ${searchStatusRef.current}, currentPageRef: ${currentPageRef.current}`,
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

      console.group("📥 엑셀 다운로드 시작");

      // 토큰 검증
      if (!TokenUtils.isTokenValid()) {
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      // 날짜 형식 변환: YYYY-MM-DD -> YYYY-MM-DD (백엔드 SQL의 DATE_FORMAT이 YYYY-MM-DD 형식을 기대함)
      // 백엔드 SQL: DATE_FORMAT(#{searchRecToDd}, '%Y-%m-%d')는 YYYY-MM-DD 형식 문자열을 기대함
      const convertDateToYYYYMMDD = (
        dateStr: string | null | undefined,
      ): string | undefined => {
        if (!dateStr) return undefined;
        // YYYY-MM-DD 형식 그대로 유지 (백엔드 SQL의 DATE_FORMAT이 이 형식을 기대함)
        return dateStr;
      };

      // 엑셀 다운로드용 API 파라미터 (페이지네이션 제외, 검색 조건 + 사업구분 포함)
      const statusFilter =
        searchStatusRef.current && searchStatusRef.current.trim() !== ""
          ? searchStatusRef.current
          : undefined;
      const params: Omit<SupportListParams, "length" | "start"> = {
        searchRecFromDd: convertDateToYYYYMMDD(startDate),
        searchRecToDd: convertDateToYYYYMMDD(endDate),
        filterStatus: statusFilter, // 상태 필터 (서버 사이드 필터링)
        // 샘플업무: proGb = "01"만 조회
        proGb: "01",
      };

      console.log("📤 엑셀 다운로드 요청:", params);

      // TODO: 백엔드 API 완료 후 주석 해제
      // 엑셀 데이터 조회
      const response = await SupportService.getSupportsExcel(params);

      console.log("📥 엑셀 다운로드 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      let supportList: Support[] = [];

      if (Array.isArray(response)) {
        supportList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as SupportListResponse;

        // 결과 확인
        if (responseObj.result === "01") {
          throw new Error("엑셀 다운로드에 실패했습니다.");
        }

        if (Array.isArray(responseObj.data)) {
          supportList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          supportList = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          supportList = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          supportList = responseObj.content;
        }
      }


      // 데이터 검증
      if (supportList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      // 엑셀 파일 다운로드
      await downloadSupportsExcel(supportList, "샘플업무");
      console.log(`✅ 엑셀 다운로드 완료: ${supportList.length}건`);
      console.groupEnd();
    } catch (err) {
      console.error("❌ 엑셀 다운로드 실패:", err);
      console.groupEnd();

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
    handleSort,
    handleSearch,
    handleApplicantClick,
    handleApplicantDialogClose,
    handleExcelDownload,
    setStartDate,
    setEndDate,
    searchStatus,
    setSearchStatus,
  };
}
