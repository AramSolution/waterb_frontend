import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MemberService,
  AuthGroup,
  AdminMemberDetail,
  AdminMemberUpdateParams,
} from '@/entities/adminWeb/member/api';
import { ApiError } from '@/shared/lib/apiClient';
import {
  formatPhoneNumber,
  validatePhoneNumber,
  validateEmail,
} from '@/features/adminWeb/member/register/model';
import {
  parseAuthGroups,
  parseAdminMemberDetail,
  convertToFormData,
} from './memberResponseParser';

export interface MemberDetailFormData {
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

export function useMemberDetail(esntlId: string | null) {
  const router = useRouter();
  const [authList, setAuthList] = useState<AuthGroup[]>([]);
  const [formData, setFormData] = useState<MemberDetailFormData>({
    userId: '',
    password: '',
    passwordConfirm: '',
    userNm: '',
    usrTelno: '',
    mbtlnum: '',
    emailAdres: '',
    mberSttus: 'P',
    sbscrbDe: '',
    secsnDe: '',
    lockAt: 'N',
    lockLastPnttm: '',
    groupId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{
    userId?: string;
    password?: string;
    passwordConfirm?: string;
    userNm?: string;
    mbtlnum?: string;
    emailAdres?: string;
  }>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');
  // 원본 데이터 저장 (변경 전후 비교용)
  const [originalData, setOriginalData] = useState<MemberDetailFormData | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!esntlId) return;

      try {
        setLoading(true);
        setError('');

        // 권한 리스트 조회
        const authResponse = await MemberService.getAdminRegisterScreen();
        const authGroups = parseAuthGroups(authResponse);
        setAuthList(authGroups);

        // 회원 상세 정보 조회
        const detailResponse =
          await MemberService.getAdminMemberDetail(esntlId);

        // adminInfo 추출 (다양한 응답 구조 대응)
        const adminInfo = parseAdminMemberDetail(detailResponse);

        if (!adminInfo) {
          console.error(
            '❌ adminInfo를 찾을 수 없습니다. 응답 구조:',
            detailResponse,
          );
          setError(
            '회원 상세 정보를 불러올 수 없습니다. 응답 구조를 확인해주세요.',
          );
          return;
        }

        // 폼 데이터 설정
        const newFormData = convertToFormData(adminInfo);

        setFormData(newFormData);
        // 원본 데이터 저장 (변경 전후 비교용)
        setOriginalData({ ...newFormData });
      } catch (err) {
        console.error('데이터 조회 오류:', err);
        if (err instanceof ApiError) {
          setError(
            err.message || '회원 정보를 불러오는 중 오류가 발생했습니다.',
          );
        } else {
          setError('회원 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [esntlId]);

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
    if (errors[name as keyof typeof errors]) {
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
    const newErrors: typeof errors = {};
    let isValid = true;

    // 아이디 유효성 검증
    if (!formData.userId || formData.userId.trim() === '') {
      newErrors.userId = '아이디를 입력해주세요.';
      isValid = false;
    }

    // 비밀번호 유효성 검증 (입력된 경우에만 검증)
    if (formData.password && formData.password.trim() !== '') {
      // 비밀번호 확인 유효성 검증
      if (!formData.passwordConfirm || formData.passwordConfirm.trim() === '') {
        newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.';
        isValid = false;
      } else if (formData.password !== formData.passwordConfirm) {
        newErrors.passwordConfirm =
          '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
        isValid = false;
      }
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

  const handleUpdate = async () => {
    if (!esntlId) {
      setMessageDialogTitle('수정 실패');
      setMessageDialogMessage('관리자 코드가 없습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // API 스펙에 따라 모든 필드가 필수이므로 password도 빈 문자열이라도 전송
      const updateParams: AdminMemberUpdateParams = {
        esntlId: esntlId || '',
        userId: formData.userId || '',
        password: formData.password || '', // 빈 문자열이라도 필수로 전송
        userNm: formData.userNm || '',
        usrTelno: formData.usrTelno || '',
        mbtlnum: formData.mbtlnum || '',
        emailAdres: formData.emailAdres || '',
        mberSttus: formData.mberSttus || '',
        sbscrbDe: formData.sbscrbDe || '',
        lockAt: formData.lockAt || '',
        groupId: formData.groupId || '',
      };

      const response = await MemberService.updateAdminMember(updateParams);

      if (response.result === '00') {
        setMessageDialogTitle('수정 완료');
        setMessageDialogMessage(
          response.message || '정상적으로 수정되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 성공 시 바로 데이터 다시 조회
        try {
          // 권한 리스트 조회
          const authResponse = await MemberService.getAdminRegisterScreen();
          const authGroups = parseAuthGroups(authResponse);
          setAuthList(authGroups);

          // 회원 상세 정보 다시 조회
          const detailResponse =
            await MemberService.getAdminMemberDetail(esntlId);

          const adminInfo = parseAdminMemberDetail(detailResponse);

          if (!adminInfo) {
            return;
          }

          // 폼 데이터 업데이트
          const updatedFormData = convertToFormData(adminInfo);

          setFormData(updatedFormData);
          // 원본 데이터도 업데이트
          setOriginalData({ ...updatedFormData });
        } catch (fetchErr) {
          // 재조회 실패 시 무시 (이미 성공 메시지 표시됨)
        }
      } else if (response.result === '50') {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(
          response.message ||
            '중복되는 아이디가 있습니다. 다른 아이디를 사용하여 주십시요.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(response.message || '에러가 발생하였습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('회원 수정 오류:', err);
      if (err instanceof ApiError) {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage(
          err.message || '회원 수정 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      } else {
        setMessageDialogTitle('수정 실패');
        setMessageDialogMessage('회원 수정 중 알 수 없는 오류가 발생했습니다.');
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
      // 성공 시 목록으로 이동
      handleList();
    }
  };

  const handleList = () => {
    // URL에서 쿼리 파라미터 읽기
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const searchCondition = searchParams.get('searchCondition') || '';
      const searchKeyword = searchParams.get('searchKeyword') || '';
      const joGunMberSta = searchParams.get('joGunMberSta') || '';
      const page = searchParams.get('page') || '1';

      // 쿼리 파라미터가 있으면 포함하여 목록으로 이동
      const params = new URLSearchParams();
      if (searchCondition) params.set('searchCondition', searchCondition);
      if (searchKeyword) params.set('searchKeyword', searchKeyword);
      if (joGunMberSta) params.set('joGunMberSta', joGunMberSta);
      if (page) params.set('page', page);

      const queryString = params.toString();
      router.push(
        queryString
          ? `/adminWeb/member/list?${queryString}`
          : '/adminWeb/member/list',
      );
    } else {
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
    handleUpdate,
    handleMessageDialogClose,
    handleList,
  };
}
