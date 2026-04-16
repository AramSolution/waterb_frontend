import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MemberService,
  Member,
  MemberListParams,
  AdminMemberListParams,
  AdminMember,
  AdminMemberListResponse,
  AdminMemberDeleteParams,
} from "@/entities/adminWeb/member/api";
import { ApiError, TokenUtils } from "@/shared/lib";
import { useResizableColumns } from "@/shared/hooks";
import { downloadAdminMembersExcel } from "@/entities/adminWeb/member/lib";

export function useMemberList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 쿼리 파라미터에서 초기값 읽기
  const urlSearchCondition = searchParams.get("searchCondition");
  const urlSearchKeyword = searchParams.get("searchKeyword");
  const urlJoGunMberSta = searchParams.get("joGunMberSta");
  const urlPage = searchParams.get("page");

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // URL 파라미터가 있으면 사용, 없으면 기본값
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMemberEsntlId, setSelectedMemberEsntlId] = useState<
    string | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showOpinionSearchPopup, setShowOpinionSearchPopup] = useState(false);
  const [opinionSearchValue, setOpinionSearchValue] = useState("");
  const [members, setMembers] = useState<AdminMember[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  // 첫 fetch 완료 여부 (페이지 변경 effect에서 중복 호출 방지)
  const initialFetchDoneRef = useRef(false);
  // 첫 로드 완료 여부
  const initialLoadDoneRef = useRef(false);

  // 새로운 조회조건 상태 - URL 파라미터 우선 사용
  const [searchCondition, setSearchCondition] = useState<string>(
    urlSearchCondition || "1",
  ); // 기본값: 관리자명
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || "",
  );
  const [joGunMberSta, setJoGunMberSta] = useState<string>(
    urlJoGunMberSta || "",
  ); // 기본값: 전체

  // 조회 조건의 최신 값을 참조하기 위한 ref 추가
  const searchConditionRef = useRef(searchCondition);
  const searchKeywordRef = useRef(searchKeyword);
  const joGunMberStaRef = useRef(joGunMberSta);

  // 조회 조건이 변경될 때마다 ref 업데이트
  useEffect(() => {
    searchConditionRef.current = searchCondition;
  }, [searchCondition]);

  useEffect(() => {
    searchKeywordRef.current = searchKeyword;
  }, [searchKeyword]);

  useEffect(() => {
    joGunMberStaRef.current = joGunMberSta;
  }, [joGunMberSta]);
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

  // URL 파라미터가 변경되면 상태 업데이트 (뒤로가기/앞으로가기 대응)
  useEffect(() => {
    if (urlSearchCondition !== null) {
      setSearchCondition(urlSearchCondition || "1");
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
    }
    if (urlJoGunMberSta !== null) {
      setJoGunMberSta(urlJoGunMberSta || "");
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlSearchCondition, urlSearchKeyword, urlJoGunMberSta, urlPage]);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      //console.group("🔐 토큰 검증");
      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        console.error("토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.");
        console.groupEnd();
        setError("로그인이 필요합니다. 다시 로그인해주세요.");
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }
      //console.groupEnd();

      // 서버 사이드 페이징: 실제 페이지와 사이즈를 계산하여 전달
      const startIndex = (currentPage - 1) * pageSize;
      // 조회 조건 ref를 사용하여 최신 값 참조
      const params: AdminMemberListParams = {
        searchCondition: searchConditionRef.current,
        searchKeyword: searchKeywordRef.current,
        joGunMberSta: joGunMberStaRef.current,
        length: pageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
      };

      //console.log("📤 관리자 회원 조회 요청:", params);

      const response = await MemberService.getAdminMembers(params);

      //console.log("📥 관리자 회원 조회 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      // 응답 구조: { result, recordsFiltered, recordsTotal, data: [...] }
      let memberList: AdminMember[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        // 응답이 배열인 경우
        memberList = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        // 응답이 객체인 경우
        const responseObj = response as AdminMemberListResponse;

        if (Array.isArray(responseObj.data)) {
          memberList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          memberList = responseObj.Array;
        }

        // 서버에서 받은 전체 개수 사용
        total =
          Number(responseObj.recordsTotal) ||
          Number(responseObj.recordsFiltered) ||
          memberList.length;
      }

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setMembers(memberList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error("관리자회원 목록 조회 실패:", err);

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
        setError("관리자회원 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      initialFetchDoneRef.current = true;
      initialLoadDoneRef.current = true;
    }
  }, [currentPage, pageSize]); // searchCondition, searchKeyword, joGunMberSta를 dependency에서 제거

  // fetchMembers의 최신 함수를 참조하기 위한 ref 추가
  const fetchMembersRef = useRef(fetchMembers);

  // fetchMembers가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchMembersRef.current = fetchMembers;
  }, [fetchMembers]);

  // 초기 로드
  useEffect(() => {
    fetchMembers();
  }, []);

  // 페이지 변경 시 API 재호출 (첫 fetch 완료 후에만 실행, 중복 호출 방지)
  useEffect(() => {
    if (!initialFetchDoneRef.current) return;
    fetchMembers();
  }, [currentPage, fetchMembers]);

  // 조회 조건 변경 시 자동 조회 제거 - 조회 버튼 클릭 또는 Enter 입력 시에만 조회

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 URL 업데이트
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleDeleteClick = (esntlId: string) => {
    setSelectedMemberEsntlId(esntlId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMemberEsntlId) {
      setShowDeleteDialog(false);
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      const deleteParams: AdminMemberDeleteParams = {
        esntlId: selectedMemberEsntlId,
      };

      const response = await MemberService.deleteAdminMember(deleteParams);

      if (response.result === "00") {
        // 삭제 성공 시 목록 다시 불러오기
        await fetchMembers();
        setShowDeleteDialog(false);
        setSelectedMemberEsntlId(null);
        // 성공 메시지는 필요시 추가
      } else {
        // 삭제 실패
        setError(response.message || "회원 탈퇴에 실패했습니다.");
        setShowDeleteDialog(false);
        setSelectedMemberEsntlId(null);
      }
    } catch (err) {
      console.error("회원 탈퇴 오류:", err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // 인증 오류
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message || "회원 탈퇴 중 오류가 발생했습니다.");
        }
      } else {
        setError("회원 탈퇴 중 오류가 발생했습니다.");
      }
      setShowDeleteDialog(false);
      setSelectedMemberEsntlId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedMemberEsntlId(null);
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

  const handleOpinionSearch = () => {
    setShowOpinionSearchPopup(true);
  };

  const handleOpinionSelect = (data: any) => {
    setOpinionSearchValue(data.content);
  };

  // 조회 버튼 핸들러
  const handleSearch = () => {
    setCurrentPage(1); // 조회 시 첫 페이지로 이동
    // URL 업데이트
    const params = new URLSearchParams();
    params.set("searchCondition", searchCondition);
    if (searchKeyword) params.set("searchKeyword", searchKeyword);
    if (joGunMberSta) params.set("joGunMberSta", joGunMberSta);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
    fetchMembers();
  };

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      setLoading(true);
      setError("");

      console.group("📥 엑셀 다운로드 시작");

      // 토큰 검증
      if (!TokenUtils.isTokenValid()) {
        console.error("토큰이 유효하지 않습니다.");
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
        joGunMberSta: joGunMberSta,
      };

      console.log("📤 엑셀 다운로드 요청:", params);

      // 엑셀 데이터 조회
      const response = await MemberService.getAdminMembersExcel(params);

      console.log("📥 엑셀 다운로드 응답:", response);

      // API 응답 구조에 맞게 데이터 추출
      let memberList: AdminMember[] = [];

      if (Array.isArray(response)) {
        memberList = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as AdminMemberListResponse;

        // 결과 확인
        if (responseObj.result === "01") {
          throw new Error("엑셀 다운로드에 실패했습니다.");
        }

        if (Array.isArray(responseObj.data)) {
          memberList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          memberList = responseObj.Array;
        }
      }

      if (memberList.length === 0) {
        setError("다운로드할 데이터가 없습니다.");
        console.warn("⚠️ 다운로드할 데이터가 없습니다.");
        return;
      }

      // 엑셀 파일 다운로드
      await downloadAdminMembersExcel(memberList, "관리자회원");
      console.log(`✅ 엑셀 다운로드 완료: ${memberList.length}건`);
      console.groupEnd();
    } catch (err) {
      console.error("❌ 엑셀 다운로드 실패:", err);
      console.groupEnd();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error("❌ 401 Unauthorized - 인증 실패");
          TokenUtils.debugToken();
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
    showOpinionSearchPopup,
    opinionSearchValue,
    members,
    totalElements,
    totalPages,
    error,
    sortConfig,
    tableRef,
    pageSize,
    setCurrentPage,
    setShowDeleteDialog,
    setShowSearchForm,
    setShowOpinionSearchPopup,
    setOpinionSearchValue,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleOpinionSearch,
    handleOpinionSelect,
    handleSearch,
    handleExcelDownload,
    searchCondition,
    searchKeyword,
    joGunMberSta,
    setSearchCondition,
    setSearchKeyword,
    setJoGunMberSta,
  };
}
