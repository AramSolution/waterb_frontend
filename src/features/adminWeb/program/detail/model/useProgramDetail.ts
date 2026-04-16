import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProgramService,
  ProgramDetailResponse,
  ProgramDetail,
  ProgramUpdateParams,
} from '@/entities/adminWeb/program/api';
import { ApiError } from '@/shared/lib/apiClient';

export interface ProgramDetailFormData {
  progrmFileNm: string;
  progrmStrePath: string;
  progrmKoreanNm: string;
  progrmDc: string;
  url: string;
}

export interface ValidationErrors {
  progrmStrePath?: string;
  progrmKoreanNm?: string;
  url?: string;
}

export function useProgramDetail(progrmFileNm: string) {
  const router = useRouter();
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [formData, setFormData] = useState<ProgramDetailFormData>({
    progrmFileNm: '',
    progrmStrePath: '',
    progrmKoreanNm: '',
    progrmDc: '',
    url: '',
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');

  // 화면 열릴 때 상세 정보 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // 상세 정보 조회
        const detailResponse = await ProgramService.getProgramDetailScreen({
          progrmFileNm: progrmFileNm,
        });

        let programDetail: ProgramDetail | null = null;

        if (detailResponse && typeof detailResponse === 'object') {
          const responseAny = detailResponse as any;

          // 다양한 응답 구조 대응
          let detailData = responseAny.detail || responseAny.data?.detail;

          // detail 필드가 없고 응답 자체가 detail인 경우
          if (
            !detailData &&
            typeof responseAny === 'object' &&
            !Array.isArray(responseAny)
          ) {
            const responseKeys = Object.keys(responseAny);
            if (
              responseKeys.length > 0 &&
              (responseAny.progrmFileNm || responseAny.progrmKoreanNm)
            ) {
              detailData = responseAny;
            }
          }

          // data가 직접 detail인 경우
          if (
            !detailData &&
            responseAny.data &&
            typeof responseAny.data === 'object' &&
            !Array.isArray(responseAny.data)
          ) {
            const dataKeys = Object.keys(responseAny.data);
            if (
              dataKeys.length > 0 &&
              (responseAny.data.progrmFileNm || responseAny.data.progrmKoreanNm)
            ) {
              detailData = responseAny.data;
            }
          }

          if (detailData && typeof detailData === 'object') {
            programDetail = detailData as ProgramDetail;
            setDetail(programDetail);

            // 폼 데이터에 상세 정보 설정
            setFormData({
              progrmFileNm: programDetail.progrmFileNm || '',
              progrmStrePath: programDetail.progrmStrePath || '',
              progrmKoreanNm: programDetail.progrmKoreanNm || '',
              progrmDc: programDetail.progrmDc || '',
              url: programDetail.url || '',
            });
          } else {
            console.error(
              '❌ detail 데이터를 찾을 수 없습니다. 응답 구조:',
              detailResponse,
            );
            setError('프로그램 상세 정보를 불러올 수 없습니다.');
          }
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.message ||
              '프로그램 상세 정보를 불러오는 중 오류가 발생했습니다.',
          );
        } else {
          setError('프로그램 상세 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (progrmFileNm) {
      fetchData();
    }
  }, [progrmFileNm]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 에러 메시지 초기화
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 저장경로 유효성 검증
    if (!formData.progrmStrePath || formData.progrmStrePath.trim() === '') {
      newErrors.progrmStrePath = '저장경로를 입력해주세요.';
      isValid = false;
    }

    // 한글명 유효성 검증
    if (!formData.progrmKoreanNm || formData.progrmKoreanNm.trim() === '') {
      newErrors.progrmKoreanNm = '한글명을 입력해주세요.';
      isValid = false;
    }

    // URL 유효성 검증
    if (!formData.url || formData.url.trim() === '') {
      newErrors.url = 'URL을 입력해주세요.';
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName) {
        const firstErrorField = document.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(
          `input[name="${firstErrorFieldName}"], textarea[name="${firstErrorFieldName}"]`,
        );
        if (firstErrorField) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }

    return isValid;
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setUpdating(true);
      setError('');

      const updateParams: ProgramUpdateParams = {
        progrmFileNm: formData.progrmFileNm,
        progrmStrePath: formData.progrmStrePath,
        progrmKoreanNm: formData.progrmKoreanNm,
        progrmDc: formData.progrmDc,
        url: formData.url,
      };

      const response = await ProgramService.updateProgram(updateParams);

      console.log('📋 프로그램 수정 응답 상세:');
      console.log('  전체 응답:', response);
      console.log('  resultCode:', response.resultCode);
      console.log('  resultMessage:', response.resultMessage);

      if (response.resultCode === '00') {
        setMessageDialogTitle('수정 완료');
        setMessageDialogMessage(
          response.resultMessage || '정상적으로 수정되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(
          response.resultMessage || '프로그램 수정 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('프로그램 수정 오류:', err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('인증이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/adminWeb/login';
          }, 2000);
        } else {
          setError(err.message || '프로그램 수정 중 오류가 발생했습니다.');
        }
      } else {
        setError('프로그램 수정 중 오류가 발생했습니다.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    // 성공한 경우 목록으로 이동
    if (messageDialogType === "success") {
      handleList();
    }
  };

  // 목록으로 돌아가기 (상태 유지)
  const handleList = () => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const searchCondition = searchParams.get('searchCondition') || '';
      const searchKeyword = searchParams.get('searchKeyword') || '';
      const page = searchParams.get('page') || '1';

      const params = new URLSearchParams();
      if (searchCondition) params.set('searchCondition', searchCondition);
      if (searchKeyword) params.set('searchKeyword', searchKeyword);
      if (page && page !== '1') params.set('page', page);

      const queryString = params.toString();
      router.push(
        queryString
          ? `/adminWeb/program/list?${queryString}`
          : '/adminWeb/program/list',
      );
    } else {
      // SSR fallback
      router.push('/adminWeb/program/list');
    }
  };

  return {
    detail,
    formData,
    loading,
    updating,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleUpdate,
    handleList,
    handleMessageDialogClose,
  };
}
