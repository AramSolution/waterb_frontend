import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  MenuMakeService,
  MenuMake,
  MenuMakeListParams,
  MenuMakeListResponse,
} from "@/entities/adminWeb/menu/api";
import { ApiError, TokenUtils } from "@/shared/lib";

export function useMenuMakeList() {
  const searchParams = useSearchParams();

  // URL 파라미터 읽기 (null 체크)
  const urlSearchCondition = searchParams?.get("searchCondition") ?? null;
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [allMenuMakeList, setAllMenuMakeList] = useState<MenuMake[]>([]); // API에서 가져온 전체 데이터
  const [menuMakeList, setMenuMakeList] = useState<MenuMake[]>([]); // 필터링된 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState("");
  // 조회조건 상태 (URL 파라미터로 초기화)
  const [searchCondition, setSearchCondition] = useState<string>(
    urlSearchCondition || "1"
  ); // 기본값: 권한코드
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || ""
  );

  // URL 파라미터와 상태 동기화
  useEffect(() => {
    if (urlSearchCondition !== null) {
      setSearchCondition(urlSearchCondition || "1");
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || "");
    }
  }, [urlSearchCondition, urlSearchKeyword]);

  // 초기 로드만 수행 (조회 조건 변경 시 자동 호출 제거)
  // 명시적 조회: Enter 키나 "조회" 버튼 클릭 시에만 API 호출
  useEffect(() => {
    fetchMenuMakeList();
  }, []);

  // 메뉴생성관리 목록 조회
  const fetchMenuMakeList = async () => {
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

      // 클라이언트 사이드 필터링을 위해 전체 데이터를 가져옴
      const params: MenuMakeListParams = {
        searchCondition: searchCondition,
        searchKeyword: searchKeyword,
      };

      const response = await MenuMakeService.getMenuMakeList(params);

      // API 응답 구조에 맞게 데이터 추출
      let list: MenuMake[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        list = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        const responseObj = response as MenuMakeListResponse;

        if (Array.isArray(responseObj.data)) {
          list = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          list = responseObj.Array;
        } else if (Array.isArray(responseObj.list)) {
          list = responseObj.list;
        } else if (Array.isArray(responseObj.content)) {
          list = responseObj.content;
        }

        total = list.length;
      }

      setAllMenuMakeList(list);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          TokenUtils.debugToken();
          setError("인증에 실패했습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError("메뉴생성관리 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // 조회 버튼 핸들러
  const handleSearch = () => {
    fetchMenuMakeList();
  };

  // API에서 받은 데이터를 그대로 사용 (서버 사이드 필터링)
  // 클라이언트 사이드 필터링 제거 - 명시적 조회 시에만 서버에서 필터링된 결과를 받아옴
  useEffect(() => {
    setMenuMakeList(allMenuMakeList);
    setTotalElements(allMenuMakeList.length);
  }, [allMenuMakeList]);

  return {
    loading,
    isInitialLoad,
    showSearchForm,
    menuMakeList,
    totalElements,
    error,
    searchCondition,
    searchKeyword,
    setShowSearchForm,
    handleSearch,
    setSearchCondition,
    setSearchKeyword,
  };
}
