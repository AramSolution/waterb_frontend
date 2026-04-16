import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArticleService,
  Article,
  ArticleListParams,
  ArticleListResponse,
  ArticleDeleteParams,
} from '@/entities/adminWeb/article/api';
import { BoardService } from '@/entities/adminWeb/board/api';
import { ApiError, TokenUtils } from '@/shared/lib';
import { useResizableColumns } from '@/shared/hooks';
import { downloadArticlesExcel } from '@/entities/adminWeb/article/lib';

/** 백엔드: 1=전체, 2=제목, 3=작성자, 4=내용 */
const VALID_SEARCH_CONDITIONS = ['1', '2', '3', '4'] as const;

function normalizeSearchCondition(raw: string | null | undefined): string {
  if (raw && (VALID_SEARCH_CONDITIONS as readonly string[]).includes(raw)) {
    return raw;
  }
  return '1';
}

export function useArticleList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터 읽기 (null 체크)
  const urlBbsId = searchParams?.get('bbsId') ?? null;
  const urlBbsNm = searchParams?.get('bbsNm') ?? null; // 게시판명 (title용)
  const urlSearchCondition = searchParams?.get('searchCondition') ?? null;
  const urlSearchKeyword = searchParams?.get('searchKeyword') ?? null;
  const urlPage = searchParams?.get('page') ?? null;

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage, 10) : 1,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  // 삭제 성공/실패 메시지 다이얼로그 상태
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'success' | 'danger'
  >('success');
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  const [bbsId, setBbsId] = useState<string>(urlBbsId || ''); // 게시판ID
  const [bbsNm, setBbsNm] = useState<string>(urlBbsNm || ''); // 게시판명 (title용)
  const [searchCondition, setSearchCondition] = useState<string>(
    normalizeSearchCondition(urlSearchCondition),
  ); // 기본값: 전체
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchKeyword || '',
  );
  const [replyYn, setReplyYn] = useState<string>('N'); // 게시판 답장가능여부
  const [bbsSe, setBbsSe] = useState<string>(''); // 게시판 유형코드 (예: BBST02 갤러리, BBST03 아카이브)
  const tableRef = useRef<HTMLTableElement>(null);
  const pageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  useResizableColumns(tableRef);

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

  // URL 파라미터와 상태 동기화 (브라우저 back/forward 처리)
  useEffect(() => {
    if (urlBbsId !== null) {
      setBbsId(urlBbsId);
    }
    if (urlBbsNm !== null) {
      setBbsNm(urlBbsNm);
    }
    if (urlSearchCondition !== null) {
      setSearchCondition(normalizeSearchCondition(urlSearchCondition));
    }
    if (urlSearchKeyword !== null) {
      setSearchKeyword(urlSearchKeyword || '');
    }
    if (urlPage !== null) {
      const pageNum = parseInt(urlPage, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
  }, [urlBbsId, urlBbsNm, urlSearchCondition, urlSearchKeyword, urlPage]);

  // 게시판 상세 정보 조회하여 replyYn 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      if (!bbsId) return;

      try {
        const response = await BoardService.getBoardDetail({ bbsId });
        let detailData =
          response.detail || (response as any).data?.detail || response.data;

        if (
          !detailData &&
          typeof response === 'object' &&
          !Array.isArray(response)
        ) {
          const responseKeys = Object.keys(response);
          if (
            responseKeys.length > 0 &&
            ((response as any).bbsId || (response as any).bbsNm)
          ) {
            detailData = response;
          }
        }

        if (detailData && typeof detailData === 'object') {
          const replyYnValue =
            (detailData as any).replyYn || (detailData as any).REPLY_YN || 'N';
          const bbsSeValue =
            (detailData as any).bbsSe || (detailData as any).BBS_SE || '';
          setReplyYn(replyYnValue);
          setBbsSe(bbsSeValue);
        } else {
          setReplyYn('N');
          setBbsSe('');
        }
      } catch (err) {
        setReplyYn('N');
        setBbsSe('');
      }
    };

    fetchBoardDetail();
  }, [bbsId]);

  // 게시글 목록 조회 (서버 사이드 페이징)
  const fetchArticles = useCallback(async () => {
    if (!bbsId) {
      setError('게시판 ID가 필요합니다.');
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        console.error('토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      // 서버 사이드 페이징: 실제 페이지와 사이즈를 계산하여 전달
      const startIndex = (currentPage - 1) * pageSize;
      // 조회 조건 ref를 사용하여 최신 값 참조
      const params: ArticleListParams = {
        searchCondition: searchConditionRef.current,
        searchKeyword: searchKeywordRef.current,
        bbsId: bbsId,
        length: pageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
      };

      const response = await ArticleService.getArticleList(params);

      // API 응답 구조에 맞게 데이터 추출
      let articleList: Article[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        articleList = response;
        total = response.length;
      } else if (response && typeof response === 'object') {
        const responseObj = response as ArticleListResponse;

        if (Array.isArray(responseObj.data)) {
          articleList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          articleList = responseObj.Array;
        }

        // 서버에서 받은 전체 개수 사용
        total =
          Number(responseObj.recordsTotal) ||
          Number(responseObj.recordsFiltered) ||
          articleList.length;
      }

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setArticles(articleList);
      setTotalElements(total);
      setTotalPages(Math.ceil(total / pageSize) || 1);
    } catch (err) {
      console.error('게시글 목록 조회 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error('❌ 401 Unauthorized - 인증 실패');
          TokenUtils.debugToken();
          setError('인증에 실패했습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setError(err.message);
        }
      } else {
        setError('게시글 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize, bbsId]); // searchCondition, searchKeyword, filters를 dependency에서 제거

  // fetchArticles의 최신 함수를 참조하기 위한 ref 추가
  const fetchArticlesRef = useRef(fetchArticles);

  // fetchArticles가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchArticlesRef.current = fetchArticles;
  }, [fetchArticles]);

  // 초기 로드
  useEffect(() => {
    if (bbsId) {
      fetchArticles();
    }
  }, [bbsId, fetchArticles]);

  // 페이지 변경 시 API 재호출
  useEffect(() => {
    if (!isInitialLoad && bbsId) {
      fetchArticles();
    }
  }, [currentPage, fetchArticles, isInitialLoad, bbsId]);

  // 조회 조건 변경 시 자동 조회 제거 - 조회 버튼 클릭 또는 Enter 입력 시에만 조회

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 URL 업데이트
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', page.toString());
    router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
  };

  const handleDeleteClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedArticleId) {
      setShowDeleteDialog(false);
      return;
    }

    if (!bbsId) {
      setMessageDialogTitle('삭제 실패');
      setMessageDialogMessage('게시판 ID가 없습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      setShowDeleteDialog(false);
      setSelectedArticleId(null);
      return;
    }

    try {
      setDeleteLoading(true);
      setError('');

      // sessionStorage에서 user 객체를 가져와서 uniqId 추출
      const userStr = sessionStorage.getItem('user');
      let uniqId = '';

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || '';
        } catch (error) {
          console.error('user 객체 파싱 오류:', error);
        }
      }

      const deleteParams: ArticleDeleteParams = {
        nttId: selectedArticleId,
        bbsId: bbsId,
        uniqId: uniqId,
      };

      const response = await ArticleService.deleteArticle(deleteParams);

      if (response.result === '00') {
        // 삭제 성공
        setMessageDialogTitle('삭제 완료');
        setMessageDialogMessage('게시글이 정상적으로 삭제되었습니다.');
        setMessageDialogType('success');
        setShowMessageDialog(true);
        setShowDeleteDialog(false);
        setSelectedArticleId(null);
        // 목록 다시 불러오기
        await fetchArticlesRef.current();
      } else {
        // 삭제 실패 (API 응답이 "01"인 경우)
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage(
          response.message || '게시글 삭제 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setShowDeleteDialog(false);
        setSelectedArticleId(null);
      }
    } catch (err) {
      console.error('게시글 삭제 오류:', err);

      // API 통신 에러는 ConfirmDialog로 표시
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('인증 실패');
          setMessageDialogMessage(
            '인증이 만료되었습니다. 다시 로그인해주세요.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('삭제 실패');
          setMessageDialogMessage(
            err.message || '게시글 삭제 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage(
          '게시글 삭제 중 알 수 없는 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
      setShowDeleteDialog(false);
      setSelectedArticleId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    setMessageDialogTitle('');
    setMessageDialogMessage('');
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedArticleId(null);
  };

  // 조회 버튼 핸들러
  const handleSearch = () => {
    setCurrentPage(1); // 조회 시 첫 페이지로 이동
    const params = new URLSearchParams();
    if (bbsId) params.set('bbsId', bbsId);
    if (bbsNm) params.set('bbsNm', bbsNm);
    params.set('searchCondition', searchConditionRef.current || '1');
    const kw = (searchKeywordRef.current || '').trim();
    if (kw) params.set('searchKeyword', kw);
    params.set('page', '1');
    router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
    fetchArticles();
  };

  // 상세 페이지로 이동
  const handleDetailClick = (articleId: string) => {
    const params = new URLSearchParams({
      articleId: articleId,
      bbsId: bbsId,
      bbsNm: bbsNm || '',
      searchCondition: searchCondition || '1',
      searchKeyword: searchKeyword || '',
      page: currentPage.toString(),
    });
    // TODO: 게시글 상세 페이지 경로로 수정
    router.push(`/adminWeb/board/list/article/detail?${params.toString()}`);
  };

  // 목록으로 돌아가기 (상세 페이지에서 사용)
  const handleList = () => {
    const params = new URLSearchParams();
    if (bbsId) params.set('bbsId', bbsId);
    if (bbsNm) params.set('bbsNm', bbsNm);
    if (searchCondition) params.set('searchCondition', searchCondition);
    if (searchKeyword) params.set('searchKeyword', searchKeyword);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    router.push(
      queryString
        ? `/adminWeb/board/list/article/list?${queryString}`
        : '/adminWeb/board/list/article/list',
    );
  };

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      setLoading(true);
      setError('');

      console.group('📥 엑셀 다운로드 시작');

      // 토큰 검증
      if (!TokenUtils.isTokenValid()) {
        console.error('토큰이 유효하지 않습니다.');
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      if (!bbsId) {
        setError('게시판 ID가 필요합니다.');
        console.warn('⚠️ 게시판 ID가 없습니다.');
        return;
      }

      // 엑셀 다운로드용 API 파라미터 (페이지네이션 제외)
      const params = {
        searchCondition: searchCondition,
        searchKeyword: searchKeyword,
        bbsId: bbsId,
      };

      console.log('📤 엑셀 다운로드 요청:', params);

      // 엑셀 데이터 조회
      const response = await ArticleService.getArticleExcel(params);

      console.log('📥 엑셀 다운로드 응답:', response);

      // API 응답 구조에 맞게 데이터 추출
      let articleList: Article[] = [];

      if (Array.isArray(response)) {
        articleList = response;
      } else if (response && typeof response === 'object') {
        const responseObj = response as ArticleListResponse;

        // 결과 확인
        if (responseObj.result === '01') {
          throw new Error('엑셀 다운로드에 실패했습니다.');
        }

        if (Array.isArray(responseObj.data)) {
          articleList = responseObj.data;
        } else if (Array.isArray(responseObj.Array)) {
          articleList = responseObj.Array;
        }
      }

      if (articleList.length === 0) {
        setError('다운로드할 데이터가 없습니다.');
        console.warn('⚠️ 다운로드할 데이터가 없습니다.');
        return;
      }

      // 엑셀 파일 다운로드 (아카이브는 메타 컬럼 포함)
      await downloadArticlesExcel(articleList, '게시글목록'); // bbsSe

      console.log(`✅ 엑셀 다운로드 완료: ${articleList.length}건`);
      console.groupEnd();
    } catch (err) {
      console.error('❌ 엑셀 다운로드 실패:', err);
      console.groupEnd();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error('❌ 401 Unauthorized - 인증 실패');
          TokenUtils.debugToken();
          setError('인증에 실패했습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setError(err.message || '엑셀 다운로드 중 오류가 발생했습니다.');
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : '엑셀 다운로드 중 오류가 발생했습니다.',
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
    articles,
    totalElements,
    totalPages,
    error,
    tableRef,
    pageSize,
    bbsId,
    bbsNm,
    bbsSe,
    replyYn,
    searchCondition,
    searchKeyword,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    setCurrentPage,
    setShowDeleteDialog,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    handleDetailClick,
    handleList,
    handleExcelDownload,
    handleMessageDialogClose,
    setSearchCondition,
    setSearchKeyword,
  };
}
