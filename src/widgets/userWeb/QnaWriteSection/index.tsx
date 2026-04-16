"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import {
  API_ENDPOINTS,
  getQnaBbsId,
  resolveUserWebBoardParams,
} from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { useUserWebAuth } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import { NoticeCommunityChrome } from "@/widgets/userWeb/NoticeCommunityChrome";

/**
 * `qnaWrite2.html` — `formGrid` 행 순서·라벨·placeholder·id 동일.
 * 연락처는 DB 컬럼 없이 본문(NTT_CN) 하단에 `연락처: …` 로 포함.
 * 비밀글 비밀번호는 게시판 설정(secretYn)이 Y일 때만 표시(HTML 정적본에는 없음).
 */
const INQUIRY_NTCR_ID = "USRCNFRM_99999999999";
const ICON = "/images/userWeb/icon";

type FileItem = { id: string; name: string; file: File };
type FocusAfterAlert = "writeName" | "title" | "qnaContent" | null;

function bodyWithOptionalContact(body: string, phoneTrim: string): string {
  if (!phoneTrim) return body;
  return `${body}\n\n연락처: ${phoneTrim}`;
}

export default function QnaWriteSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useUserWebAuth();
  const isGuest = !isAuthenticated;
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  /** 게시판 비밀글 사용 여부: Y면 비밀번호 입력란 표시, N이면 숨김 */
  const [secretYn, setSecretYn] = useState<"Y" | "N" | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("danger");
  const focusAfterAlertRef = useRef<FocusAfterAlert>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const boardParams = React.useMemo(() => {
    const userSe = isAuthenticated ? AuthService.getUserSe() : null;
    return resolveUserWebBoardParams(
      searchParams.get("reqGbPosition"),
      searchParams.get("type"),
      userSe,
    );
  }, [searchParams, isAuthenticated]);

  const bbsId = React.useMemo(
    () => getQnaBbsId(boardParams.reqGbPosition, boardParams.type),
    [boardParams],
  );
  const themeQuery = React.useMemo(() => {
    if (boardParams.type)
      return `type=${encodeURIComponent(boardParams.type)}`;
    if (boardParams.reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(boardParams.reqGbPosition)}`;
    return "";
  }, [boardParams]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated) return;
    const stored = sessionStorage.getItem("username");
    if (stored) setName(stored);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!bbsId) {
      setSecretYn("N");
      return;
    }
    let cancelled = false;
    const url = `${API_ENDPOINTS.USER_ARTICLE_BOARD_SETTINGS}?bbsId=${encodeURIComponent(bbsId)}`;
    apiClient
      .get<{ secretYn?: string }>(url)
      .then((res) => {
        if (!cancelled) {
          const yn = res?.secretYn?.trim() === "Y" ? "Y" : "N";
          setSecretYn(yn);
        }
      })
      .catch(() => {
        if (!cancelled) setSecretYn("N");
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
    e.target.value = "";
  };

  const handleFileDel = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const showAlert = (
    title: string,
    message: string,
    type: AlertModalType = "danger",
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
    const contentTrim = content.trim();

    if (isGuest) {
      const nameTrim = name.trim();
      const titleTrim = title.trim();
      const phoneTrim = phone.trim();
      if (!nameTrim) {
        showAlert("안내", "작성자명을 입력해 주세요.", "danger", "writeName");
        return;
      }
      if (!titleTrim) {
        showAlert("안내", "질문을 입력해 주세요.", "danger", "title");
        return;
      }
      if (!contentTrim) {
        showAlert("안내", "문의내용을 입력해 주세요.", "danger", "qnaContent");
        return;
      }
      const bodyStored = bodyWithOptionalContact(contentTrim, phoneTrim);
      setSubmitting(true);
      const formData = new FormData();
      formData.append("bbsId", bbsId);
      formData.append("uniqId", INQUIRY_NTCR_ID);
      formData.append("name", nameTrim);
      formData.append("nttSj", titleTrim);
      formData.append("nttCn", bodyStored);
      formData.append("boardInfo1", bodyStored);
      formData.append("noticeAt", "N");
      formData.append("sttusCode", "A");
      if (secretYn === "Y" && password.trim()) {
        formData.append("password", password.trim());
        formData.append("secretAt", "Y");
      }
      files.forEach((item) => formData.append("articleFiles", item.file));
      apiClient
        .post<{ result?: string; message?: string }>(
          API_ENDPOINTS.USER_ARTICLE_REGISTER,
          formData,
        )
        .then((res) => {
          if (res?.result === "00") {
            const listHref = themeQuery
              ? `/userWeb/qna?${themeQuery}`
              : "/userWeb/qna";
            router.push(listHref);
          } else {
            showAlert(
              "안내",
              res?.message || "등록에 실패했습니다.",
              "danger",
              null,
            );
            setSubmitting(false);
          }
        })
        .catch(() => {
          showAlert(
            "안내",
            "등록 중 오류가 발생했습니다. 다시 시도해 주세요.",
            "danger",
            null,
          );
          setSubmitting(false);
        });
      return;
    }

    const titleTrim = title.trim();
    const phoneTrim = phone.trim();
    if (!titleTrim) {
      showAlert("안내", "질문을 입력해 주세요.", "danger", "title");
      return;
    }
    if (!contentTrim) {
      showAlert("안내", "문의내용을 입력해 주세요.", "danger", "qnaContent");
      return;
    }
    const bodyStored = bodyWithOptionalContact(contentTrim, phoneTrim);
    const uniqId = AuthService.getEsntlId();
    const authorName =
      name ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("username")
        : null) ||
      "";
    if (!uniqId || !authorName) {
      showAlert("안내", "로그인 후 이용해 주세요.", "danger", null);
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append("bbsId", bbsId);
    formData.append("nttSj", titleTrim);
    formData.append("nttCn", bodyStored);
    formData.append("boardInfo1", bodyStored);
    formData.append("noticeAt", "N");
    formData.append("sttusCode", "A");
    formData.append("uniqId", uniqId);
    formData.append("name", authorName);
    if (secretYn === "Y" && password.trim()) {
      formData.append("password", password.trim());
      formData.append("secretAt", "Y");
    }
    files.forEach((item) => formData.append("articleFiles", item.file));
    apiClient
      .post<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTICLE_REGISTER,
        formData,
      )
      .then((res) => {
        if (res?.result === "00") {
          const listHref = themeQuery
            ? `/userWeb/qna?${themeQuery}`
            : "/userWeb/qna";
          router.push(listHref);
        } else {
          showAlert(
            "안내",
            res?.message || "등록에 실패했습니다.",
            "danger",
            null,
          );
          setSubmitting(false);
        }
      })
      .catch(() => {
        showAlert(
          "안내",
          "등록 중 오류가 발생했습니다. 다시 시도해 주세요.",
          "danger",
          null,
        );
        setSubmitting(false);
      });
  };

  return (
    <>
      <NoticeCommunityChrome
        themeQuery={themeQuery}
        shell="community"
        headTit="1:1 문의"
        breadcrumbCurrent="1:1 문의"
        activeNav="qna"
      >
        <section className="mainViewContent mt-40">
          <div className="registrationContainer bizInput">
            <form className="mainForm" onSubmit={handleSubmit}>
              <section className="formSection">
                <div className="formGrid">
                  {isGuest ? (
                    <>
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
                        <label htmlFor="title" className="formLabel">
                          질문
                        </label>
                        <div className="formControl">
                          <input
                            type="text"
                            id="title"
                            className="inputField"
                            placeholder="질문을 입력해주세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            aria-required="true"
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <label htmlFor="callNumber" className="formLabel">
                          연락처
                        </label>
                        <div className="formControl">
                          <input
                            type="text"
                            id="callNumber"
                            className="inputField"
                            placeholder="연락처를 입력해주세요"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
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
                      {secretYn === "Y" ? (
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
                      ) : null}
                    </>
                  ) : (
                    <>
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
                            readOnly
                            aria-readonly="true"
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <label htmlFor="title" className="formLabel">
                          질문
                        </label>
                        <div className="formControl">
                          <input
                            type="text"
                            id="title"
                            className="inputField"
                            placeholder="질문을 입력해주세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            aria-required="true"
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <label htmlFor="callNumber" className="formLabel">
                          연락처
                        </label>
                        <div className="formControl">
                          <input
                            type="text"
                            id="callNumber"
                            className="inputField"
                            placeholder="연락처를 입력해주세요"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
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
                      {secretYn === "Y" ? (
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
                      ) : null}
                    </>
                  )}
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
                  {submitting ? "등록 중…" : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </NoticeCommunityChrome>
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          const which = focusAfterAlertRef.current;
          focusAfterAlertRef.current = null;
          if (which === "writeName") {
            requestAnimationFrame(() =>
              document.getElementById("writeName")?.focus(),
            );
          } else if (which === "title") {
            requestAnimationFrame(() =>
              document.getElementById("title")?.focus(),
            );
          } else if (which === "qnaContent") {
            requestAnimationFrame(() =>
              document.getElementById("qnaContent")?.focus(),
            );
          }
        }}
      />
    </>
  );
}
