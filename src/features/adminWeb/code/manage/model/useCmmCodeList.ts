import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  CmmCodeService,
  CmmCode,
  CmmCodeListParams,
  CmmCodeListResponse,
} from "@/entities/adminWeb/code/api";
import { downloadCmmCodesExcel } from "@/entities/adminWeb/code/lib";
import { ApiError, TokenUtils } from "@/shared/lib";

export function useCmmCodeList() {
  const searchParams = useSearchParams();

  // URL 파라미터 읽기 (null 체크)
  const urlSearchCondition = searchParams?.get("searchCondition") ?? null;
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? null;
  const urlSearchUseAt = searchParams?.get("searchUseAt") ?? null;
  const urlPage = searchParams?.get("page") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cmmCodeList, setCmmCodeList] = useState<CmmCode[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1
  );
  const [error, setError] = useState("");
  const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  // 테이블 필터 상태
  const [filters, setFilters] = useState({
    codeId: "",
    codeIdNm: "",
    clCodeNm: "",
    useAt: "",
  });

  // filters의 최신 값을 참조하기 위한 ref 추가
  const filtersRef = useRef(filters);
  
  // filters가 변경될 때마다 ref 업데이트
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // 조회조건 상태 (URL 파라미터로 초기화)
  const [searchCondition, setSearchCondition] = useState<string>(
    urlSearchCondition || "1"
  ); // 기본값: 코드ID
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || ""
  );
  const [searchUseAt, setSearchUseAt] = useState<string>(urlSearchUseAt || "Y"); // 사용여부: "Y" (기본값: 사용), "", "N"
  
  // 조회 조건의 최신 값을 참조하기 위한 ref 추가
  const searchConditionRef = useRef(searchCondition);
  const searchKeywordRef = useRef(searchKeyword);
  const searchUseAtRef = useRef(searchUseAt);
  
  // 조회 조건이 변경될 때마다 ref 업데이트
  useEffect(() => {
    searchConditionRef.current = searchCondition;
  }, [searchCondition]);
  
  useEffect(() => {
    searchKeywordRef.current = searchKeyword;
  }, [searchKeyword]);
  
  useEffect(() => {
    searchUseAtRef.current = searchUseAt;
  }, [searchUseAt]);

  // URL 파라미터와 상태 동기화
  useEffect(() => {
    if (urlSearchCondition !== null) {
      setSearchCondition(urlSearchCondition || "1");
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
    }
    if (urlSearchUseAt !== null) {
      setSearchUseAt(urlSearchUseAt || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlSearchCondition, urlSearchKeyword, urlSearchUseAt, urlPage]);


  // 공통코드 목록 조회 (서버 사이드 페이징)
  const fetchCmmCodeList = useCallback(async () => {
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
      const params: CmmCodeListParams = {
        searchCondition: searchConditionRef.current,
        searchKeyword: searchKeywordRef.current,
        searchUseAt: searchUseAtRef.current || undefined,
        length: pageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
        // 테이블 필터 파라미터 추가
        filterCodeId: currentFilters.codeId || undefined,
        filterCodeIdNm: currentFilters.codeIdNm || undefined,
        filterClCodeNm: currentFilters.clCodeNm || undefined,
        filterUseAt: currentFilters.useAt || undefined,
      };

      const response = await CmmCodeService.getCmmCodeList(params);

      // API 응답 구조에 맞게 데이터 추출
      let list: CmmCode[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        list = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        const responseObj = response as CmmCodeListResponse;

        let rawList: any[] = [];
        if (Array.isArray(responseObj.data)) {
          rawList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          rawList = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          rawList = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          rawList = responseObj.content;
        }

        // 백엔드에서 오는 대문자 키를 카멜케이스로 변환
        list = rawList.map((item: any) => ({
          rnum: item.RNUM || item.rnum || 0,
          codeId: item.CODE_ID || item.codeId || "",
          codeIdNm: item.CODE_ID_NM || item.codeIdNm || "",
          codeIdDc: item.CODE_ID_DC || item.codeIdDc || "",
          useAt: item.USE_AT || item.useAt || "",
          clCode: item.CL_CODE || item.clCode || "",
          clCodeNm: item.CL_CODE_NM || item.clCodeNm || "",
          ...item, // 원본 데이터도 유지
        }));

        // 서버에서 받은 전체 개수 사용
        total =
          Number(responseObj.recordsTotal) ||
          Number(responseObj.recordsFiltered) ||
          list.length;
      }

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setCmmCodeList(list);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error("공통코드 목록 조회 실패:", err);

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
        setError("공통코드 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize]); // searchCondition, searchKeyword, searchUseAt, filters를 dependency에서 제거

  // fetchCmmCodeList의 최신 함수를 참조하기 위한 ref 추가
  const fetchCmmCodeListRef = useRef(fetchCmmCodeList);
  
  // fetchCmmCodeList가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchCmmCodeListRef.current = fetchCmmCodeList;
  }, [fetchCmmCodeList]);

  // 초기 로드
  useEffect(() => {
    fetchCmmCodeList();
  }, []);

  // 페이지 변경 시 API 재호출
  useEffect(() => {
    if (!isInitialLoad) {
      fetchCmmCodeList();
    }
  }, [currentPage, fetchCmmCodeList, isInitialLoad]);

  // 필터 변경 시 Debounce 800ms 적용하여 첫 페이지로 이동하고 API 호출
  useEffect(() => {
    if (isInitialLoad) return; // 초기 로드 시에는 실행하지 않음

    const timer = setTimeout(() => {
      // 필터 변경 시 첫 페이지로 이동하고 API 호출
      setCurrentPage(1);
      // currentPage가 이미 1일 수 있으므로 직접 fetchCmmCodeList 호출
      // fetchCmmCodeListRef.current를 사용하여 최신 함수 참조
      fetchCmmCodeListRef.current();
    }, 800); // 800ms Debounce

    return () => clearTimeout(timer);
  }, [filters.codeId, filters.codeIdNm, filters.clCodeNm, filters.useAt, isInitialLoad]); // fetchCmmCodeList를 dependency에서 제거

  // 조회 버튼 핸들러
  const handleSearch = () => {
    setCurrentPage(1); // 조회 시 첫 페이지로 이동
    fetchCmmCodeListRef.current(); // ref를 통해 최신 함수 호출
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 필터 초기화 핸들러
  const handleClearFilters = () => {
    setFilters({
      codeId: "",
      codeIdNm: "",
      clCodeNm: "",
      useAt: "",
    });
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
        searchUseAt: searchUseAt || undefined,
        // 테이블 필터 파라미터 추가
        filterCodeId: filters.codeId || undefined,
        filterCodeIdNm: filters.codeIdNm || undefined,
        filterClCodeNm: filters.clCodeNm || undefined,
        filterUseAt: filters.useAt || undefined,
      };

      console.log("📤 엑셀 다운로드 요청:", params);

      // 엑셀 데이터 조회
      const response = await CmmCodeService.getCmmCodesExcel(params);

      console.log("📥 엑셀 다운로드 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      let codeList: CmmCode[] = [];

      if (Array.isArray(response)) {
        codeList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as CmmCodeListResponse;

        // 결과 확인
        if (responseObj.resultCode === "01") {
          throw new Error("엑셀 다운로드에 실패했습니다.");
        }

        let rawList: any[] = [];
        if (Array.isArray(responseObj.data)) {
          rawList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          rawList = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          rawList = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          rawList = responseObj.content;
        }

        // 백엔드에서 오는 대문자 키를 카멜케이스로 변환
        codeList = rawList.map((item: any) => ({
          rnum: item.RNUM || item.rnum || 0,
          codeId: item.CODE_ID || item.codeId || "",
          codeIdNm: item.CODE_ID_NM || item.codeIdNm || "",
          codeIdDc: item.CODE_ID_DC || item.codeIdDc || "",
          useAt: item.USE_AT || item.useAt || "",
          clCode: item.CL_CODE || item.clCode || "",
          clCodeNm: item.CL_CODE_NM || item.clCodeNm || "",
          ...item, // 원본 데이터도 유지
        }));
      }

      // 데이터 검증
      if (codeList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      // 엑셀 파일 다운로드
      await downloadCmmCodesExcel(codeList, "대분류코드목록");
      console.log(`✅ 엑셀 다운로드 완료: ${codeList.length}건`);
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
            : "엑셀 다운로드 중 오류가 발생했습니다."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isInitialLoad,
    showSearchForm,
    showFilters,
    cmmCodeList,
    totalElements,
    totalPages,
    currentPage,
    pageSize,
    error,
    searchCondition,
    searchKeyword,
    searchUseAt,
    filters,
    setShowSearchForm,
    setShowFilters,
    handleSearch,
    handlePageChange,
    handleClearFilters,
    handleExcelDownload,
    setSearchCondition,
    setSearchKeyword,
    setSearchUseAt,
    setFilters,
  };
}
