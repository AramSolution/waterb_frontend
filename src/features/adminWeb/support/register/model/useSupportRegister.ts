import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupportService } from '@/entities/adminWeb/support/api';
import { CmmCodeService } from '@/entities/adminWeb/code/api';
import { SUPPORT_CHARGE_DEPT_CODE_ID } from '@/features/adminWeb/support/lib/supportChargeDeptCodeId';
import { ynPipeFromBooleans } from '@/entities/adminWeb/support/lib/proPartNature';
import { ApiError } from '@/shared/lib/apiClient';
import { formatPhoneWithHyphen } from '@/shared/lib/inputValidation';

export interface SupportRegisterFormData {
  businessNm: string; // 사업명
  businessCode: string; // 사업코드
  statusCode: string; // 상태코드
  targetName: string; // 사업대상명
  recruitTarget: string[]; // 사업대상 (체크박스 배열)
  /** 사업성격 PRO_PART — 홍보와 동일 5슬롯 */
  proNature: boolean[];
  recruitStartDate: string; // 모집기간 시작일
  recruitEndDate: string; // 모집기간 종료일
  recruitCount: string; // 모집인원수
  /** 사업기간 (PRO_FROM_DD ~ PRO_TO_DD, 홍보 등록과 동일) */
  businessPeriodStart: string;
  businessPeriodEnd: string;
  businessSummary: string; // 홍보문구 (PRO_SUM)
  businessContent: string; // 사업내용 (PRO_DESC)
  etcNm: string; // 기타내용 (ETC_NM, 최대 512자)
  /** 신청방법 (PRO_HOW) */
  applyMethod: string;
  /** 홈페이지 (PRO_PAGE) */
  homepage: string;
  reqGb: boolean[]; // 신청구분 [학생, 학부모, 학원, 멘토, 학교]
  /** 담당부서 PRO_DEPA — EDR007 등 소분류 `code` */
  chargeDept: string;
  chargePerson: string;
  contact: string;
  // 스터디사업 전용 필드 (기초생활수급자/차상위계층/한부모가족/사업구분)
  basicYn: string; // 기초생활수급자 (Y/N)
  poorYn: string; // 차상위계층 (Y/N)
  singleYn: string; // 한부모가족 (Y/N)
  programType: string[]; // 사업구분 (01: 마중물, 02: 희망)
}

export interface ValidationErrors {
  businessNm?: string;
  businessCode?: string;
  statusCode?: string;
  targetName?: string;
  recruitTarget?: string;
  recruitStartDate?: string;
  recruitEndDate?: string;
  recruitCount?: string;
  businessPeriodStart?: string;
  businessPeriodEnd?: string;
  businessSummary?: string;
  businessContent?: string;
  etcNm?: string;
  programType?: string;
  reqGb?: string;
}

export function useSupportRegister() {
  const router = useRouter();
  // 모집기간 시작일: 당일, 종료일: 해당 년도 12월 31일
  const getDefaultStartDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultEndDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-12-31`;
  };

  const getDefaultYearEnd = (): string => {
    const y = new Date().getFullYear();
    return `${y}-12-31`;
  };

  const [formData, setFormData] = useState<SupportRegisterFormData>({
    businessNm: '',
    businessCode: '',
    statusCode: '02', // 기본값: 접수중
    targetName: '',
    recruitTarget: [],
    proNature: [false, false, false, false, false],
    recruitStartDate: getDefaultStartDate(),
    recruitEndDate: getDefaultEndDate(),
    recruitCount: '0', // 모집인원수 기본값 0
    businessPeriodStart: getDefaultStartDate(),
    businessPeriodEnd: getDefaultYearEnd(),
    businessSummary: '',
    businessContent: '',
    etcNm: '',
    applyMethod: '',
    homepage: '',
    reqGb: [false, false, false, false, false], // [학생, 학부모, 학원, 멘토, 학교]
    chargeDept: '',
    chargePerson: '',
    contact: '',
    basicYn: '',
    poorYn: '',
    singleYn: '',
    programType: [],
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

  // 첨부파일 관련 상태
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);

  const [chargeDeptOptions, setChargeDeptOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [chargeDeptLoading, setChargeDeptLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchChargeDeptOptions() {
      setChargeDeptLoading(true);
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId(
          SUPPORT_CHARGE_DEPT_CODE_ID,
        );
        if (cancelled) return;
        setChargeDeptOptions(
          list.map((item) => ({
            value: item.code,
            label: item.codeNm || item.code,
          })),
        );
      } catch (err) {
        console.error('담당부서 코드 조회 실패:', err);
        if (!cancelled) setChargeDeptOptions([]);
      } finally {
        if (!cancelled) setChargeDeptLoading(false);
      }
    }

    fetchChargeDeptOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    let nextValue: string = value;
    if (name === 'recruitCount') {
      nextValue = value.replace(/\D/g, '');
    } else if (name === 'contact') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      nextValue = formatPhoneWithHyphen(digits);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    // 에러 메시지 초기화
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          recruitTarget: [...prev.recruitTarget, value],
        };
      } else {
        return {
          ...prev,
          recruitTarget: prev.recruitTarget.filter((item) => item !== value),
        };
      }
    });

    // 에러 메시지 초기화
    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // 그룹별 전체 선택/해제 핸들러
  const handleGroupSelectAll = (groupValues: string[], checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // 그룹 내 모든 항목 추가 (중복 제거)
        const newTargets = [...prev.recruitTarget];
        groupValues.forEach((value) => {
          if (!newTargets.includes(value)) {
            newTargets.push(value);
          }
        });
        return {
          ...prev,
          recruitTarget: newTargets,
        };
      } else {
        // 그룹 내 모든 항목 제거
        return {
          ...prev,
          recruitTarget: prev.recruitTarget.filter(
            (item) => !groupValues.includes(item),
          ),
        };
      }
    });

    // 에러 메시지 초기화
    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // 그룹 전체 선택 상태 확인
  const isGroupAllSelected = (groupValues: string[]): boolean => {
    return groupValues.every((value) => formData.recruitTarget.includes(value));
  };

  // 신청구분 체크박스 변경 핸들러
  const handleReqGbChange = (index: number, checked: boolean) => {
    setFormData((prev) => {
      const newReqGb = [...prev.reqGb];
      newReqGb[index] = checked;
      return {
        ...prev,
        reqGb: newReqGb,
      };
    });
    if (errors.reqGb) {
      setErrors((prev) => ({ ...prev, reqGb: undefined }));
    }
  };

  const handleProNatureChange = (index: number, checked: boolean) => {
    setFormData((prev) => {
      const next = [...prev.proNature];
      next[index] = checked;
      return { ...prev, proNature: next };
    });
  };

  const handleBusinessContentChange = (html: string) => {
    setFormData((prev) => ({ ...prev, businessContent: html }));
    if (errors.businessContent) {
      setErrors((prev) => ({ ...prev, businessContent: undefined }));
    }
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setSelectedFiles((prev) => {
      const toAdd = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }));
      return [...prev, ...toAdd];
    });
  };

  const handlePromoFileSelected = (file: File) => {
    setSelectedPromoFile(file);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const removePromoFile = () => {
    setSelectedPromoFile(null);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 사업명 필수 체크
    if (!formData.businessNm || formData.businessNm.trim() === '') {
      newErrors.businessNm = '사업명을 입력해주세요.';
      isValid = false;
    }

    // 사업기간 필수·순서 (PRO_FROM_DD / PRO_TO_DD)
    if (!formData.businessPeriodStart || formData.businessPeriodStart.trim() === '') {
      newErrors.businessPeriodStart = '시작일을 선택해주세요.';
      isValid = false;
    }
    if (!formData.businessPeriodEnd || formData.businessPeriodEnd.trim() === '') {
      newErrors.businessPeriodEnd = '종료일을 선택해주세요.';
      isValid = false;
    }
    if (formData.businessPeriodStart && formData.businessPeriodEnd) {
      if (formData.businessPeriodStart > formData.businessPeriodEnd) {
        newErrors.businessPeriodEnd = '종료일은 시작일 이후여야 합니다.';
        isValid = false;
      }
    }

    // 모집기간 시작일 필수 체크
    if (!formData.recruitStartDate || formData.recruitStartDate.trim() === '') {
      newErrors.recruitStartDate = '시작일을 선택해주세요.';
      isValid = false;
    }

    // 모집기간 종료일 필수 체크
    if (!formData.recruitEndDate || formData.recruitEndDate.trim() === '') {
      newErrors.recruitEndDate = '종료일을 선택해주세요.';
      isValid = false;
    }

    // 모집기간 날짜 순서 검증
    if (formData.recruitStartDate && formData.recruitEndDate) {
      if (formData.recruitStartDate > formData.recruitEndDate) {
        newErrors.recruitEndDate = '종료일은 시작일 이후여야 합니다.';
        isValid = false;
      }
    }

    // 기타내용 최대 512자
    if (formData.etcNm && formData.etcNm.trim().length > 512) {
      newErrors.etcNm = '기타내용은 512자 이내로 입력해주세요.';
      isValid = false;
    }

    // 신청구분: 학생·학부모 중 하나 이상
    if (!formData.reqGb[0] && !formData.reqGb[1]) {
      newErrors.reqGb = '학생 또는 학부모/일반을 하나 이상 선택해주세요.';
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName === 'reqGb') {
        document
          .getElementById('support-req-gb')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstErrorFieldName) {
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

      // REQ_GB 변환: [학생, 학부모, 학원, 멘토, 학교] — 5자리
      const reqGbString = [
        formData.reqGb[0],
        formData.reqGb[1],
        formData.reqGb[2],
        formData.reqGb[3],
        formData.reqGb[4],
      ]
        .map((checked) => (checked ? 'Y' : 'N'))
        .join('|');

      // 백엔드 API 호출 (홍보사진·첨부파일 전달 → ARTFILE 저장 후 PRO_FILE_ID, FILE_ID 설정)
      const response = await SupportService.registerSupport({
        proGb: '01', // 기본값: 01
        proType: '01',
        proNm: formData.businessNm.trim(),
        proTargetNm: formData.targetName.trim() || undefined,
        proTarget: formData.recruitTarget.join(','), // ELEMENTARY_1,HIGH_1 형식 (내부에서 E1,H1로 변환)
        recFromDd: formData.recruitStartDate,
        recToDd: formData.recruitEndDate,
        recCnt: formData.recruitCount ? parseInt(formData.recruitCount, 10) : 0,
        proFromDd: formData.businessPeriodStart,
        proToDd: formData.businessPeriodEnd,
        proSum: formData.businessSummary.trim(),
        proDesc: formData.businessContent.trim(),
        etcNm: formData.etcNm.trim().slice(0, 512),
        proFileId: '',
        fileId: '',
        runSta: formData.statusCode || '02', // RUN_STA: 01/02/04/99 (샘플업무)
        sttusCode: 'A', // 사용여부 A(사용)/D(삭제)
        reqGb: reqGbString,
        proPart: ynPipeFromBooleans(formData.proNature),
        proDepa: formData.chargeDept.trim(),
        proCharge: formData.chargePerson.trim(),
        proTel: formData.contact.trim(),
        proHow: formData.applyMethod.trim(),
        proPage: formData.homepage.trim(),
        proFile: selectedPromoFile ?? undefined,
        artpromFiles:
          selectedFiles.length > 0
            ? selectedFiles.map((item) => item.file)
            : undefined,
      });

      if (response.result === '00') {
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          response.message || '지원사업이 성공적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          response.message || '지원사업 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error('지원사업 등록 오류:', err);
      if (err instanceof ApiError) {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          err.message || '지원사업 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          '지원사업 등록 중 알 수 없는 오류가 발생했습니다.',
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
      router.push('/adminWeb/support/list');
    }
  };

  const handleCancel = () => {
    router.push('/adminWeb/support/list');
  };

  return {
    formData,
    loading,
    error,
    errors,
    selectedFiles,
    selectedPromoFile,
    handleFilesSelected,
    handlePromoFileSelected,
    removeFile,
    removePromoFile,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleCheckboxChange,
    handleGroupSelectAll,
    isGroupAllSelected,
    handleReqGbChange,
    handleProNatureChange,
    handleBusinessContentChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
    chargeDeptOptions,
    chargeDeptLoading,
  };
}
