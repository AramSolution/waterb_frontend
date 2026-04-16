'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/lib';
import { API_ENDPOINTS, USER_BOARD_BBS_IDS } from '@/shared/config/apiUser';
import { AlertModal } from '@/shared/ui/userWeb';
import type { AlertModalType } from '@/shared/ui/userWeb';

/**
 * communityWrite.html → React
 * 원본: source/gunsan/communityWrite.html
 * 로그인 없음: NTCR_ID = USRCNFRM_99999999999 고정, bbsId = BBS_0000000000000005
 * 폼: 작성자명, 비밀번호, 문의내용, 첨부파일. 유효성 실패 시 AlertModal + 해당 필드 포커스.
 */
const INQUIRY_NTCR_ID = 'USRCNFRM_99999999999';
const ICON = '/images/userWeb/icon';

type FileItem = { id: string; name: string; file: File };
type FocusAfterAlert = 'writeName' | 'qnaContent' | null;

export default function CommunityWriteSection() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [secretYn, setSecretYn] = useState<'Y' | 'N' | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertModalType>('danger');
  const focusAfterAlertRef = useRef<FocusAfterAlert>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bbsId = USER_BOARD_BBS_IDS.INQUIRY;

  useEffect(() => {
    let cancelled = false;
    const url = `${API_ENDPOINTS.USER_ARTICLE_BOARD_SETTINGS}?bbsId=${encodeURIComponent(bbsId)}`;
    apiClient
      .get<{ secretYn?: string }>(url)
      .then((res) => {
        if (!cancelled) {
          const yn = res?.secretYn?.trim() === 'Y' ? 'Y' : 'N';
          setSecretYn(yn);
        }
      })
      .catch(() => {
        if (!cancelled) setSecretYn('N');
      });
    return () => {
      cancelled = true;
    };
  }, [bbsId]);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const next: FileItem[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      next.push({ id: `${Date.now()}-${i}`, name: f.name, file: f });
    }
    setFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const handleFileDel = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const showAlert = (
    title: string,
    message: string,
    type: AlertModalType = 'danger',
    focusAfter: FocusAfterAlert = null,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    focusAfterAlertRef.current = focusAfter;
    setShowAlertModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrim = name.trim();
    const contentTrim = content.trim();
    if (!nameTrim) {
      showAlert('안내', '작성자명을 입력해 주세요.', 'danger', 'writeName');
      return;
    }
    if (!contentTrim) {
      showAlert('안내', '문의내용을 입력해 주세요.', 'danger', 'qnaContent');
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append('bbsId', bbsId);
    formData.append('uniqId', INQUIRY_NTCR_ID);
    formData.append('name', nameTrim);
    const nttSj = contentTrim.slice(0, 50).replace(/\n/g, ' ') || '문의';
    formData.append('nttSj', nttSj);
    formData.append('nttCn', contentTrim);
    formData.append('boardInfo1', contentTrim);
    formData.append('noticeAt', 'N');
    formData.append('sttusCode', 'A');
    if (secretYn === 'Y' && password.trim()) {
      formData.append('password', password.trim());
      formData.append('secretAt', 'Y');
    }
    files.forEach((item) => formData.append('articleFiles', item.file));
    apiClient
      .post<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTICLE_REGISTER,
        formData,
      )
      .then((res) => {
        if (res?.result === '00') {
          router.push('/userWeb/community?tab=inquiry');
        } else {
          showAlert(
            '안내',
            res?.message || '등록에 실패했습니다.',
            'danger',
            null,
          );
          setSubmitting(false);
        }
      })
      .catch(() => {
        showAlert(
          '안내',
          '등록 중 오류가 발생했습니다. 다시 시도해 주세요.',
          'danger',
          null,
        );
        setSubmitting(false);
      });
  };

  return (
    <>
      <section className="mainViewVisual" aria-labelledby="visualTitle">
        <div className="mainViewVisualInner">
          <div id="visualTitle" className="mainViewVisualEng">
            COMMUNITY
          </div>
          <p className="mainViewVisualKor">꿈이음센터의 소식을 확인하세요</p>
        </div>
      </section>
      <div className="registrationContainer qnaRegister bizInput">
        <div className="inner">
          <form className="mainForm" onSubmit={handleSubmit}>
            <section className="formSection">
              <div className="sectionHeader">
                <div className="sectionTitle">문의하기</div>
              </div>
              <div className="formGrid">
                <div className="formRow">
                  <label htmlFor="writeName" className="formLabel">
                    작성자명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="writeName"
                      className="inputField"
                      placeholder="작성자명을 입력해주세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="writePw" className="formLabel">
                    비밀번호
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="writePw"
                      className="inputField"
                      placeholder="답변 조회 시 사용할 비밀번호 입력해주세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="qnaContent" className="formLabel">
                    문의내용
                  </label>
                  <div className="formControl">
                    <textarea
                      id="qnaContent"
                      className="textAreaField"
                      placeholder="문의내용을 입력해주세요"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="formRow">
                  <span className="formLabel">
                    첨부파일
                    <input
                      type="file"
                      id="fileInput"
                      className="hiddenInput"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileAdd}
                    />
                    <label
                      htmlFor="fileInput"
                      className="btnFileAdd"
                      aria-label="파일 첨부하기"
                    >
                      <img
                        src={`${ICON}/ico_file_add.png`}
                        alt=""
                        aria-hidden
                      />
                    </label>
                  </span>
                  <div className="formControl fileListContainer">
                    {files.map((file) => (
                      <div key={file.id} className="file">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="btnFileDel"
                          aria-label={`${file.name} 파일 삭제`}
                          onClick={() => handleFileDel(file.id)}
                        >
                          <img
                            src={`${ICON}/ico_file_del.png`}
                            alt=""
                            aria-hidden
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <div className="formActions">
              <button type="submit" className="btnSubmit" disabled={submitting}>
                {submitting ? '등록 중…' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          const which = focusAfterAlertRef.current;
          focusAfterAlertRef.current = null;
          if (which === 'writeName') {
            requestAnimationFrame(() =>
              document.getElementById('writeName')?.focus(),
            );
          } else if (which === 'qnaContent') {
            requestAnimationFrame(() =>
              document.getElementById('qnaContent')?.focus(),
            );
          }
        }}
      />
    </>
  );
}
