import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProgramService,
  ProgramRegisterParams,
} from '@/entities/adminWeb/program/api';
import { ApiError } from '@/shared/lib/apiClient';

export interface ProgramRegisterFormData {
  progrmFileNm: string;
  progrmStrePath: string;
  progrmKoreanNm: string;
  progrmDc: string;
  url: string;
}

export interface ValidationErrors {
  progrmFileNm?: string;
  progrmStrePath?: string;
  progrmKoreanNm?: string;
  url?: string;
}

export function useProgramRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProgramRegisterFormData>({
    progrmFileNm: '',
    progrmStrePath: '',
    progrmKoreanNm: '',
    progrmDc: '',
    url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');

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

    // 프로그램명 유효성 검증
    if (!formData.progrmFileNm || formData.progrmFileNm.trim() === '') {
      newErrors.progrmFileNm = '프로그램명을 입력해주세요.';
      isValid = false;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // API 요청 파라미터 구성
      const registerParams: ProgramRegisterParams = {
        progrmFileNm: formData.progrmFileNm.trim(),
        progrmStrePath: formData.progrmStrePath.trim(),
        progrmKoreanNm: formData.progrmKoreanNm.trim(),
        progrmDc: formData.progrmDc.trim(),
        url: formData.url.trim(),
      };

      const response = await ProgramService.registerProgram(registerParams);

      // resultCode 기준으로 성공/실패 판단
      // 00: 성공, 01: 실패, 03: 실패
      if (response.resultCode === '00') {
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          response.resultMessage || '정상적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);
      } else {
        // 01, 03 또는 기타 코드는 모두 실패로 처리
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.resultMessage || '프로그램 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('프로그램 등록 오류:', err);
      if (err instanceof ApiError) {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          err.message || '프로그램 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          '프로그램 등록 중 알 수 없는 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      }
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === 'success') {
      router.push('/adminWeb/program/list');
    }
  };

  return {
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleSubmit,
    handleMessageDialogClose,
  };
}
