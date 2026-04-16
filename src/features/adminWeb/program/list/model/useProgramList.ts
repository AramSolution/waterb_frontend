import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProgramService,
  Program,
  ProgramListParams,
  ProgramListResponse,
} from "@/entities/adminWeb/program/api";
import { downloadProgramsExcel } from "@/entities/adminWeb/program/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";

export function useProgramList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기 (null 체크)
  const urlSearchCondition = searchParams?.get("searchCondition") ?? null;
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? null;
  const urlPage = searchParams?.get("page") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    progrmFileNm: "",
    progrmStrePath: "",
    progrmKoreanNm: "",
    url: "",
  });
  // filters의 최신 값을 참조하기 위한 ref 추가
  const filtersRef = useRef(filters);
  // 첫 fetch 완료 여부 (페이지 변경 effect에서 중복 호출 방지)
  const initialFetchDoneRef = useRef(false);
  // 첫 로드 완료 여부 (필터 effect에서 상세 복귀 시 타이머 방지)
  const initialLoadDoneRef = useRef(false);

  // filters가 변경될 때마다 ref 업데이트
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // 조회조건 상태 (URL 파라미터로 초기화)
  const [searchCondition, setSearchCondition] = useState<string>(
    urlSearchCondition || "3",
  ); // 기본값: 프로그램(한글명)
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || "",
  );

  // 조회 조건의 최신 값을 참조하기 위한 ref 추가
  const searchConditionRef = useRef(searchCondition);
  const searchKeywordRef = useRef(searchKeyword);

  // 조회 조건이 변경될 때마다 ref 업데이트
  useEffect(() => {
    searchConditionRef.current = searchCondition;
  }, [searchCondition]);

  useEffect(() => {
    searchKeywordRef.current = searchKeyword;
  }, [searchKeyword]);
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

  // URL 파라미터와 상태 동기화 (브라우저 back/forward 처리)
  useEffect(() => {
    if (urlSearchCondition !== null) {
      setSearchCondition(urlSearchCondition || "3");
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlSearchCondition, urlSearchKeyword, urlPage]);

  // 프로그램 목록 조회 (서버 사이드 페이징)
  const fetchPrograms = useCallback(async () => {
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

      // 서버 사이드 페이징: 실제 페이지와 사이즈를 계산하여 전달
      const startIndex = (currentPage - 1) * pageSize;
      // filtersRef.current를 사용하여 최신 필터 값 참조
      const currentFilters = filtersRef.current;
      // 조회 조건 ref를 사용하여 최신 값 참조
      const params: ProgramListParams = {
        searchCondition: searchConditionRef.current,
        searchKeyword: searchKeywordRef.current,
        length: pageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
        // 테이블 필터 파라미터 추가
        filterProgrmFileNm: currentFilters.progrmFileNm || undefined,
        filterProgrmStrePath: currentFilters.progrmStrePath || undefined,
        filterProgrmKoreanNm: currentFilters.progrmKoreanNm || undefined,
        filterUrl: currentFilters.url || undefined,
      };

      const response = await ProgramService.getProgramList(params);

      // API 응답 구조에 맞게 데이터 추출
      let programList: Program[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        programList = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        const responseObj = response as ProgramListResponse;

        if (Array.isArray(responseObj.data)) {
          programList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          programList = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          programList = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          programList = responseObj.content;
        }

        // 서버에서 받은 전체 개수 사용
        total =
          Number(responseObj.recordsTotal) ||
          Number(responseObj.recordsFiltered) ||
          programList.length;
      }

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setPrograms(programList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error("프로그램 목록 조회 실패:", err);

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
        setError("프로그램 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      initialFetchDoneRef.current = true;
      initialLoadDoneRef.current = true;
    }
  }, [currentPage, pageSize]); // searchCondition, searchKeyword, filters를 dependency에서 제거

  // fetchPrograms의 최신 함수를 참조하기 위한 ref 추가
  const fetchProgramsRef = useRef(fetchPrograms);

  // fetchPrograms가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchProgramsRef.current = fetchPrograms;
  }, [fetchPrograms]);

  // 초기 로드
  useEffect(() => {
    fetchPrograms();
  }, []);

  // 페이지 변경 시 API 재호출 (첫 fetch 완료 후에만 실행, 중복 호출 방지)
  useEffect(() => {
    if (!initialFetchDoneRef.current) return;
    fetchPrograms();
  }, [currentPage, fetchPrograms]);

  // 필터 변경 시 Debounce 800ms 적용하여 첫 페이지로 이동하고 API 호출 (첫 로드 완료 후에만 타이머 실행, 상세 복귀 시 페이지 유지)
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchProgramsRef.current();
    }, 800); // 800ms Debounce

    return () => clearTimeout(timer);
  }, [
    filters.progrmFileNm,
    filters.progrmStrePath,
    filters.progrmKoreanNm,
    filters.url,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (progrmFileNm: string) => {
    setSelectedProgramId(progrmFileNm);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProgramId) {
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      // 삭제 API 호출
      const response = await ProgramService.deleteProgram({
        progrmFileNm: selectedProgramId,
      });

      // 삭제 성공 시 목록 다시 불러오기
      if (response.resultCode === "00") {
        await fetchProgramsRef.current();
        setShowDeleteDialog(false);
        setSelectedProgramId(null);
      } else {
        setError(
          response.resultMessage || "프로그램 삭제 중 오류가 발생했습니다.",
        );
        setShowDeleteDialog(false);
        setSelectedProgramId(null);
      }
    } catch (err) {
      console.error("프로그램 삭제 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "프로그램 삭제 중 오류가 발생했습니다.");
        }
      } else {
        setError("프로그램 삭제 중 오류가 발생했습니다.");
      }
      setShowDeleteDialog(false);
      setSelectedProgramId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedProgramId(null);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      progrmFileNm: "",
      progrmStrePath: "",
      progrmKoreanNm: "",
      url: "",
    });
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
  const handleSearch = () => {
    setCurrentPage(1); // 조회 시 첫 페이지로 이동
    fetchProgramsRef.current(); // ref를 통해 최신 함수 호출
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

      // 엑셀 다운로드용 API 파라미터 (페이지네이션 제외, 필터 포함)
      const params = {
        searchCondition: searchCondition,
        searchKeyword: searchKeyword,
        // 테이블 필터 파라미터 추가
        filterProgrmFileNm: filters.progrmFileNm || undefined,
        filterProgrmStrePath: filters.progrmStrePath || undefined,
        filterProgrmKoreanNm: filters.progrmKoreanNm || undefined,
        filterUrl: filters.url || undefined,
      };

      console.log("📤 엑셀 다운로드 요청:", params);

      // 엑셀 데이터 조회
      const response = await ProgramService.getProgramsExcel(params);

      console.log("📥 엑셀 다운로드 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      let programList: Program[] = [];

      if (Array.isArray(response)) {
        programList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as ProgramListResponse;

        // 결과 확인
        if (responseObj.resultCode === "0001") {
          throw new Error("엑셀 다운로드에 실패했습니다.");
        }

        if (Array.isArray(responseObj.data)) {
          programList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          programList = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          programList = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          programList = responseObj.content;
        }
      }

      // 데이터 검증
      if (programList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      // 엑셀 파일 다운로드
      await downloadProgramsExcel(programList, "프로그램목록");
      console.log(`✅ 엑셀 다운로드 완료: ${programList.length}건`);
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
    showFilters,
    showSearchForm,
    programs,
    totalElements,
    totalPages,
    error,
    filters,
    sortConfig,
    tableRef,
    pageSize,
    searchCondition,
    searchKeyword,
    setCurrentPage,
    setShowDeleteDialog,
    setShowFilters,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleFilterChange,
    handleClearFilters,
    handleSort,
    handleSearch,
    handleExcelDownload,
    setSearchCondition,
    setSearchKeyword,
  };
}
