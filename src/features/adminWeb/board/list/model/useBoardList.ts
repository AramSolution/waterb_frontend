import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BoardService,
  Board,
  BoardListParams,
  BoardListResponse,
  BoardDeleteParams,
  TargetCode,
} from "@/entities/adminWeb/board/api";
import { downloadBoardsExcel } from "@/entities/adminWeb/board/lib";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";

export function useBoardList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기 (null 체크)
  const urlSearchCondition = searchParams?.get("searchCondition") ?? null;
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? null;
  const urlTargetGbn = searchParams?.get("targetGbn") ?? null;
  const urlPage = searchParams?.get("page") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [targetList, setTargetList] = useState<TargetCode[]>([]); // 대상구분 리스트
  // 조회조건 상태 (URL 파라미터로 초기화)
  const [targetGbn, setTargetGbn] = useState<string>(urlTargetGbn || ""); // 대상구분
  const [searchCondition, setSearchCondition] = useState<string>(
    urlSearchCondition || "1",
  ); // 기본값: 게시판명
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || "",
  );

  // 조회 조건의 최신 값을 참조하기 위한 ref 추가
  const searchConditionRef = useRef(searchCondition);
  const searchKeywordRef = useRef(searchKeyword);
  const targetGbnRef = useRef(targetGbn);

  // 조회 조건이 변경될 때마다 ref 업데이트
  useEffect(() => {
    searchConditionRef.current = searchCondition;
  }, [searchCondition]);

  useEffect(() => {
    searchKeywordRef.current = searchKeyword;
  }, [searchKeyword]);

  useEffect(() => {
    targetGbnRef.current = targetGbn;
  }, [targetGbn]);
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
      setSearchCondition(urlSearchCondition || "1");
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
    }
    if (urlTargetGbn !== null) {
      setTargetGbn(urlTargetGbn || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlSearchCondition, urlSearchKeyword, urlTargetGbn, urlPage]);

  // 초기 로드: 대상구분 리스트 조회
  useEffect(() => {
    fetchTargetList();
  }, []);

  // 대상구분 리스트가 로드되면 "T"(통합)를 기본값으로 설정, 없으면 첫 번째 사용
  useEffect(() => {
    if (targetList.length > 0 && !targetGbn) {
      const defaultCode = "T";
      const unifiedItem = targetList.find(
        (t) => (t.code || "").trim() === defaultCode,
      );
      setTargetGbn(
        unifiedItem ? defaultCode : (targetList[0].code || "").trim(),
      );
    }
  }, [targetList]);

  // 대상구분 리스트 조회
  const fetchTargetList = async () => {
    try {
      const response = await BoardService.getBoardMasterManage();
      const safeTargetList =
        response.targetList && Array.isArray(response.targetList)
          ? response.targetList
          : [];

      setTargetList(safeTargetList);

      // 대상구분 API가 빈 배열이면 초기 조회 트리거 조건(targetList.length > 0)을 만족하지 않아
      // 로딩이 끝나지 않을 수 있으므로 빈 목록 상태로 명시적으로 종료한다.
      if (safeTargetList.length === 0) {
        setBoards([]);
        setTotalElements(0);
        setTotalPages(1);
        setLoading(false);
        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error("대상구분 리스트 조회 실패:", err);
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
        setError("대상구분 리스트를 불러오는 중 오류가 발생했습니다.");
      }

      // 대상구분 조회 실패 시에도 초기 스켈레톤이 무한 지속되지 않도록 종료
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // 게시판 목록 조회 (서버 사이드 페이징)
  const fetchBoards = useCallback(async () => {
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
      // 조회 조건 ref를 사용하여 최신 값 참조
      const params: BoardListParams = {
        searchCondition: searchConditionRef.current,
        searchKeyword: searchKeywordRef.current,
        targetGbn: targetGbnRef.current,
        length: pageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
      };

      const response = await BoardService.getBoardList(params);

      // API 응답 구조에 맞게 데이터 추출
      let boardList: Board[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        boardList = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        const responseObj = response as BoardListResponse;

        if (Array.isArray(responseObj.data)) {
          boardList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          boardList = responseObj.Array;
        }

        // 서버에서 받은 전체 개수 사용
        total =
          Number(responseObj.recordsTotal) ||
          Number(responseObj.recordsFiltered) ||
          boardList.length;
      }

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setBoards(boardList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error("게시판 목록 조회 실패:", err);

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
        setError("게시판 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize]); // searchCondition, searchKeyword, targetGbn, filters를 dependency에서 제거

  // fetchBoards의 최신 함수를 참조하기 위한 ref 추가
  const fetchBoardsRef = useRef(fetchBoards);

  // 초기 조회 완료 여부 (대상구분 변경 시 자동 조회 방지 - 조회 버튼/Enter만 조회)
  const initialFetchDoneRef = useRef(false);

  // fetchBoards가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchBoardsRef.current = fetchBoards;
  }, [fetchBoards]);

  // 초기 로드 (최초 1회만 실행, 대상구분 변경 시에는 실행하지 않음)
  useEffect(() => {
    if (targetList.length > 0 && targetGbn && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchBoardsRef.current();
    }
  }, [targetList, targetGbn]);

  // 페이지 변경 시 API 재호출
  useEffect(() => {
    if (!isInitialLoad) {
      fetchBoards();
    }
  }, [currentPage, fetchBoards, isInitialLoad]);


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (bbsId: string) => {
    setSelectedBoardId(bbsId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBoardId) {
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

      const deleteParams: BoardDeleteParams = {
        bbsId: selectedBoardId,
        uniqId: uniqId,
      };

      const response = await BoardService.deleteBoard(deleteParams);

      if (response.result === "00") {
        // 삭제 성공 시 목록 다시 불러오기
        await fetchBoardsRef.current();
        setShowDeleteDialog(false);
        setSelectedBoardId(null);
      } else {
        setError(response.message || "게시판 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("게시판 삭제 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "게시판 삭제 중 오류가 발생했습니다.");
        }
      } else {
        setError("게시판 삭제 중 오류가 발생했습니다.");
      }
      setShowDeleteDialog(false);
      setSelectedBoardId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedBoardId(null);
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
    fetchBoardsRef.current(); // ref를 통해 최신 함수 호출
  };

  // 목록으로 돌아가기 (상세 페이지에서 사용)
  const handleList = () => {
    const params = new URLSearchParams();
    if (searchCondition) params.set("searchCondition", searchCondition);
    if (searchKeyword) params.set("searchKeyword", searchKeyword);
    if (targetGbn) params.set("targetGbn", targetGbn);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.push(
      queryString
        ? `/adminWeb/board/list?${queryString}`
        : "/adminWeb/board/list",
    );
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

      // 엑셀 다운로드용 API 파라미터 (페이지네이션 제외)
      const params = {
        searchCondition: searchCondition,
        searchKeyword: searchKeyword,
        targetGbn: targetGbn,
      };

      console.log("📤 엑셀 다운로드 요청:", params);

      // 엑셀 데이터 조회
      const response = await BoardService.getBoardsExcel(params);

      console.log("📥 엑셀 다운로드 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      let boardList: Board[] = [];

      if (Array.isArray(response)) {
        boardList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as BoardListResponse;

        // 결과 확인
        if (responseObj.result === "01") {
          throw new Error("엑셀 다운로드에 실패했습니다.");
        }

        if (Array.isArray(responseObj.data)) {
          boardList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          boardList = responseObj.Array;
        }
      }

      // 데이터 검증
      if (boardList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        return;
      }

      // 엑셀 파일 다운로드
      await downloadBoardsExcel(boardList, "게시판목록");
      console.log(`✅ 엑셀 다운로드 완료: ${boardList.length}건`);
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
    boards,
    totalElements,
    totalPages,
    error,
    sortConfig,
    tableRef,
    pageSize,
    targetList,
    targetGbn,
    searchCondition,
    searchKeyword,
    setCurrentPage,
    setShowDeleteDialog,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleSearch,
    handleList,
    handleExcelDownload,
    setTargetGbn,
    setSearchCondition,
    setSearchKeyword,
  };
}
