'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCmmCodeList } from '../model';
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from '@/shared/ui/adminWeb';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalFormField,
} from '@/shared/ui/adminWeb/form';
import type { SelectOption } from '@/shared/ui/adminWeb/form';
import {
  CmmCodeService,
  CmmDetailCode,
  CmmDetailCodeListParams,
  ClCode,
  ClCodeListResponse,
  InsertCmmCodeParams,
  CmmCode,
  CmmCodeDetailParams,
  UpdateCmmCodeParams,
  DeleteCmmCodeParams,
  CodeIdListParams,
  CodeId,
  InsertCmmDetailCodeParams,
  CmmDetailCodeDetailParams,
  UpdateCmmDetailCodeParams,
  DeleteCmmDetailCodeParams,
  CmmDetailCodeListResponse,
} from '@/entities/adminWeb/code/api';
import { downloadCmmDetailCodesExcel } from '@/entities/adminWeb/code/lib';
import { ApiError, TokenUtils } from '@/shared/lib';
import '@/shared/styles/admin/search-form.css';
import '@/shared/styles/admin/mobile-table.css';
import '@/shared/styles/admin/table-filter.css';
import '@/shared/styles/admin/dialog.css';
import '@/shared/styles/admin/register-form.css';

export const CmmCodeManagePageView: React.FC = () => {
  const {
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
  } = useCmmCodeList();

  // 소분류코드관리 상태
  const [detailCodeId, setDetailCodeId] = useState<string>('');
  const [detailCodeNm, setDetailCodeNm] = useState<string>('');
  const [selectedCmmCode, setSelectedCmmCode] = useState<CmmCode | null>(null); // 선택된 대분류코드 정보
  const [detailSearchUseAt, setDetailSearchUseAt] = useState<string>('Y'); // 기본값: 사용
  const [detailShowSearchForm, setDetailShowSearchForm] = useState(false);
  const [detailShowFilters, setDetailShowFilters] = useState(false);
  const [detailCodeList, setDetailCodeList] = useState<CmmDetailCode[]>([]); // 서버에서 받은 현재 페이지 데이터
  const [detailTotalElements, setDetailTotalElements] = useState(0);
  const [detailTotalPages, setDetailTotalPages] = useState(0);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [detailIsInitialLoad, setDetailIsInitialLoad] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>('');
  const detailPageSize = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 15;

  // 소분류코드 테이블 필터 상태
  const [detailFilters, setDetailFilters] = useState({
    code: '',
    codeNm: '',
    orderBy: '',
    useAt: '',
  });

  // 소분류코드 filters의 최신 값을 참조하기 위한 ref 추가
  const detailFiltersRef = useRef(detailFilters);

  // detailFilters가 변경될 때마다 ref 업데이트
  useEffect(() => {
    detailFiltersRef.current = detailFilters;
  }, [detailFilters]);

  // 소분류코드 조회 조건의 최신 값을 참조하기 위한 ref 추가
  const detailSearchUseAtRef = useRef(detailSearchUseAt);

  // detailSearchUseAt이 변경될 때마다 ref 업데이트
  useEffect(() => {
    detailSearchUseAtRef.current = detailSearchUseAt;
  }, [detailSearchUseAt]);

  // 대분류코드 등록 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [clCodeList, setClCodeList] = useState<ClCode[]>([]);
  const [clCodeDetailList, setClCodeDetailList] = useState<ClCode[]>([]); // 소분류코드 등록용
  const [registerForm, setRegisterForm] = useState({
    clCode: '', // 분류코드명 선택값
    codeId: '', // 코드ID (readonly)
    codeIdInput: '', // 코드ID 입력
    codeIdNm: '', // 코드ID명
    codeIdDc: '', // 코드ID설명
    useAt: 'Y', // 사용여부
  });
  const [registerErrors, setRegisterErrors] = useState({
    clCode: '',
    codeIdInput: '',
    codeIdNm: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // 메시지 다이얼로그 상태
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');

  // 대분류코드 상세 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailForm, setDetailForm] = useState({
    clCode: '', // 분류코드명 선택값
    codeId: '', // 코드ID (readonly)
    codeIdInput: '', // 코드ID 입력 (readonly)
    codeIdNm: '', // 코드ID명
    codeIdDc: '', // 코드ID설명
    useAt: 'Y', // 사용여부
  });
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [detailUpdateLoading, setDetailUpdateLoading] = useState(false);
  const [detailErrors, setDetailErrors] = useState({
    codeIdNm: '',
  });

  // 삭제 확인 다이얼로그 상태
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetCode, setDeleteTargetCode] = useState<CmmCode | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 소분류코드 등록 모달 상태
  const [showDetailCodeRegisterModal, setShowDetailCodeRegisterModal] =
    useState(false);
  const [detailCodeRegisterForm, setDetailCodeRegisterForm] = useState({
    clCode: '', // 첫 번째 SELECT (분류코드)
    codeId: '', // 두 번째 SELECT (코드ID)
    code: '', // 상세코드
    codeNm: '', // 상세코드명
    codeDc: '', // 상세코드설명
    orderBy: 0, // 순서
    useAt: 'Y', // 사용여부
  });
  const [codeIdList, setCodeIdList] = useState<CodeId[]>([]); // 두 번째 SELECT 옵션 목록
  const [detailCodeRegisterLoading, setDetailCodeRegisterLoading] =
    useState(false);
  const [detailCodeRegisterErrors, setDetailCodeRegisterErrors] = useState({
    codeId: '',
    code: '',
    codeNm: '',
  });
  const [isCodeIdLocked, setIsCodeIdLocked] = useState(false); // 코드ID가 잠겨있는지 여부

  // 소분류코드 상세 모달 상태
  const [showDetailCodeDetailModal, setShowDetailCodeDetailModal] =
    useState(false);
  const [detailCodeDetailForm, setDetailCodeDetailForm] = useState({
    codeId: '', // 코드ID (readonly)
    code: '', // 상세코드 (readonly)
    codeNm: '', // 상세코드명
    codeDc: '', // 상세코드설명
    orderBy: 0, // 순서
    useAt: 'Y', // 사용여부
  });
  const [detailCodeDetailLoading, setDetailCodeDetailLoading] = useState(false);
  const [detailCodeDetailUpdateLoading, setDetailCodeDetailUpdateLoading] =
    useState(false);
  const [detailCodeDetailErrors, setDetailCodeDetailErrors] = useState({
    codeNm: '',
  });

  // 소분류코드 삭제 확인 다이얼로그 상태
  const [showDetailDeleteConfirmDialog, setShowDetailDeleteConfirmDialog] =
    useState(false);
  const [detailDeleteTargetCode, setDetailDeleteTargetCode] =
    useState<CmmDetailCode | null>(null);
  const [detailDeleteLoading, setDetailDeleteLoading] = useState(false);

  // 소분류코드 목록 조회 (서버 사이드 페이징)
  const fetchDetailCodeList = useCallback(async () => {
    if (!detailCodeId) {
      setDetailCodeList([]);
      setDetailTotalElements(0);
      setDetailTotalPages(0);
      return;
    }

    try {
      setDetailLoading(true);
      setDetailError('');

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        console.error('토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
        setDetailError('로그인이 필요합니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      // 서버 사이드 페이징: 실제 페이지와 사이즈를 계산하여 전달
      const startIndex = (detailCurrentPage - 1) * detailPageSize;
      // detailFiltersRef.current를 사용하여 최신 필터 값 참조
      const currentDetailFilters = detailFiltersRef.current;
      // 조회 조건 ref를 사용하여 최신 값 참조
      const params: CmmDetailCodeListParams = {
        searchCondition: detailCodeId || undefined,
        searchUseAt: detailSearchUseAtRef.current || undefined,
        length: detailPageSize.toString(), // 페이지 사이즈
        start: startIndex.toString(), // 시작 인덱스 (0부터 시작)
        // 테이블 필터 파라미터 추가
        filterCode: currentDetailFilters.code || undefined,
        filterCodeNm: currentDetailFilters.codeNm || undefined,
        filterOrderBy: currentDetailFilters.orderBy || undefined,
        filterUseAt: currentDetailFilters.useAt || undefined,
      };

      console.log('📤 소분류코드 목록 조회 요청 파라미터:', params);

      const response = await CmmCodeService.getCmmDetailCodeList(params);

      console.log('🔍 소분류코드 목록 조회 응답:', response);

      // API 응답 구조에 맞게 데이터 추출
      let list: CmmDetailCode[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        list = response.map((item: any) => ({
          rnum: item.RNUM || item.rnum || 0,
          code: item.CODE || item.code || '',
          codeNm: item.CODE_NM || item.codeNm || '',
          orderBy:
            item.orderBy !== undefined && item.orderBy !== null
              ? item.orderBy
              : item.ORDER_BY !== undefined && item.ORDER_BY !== null
                ? item.ORDER_BY
                : item.ORDERBY !== undefined && item.ORDERBY !== null
                  ? item.ORDERBY
                  : '',
          useAt: item.USE_AT || item.useAt || '',
          codeId: detailCodeId, // 코드ID 추가
          ...item,
        }));
        total = response.length;
      } else if (response && typeof response === 'object') {
        let rawList: any[] = [];
        if (Array.isArray(response.data)) {
          rawList = response.data;
        } else if (Array.isArray(response.Array)) {
          rawList = response.Array;
        } else if (Array.isArray(response.list)) {
          rawList = response.list;
        } else if (Array.isArray(response.content)) {
          rawList = response.content;
        }

        // 백엔드에서 오는 대문자 키를 카멜케이스로 변환
        list = rawList.map((item: any) => ({
          rnum: item.RNUM || item.rnum || 0,
          code: item.CODE || item.code || '',
          codeNm: item.CODE_NM || item.codeNm || '',
          orderBy:
            item.orderBy !== undefined && item.orderBy !== null
              ? item.orderBy
              : item.ORDER_BY !== undefined && item.ORDER_BY !== null
                ? item.ORDER_BY
                : item.ORDERBY !== undefined && item.ORDERBY !== null
                  ? item.ORDERBY
                  : '',
          useAt: item.USE_AT || item.useAt || '',
          codeId: detailCodeId, // 코드ID 추가
          ...item,
        }));

        // 서버에서 받은 전체 개수 사용
        total =
          Number(response.recordsTotal) ||
          Number(response.recordsFiltered) ||
          list.length;
      }

      console.log('📋 추출된 소분류코드 목록:', list);
      console.log('📊 총 개수:', total);

      // 서버에서 받은 데이터를 그대로 사용 (클라이언트 사이드 필터링 제거)
      setDetailCodeList(list);
      setDetailTotalElements(total);
      setDetailTotalPages(Math.ceil(total / detailPageSize) || 1);
    } catch (err) {
      console.error('소분류코드 목록 조회 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error('❌ 401 Unauthorized - 인증 실패');
          TokenUtils.debugToken();
          setDetailError('인증에 실패했습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setDetailError(err.message);
        }
      } else {
        setDetailError('소분류코드 목록을 불러오는 중 오류가 발생했습니다.');
      }
      setDetailCodeList([]);
    } finally {
      setDetailLoading(false);
      setDetailIsInitialLoad(false);
    }
  }, [detailCodeId, detailCurrentPage, detailPageSize]); // detailSearchUseAt, detailFilters를 dependency에서 제거

  // fetchDetailCodeList의 최신 함수를 참조하기 위한 ref 추가
  const fetchDetailCodeListRef = useRef(fetchDetailCodeList);

  // fetchDetailCodeList가 변경될 때마다 ref 업데이트
  useEffect(() => {
    fetchDetailCodeListRef.current = fetchDetailCodeList;
  }, [fetchDetailCodeList]);

  // 공통코드 행 클릭 핸들러
  const handleCmmCodeRowClick = (item: any) => {
    const codeId = item.codeId || '';
    const codeIdNm = item.codeIdNm || '';
    setDetailCodeId(codeId);
    setDetailCodeNm(codeIdNm);
    setSelectedCmmCode(item); // 선택된 대분류코드 정보 저장
  };

  // 소분류코드 조회 버튼 핸들러
  const handleDetailCodeSearch = () => {
    if (!detailCodeId) return;

    // 페이지가 바뀌면 page effect에서 1회 호출되므로 직접 호출하지 않음
    if (detailCurrentPage !== 1) {
      setDetailCurrentPage(1);
      return;
    }

    fetchDetailCodeListRef.current(); // 현재 페이지가 1이면 즉시 1회 호출
  };

  // 소분류코드 페이지 변경 핸들러
  const handleDetailPageChange = (page: number) => {
    setDetailCurrentPage(page);
  };

  // 소분류코드 엑셀 다운로드 핸들러
  const handleDetailExcelDownload = async () => {
    if (!detailCodeId) {
      setDetailError('대분류코드를 먼저 선택해주세요.');
      return;
    }

    try {
      setDetailLoading(true);
      setDetailError('');

      console.group('📥 소분류코드 엑셀 다운로드 시작');

      // 토큰 검증
      if (!TokenUtils.isTokenValid()) {
        setDetailError('로그인이 필요합니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      // 엑셀 다운로드용 API 파라미터 (페이지네이션 제외, 필터 포함)
      const params = {
        searchCondition: detailCodeId || undefined,
        searchUseAt: detailSearchUseAt || undefined,
        // 테이블 필터 파라미터 추가
        filterCode: detailFilters.code || undefined,
        filterCodeNm: detailFilters.codeNm || undefined,
        filterOrderBy: detailFilters.orderBy || undefined,
        filterUseAt: detailFilters.useAt || undefined,
      };

      console.log('📤 소분류코드 엑셀 다운로드 요청:', params);

      // 엑셀 데이터 조회
      const response = await CmmCodeService.getCmmDetailCodesExcel(params);

      console.log('📥 소분류코드 엑셀 다운로드 응답:', response);

      // API 응답 구조에 맞게 데이터 추출
      let codeList: CmmDetailCode[] = [];

      if (Array.isArray(response)) {
        codeList = response.map((item: any) => ({
          rnum: item.RNUM || item.rnum || 0,
          code: item.CODE || item.code || '',
          codeNm: item.CODE_NM || item.codeNm || '',
          orderBy:
            item.orderBy !== undefined && item.orderBy !== null
              ? item.orderBy
              : item.ORDER_BY !== undefined && item.ORDER_BY !== null
                ? item.ORDER_BY
                : item.ORDERBY !== undefined && item.ORDERBY !== null
                  ? item.ORDERBY
                  : '',
          useAt: item.USE_AT || item.useAt || '',
          codeId: detailCodeId,
          ...item,
        }));
      } else if (response && typeof response === 'object') {
        const responseObj = response as CmmDetailCodeListResponse;

        // 결과 확인
        if (responseObj.resultCode === '01') {
          throw new Error('엑셀 다운로드에 실패했습니다.');
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
          code: item.CODE || item.code || '',
          codeNm: item.CODE_NM || item.codeNm || '',
          orderBy:
            item.orderBy !== undefined && item.orderBy !== null
              ? item.orderBy
              : item.ORDER_BY !== undefined && item.ORDER_BY !== null
                ? item.ORDER_BY
                : item.ORDERBY !== undefined && item.ORDERBY !== null
                  ? item.ORDERBY
                  : '',
          useAt: item.USE_AT || item.useAt || '',
          codeId: detailCodeId,
          ...item,
        }));
      }

      // 데이터 검증
      if (codeList.length === 0) {
        setDetailError('다운로드할 데이터가 없습니다.');
        return;
      }

      // 엑셀 파일 다운로드
      await downloadCmmDetailCodesExcel(codeList, '소분류코드목록');
      console.log(`✅ 소분류코드 엑셀 다운로드 완료: ${codeList.length}건`);
      console.groupEnd();
    } catch (err) {
      console.error('❌ 소분류코드 엑셀 다운로드 실패:', err);
      console.groupEnd();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setDetailError('인증에 실패했습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setDetailError(
            err.message || '엑셀 다운로드 중 오류가 발생했습니다.',
          );
        }
      } else {
        setDetailError(
          err instanceof Error
            ? err.message
            : '엑셀 다운로드 중 오류가 발생했습니다.',
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // detailCodeId가 변경되면 조회 조건만 리셋 (실제 조회는 page effect에서 1회 수행)
  useEffect(() => {
    if (detailCodeId) {
      console.log('🔄 detailCodeId 변경됨, 자동 조회 시작:', detailCodeId);
      setDetailCurrentPage(1);
      setDetailIsInitialLoad(false);
    } else {
      setDetailCodeList([]);
      setDetailTotalElements(0);
      setDetailTotalPages(0);
      setDetailIsInitialLoad(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailCodeId]);

  // 소분류코드 페이지 변경/대분류코드 변경 시 API 재호출 (단일 트리거)
  useEffect(() => {
    if (detailCodeId) {
      fetchDetailCodeList();
    }
  }, [detailCurrentPage, fetchDetailCodeList, detailCodeId]);

  // 소분류코드 필터 변경 시 Debounce 800ms 적용하여 첫 페이지로 이동하고 API 호출
  useEffect(() => {
    if (!detailCodeId) return;

    const timer = setTimeout(() => {
      // 필터 변경 시 첫 페이지로 이동하고 API 호출
      // 페이지가 바뀌면 page effect에서 1회 호출되므로 직접 호출하지 않음
      if (detailCurrentPage !== 1) {
        setDetailCurrentPage(1);
        return;
      }

      // 현재 페이지가 1이면 즉시 1회 호출
      fetchDetailCodeListRef.current();
    }, 800); // 800ms Debounce

    return () => clearTimeout(timer);
  }, [
    detailFilters.code,
    detailFilters.codeNm,
    detailFilters.orderBy,
    detailFilters.useAt,
    detailCodeId,
    detailCurrentPage,
  ]); // fetchDetailCodeList를 dependency에서 제거

  // 소분류코드 필터 초기화 핸들러
  const handleClearDetailFilters = () => {
    setDetailFilters({
      code: '',
      codeNm: '',
      orderBy: '',
      useAt: '',
    });
  };

  // 공통분류코드 목록 조회
  const fetchClCodeList = async () => {
    try {
      const response = await CmmCodeService.getClCodeList();
      console.log('🔍 공통분류코드 목록 조회 응답:', response);

      let list: ClCode[] = [];
      if (Array.isArray(response)) {
        list = response.map((item: any) => ({
          clCode: item.CL_CODE || item.clCode || '',
          clCodeNm: item.CL_CODE_NM || item.clCodeNm || '',
          ...item,
        }));
      } else if (response && typeof response === 'object') {
        let rawList: any[] = [];
        if (Array.isArray(response.codeList)) {
          rawList = response.codeList;
        } else if (Array.isArray(response.data)) {
          rawList = response.data;
        } else if (Array.isArray(response.Array)) {
          rawList = response.Array;
        } else if (Array.isArray(response.list)) {
          rawList = response.list;
        } else if (Array.isArray(response.content)) {
          rawList = response.content;
        }

        list = rawList.map((item: any) => ({
          clCode: item.CL_CODE || item.clCode || '',
          clCodeNm: item.CL_CODE_NM || item.clCodeNm || '',
          ...item,
        }));
      }

      console.log('📋 추출된 공통분류코드 목록:', list);
      setClCodeList(list);
    } catch (err) {
      console.error('공통분류코드 목록 조회 실패:', err);
      setClCodeList([]);
    }
  };

  // 등록 모달 열기
  const handleOpenRegisterModal = () => {
    setShowRegisterModal(true);
    setRegisterForm({
      clCode: '',
      codeId: '',
      codeIdInput: '',
      codeIdNm: '',
      codeIdDc: '',
      useAt: 'Y',
    });
    fetchClCodeList();
  };

  // 등록 모달 닫기
  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterForm({
      clCode: '',
      codeId: '',
      codeIdInput: '',
      codeIdNm: '',
      codeIdDc: '',
      useAt: 'Y',
    });
    setRegisterErrors({
      clCode: '',
      codeIdInput: '',
      codeIdNm: '',
    });
  };

  // 분류코드명 선택 핸들러
  const handleClCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedClCode = e.target.value;
    setRegisterForm({
      ...registerForm,
      clCode: selectedClCode,
      codeId: selectedClCode, // readonly text에 선택한 값 설정
    });
  };

  // 코드ID 입력 핸들러 (3자리 숫자만)
  const handleCodeIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3); // 숫자만, 최대 3자리
    setRegisterForm({
      ...registerForm,
      codeIdInput: value,
    });
  };

  // 폼 입력 핸들러
  const handleRegisterFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setRegisterForm({
      ...registerForm,
      [name]: value,
    });
  };

  // 유효성 검사
  const validateRegisterForm = (): boolean => {
    const errors = {
      clCode: '',
      codeIdInput: '',
      codeIdNm: '',
    };

    let isValid = true;

    // 분류코드명 검사
    if (!registerForm.clCode || registerForm.clCode.trim() === '') {
      errors.clCode = '분류코드를 선택하세요';
      isValid = false;
    }

    // 코드ID 검사
    if (!registerForm.codeIdInput || registerForm.codeIdInput.trim() === '') {
      errors.codeIdInput = '코드ID를 입력하세요';
      isValid = false;
    }

    // 코드ID명 검사
    if (!registerForm.codeIdNm || registerForm.codeIdNm.trim() === '') {
      errors.codeIdNm = '코드ID명을 입력하세요';
      isValid = false;
    }

    setRegisterErrors(errors);
    return isValid;
  };

  // 저장 핸들러
  const handleSaveRegister = async () => {
    // 유효성 검사
    if (!validateRegisterForm()) {
      return;
    }

    try {
      setRegisterLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: InsertCmmCodeParams = {
        clCode: registerForm.clCode,
        codeIdNum: registerForm.codeIdInput,
        codeIdNm: registerForm.codeIdNm,
        codeIdDc: registerForm.codeIdDc || '',
        useAt: registerForm.useAt,
      };

      console.log('📤 대분류코드 등록 요청 파라미터:', params);

      const response = await CmmCodeService.insertCmmCode(params);

      console.log('🔍 대분류코드 등록 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 모달 닫기 및 폼 초기화
        handleCloseRegisterModal();

        // 목록 새로고침
        handleSearch();
      } else if (response.result === '50') {
        // 중복 에러
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message ||
            '중복되는 대분류 코드가 있습니다. 다른 코드ID로 입력하세요',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      } else {
        // 기타 에러
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('대분류코드 등록 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('등록 실패');
          setMessageDialogMessage(
            err.message || '등록 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage('대분류코드 등록 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // 메시지 다이얼로그 닫기
  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
  };

  // 대분류코드 상세 조회
  const fetchCmmCodeDetail = async (codeId: string) => {
    try {
      setDetailModalLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: CmmCodeDetailParams = {
        codeId: codeId,
      };

      console.log('📤 대분류코드 상세 조회 요청 파라미터:', params);

      const response = await CmmCodeService.getCmmCodeDetail(params);

      console.log('🔍 대분류코드 상세 조회 응답:', response);

      if (response.result === '00' && response.data) {
        const data = response.data as any;
        const codeIdValue = data.CODE_ID || data.codeId || '';
        const clCodeValue = data.CL_CODE || data.clCode || '';

        // 코드ID에서 분류코드와 입력값 분리
        // 예: "COM001" -> clCode: "COM", codeIdInput: "001"
        let codeIdInputValue = '';

        if (codeIdValue && clCodeValue) {
          // 코드ID에서 분류코드를 제거한 나머지가 입력값
          codeIdInputValue = codeIdValue.replace(clCodeValue, '');
        }

        setDetailForm({
          clCode: clCodeValue,
          codeId: codeIdValue,
          codeIdInput: codeIdInputValue,
          codeIdNm: data.CODE_ID_NM || data.codeIdNm || '',
          codeIdDc: data.CODE_ID_DC || data.codeIdDc || '',
          useAt: data.USE_AT || data.useAt || 'Y',
        });
      } else {
        setMessageDialogTitle('오류');
        setMessageDialogMessage(
          response.resultMessage ||
            '대분류코드 상세 정보를 불러오는 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('대분류코드 상세 조회 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('오류');
          setMessageDialogMessage(
            err.message || '대분류코드 상세 조회 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('대분류코드 상세 조회 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailModalLoading(false);
    }
  };

  // 상세 모달 열기
  const handleOpenDetailModal = async (item: CmmCode) => {
    const codeId = item.codeId || '';
    if (!codeId) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('코드ID가 없습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    setShowDetailModal(true);
    setDetailForm({
      clCode: '',
      codeId: '',
      codeIdInput: '',
      codeIdNm: '',
      codeIdDc: '',
      useAt: 'Y',
    });

    // 분류코드 목록 먼저 로드
    await fetchClCodeList();
    // 상세 데이터 로드
    await fetchCmmCodeDetail(codeId);
  };

  // 상세 모달 닫기
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailForm({
      clCode: '',
      codeId: '',
      codeIdInput: '',
      codeIdNm: '',
      codeIdDc: '',
      useAt: 'Y',
    });
    setDetailErrors({
      codeIdNm: '',
    });
  };

  // 상세 수정 저장 핸들러
  const handleSaveDetailUpdate = async () => {
    // 유효성 검사
    const errors = {
      codeIdNm: '',
    };

    let hasError = false;

    if (!detailForm.codeIdNm || detailForm.codeIdNm.trim() === '') {
      errors.codeIdNm = '코드ID명을 입력하세요';
      hasError = true;
    }

    setDetailErrors(errors);

    if (hasError) {
      return;
    }

    try {
      setDetailUpdateLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      // 컨트롤러가 clCode와 codeIdNum을 받으므로 분리해서 전송
      const params: any = {
        clCode: detailForm.clCode,
        codeIdNum: detailForm.codeIdInput,
        codeId: detailForm.codeId,
        codeIdNm: detailForm.codeIdNm.trim(),
        codeIdDc: detailForm.codeIdDc || '',
        useAt: detailForm.useAt,
      };

      console.log('📤 대분류코드 수정 요청 파라미터:', params);

      const response = await CmmCodeService.updateCmmCode(params);

      console.log('🔍 대분류코드 수정 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('수정 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 수정되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 목록 새로고침
        handleSearch();
      } else {
        // 실패
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '수정 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('대분류코드 수정 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('수정 실패');
          setMessageDialogMessage(
            err.message || '수정 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage('대분류코드 수정 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailUpdateLoading(false);
    }
  };

  // 상세 폼 입력 핸들러
  const handleDetailFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setDetailForm({
      ...detailForm,
      [name]: value,
    });
    // 에러 메시지 초기화
    if (name === 'codeIdNm' && detailErrors.codeIdNm) {
      setDetailErrors({
        ...detailErrors,
        codeIdNm: '',
      });
    }
  };

  // 소분류코드 등록 모달 열기
  const handleOpenDetailCodeRegisterModal = async () => {
    setShowDetailCodeRegisterModal(true);

    // 대분류코드가 선택되어 있는지 확인
    const hasSelectedCodeId = detailCodeId && detailCodeId.trim() !== '';

    if (hasSelectedCodeId) {
      // 대분류코드가 선택된 경우: 코드ID를 자동으로 설정하고 잠금
      setIsCodeIdLocked(true);

      // 선택된 대분류코드 정보에서 분류코드 추출
      let extractedClCode = '';
      if (selectedCmmCode && selectedCmmCode.clCode) {
        extractedClCode = selectedCmmCode.clCode;
      } else {
        // 선택된 대분류코드 정보가 없으면 코드ID에서 분류코드 추출 시도
        // 코드ID는 보통 분류코드 + 번호 형태이므로, 앞부분을 분류코드로 추정
        if (detailCodeId.length >= 3) {
          extractedClCode = detailCodeId.substring(0, 3);
        }
      }

      setDetailCodeRegisterForm({
        clCode: extractedClCode,
        codeId: detailCodeId,
        code: '',
        codeNm: '',
        codeDc: '',
        orderBy: 0,
        useAt: 'Y',
      });

      // 분류코드가 있으면 코드ID 목록 로드
      if (extractedClCode) {
        try {
          TokenUtils.debugToken();

          if (TokenUtils.isTokenValid()) {
            const params: CodeIdListParams = {
              clCode: extractedClCode,
            };

            const response = await CmmCodeService.getCodeIdList(params);

            let list: CodeId[] = [];
            let rawList: any[] = [];

            if (response.data) {
              if (Array.isArray(response.data)) {
                rawList = response.data;
              } else if (Array.isArray(response.Array)) {
                rawList = response.Array;
              } else if (Array.isArray(response.list)) {
                rawList = response.list;
              }

              list = rawList.map((item: any) => ({
                codeId: item.CODE_ID || item.codeId || '',
                codeIdNm: item.CODE_ID_NM || item.codeIdNm || '',
                ...item,
              }));
            }

            setCodeIdList(list);
          }
        } catch (err) {
          console.error('코드ID 목록 조회 실패:', err);
          setCodeIdList([]);
        }
      }
    } else {
      // 대분류코드가 선택되지 않은 경우: 사용자가 선택할 수 있도록 함
      setIsCodeIdLocked(false);
      setDetailCodeRegisterForm({
        clCode: '',
        codeId: '',
        code: '',
        codeNm: '',
        codeDc: '',
        orderBy: 0,
        useAt: 'Y',
      });
      setCodeIdList([]);
    }

    // 공통분류코드 상세 목록 로드 (codeDetailList)
    try {
      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const response = await CmmCodeService.getClCodeList();

      console.log('🔍 공통분류코드 목록 조회 응답:', response);

      let detailList: ClCode[] = [];
      let rawDetailList: any[] = [];

      if (response.codeDetailList) {
        if (Array.isArray(response.codeDetailList)) {
          rawDetailList = response.codeDetailList;
        }

        detailList = rawDetailList.map((item: any) => ({
          clCode: item.CL_CODE || item.clCode || '',
          clCodeNm: item.CL_CODE_NM || item.clCodeNm || '',
          ...item,
        }));
      }

      console.log('📋 추출된 공통분류코드 상세 목록:', detailList);
      setClCodeDetailList(detailList);
    } catch (err) {
      console.error('공통분류코드 상세 목록 조회 실패:', err);
      setClCodeDetailList([]);
    }
  };

  // 소분류코드 등록 모달 닫기
  const handleCloseDetailCodeRegisterModal = () => {
    setShowDetailCodeRegisterModal(false);
    setDetailCodeRegisterForm({
      clCode: '',
      codeId: '',
      code: '',
      codeNm: '',
      codeDc: '',
      orderBy: 0,
      useAt: 'Y',
    });
    setCodeIdList([]);
    setDetailCodeRegisterErrors({
      codeId: '',
      code: '',
      codeNm: '',
    });
    setIsCodeIdLocked(false);
  };

  // 첫 번째 SELECT (분류코드) 변경 핸들러
  const handleDetailCodeRegisterClCodeChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedClCode = e.target.value;
    setDetailCodeRegisterForm({
      ...detailCodeRegisterForm,
      clCode: selectedClCode,
      codeId: '', // 두 번째 SELECT 초기화
    });
    setCodeIdList([]); // 코드ID 목록 초기화
    // 코드ID 에러 메시지 초기화
    if (detailCodeRegisterErrors.codeId) {
      setDetailCodeRegisterErrors({
        ...detailCodeRegisterErrors,
        codeId: '',
      });
    }

    if (selectedClCode) {
      try {
        TokenUtils.debugToken();

        if (!TokenUtils.isTokenValid()) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
          return;
        }

        const params: CodeIdListParams = {
          clCode: selectedClCode,
        };

        console.log('📤 코드ID 목록 조회 요청 파라미터:', params);

        const response = await CmmCodeService.getCodeIdList(params);

        console.log('🔍 코드ID 목록 조회 응답:', response);

        let list: CodeId[] = [];
        let rawList: any[] = [];

        if (response.data) {
          if (Array.isArray(response.data)) {
            rawList = response.data;
          } else if (Array.isArray(response.Array)) {
            rawList = response.Array;
          } else if (Array.isArray(response.list)) {
            rawList = response.list;
          }

          list = rawList.map((item: any) => ({
            codeId: item.CODE_ID || item.codeId || '',
            codeIdNm: item.CODE_ID_NM || item.codeIdNm || '',
            ...item,
          }));
        }

        console.log('📋 추출된 코드ID 목록:', list);
        setCodeIdList(list);
      } catch (err) {
        console.error('코드ID 목록 조회 실패:', err);
        setCodeIdList([]);
        setMessageDialogTitle('오류');
        setMessageDialogMessage(
          '코드ID 목록을 불러오는 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    }
  };

  // 소분류코드 등록 폼 입력 핸들러
  const handleDetailCodeRegisterFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setDetailCodeRegisterForm({
      ...detailCodeRegisterForm,
      [name]: value,
    });
    // 에러 메시지 초기화
    if (name === 'codeId' && detailCodeRegisterErrors.codeId) {
      setDetailCodeRegisterErrors({
        ...detailCodeRegisterErrors,
        codeId: '',
      });
    } else if (name === 'code' && detailCodeRegisterErrors.code) {
      setDetailCodeRegisterErrors({
        ...detailCodeRegisterErrors,
        code: '',
      });
    } else if (name === 'codeNm' && detailCodeRegisterErrors.codeNm) {
      setDetailCodeRegisterErrors({
        ...detailCodeRegisterErrors,
        codeNm: '',
      });
    }
  };

  // 순서 증가
  const handleOrderByIncrease = () => {
    setDetailCodeRegisterForm({
      ...detailCodeRegisterForm,
      orderBy: (detailCodeRegisterForm.orderBy || 0) + 1,
    });
  };

  // 순서 감소
  const handleOrderByDecrease = () => {
    const currentOrderBy = detailCodeRegisterForm.orderBy || 0;
    if (currentOrderBy > 0) {
      setDetailCodeRegisterForm({
        ...detailCodeRegisterForm,
        orderBy: currentOrderBy - 1,
      });
    }
  };

  // 소분류코드 상세 모달 열기
  const handleOpenDetailCodeDetailModal = async (item: CmmDetailCode) => {
    const codeId = detailCodeId || '';
    const code = item.code || '';

    if (!codeId || !code) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('코드ID와 상세코드가 필요합니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    setShowDetailCodeDetailModal(true);
    setDetailCodeDetailForm({
      codeId: '',
      code: '',
      codeNm: '',
      codeDc: '',
      orderBy: 0,
      useAt: 'Y',
    });

    // 상세 데이터 로드
    await fetchDetailCodeDetail(codeId, code);
  };

  // 소분류코드 상세 데이터 조회
  const fetchDetailCodeDetail = async (codeId: string, code: string) => {
    try {
      setDetailCodeDetailLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: CmmDetailCodeDetailParams = {
        codeId: codeId,
        code: code,
      };

      console.log('📤 소분류코드 상세 조회 요청 파라미터:', params);

      const response = await CmmCodeService.getCmmDetailCodeDetail(params);

      console.log('🔍 소분류코드 상세 조회 응답:', response);

      if (response.result === '00' && response.data) {
        const data = response.data;
        setDetailCodeDetailForm({
          codeId: data.CODE_ID || data.codeId || codeId,
          code: data.CODE || data.code || code,
          codeNm: data.CODE_NM || data.codeNm || '',
          codeDc: data.CODE_DC || data.codeDc || '',
          orderBy:
            data.ORD || data.ORD || data.orderBy !== undefined
              ? Number(data.ORD || data.ord || data.orderBy || 0)
              : 0,
          useAt: data.USE_AT || data.useAt || 'Y',
        });
      } else {
        setMessageDialogTitle('오류');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '소분류코드 상세 조회 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('소분류코드 상세 조회 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('오류');
          setMessageDialogMessage(
            err.message || '소분류코드 상세 조회 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('소분류코드 상세 조회 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailCodeDetailLoading(false);
    }
  };

  // 소분류코드 상세 모달 닫기
  const handleCloseDetailCodeDetailModal = () => {
    setShowDetailCodeDetailModal(false);
    setDetailCodeDetailForm({
      codeId: '',
      code: '',
      codeNm: '',
      codeDc: '',
      orderBy: 0,
      useAt: 'Y',
    });
    setDetailCodeDetailErrors({
      codeNm: '',
    });
  };

  // 소분류코드 상세 폼 입력 핸들러
  const handleDetailCodeDetailFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setDetailCodeDetailForm({
      ...detailCodeDetailForm,
      [name]: value,
    });
    // 에러 메시지 초기화
    if (name === 'codeNm' && detailCodeDetailErrors.codeNm) {
      setDetailCodeDetailErrors({
        ...detailCodeDetailErrors,
        codeNm: '',
      });
    }
  };

  // 소분류코드 상세 순서 증가
  const handleDetailCodeDetailOrderByIncrease = () => {
    setDetailCodeDetailForm({
      ...detailCodeDetailForm,
      orderBy: (detailCodeDetailForm.orderBy || 0) + 1,
    });
  };

  // 소분류코드 상세 순서 감소
  const handleDetailCodeDetailOrderByDecrease = () => {
    const currentOrderBy = detailCodeDetailForm.orderBy || 0;
    if (currentOrderBy > 0) {
      setDetailCodeDetailForm({
        ...detailCodeDetailForm,
        orderBy: currentOrderBy - 1,
      });
    }
  };

  // 소분류코드 상세 수정 저장
  const handleSaveDetailCodeDetailUpdate = async () => {
    // 유효성 검사
    const errors = {
      codeNm: '',
    };

    let hasError = false;

    if (
      !detailCodeDetailForm.codeNm ||
      detailCodeDetailForm.codeNm.trim() === ''
    ) {
      errors.codeNm = '상세코드명을 입력하세요';
      hasError = true;
    }

    setDetailCodeDetailErrors(errors);

    if (hasError) {
      return;
    }

    try {
      setDetailCodeDetailUpdateLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: UpdateCmmDetailCodeParams = {
        codeId: detailCodeDetailForm.codeId,
        code: detailCodeDetailForm.code,
        codeNm: detailCodeDetailForm.codeNm.trim(),
        codeDc: detailCodeDetailForm.codeDc || '',
        orderBy: detailCodeDetailForm.orderBy || 0,
        useAt: detailCodeDetailForm.useAt || 'Y',
      };

      console.log('📤 소분류코드 수정 요청 파라미터:', params);

      const response = await CmmCodeService.updateCmmDetailCode(params);

      console.log('🔍 소분류코드 수정 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('수정 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 수정되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 모달 닫기
        handleCloseDetailCodeDetailModal();

        // 목록 새로고침
        if (detailCodeId) {
          fetchDetailCodeListRef.current();
        }
      } else {
        // 실패
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '수정 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('소분류코드 수정 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('수정 실패');
          setMessageDialogMessage(
            err.message || '수정 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage('소분류코드 수정 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailCodeDetailUpdateLoading(false);
    }
  };

  // 소분류코드 등록 저장
  const handleSaveDetailCodeRegister = async () => {
    // 유효성 검사
    const errors = {
      codeId: '',
      code: '',
      codeNm: '',
    };

    let hasError = false;

    if (
      !detailCodeRegisterForm.codeId ||
      detailCodeRegisterForm.codeId.trim() === ''
    ) {
      errors.codeId = '코드ID를 선택하세요';
      hasError = true;
    }

    if (
      !detailCodeRegisterForm.code ||
      detailCodeRegisterForm.code.trim() === ''
    ) {
      errors.code = '상세코드를 입력하세요';
      hasError = true;
    }

    if (
      !detailCodeRegisterForm.codeNm ||
      detailCodeRegisterForm.codeNm.trim() === ''
    ) {
      errors.codeNm = '상세코드명을 입력하세요';
      hasError = true;
    }

    setDetailCodeRegisterErrors(errors);

    if (hasError) {
      return;
    }

    try {
      setDetailCodeRegisterLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: InsertCmmDetailCodeParams = {
        codeId: detailCodeRegisterForm.codeId,
        code: detailCodeRegisterForm.code.trim(),
        codeNm: detailCodeRegisterForm.codeNm.trim(),
        codeDc: detailCodeRegisterForm.codeDc || '',
        orderBy: detailCodeRegisterForm.orderBy || 0,
        useAt: detailCodeRegisterForm.useAt || 'Y',
      };

      console.log('📤 소분류코드 등록 요청 파라미터:', params);

      const response = await CmmCodeService.insertCmmDetailCode(params);

      console.log('🔍 소분류코드 등록 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 모달 닫기
        handleCloseDetailCodeRegisterModal();

        // 목록 새로고침
        if (detailCodeId) {
          fetchDetailCodeListRef.current();
        }
      } else if (response.result === '50') {
        // 중복
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message ||
            '중복되는 소분류 코드가 있습니다. 다른 코드ID로 입력하세요',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      } else {
        // 실패
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('소분류코드 등록 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('등록 실패');
          setMessageDialogMessage(
            err.message || '등록 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage('소분류코드 등록 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailCodeRegisterLoading(false);
    }
  };

  // 삭제 확인 다이얼로그 열기
  const handleOpenDeleteConfirm = (item: CmmCode) => {
    setDeleteTargetCode(item);
    setShowDeleteConfirmDialog(true);
  };

  // 삭제 확인 다이얼로그 닫기
  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirmDialog(false);
    setDeleteTargetCode(null);
  };

  // 대분류코드 삭제
  const handleDeleteCmmCode = async () => {
    if (!deleteTargetCode || !deleteTargetCode.codeId) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('삭제할 코드를 선택해주세요.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    try {
      setDeleteLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: DeleteCmmCodeParams = {
        codeId: deleteTargetCode.codeId,
      };

      console.log('📤 대분류코드 삭제 요청 파라미터:', params);

      const response = await CmmCodeService.deleteCmmCode(params);

      console.log('🔍 대분류코드 삭제 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('삭제 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 삭제되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 삭제 확인 다이얼로그 닫기
        handleCloseDeleteConfirm();

        // 목록 새로고침
        handleSearch();
      } else {
        // 실패
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '삭제 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('대분류코드 삭제 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('삭제 실패');
          setMessageDialogMessage(
            err.message || '삭제 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage('대분류코드 삭제 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // 소분류코드 삭제 확인 다이얼로그 열기
  const handleOpenDetailDeleteConfirm = (item: CmmDetailCode) => {
    setDetailDeleteTargetCode(item);
    setShowDetailDeleteConfirmDialog(true);
  };

  // 소분류코드 삭제 확인 다이얼로그 닫기
  const handleCloseDetailDeleteConfirm = () => {
    setShowDetailDeleteConfirmDialog(false);
    setDetailDeleteTargetCode(null);
  };

  // 소분류코드 삭제
  const handleDeleteCmmDetailCode = async () => {
    if (
      !detailDeleteTargetCode ||
      !detailDeleteTargetCode.codeId ||
      !detailDeleteTargetCode.code
    ) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('삭제할 코드를 선택해주세요.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    try {
      setDetailDeleteLoading(true);

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('로그인이 필요합니다. 다시 로그인해주세요.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = '/adminWeb/login';
        }, 2000);
        return;
      }

      const params: DeleteCmmDetailCodeParams = {
        codeId: detailDeleteTargetCode.codeId,
        code: detailDeleteTargetCode.code,
      };

      console.log('📤 소분류코드 삭제 요청 파라미터:', params);

      const response = await CmmCodeService.deleteCmmDetailCode(params);

      console.log('🔍 소분류코드 삭제 응답:', response);

      if (response.result === '00') {
        // 성공
        setMessageDialogTitle('삭제 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 삭제되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 삭제 확인 다이얼로그 닫기
        handleCloseDetailDeleteConfirm();

        // 목록 새로고침
        fetchDetailCodeListRef.current();
      } else {
        // 실패
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage(
          response.message ||
            response.resultMessage ||
            '삭제 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('소분류코드 삭제 실패:', err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogTitle('오류');
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
          setMessageDialogType('danger');
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setMessageDialogTitle('삭제 실패');
          setMessageDialogMessage(
            err.message || '삭제 중 오류가 발생했습니다.',
          );
          setMessageDialogType('danger');
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle('삭제 실패');
        setMessageDialogMessage('소분류코드 삭제 중 오류가 발생했습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } finally {
      setDetailDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">공통코드관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt;{' '}
          <span>공통코드관리</span>
        </nav>
      </div>

      {/* 좌우 분할 레이아웃 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 왼쪽: 공통코드관리 */}
        <div className="flex-1">
          {/* 모바일 조회조건 토글 버튼 */}
          <div className="md:hidden mb-2">
            <button
              className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
              onClick={() => setShowSearchForm(!showSearchForm)}
            >
              {showSearchForm ? '▲ 조회조건 닫기' : '▼ 조회조건 열기'}
            </button>
          </div>

          <div
            className={`bg-white mb-3 rounded-lg shadow search-form-container ${
              showSearchForm ? 'show' : ''
            }`}
          >
            <div className="border border-gray-300">
              <div className="flex flex-wrap">
                <div className="w-full">
                  {/* 검색구분 + 검색어 */}
                  <div
                    className="flex flex-col border-b md:flex-row items-stretch"
                    style={{ minHeight: '45px' }}
                  >
                    <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                      검색구분
                    </label>
                    <div className="w-full md:w-3/4 flex p-2">
                      <select
                        className="input w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="searchCondition"
                        name="searchCondition"
                        value={searchCondition}
                        onChange={(e) => setSearchCondition(e.target.value)}
                      >
                        <option value="1">코드ID</option>
                        <option value="2">코드명</option>
                        <option value="3">분류코드명</option>
                      </select>
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="검색할 내용을 입력하세요"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* 상태 */}
                  <div
                    className="flex flex-col border-b md:flex-row items-stretch"
                    style={{ minHeight: '45px' }}
                  >
                    <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                      상태
                    </label>
                    <div className="w-full md:w-3/4 flex p-2">
                      <select
                        className="input w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="searchUseAt"
                        name="searchUseAt"
                        value={searchUseAt}
                        onChange={(e) => setSearchUseAt(e.target.value)}
                      >
                        <option value="">전체</option>
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-3 gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
              style={{ minWidth: '100px' }}
              onClick={handleSearch}
            >
              🔍 조회
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
              style={{ minWidth: '100px' }}
              onClick={handleOpenRegisterModal}
            >
              ✏️ 등록
            </button>
          </div>

          <div className="bg-white rounded-lg shadow border">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h5 className="mb-0 text-lg font-semibold">
                대분류코드 목록 (총 {totalElements.toLocaleString()}개)
              </h5>
              <div className="flex gap-2">
                {showFilters && (
                  <button
                    className="px-3 py-1 text-[13px] bg-white text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                    onClick={handleClearFilters}
                  >
                    ✕ 초기화
                  </button>
                )}
                <button
                  className={`px-3 py-1 text-[13px] rounded transition-colors ${
                    showFilters
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? '🔽' : '🔼'} 필터
                </button>
                <AdminExcelDownloadButton
                  onClick={handleExcelDownload}
                  loading={loading}
                />
              </div>
            </div>
            <div className="p-0">
              {loading && isInitialLoad ? (
                <div className="overflow-x-auto hidden md:block">
                  <table
                    className="w-full mb-0"
                    style={{ tableLayout: 'fixed' }}
                  >
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '32%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr className="border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          코드ID
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          코드명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          분류코드명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          사용여부
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '30px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '80px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '100px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '100px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '60px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <div
                                className="skeleton"
                                style={{
                                  width: '120px',
                                  height: '28px',
                                  borderRadius: '4px',
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  {/* 데스크톱 테이블 뷰 */}
                  <div className="overflow-x-auto hidden md:block">
                    <table
                      className="w-full mb-0"
                      style={{ tableLayout: 'fixed' }}
                    >
                      <colgroup>
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '18%' }} />
                      </colgroup>
                      <thead className="bg-gray-100">
                        <tr className="border-t border-b-2">
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            번호
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            코드ID
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            코드명
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            분류코드명
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            사용여부
                          </th>
                          <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                            관리
                          </th>
                        </tr>
                        {/* 테이블 필터 행 */}
                        {showFilters && (
                          <tr className="table-filter-row bg-gray-50">
                            <th className="px-2 py-2 border-r"></th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="코드ID"
                                value={filters.codeId}
                                onChange={(e) =>
                                  setFilters({
                                    ...filters,
                                    codeId: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="코드명"
                                value={filters.codeIdNm}
                                onChange={(e) =>
                                  setFilters({
                                    ...filters,
                                    codeIdNm: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="분류코드명"
                                value={filters.clCodeNm}
                                onChange={(e) =>
                                  setFilters({
                                    ...filters,
                                    clCodeNm: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <select
                                className="table-filter-select w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={filters.useAt}
                                onChange={(e) =>
                                  setFilters({
                                    ...filters,
                                    useAt: e.target.value,
                                  })
                                }
                              >
                                <option value="">전체</option>
                                <option value="Y">사용</option>
                                <option value="N">미사용</option>
                              </select>
                            </th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cmmCodeList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              {loading
                                ? '데이터를 불러오는 중...'
                                : '조회된 데이터가 없습니다.'}
                            </td>
                          </tr>
                        ) : (
                          cmmCodeList.map((item, index) => {
                            const rnum =
                              item.rnum ||
                              String((currentPage - 1) * pageSize + index + 1);
                            const codeId = item.codeId || '';
                            const codeIdNm = item.codeIdNm || '';
                            const clCodeNm = item.clCodeNm || '';
                            const useAt = item.useAt || '';

                            return (
                              <tr
                                key={item.codeId || index}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleCmmCodeRowClick(item)}
                              >
                                <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                                  {rnum}
                                </td>
                                <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                                  {codeId}
                                </td>
                                <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                                  {codeIdNm}
                                </td>
                                <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                                  {clCodeNm}
                                </td>
                                <td className="px-3 py-2 border-r text-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                                      useAt === 'Y'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {useAt === 'Y' ? '사용' : '미사용'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDetailModal(item);
                                    }}
                                  >
                                    상세
                                  </button>
                                  <button
                                    className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                      handleOpenDeleteConfirm(item);
                                    }}
                                  >
                                    삭제
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden">
                    {cmmCodeList.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {loading
                          ? '데이터를 불러오는 중...'
                          : '조회된 데이터가 없습니다.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {cmmCodeList.map((item, index) => {
                          const rnum =
                            item.rnum ||
                            String((currentPage - 1) * pageSize + index + 1);
                          const codeId = item.codeId || '';
                          const codeIdNm = item.codeIdNm || '';
                          const clCodeNm = item.clCodeNm || '';
                          const useAt = item.useAt || '';

                          return (
                            <div key={item.codeId || index} className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 mb-1">
                                    {codeIdNm}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    코드ID: {codeId}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                    onClick={() => {
                                      handleOpenDetailModal(item);
                                    }}
                                  >
                                    상세
                                  </button>
                                  <button
                                    className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                      handleOpenDeleteConfirm(item);
                                    }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>번호: {rnum}</div>
                                <div>분류코드명: {clCodeNm}</div>
                                <div>
                                  사용여부:{' '}
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                                      useAt === 'Y'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {useAt === 'Y' ? '사용' : '미사용'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* 페이징 */}
            {totalPages > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* 오른쪽: 소분류코드 관리 */}
        <div className="flex-1">
          {/* 모바일 조회조건 토글 버튼 */}
          <div className="md:hidden mb-2">
            <button
              className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
              onClick={() => setDetailShowSearchForm(!detailShowSearchForm)}
            >
              {detailShowSearchForm ? '▲ 조회조건 닫기' : '▼ 조회조건 열기'}
            </button>
          </div>

          <div
            className={`bg-white mb-3 rounded-lg shadow search-form-container ${
              detailShowSearchForm ? 'show' : ''
            }`}
          >
            <div className="border border-gray-300">
              <div className="flex flex-wrap">
                <div className="w-full">
                  {/* 코드ID/코드명 */}
                  <div
                    className="flex flex-col border-b md:flex-row items-stretch"
                    style={{ minHeight: '45px' }}
                  >
                    <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                      코드ID/코드명
                    </label>
                    <div className="w-full md:w-3/4 flex p-2 gap-2">
                      <input
                        type="text"
                        className="w-1/3 border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        placeholder="코드ID"
                        value={detailCodeId}
                        onChange={(e) => setDetailCodeId(e.target.value)}
                        readOnly
                      />
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        placeholder="코드명"
                        value={detailCodeNm}
                        onChange={(e) => setDetailCodeNm(e.target.value)}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* 사용여부 */}
                  <div
                    className="flex flex-col border-b md:flex-row items-stretch"
                    style={{ minHeight: '45px' }}
                  >
                    <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                      사용여부
                    </label>
                    <div className="w-full md:w-3/4 flex p-2">
                      <select
                        className="input w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="detailSearchUseAt"
                        name="detailSearchUseAt"
                        value={detailSearchUseAt}
                        onChange={(e) => setDetailSearchUseAt(e.target.value)}
                      >
                        <option value="">전체</option>
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-3 gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
              style={{ minWidth: '100px' }}
              onClick={handleDetailCodeSearch}
              disabled={!detailCodeId}
            >
              🔍 조회
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
              style={{ minWidth: '100px' }}
              onClick={handleOpenDetailCodeRegisterModal}
            >
              ✏️ 등록
            </button>
          </div>

          <div className="bg-white rounded-lg shadow border">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h5 className="mb-0 text-lg font-semibold">
                소분류코드 목록 (총 {detailTotalElements.toLocaleString()}개)
              </h5>
              <div className="flex gap-2">
                {detailShowFilters && (
                  <button
                    className="px-3 py-1 text-[13px] bg-white text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                    onClick={handleClearDetailFilters}
                  >
                    ✕ 초기화
                  </button>
                )}
                <button
                  className={`px-3 py-1 text-[13px] rounded transition-colors ${
                    detailShowFilters
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setDetailShowFilters(!detailShowFilters)}
                >
                  {detailShowFilters ? '🔽' : '🔼'} 필터
                </button>
                <AdminExcelDownloadButton
                  onClick={handleDetailExcelDownload}
                  loading={detailLoading}
                  disabled={!detailCodeId}
                />
              </div>
            </div>
            <div className="p-0">
              {detailLoading ? (
                <div className="overflow-x-auto hidden md:block">
                  <table
                    className="w-full mb-0"
                    style={{ tableLayout: 'fixed' }}
                  >
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '33%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr className="border-b-2">
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          번호
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상세코드
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          상세코드명
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          순서
                        </th>
                        <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                          사용여부
                        </th>
                        <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '30px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '80px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '100px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '60px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: '60px',
                                height: '16px',
                                margin: '0 auto',
                              }}
                            ></div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <div
                                className="skeleton"
                                style={{
                                  width: '120px',
                                  height: '28px',
                                  borderRadius: '4px',
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  {/* 데스크톱 테이블 뷰 */}
                  <div className="overflow-x-auto hidden md:block">
                    <table
                      className="w-full mb-0"
                      style={{ tableLayout: 'fixed' }}
                    >
                      <colgroup>
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '33%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '20%' }} />
                      </colgroup>
                      <thead className="bg-gray-100">
                        <tr className="border-t border-b-2">
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            번호
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            상세코드
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            상세코드명
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            순서
                          </th>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            사용여부
                          </th>
                          <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                            관리
                          </th>
                        </tr>
                        {/* 테이블 필터 행 */}
                        {detailShowFilters && (
                          <tr className="table-filter-row bg-gray-50">
                            <th className="px-2 py-2 border-r"></th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="상세코드"
                                value={detailFilters.code}
                                onChange={(e) =>
                                  setDetailFilters({
                                    ...detailFilters,
                                    code: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="상세코드명"
                                value={detailFilters.codeNm}
                                onChange={(e) =>
                                  setDetailFilters({
                                    ...detailFilters,
                                    codeNm: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <input
                                type="text"
                                className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="순서"
                                value={detailFilters.orderBy}
                                onChange={(e) =>
                                  setDetailFilters({
                                    ...detailFilters,
                                    orderBy: e.target.value,
                                  })
                                }
                              />
                            </th>
                            <th className="px-2 py-2 border-r">
                              <select
                                className="table-filter-select w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={detailFilters.useAt}
                                onChange={(e) =>
                                  setDetailFilters({
                                    ...detailFilters,
                                    useAt: e.target.value,
                                  })
                                }
                              >
                                <option value="">전체</option>
                                <option value="Y">사용</option>
                                <option value="N">미사용</option>
                              </select>
                            </th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailCodeList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              조회된 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          detailCodeList.map((item, index) => {
                            const rnum = item.rnum || index + 1;
                            const code = item.code || '';
                            const codeNm = item.codeNm || '';
                            const orderBy =
                              item.orderBy !== undefined &&
                              item.orderBy !== null
                                ? item.orderBy
                                : '';
                            const useAt = item.useAt || '';

                            return (
                              <tr
                                key={item.code || index}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                                  {rnum}
                                </td>
                                <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                                  {code}
                                </td>
                                <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                                  {codeNm}
                                </td>
                                <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                                  {orderBy}
                                </td>
                                <td className="px-3 py-2 border-r text-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                                      useAt === 'Y'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {useAt === 'Y' ? '사용' : '미사용'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDetailCodeDetailModal(item);
                                    }}
                                  >
                                    상세
                                  </button>
                                  <button
                                    className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDetailDeleteConfirm(item);
                                    }}
                                  >
                                    삭제
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden">
                    {detailCodeList.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        조회된 데이터가 없습니다.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {detailCodeList.map((item, index) => {
                          const rnum = item.rnum || index + 1;
                          const code = item.code || '';
                          const codeNm = item.codeNm || '';
                          const orderBy =
                            item.orderBy !== undefined && item.orderBy !== null
                              ? item.orderBy
                              : '';
                          const useAt = item.useAt || '';

                          return (
                            <div key={item.code || index} className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 mb-1">
                                    {codeNm}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    상세코드: {code}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                    onClick={() => {
                                      handleOpenDetailCodeDetailModal(item);
                                    }}
                                  >
                                    상세
                                  </button>
                                  <button
                                    className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                      handleOpenDetailDeleteConfirm(item);
                                    }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>번호: {rnum}</div>
                                <div>순서: {orderBy}</div>
                                <div>
                                  사용여부:{' '}
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                                      useAt === 'Y'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {useAt === 'Y' ? '사용' : '미사용'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* 소분류코드 페이징 */}
            {detailTotalPages > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <Pagination
                  currentPage={detailCurrentPage}
                  totalPages={detailTotalPages}
                  onPageChange={handleDetailPageChange}
                  pageSize={detailPageSize}
                />
              </div>
            )}
          </div>

          {detailError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {detailError}
            </div>
          )}
        </div>
      </div>

      {/* 대분류코드 등록 모달 */}
      {showRegisterModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCloseRegisterModal}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                <h2 className="text-lg font-semibold text-gray-900">
                  대분류코드 등록
                </h2>
                <button
                  onClick={handleCloseRegisterModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-0 rounded-b-lg">
                <form noValidate>
                  {/* 분류코드명 */}
                  <div className="flex flex-wrap">
                    <ModalFormField
                      label="분류코드명"
                      required
                      isFirstRow
                      error={registerErrors.clCode}
                    >
                      <FormSelect
                        name="clCode"
                        value={registerForm.clCode}
                        onChange={handleClCodeChange}
                        options={clCodeList.map((item) => ({
                          value: item.clCode,
                          label: item.clCodeNm,
                        }))}
                        placeholder="--------선택하세요-----"
                        error={registerErrors.clCode}
                      />
                    </ModalFormField>
                  </div>

                  {/* 코드ID */}
                  <div className="flex flex-wrap">
                    <ModalFormField
                      label="코드ID"
                      required
                      error={registerErrors.codeIdInput}
                    >
                      <div className="w-full flex gap-2">
                        <FormInput
                          type="text"
                          name="codeId"
                          value={registerForm.codeId}
                          onChange={() => {}}
                          readOnly
                          disabled
                          className="w-1/4"
                        />
                        <FormInput
                          type="text"
                          name="codeIdInput"
                          value={registerForm.codeIdInput}
                          onChange={handleCodeIdInputChange}
                          error={registerErrors.codeIdInput}
                          placeholder="3자리의 숫자만 입력할 수 있습니다."
                          maxLength={3}
                          className="flex-1"
                        />
                      </div>
                    </ModalFormField>
                  </div>

                  {/* 코드ID명 */}
                  <div className="flex flex-wrap">
                    <ModalFormField
                      label="코드ID명"
                      required
                      error={registerErrors.codeIdNm}
                    >
                      <FormInput
                        type="text"
                        name="codeIdNm"
                        value={registerForm.codeIdNm}
                        onChange={handleRegisterFormChange}
                        error={registerErrors.codeIdNm}
                      />
                    </ModalFormField>
                  </div>

                  {/* 코드ID설명 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="코드ID설명">
                      <FormTextarea
                        name="codeIdDc"
                        value={registerForm.codeIdDc}
                        onChange={handleRegisterFormChange}
                        minHeight="100px"
                      />
                    </ModalFormField>
                  </div>

                  {/* 사용여부 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="사용여부">
                      <FormSelect
                        name="useAt"
                        value={registerForm.useAt}
                        onChange={handleRegisterFormChange}
                        options={[
                          { value: 'Y', label: '예' },
                          { value: 'N', label: '아니오' },
                        ]}
                      />
                    </ModalFormField>
                  </div>

                  {/* 버튼 */}
                  <div className="flex justify-end mt-3 gap-2 px-6 py-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ minWidth: '100px' }}
                      onClick={handleSaveRegister}
                      disabled={registerLoading}
                    >
                      {registerLoading ? '저장 중...' : '저장'}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ minWidth: '100px' }}
                      onClick={handleCloseRegisterModal}
                      disabled={registerLoading}
                    >
                      닫기
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 대분류코드 상세 모달 */}
      {showDetailModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCloseDetailModal}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                <h2 className="text-lg font-semibold text-gray-900">
                  대분류코드 상세
                </h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-0 rounded-b-lg">
                {detailModalLoading ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-600">로딩 중...</div>
                  </div>
                ) : (
                  <form noValidate>
                    {/* 분류코드명 */}
                    <div className="flex flex-wrap">
                      <ModalFormField label="분류코드명" isFirstRow>
                        <FormSelect
                          name="clCode"
                          value={detailForm.clCode}
                          onChange={() => {}}
                          options={clCodeList.map((item) => ({
                            value: item.clCode,
                            label: item.clCodeNm,
                          }))}
                          disabled
                        />
                      </ModalFormField>
                    </div>

                    {/* 코드ID */}
                    <div className="flex flex-wrap">
                      <ModalFormField label="코드ID">
                        <div className="w-full flex gap-2">
                          <FormInput
                            type="text"
                            name="clCode"
                            value={detailForm.clCode}
                            onChange={() => {}}
                            readOnly
                            disabled
                            className="w-1/4"
                          />
                          <FormInput
                            type="text"
                            name="codeIdInput"
                            value={detailForm.codeIdInput}
                            onChange={() => {}}
                            readOnly
                            disabled
                            className="flex-1"
                          />
                        </div>
                      </ModalFormField>
                    </div>

                    {/* 코드ID명 */}
                    <div className="flex flex-wrap">
                      <ModalFormField
                        label="코드ID명"
                        required
                        error={detailErrors.codeIdNm}
                      >
                        <FormInput
                          type="text"
                          name="codeIdNm"
                          value={detailForm.codeIdNm}
                          onChange={handleDetailFormChange}
                          error={detailErrors.codeIdNm}
                        />
                      </ModalFormField>
                    </div>

                    {/* 코드ID설명 */}
                    <div className="flex flex-wrap">
                      <ModalFormField label="코드ID설명">
                        <FormTextarea
                          name="codeIdDc"
                          value={detailForm.codeIdDc}
                          onChange={handleDetailFormChange}
                          minHeight="100px"
                        />
                      </ModalFormField>
                    </div>

                    {/* 사용여부 */}
                    <div className="flex flex-wrap">
                      <ModalFormField label="사용여부">
                        <FormSelect
                          name="useAt"
                          value={detailForm.useAt}
                          onChange={handleDetailFormChange}
                          options={[
                            { value: 'Y', label: '예' },
                            { value: 'N', label: '아니오' },
                          ]}
                        />
                      </ModalFormField>
                    </div>

                    {/* 버튼 */}
                    <div className="flex justify-end mt-3 gap-2 px-6 py-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: '100px' }}
                        onClick={handleSaveDetailUpdate}
                        disabled={detailUpdateLoading}
                      >
                        {detailUpdateLoading ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: '100px' }}
                        onClick={handleCloseDetailModal}
                        disabled={detailUpdateLoading}
                      >
                        닫기
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        type={messageDialogType}
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
        confirmText="확인"
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteConfirmDialog}
        title="삭제 확인"
        message={
          deleteTargetCode
            ? `"${
                deleteTargetCode.codeIdNm || deleteTargetCode.codeId
              }" 코드를 삭제하시겠습니까?`
            : '코드를 삭제하시겠습니까?'
        }
        type="danger"
        useDeleteHeader
        onConfirm={handleDeleteCmmCode}
        onCancel={handleCloseDeleteConfirm}
        confirmText={deleteLoading ? '삭제 중...' : '삭제'}
      />

      {/* 소분류코드 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDetailDeleteConfirmDialog}
        title="삭제 확인"
        message={
          detailDeleteTargetCode
            ? `"${
                detailDeleteTargetCode.codeNm || detailDeleteTargetCode.code
              }" 소분류코드를 삭제하시겠습니까?`
            : '소분류코드를 삭제하시겠습니까?'
        }
        type="danger"
        useDeleteHeader
        onConfirm={handleDeleteCmmDetailCode}
        onCancel={handleCloseDetailDeleteConfirm}
        confirmText={detailDeleteLoading ? '삭제 중...' : '삭제'}
      />

      {/* 소분류코드 등록 모달 */}
      {showDetailCodeRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h5 className="text-lg font-semibold mb-0">소분류코드 등록</h5>
            </div>

            <div className="p-0">
              {/* 코드ID */}
              <div className="flex flex-wrap">
                <ModalFormField
                  label="코드ID"
                  required
                  isFirstRow
                  error={detailCodeRegisterErrors.codeId}
                >
                  <div className="w-full flex gap-2">
                    <div className="w-1/2">
                      <FormSelect
                        name="clCode"
                        value={detailCodeRegisterForm.clCode}
                        onChange={handleDetailCodeRegisterClCodeChange}
                        options={clCodeDetailList.map((item) => ({
                          value: item.clCode,
                          label: item.clCodeNm,
                        }))}
                        placeholder="--------선택하세요-----"
                        disabled={isCodeIdLocked}
                      />
                    </div>
                    <div className="w-1/2">
                      <FormSelect
                        name="codeId"
                        value={detailCodeRegisterForm.codeId}
                        onChange={handleDetailCodeRegisterFormChange}
                        options={codeIdList.map((item) => ({
                          value: item.codeId,
                          label: item.codeIdNm,
                        }))}
                        placeholder="--------선택하세요-----"
                        error={detailCodeRegisterErrors.codeId}
                        disabled={
                          isCodeIdLocked || !detailCodeRegisterForm.clCode
                        }
                      />
                    </div>
                  </div>
                </ModalFormField>
              </div>

              {/* 상세코드 */}
              <div className="flex flex-wrap">
                <ModalFormField
                  label="상세코드"
                  required
                  error={detailCodeRegisterErrors.code}
                >
                  <FormInput
                    type="text"
                    name="code"
                    value={detailCodeRegisterForm.code}
                    onChange={handleDetailCodeRegisterFormChange}
                    error={detailCodeRegisterErrors.code}
                  />
                </ModalFormField>
              </div>

              {/* 상세코드명 */}
              <div className="flex flex-wrap">
                <ModalFormField
                  label="상세코드명"
                  required
                  error={detailCodeRegisterErrors.codeNm}
                >
                  <FormInput
                    type="text"
                    name="codeNm"
                    value={detailCodeRegisterForm.codeNm}
                    onChange={handleDetailCodeRegisterFormChange}
                    error={detailCodeRegisterErrors.codeNm}
                  />
                </ModalFormField>
              </div>

              {/* 상세코드설명 */}
              <div className="flex flex-wrap">
                <ModalFormField label="상세코드설명">
                  <FormTextarea
                    name="codeDc"
                    value={detailCodeRegisterForm.codeDc}
                    onChange={handleDetailCodeRegisterFormChange}
                    minHeight="100px"
                  />
                </ModalFormField>
              </div>

              {/* 순서 */}
              <div className="flex flex-wrap">
                <ModalFormField label="순서">
                  <div className="w-full flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onClick={handleOrderByIncrease}
                    >
                      ▲
                    </button>
                    <FormInput
                      type="text"
                      name="orderBy"
                      value={detailCodeRegisterForm.orderBy.toString()}
                      onChange={() => {}}
                      readOnly
                      className="flex-1 text-center"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      onClick={handleOrderByDecrease}
                    >
                      ▼
                    </button>
                  </div>
                </ModalFormField>
              </div>

              {/* 사용여부 */}
              <div className="flex flex-wrap">
                <ModalFormField label="사용여부">
                  <FormSelect
                    name="useAt"
                    value={detailCodeRegisterForm.useAt}
                    onChange={handleDetailCodeRegisterFormChange}
                    options={[
                      { value: 'Y', label: '예' },
                      { value: 'N', label: '아니오' },
                    ]}
                  />
                </ModalFormField>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end mt-3 gap-2 px-6 py-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minWidth: '100px' }}
                  onClick={handleSaveDetailCodeRegister}
                  disabled={detailCodeRegisterLoading}
                >
                  {detailCodeRegisterLoading ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minWidth: '100px' }}
                  onClick={handleCloseDetailCodeRegisterModal}
                  disabled={detailCodeRegisterLoading}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 소분류코드 상세 모달 */}
      {showDetailCodeDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h5 className="text-lg font-semibold mb-0">소분류코드 상세</h5>
            </div>

            <div className="p-0">
              {detailCodeDetailLoading ? (
                <div className="p-8 text-center text-gray-500">
                  데이터를 불러오는 중...
                </div>
              ) : (
                <>
                  {/* 코드ID */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="코드ID" isFirstRow>
                      <FormInput
                        type="text"
                        name="codeId"
                        value={detailCodeDetailForm.codeId}
                        onChange={() => {}}
                        readOnly
                        disabled
                      />
                    </ModalFormField>
                  </div>

                  {/* 상세코드 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="상세코드">
                      <FormInput
                        type="text"
                        name="code"
                        value={detailCodeDetailForm.code}
                        onChange={() => {}}
                        readOnly
                        disabled
                      />
                    </ModalFormField>
                  </div>

                  {/* 상세코드명 */}
                  <div className="flex flex-wrap">
                    <ModalFormField
                      label="상세코드명"
                      required
                      error={detailCodeDetailErrors.codeNm}
                    >
                      <FormInput
                        type="text"
                        name="codeNm"
                        value={detailCodeDetailForm.codeNm}
                        onChange={handleDetailCodeDetailFormChange}
                        error={detailCodeDetailErrors.codeNm}
                      />
                    </ModalFormField>
                  </div>

                  {/* 상세코드설명 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="상세코드설명">
                      <FormTextarea
                        name="codeDc"
                        value={detailCodeDetailForm.codeDc}
                        onChange={handleDetailCodeDetailFormChange}
                        minHeight="100px"
                      />
                    </ModalFormField>
                  </div>

                  {/* 순서 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="순서">
                      <div className="w-full flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          onClick={handleDetailCodeDetailOrderByIncrease}
                        >
                          ▲
                        </button>
                        <FormInput
                          type="text"
                          name="orderBy"
                          value={detailCodeDetailForm.orderBy.toString()}
                          onChange={() => {}}
                          readOnly
                          className="flex-1 text-center"
                        />
                        <button
                          type="button"
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          onClick={handleDetailCodeDetailOrderByDecrease}
                        >
                          ▼
                        </button>
                      </div>
                    </ModalFormField>
                  </div>

                  {/* 사용여부 */}
                  <div className="flex flex-wrap">
                    <ModalFormField label="사용여부">
                      <FormSelect
                        name="useAt"
                        value={detailCodeDetailForm.useAt}
                        onChange={handleDetailCodeDetailFormChange}
                        options={[
                          { value: 'Y', label: '예' },
                          { value: 'N', label: '아니오' },
                        ]}
                      />
                    </ModalFormField>
                  </div>

                  {/* 버튼 */}
                  <div className="flex justify-end mt-3 gap-2 px-6 py-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ minWidth: '100px' }}
                      onClick={handleSaveDetailCodeDetailUpdate}
                      disabled={detailCodeDetailUpdateLoading}
                    >
                      {detailCodeDetailUpdateLoading ? '저장 중...' : '저장'}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ minWidth: '100px' }}
                      onClick={handleCloseDetailCodeDetailModal}
                      disabled={detailCodeDetailUpdateLoading}
                    >
                      닫기
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
