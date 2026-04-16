import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MemberService,
  AuthGroup,
  AdminMemberRegisterParams,
} from '@/entities/adminWeb/member/api';
import { ApiError } from '@/shared/lib/apiClient';

export interface MemberRegisterFormData {
  userId: string;
  password: string;
  passwordConfirm: string;
  userNm: string;
  usrTelno: string;
  mbtlnum: string;
  emailAdres: string;
  mberSttus: string;
  sbscrbDe: string;
  secsnDe: string;
  lockAt: string;
  lockLastPnttm: string;
  groupId: string;
}

export interface ValidationErrors {
  userId?: string;
  password?: string;
  passwordConfirm?: string;
  userNm?: string;
  mbtlnum?: string;
  emailAdres?: string;
}

// 전화번호 자동 포맷팅 함수
export const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');

  if (numbers.length === 0) return '';

  // 휴대폰 번호 (010, 011, 016, 017, 018, 019로 시작하는 11자리)
  if (
    numbers.startsWith('010') ||
    numbers.startsWith('011') ||
    numbers.startsWith('016') ||
    numbers.startsWith('017') ||
    numbers.startsWith('018') ||
    numbers.startsWith('019')
  ) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
      7,
      11,
    )}`;
  }

  // 서울 지역번호 (02로 시작하는 9~10자리)
  if (numbers.startsWith('02')) {
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `02-${numbers.slice(2)}`;
    if (numbers.length === 9) {
      return `02-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    if (numbers.length === 10) {
      return `02-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return `02-${numbers.slice(2, 5)}-${numbers.slice(5, 8)}`;
  }

  // 지역번호 3자리
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(
    6,
    10,
  )}`;
};

// 전화번호 형식 검증 함수
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[0-9- ]+$/;
  const cleanedPhone = phone.replace(/[-\s]/g, '');
  return (
    phoneRegex.test(phone) &&
    cleanedPhone.length >= 10 &&
    cleanedPhone.length <= 20
  );
};

// 이메일 형식 검증 함수
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function useMemberRegister() {
  const router = useRouter();
  const [authList, setAuthList] = useState<AuthGroup[]>([]);
  const [formData, setFormData] = useState<MemberRegisterFormData>({
    userId: '',
    password: '',
    passwordConfirm: '',
    userNm: '',
    usrTelno: '',
    mbtlnum: '',
    emailAdres: '',
    mberSttus: 'P',
    sbscrbDe: new Date().toISOString().split('T')[0],
    secsnDe: '',
    lockAt: 'N',
    lockLastPnttm: '',
    groupId: '',
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

  // 화면 열릴 때 권한 리스트 조회
  useEffect(() => {
    const fetchAuthList = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await MemberService.getAdminRegisterScreen();

        let authGroups: AuthGroup[] = [];

        if (Array.isArray(response)) {
          authGroups = response;
        } else if (response && typeof response === 'object') {
          const responseAny = response as any;
          const authListData =
            responseAny.authList ||
            responseAny.data?.authList ||
            responseAny.data ||
            responseAny.Array ||
            responseAny.list ||
            responseAny.content ||
            [];

          if (Array.isArray(authListData)) {
            authGroups = authListData;
          } else if (authListData && typeof authListData === 'object') {
            const values = Object.values(authListData);
            const arrayValue = values.find((v) => Array.isArray(v));
            if (arrayValue) {
              authGroups = arrayValue as AuthGroup[];
            }
          }
        }

        setAuthList(authGroups);

        if (authGroups.length > 0) {
          setFormData((prev) => ({
            ...prev,
            groupId: authGroups[0].groupId,
          }));
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.message || '권한 리스트를 불러오는 중 오류가 발생했습니다.',
          );
        } else {
          setError('권한 리스트를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAuthList();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // 전화번호 필드 자동 포맷팅
    if (name === 'mbtlnum' || name === 'usrTelno') {
      formattedValue = formatPhoneNumber(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // 에러 메시지 초기화
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 아이디 유효성 검증
    if (!formData.userId || formData.userId.trim() === '') {
      newErrors.userId = '아이디를 입력해주세요.';
      isValid = false;
    }

    // 비밀번호 유효성 검증
    if (!formData.password || formData.password.trim() === '') {
      newErrors.password = '비밀번호를 입력해주세요.';
      isValid = false;
    }

    // 비밀번호 확인 유효성 검증
    if (!formData.passwordConfirm || formData.passwordConfirm.trim() === '') {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
      isValid = false;
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm =
        '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
      isValid = false;
    }

    // 회원명 유효성 검증
    if (!formData.userNm || formData.userNm.trim() === '') {
      newErrors.userNm = '회원명을 입력해주세요.';
      isValid = false;
    }

    // 연락처 유효성 검증
    if (!formData.mbtlnum || formData.mbtlnum.trim() === '') {
      newErrors.mbtlnum = '연락처를 입력해주세요.';
      isValid = false;
    } else if (!validatePhoneNumber(formData.mbtlnum)) {
      newErrors.mbtlnum = '올바른 전화번호 형식이 아닙니다.';
      isValid = false;
    }

    // 이메일 유효성 검증
    if (!formData.emailAdres || formData.emailAdres.trim() === '') {
      newErrors.emailAdres = '이메일을 입력해주세요.';
      isValid = false;
    } else if (!validateEmail(formData.emailAdres)) {
      newErrors.emailAdres = '올바른 이메일 형식이 아닙니다.';
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName) {
        const firstErrorField = document.querySelector<HTMLInputElement>(
          `input[name="${firstErrorFieldName}"], select[name="${firstErrorFieldName}"]`,
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

      const response = await MemberService.registerAdminMember({
        userId: formData.userId,
        password: formData.password,
        userNm: formData.userNm,
        usrTelno: formData.usrTelno,
        mbtlnum: formData.mbtlnum,
        emailAdres: formData.emailAdres,
        mberSttus: formData.mberSttus,
        sbscrbDe: formData.sbscrbDe,
        secsnDe: formData.secsnDe || undefined,
        lockAt: formData.lockAt,
        lockLastPnttm: formData.lockLastPnttm || undefined,
        groupId: formData.groupId,
      });

      if (response.result === '00') {
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);
      } else if (response.result === '50') {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message ||
            '중복되는 아이디가 있습니다. 다른 아이디를 사용하여 주십시요.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(response.message || '에러가 발생하였습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('회원 등록 오류:', err);
      if (err instanceof ApiError) {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          err.message || '회원 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage('회원 등록 중 알 수 없는 오류가 발생했습니다.');
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
      router.push('/adminWeb/member/list');
    }
  };

  return {
    authList,
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
  };
}
