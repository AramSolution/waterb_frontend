import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleService } from '@/entities/adminWeb/article/api';
import { ApiError } from '@/shared/lib/apiClient';

interface ArticleReplyFormData {
  parentNttSj: string; // 본문제목 (readonly)
  nttSj: string; // 답글제목
  nttCn: string; // 게시글 내용
  bbsId: string; // 게시판ID
  parntscttid: string; // 부모 게시글ID
}

interface ArticleReplyErrors {
  nttSj?: string;
  nttCn?: string;
}

export function useArticleReply() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 정보 가져오기
  const urlBbsId = searchParams?.get('bbsId') ?? '';
  const urlBbsNm = searchParams?.get('bbsNm') ?? '';
  const urlParntscttid = searchParams?.get('parntscttid') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ArticleReplyFormData>({
    parentNttSj: '', // 본문제목 (부모 게시글에서 가져옴)
    nttSj: '', // 답글제목
    nttCn: '', // 게시글 내용
    bbsId: urlBbsId,
    parntscttid: urlParntscttid,
  });

  const [errors, setErrors] = useState<ArticleReplyErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('danger');

  // 부모 게시글 정보 조회
  useEffect(() => {
    const fetchParentArticle = async () => {
      if (!urlBbsId || !urlParntscttid) return;

      try {
        const response = await ArticleService.getArticleDetail({
          nttId: urlParntscttid,
          bbsId: urlBbsId,
        });

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
            ((response as any).nttId || (response as any).bbsId)
          ) {
            detailData = response;
          }
        }

        if (detailData && typeof detailData === 'object') {
          const parentNttSj =
            (detailData as any).nttSj || (detailData as any).NTT_SJ || '';
          // 답글 제목에 "RE: " + 본문제목을 기본값으로 설정
          const replyTitle = parentNttSj ? `RE:${parentNttSj}` : '';
          setFormData((prev) => ({
            ...prev,
            parentNttSj,
            nttSj: replyTitle, // 답글 제목에 "RE: " + 본문제목 설정
            bbsId: urlBbsId,
            parntscttid: urlParntscttid,
          }));
        }
      } catch (err) {
        console.error('부모 게시글 조회 실패:', err);
        setError('부모 게시글 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchParentArticle();
  }, [urlBbsId, urlParntscttid]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 해당 필드의 에러 제거
    if (errors[name as keyof ArticleReplyErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /** 리치 에디터(Quill) 등에서 HTML 내용 변경 시 사용 */
  const handleContentChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof ArticleReplyErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ArticleReplyErrors = {};

    // 답글제목 필수 체크
    if (!formData.nttSj.trim()) {
      newErrors.nttSj = '답글 제목을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** nttCnOverride: 리치 에디터 ref.getValue() — 표 HTML 정리 반영 */
  const handleSubmit = async (e: React.FormEvent, nttCnOverride?: string) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const nttCnToSave =
      nttCnOverride !== undefined ? nttCnOverride : formData.nttCn;

    setLoading(true);
    setError('');

    try {
      // sessionStorage에서 user 객체를 가져와서 uniqId와 name 추출
      const userStr = sessionStorage.getItem('user');
      let uniqId = '';
      let name = '';

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || '';
          name = user.name || '';
        } catch (error) {
          console.error('user 객체 파싱 오류:', error);
        }
      }

      // 답글 등록 API 호출
      // 백엔드에서 answerAt="Y"이고 nttId(부모 게시글 ID)가 있으면 답글 처리
      const formDataToSend = new FormData();
      formDataToSend.append('bbsId', formData.bbsId);
      formDataToSend.append('nttId', formData.parntscttid); // 부모 게시글 ID를 nttId로 전달
      formDataToSend.append('nttSj', formData.nttSj);
      formDataToSend.append('nttCn', nttCnToSave);
      formDataToSend.append('boardInfo1', nttCnToSave); // 백엔드에서 boardInfo1로도 받음
      formDataToSend.append('answerAt', 'Y'); // 답글 여부 (필수)
      formDataToSend.append('noticeAt', 'N'); // 답글은 공지 아님
      formDataToSend.append('sttusCode', 'A'); // 상태코드 (A: 사용)

      if (uniqId) {
        formDataToSend.append('uniqId', uniqId);
      }
      if (name) {
        formDataToSend.append('name', name);
      }

      const replyResponse =
        await ArticleService.createArticleReply(formDataToSend);

      // 응답 확인
      if (replyResponse.result === '00' || replyResponse.result === 'success') {
        setMessageDialogTitle('등록 완료');
        setMessageDialogMessage(
          replyResponse.message || '답글이 성공적으로 등록되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);
      } else {
        throw new ApiError(
          0,
          replyResponse.message || '답글 등록 중 오류가 발생했습니다.',
        );
      }
    } catch (err) {
      console.error('답글 등록 오류:', err);
      if (err instanceof ApiError) {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage(
          err.message || '답글 등록 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
      } else {
        setMessageDialogTitle('등록 실패');
        setMessageDialogMessage('답글 등록 중 알 수 없는 오류가 발생했습니다.');
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
      // 등록 성공 시 게시글 목록으로 이동
      const params = new URLSearchParams();
      if (formData.bbsId) params.set('bbsId', formData.bbsId);
      if (urlBbsNm) params.set('bbsNm', urlBbsNm);
      router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
    }
  };

  const handleCancel = () => {
    // 게시글 목록으로 이동
    const params = new URLSearchParams();
    if (formData.bbsId) params.set('bbsId', formData.bbsId);
    if (urlBbsNm) params.set('bbsNm', urlBbsNm);
    router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
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
    handleContentChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
  };
}
