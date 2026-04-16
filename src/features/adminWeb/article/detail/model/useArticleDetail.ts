import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArticleService,
  Article,
  ArticleDetailParams,
  ArticleDetailResponse,
  ArticleUpdateParams,
  ArticleUpdateResponse,
  ArticleFileItem,
} from "@/entities/adminWeb/article/api/articleApi";
import { BoardService } from "@/entities/adminWeb/board/api";
import { ApiError, TokenUtils } from "@/shared/lib/apiClient";
import { downloadEdreamAttachment } from "@/shared/lib";
import {
  ARCHIVE_REGISTER_IMAGE_MAX,
  archiveRowHasImage,
  buildArchiveImageSubmitParts,
  createArchiveImageRowId,
  ensureTrailingEmptySlot,
  type ArchiveImageRow,
} from "../../register/model/useArticleRegister";

/**
 * NTT_IMG_FILE_ID가 JSON number로 오면 JS 정밀도 한계(안전 정수 2^53-1)를 넘어 값이 깨짐.
 * nttImgFileList[].fileId는 서버에서 문자열로 내려보내므로, 수정 요청 시 그룹 ID로 우선 사용.
 */
function resolveNttImgFileIdForForm(
  detail: Article,
  imgList: ArticleFileItem[],
): string {
  if (
    imgList.length > 0 &&
    imgList[0].fileId != null &&
    String(imgList[0].fileId).trim() !== ""
  ) {
    return String(imgList[0].fileId);
  }
  const raw =
    detail.nttImgFileId ??
    detail.NTT_IMG_FILE_ID ??
    detail.nttImgUrl ??
    detail.NTT_IMG_URL ??
    "";
  return raw === null || raw === undefined ? "" : String(raw);
}

export interface ArticleDetailFormData {
  nttSj: string;
  noticeAt: string;
  ntcrStartDt: string;
  ntcrEndDt: string;
  sttusCode: string;
  nttCn: string;
  bbsId: string;
  nttId: string;
  atchFileId: string;
  ntcrNm: string;
  rdcnt: string;
  ntcrDt: string;
  password: string; // 비밀글 비밀번호 변경용 (서버에서 내려주지 않음, 변경 시에만 입력)
  answerAt: string; // 답글 여부 (Y/N) - 답글일 때 단순 폼 표시, 비밀번호 필드 숨김
  nttData1: string; // 지정별
  nttData2: string; // 지정일
  nttData3: string; // 연대/시대
  nttData4: string; // 소재지
  nttData5: string; // 자료출처
  nttData6: string; // 소개
  nttImgFileId: string; // 대표 이미지 파일ID
}

export interface ArticleDetailErrors {
  nttSj?: string;
  nttCn?: string;
  ntcrStartDt?: string;
  ntcrEndDt?: string;
  password?: string;
  nttData5?: string;
  nttData6?: string;
  nttImgFileId?: string;
}

export function useArticleDetail(articleId: string, bbsId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlBbsNm = searchParams?.get("bbsNm") ?? "";
  const urlSearchCondition = searchParams?.get("searchCondition") ?? "1";
  const urlSearchKeyword = searchParams?.get("searchKeyword") ?? "";
  const urlPage = searchParams?.get("page") ?? "1";

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ArticleDetailErrors>({});
  const [formData, setFormData] = useState<ArticleDetailFormData | null>(null);
  const [atchFileCnt, setAtchFileCnt] = useState<number>(0); // 게시판 파일 개수
  const [secretYn, setSecretYn] = useState<string>("N"); // 게시판 비밀글 사용 여부
  const [bbsSe, setBbsSe] = useState<string>("");
  const [fileList, setFileList] = useState<ArticleFileItem[]>([]); // 상세 API에서 받은 첨부파일 목록
  /** NTT_IMG_FILE_ID 그룹 이미지(아카이브 다중) */
  const [nttImgFileList, setNttImgFileList] = useState<ArticleFileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]); // 새로 선택한 파일 (수정 시)
  const [archiveImageRows, setArchiveImageRows] = useState<ArchiveImageRow[]>(
    () => [{ id: createArchiveImageRowId(), file: null }],
  );
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");

  // 조회수 증가가 이미 호출되었는지 추적 (React Strict Mode로 인한 중복 호출 방지)
  const viewCountUpdatedRef = useRef(false);

  const removeArchiveImageRow = useCallback((rowId: string) => {
    setArchiveImageRows((rows) => {
      let next: ArchiveImageRow[];
      if (rows.length <= 1) {
        next = rows.map((r) =>
          r.id === rowId
            ? { ...r, file: null, replaceTargetSeq: undefined }
            : r,
        );
      } else {
        next = rows.filter((r) => r.id !== rowId);
      }
      return ensureTrailingEmptySlot(next);
    });
    setErrors((prev) => ({ ...prev, nttImgFileId: undefined }));
  }, []);

  const reorderArchiveImageRows = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setArchiveImageRows((rows) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= rows.length ||
        toIndex >= rows.length
      ) {
        return rows;
      }
      const next = [...rows];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return ensureTrailingEmptySlot(next);
    });
  }, []);

  // 게시판 상세 정보 조회하여 atchFileCnt 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      if (!bbsId) return;

      try {
        const response = await BoardService.getBoardDetail({ bbsId });

        if (response && typeof response === "object") {
          const responseAny = response as any;

          // 다양한 응답 구조 대응
          let detailData = responseAny.detail || responseAny.data?.detail;

          // detail 필드가 없고 응답 자체가 detail인 경우
          if (
            !detailData &&
            typeof responseAny === "object" &&
            !Array.isArray(responseAny)
          ) {
            const responseKeys = Object.keys(responseAny);
            if (
              responseKeys.length > 0 &&
              (responseAny.bbsId ||
                responseAny.BBS_ID ||
                responseAny.bbsNm ||
                responseAny.BBS_NM)
            ) {
              detailData = responseAny;
            }
          }

          // data가 직접 detail인 경우
          if (
            !detailData &&
            responseAny.data &&
            typeof responseAny.data === "object" &&
            !Array.isArray(responseAny.data)
          ) {
            const dataKeys = Object.keys(responseAny.data);
            if (
              dataKeys.length > 0 &&
              (responseAny.data.bbsId ||
                responseAny.data.BBS_ID ||
                responseAny.data.bbsNm ||
                responseAny.data.BBS_NM)
            ) {
              detailData = responseAny.data;
            }
          }

          if (detailData && typeof detailData === "object") {
            // camelCase와 UPPER_SNAKE_CASE 모두 확인
            const fileCntStr =
              detailData.atchFileCnt || detailData.ATCH_FILE_CNT || "0";
            const fileCnt = parseInt(String(fileCntStr), 10);
            setAtchFileCnt(isNaN(fileCnt) ? 0 : fileCnt);
            const secret = detailData.secretYn ?? detailData.SECRET_YN ?? "N";
            setSecretYn(String(secret));
            const bbsSeValue = detailData.bbsSe ?? detailData.BBS_SE ?? "";
            setBbsSe(String(bbsSeValue));
          } else {
            setAtchFileCnt(0);
            setSecretYn("N");
            setBbsSe("");
          }
        } else {
          setAtchFileCnt(0);
          setSecretYn("N");
          setBbsSe("");
        }
      } catch (err) {
        // 게시판 상세 조회 실패 시 기본값 사용
        setAtchFileCnt(0);
        setSecretYn("N");
        setBbsSe("");
      }
    };

    fetchBoardDetail();
  }, [bbsId]);

  // 게시글 상세 조회
  useEffect(() => {
    // 조회수 증가 플래그 초기화 (articleId나 bbsId가 변경될 때)
    viewCountUpdatedRef.current = false;

    const fetchArticleDetail = async () => {
      if (!articleId || !bbsId) {
        setError("게시글 ID 또는 게시판 ID가 필요합니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        TokenUtils.debugToken();

        if (!TokenUtils.isTokenValid()) {
          console.error(
            "토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.",
          );
          setError("로그인이 필요합니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
          return;
        }

        const params: ArticleDetailParams = {
          nttId: articleId,
          bbsId: bbsId,
        };

        const response = await ArticleService.getArticleDetail(params);

        if (response.result === "00" && response.detail) {
          const detail = response.detail as Article;
          const imgList = Array.isArray(
            (response as ArticleDetailResponse).nttImgFileList,
          )
            ? ((response as ArticleDetailResponse).nttImgFileList as ArticleFileItem[])
            : [];
          setNttImgFileList(imgList);
          setFormData({
            nttSj: detail.nttSj || "",
            noticeAt: detail.noticeAt || "N",
            ntcrStartDt: detail.ntcrStartDt || "",
            ntcrEndDt: detail.ntcrEndDt || "",
            sttusCode: detail.sttusCode || "A",
            nttCn: detail.nttCn || "",
            bbsId: detail.bbsId || "",
            nttId: detail.nttId || "",
            atchFileId: detail.atchFileId || "",
            ntcrNm: detail.ntcrNm || "",
            rdcnt: detail.rdcnt || "0",
            ntcrDt: detail.ntcrDt || "",
            password: "", // 서버에서 내려주지 않음
            answerAt: detail.answerAt ?? detail.ANSWER_AT ?? "N",
            nttData1: detail.nttData1 ?? detail.NTT_DATA1 ?? "",
            nttData2: detail.nttData2 ?? detail.NTT_DATA2 ?? "",
            nttData3: detail.nttData3 ?? detail.NTT_DATA3 ?? "",
            nttData4: detail.nttData4 ?? detail.NTT_DATA4 ?? "",
            nttData5: detail.nttData5 ?? detail.NTT_DATA5 ?? "",
            nttData6: detail.nttData6 ?? detail.NTT_DATA6 ?? "",
            nttImgFileId: resolveNttImgFileIdForForm(detail, imgList),
          });
          setFileList(
            Array.isArray((response as ArticleDetailResponse).fileList)
              ? (response as ArticleDetailResponse).fileList!
              : [],
          );
          if (imgList.length > 0) {
            const sorted = [...imgList].sort(
              (a, b) => Number(a.seq) - Number(b.seq),
            );
            setArchiveImageRows(
              ensureTrailingEmptySlot(
                sorted.map((item) => ({
                  id: createArchiveImageRowId(),
                  file: null,
                  serverFileId: String(item.fileId),
                  serverSeq: String(item.seq),
                  serverSaveNm:
                    item.saveNm != null ? String(item.saveNm) : undefined,
                })),
              ),
            );
          } else {
            const rawImg = String(
              detail.nttImgFileId ??
                detail.NTT_IMG_FILE_ID ??
                detail.nttImgUrl ??
                detail.NTT_IMG_URL ??
                "",
            ).trim();
            if (/^\d+$/.test(rawImg)) {
              setArchiveImageRows(
                ensureTrailingEmptySlot([
                  {
                    id: createArchiveImageRowId(),
                    file: null,
                    serverFileId: rawImg,
                    serverSeq: "0",
                  },
                ]),
              );
            } else {
              setArchiveImageRows([
                { id: createArchiveImageRowId(), file: null },
              ]);
            }
          }

          // 조회수 증가 API 호출 (한 번만 호출되도록 체크)
          // React Strict Mode로 인한 중복 호출 방지
          if (!viewCountUpdatedRef.current) {
            viewCountUpdatedRef.current = true;
            try {
              await ArticleService.updateViewCount(params);
            } catch (viewCountError) {
              // 조회수 증가 실패는 로그만 남기고 계속 진행
              console.warn("조회수 증가 실패:", viewCountError);
              // 실패 시 플래그를 다시 false로 설정하여 재시도 가능하도록
              viewCountUpdatedRef.current = false;
            }
          }
        } else {
          throw new Error("게시글 상세 정보를 불러올 수 없습니다.");
        }
      } catch (err) {
        console.error("게시글 상세 조회 실패:", err);

        if (err instanceof ApiError) {
          if (err.status === 401) {
            console.error("❌ 401 Unauthorized - 인증 실패");
            TokenUtils.debugToken();
            setError("인증에 실패했습니다. 다시 로그인해주세요.");
            setTimeout(() => {
              window.location.href = "/adminWeb/login";
            }, 2000);
          } else {
            setError(err.message);
          }
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "게시글 상세 정보를 불러오는 중 오류가 발생했습니다.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetail();
  }, [articleId, bbsId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
    // 해당 필드의 에러 제거
    if (errors[name as keyof ArticleDetailErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /** 리치 에디터(Quill) 등에서 HTML 내용 변경 시 사용 */
  const handleContentChange = (name: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
    if (errors[name as keyof ArticleDetailErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
    // 해당 필드의 에러 제거
    if (errors[name as keyof ArticleDetailErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setSelectedFiles((prev) => {
      const remain = Math.max(0, atchFileCnt - fileList.length - prev.length);
      if (remain <= 0) return prev;
      const toAdd = fileArray.slice(0, remain).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleArchiveImageSelected = useCallback(
    (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setMessageDialogTitle("파일 형식 오류");
        setMessageDialogMessage("이미지 파일만 업로드할 수 있습니다.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      setArchiveImageRows((rows) => {
        const updated = rows.map((r) => {
          if (r.id !== rowId) return r;
          const hadServer =
            r.serverSeq != null &&
            String(r.serverSeq).trim() !== "" &&
            r.serverFileId != null &&
            String(r.serverFileId).trim() !== "";
          const replaceTargetSeq = hadServer ? Number(r.serverSeq) : undefined;
          return {
            ...r,
            file,
            replaceTargetSeq:
              hadServer && !Number.isNaN(replaceTargetSeq)
                ? replaceTargetSeq
                : undefined,
            serverFileId: undefined,
            serverSeq: undefined,
            serverSaveNm: undefined,
          };
        });
        return ensureTrailingEmptySlot(updated);
      });
      setErrors((prev) =>
        prev.nttImgFileId ? { ...prev, nttImgFileId: undefined } : prev,
      );
    },
    [],
  );

  /** 기존 첨부파일 1건 삭제 (API 호출 후 fileList에서 제거). fileId/seq는 문자열로 전달해 JS 정수 오차 방지. */
  const handleDeleteFile = async (fileId: string, seq: string) => {
    if (!formData) return;
    try {
      const response = await ArticleService.deleteArticleFile({
        fileId,
        seq,
        bbsId: formData.bbsId || "",
        nttId: formData.nttId || "",
      });
      if (response.result === "00") {
        const wasOnlyFile =
          fileList.length === 1 &&
          fileList[0].fileId === fileId &&
          fileList[0].seq === seq;
        setFileList((prev) =>
          prev.filter((f) => !(f.fileId === fileId && f.seq === seq)),
        );
        if (wasOnlyFile) {
          setFormData((p) => (p ? { ...p, atchFileId: "" } : null));
        }
        setMessageDialogTitle("삭제 완료");
        setMessageDialogMessage("삭제가 완료되었습니다.");
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("파일 삭제 실패");
        setMessageDialogMessage(
          response.message || "파일을 삭제하는 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("첨부파일 삭제 실패:", err);
      setMessageDialogTitle("파일 삭제 실패");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : "파일을 삭제하는 중 오류가 발생했습니다.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: ArticleDetailErrors = {};
    let isValid = true;

    // 게시글 제목 필수 체크
    if (!formData.nttSj.trim()) {
      newErrors.nttSj = "게시글 제목을 입력해주세요.";
      isValid = false;
    }

    // 게시기간 필수 체크
    if (!formData.ntcrStartDt.trim()) {
      newErrors.ntcrStartDt = "게시기간 시작일을 선택해주세요.";
      isValid = false;
    }
    if (!formData.ntcrEndDt.trim()) {
      newErrors.ntcrEndDt = "게시기간 종료일을 선택해주세요.";
      isValid = false;
    }

    // 게시기간 유효성 검사 (시작일이 종료일보다 크면 안됨)
    if (formData.ntcrStartDt && formData.ntcrEndDt) {
      const startDate = new Date(formData.ntcrStartDt);
      const endDate = new Date(formData.ntcrEndDt);
      if (startDate > endDate) {
        newErrors.ntcrEndDt = "종료일은 시작일보다 이후여야 합니다.";
        isValid = false;
      }
    }

    const isArchiveBoard = bbsSe === "BBST03";
    if (isArchiveBoard) {
      if (!formData.nttData6.trim()) {
        newErrors.nttData6 = "소개를 입력해주세요.";
        isValid = false;
      }
      if (!formData.nttData5.trim()) {
        newErrors.nttData5 = "자료출처를 입력해주세요.";
        isValid = false;
      }
      const hasArchiveInRows = archiveImageRows.some((r) =>
        archiveRowHasImage(r),
      );
      if (!hasArchiveInRows) {
        newErrors.nttImgFileId = "이미지를 등록해주세요.";
        isValid = false;
      }
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
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }

    return isValid;
  };

  // 게시글 수정 (nttCnOverride: 에디터 ref에서 직접 가져온 최신 HTML)
  const handleEdit = async (nttCnOverride?: string) => {
    if (!formData) return;

    if (!validateForm()) {
      return;
    }

    try {
      setUpdating(true);
      setError("");

      TokenUtils.debugToken();

      if (!TokenUtils.isTokenValid()) {
        console.error("토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.");
        setMessageDialogTitle("인증 오류");
        setMessageDialogMessage("로그인이 필요합니다. 다시 로그인해주세요.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      // sessionStorage에서 user 객체를 가져와서 uniqId와 name 추출
      const userStr = sessionStorage.getItem("user");
      let uniqId = "";
      let name = "";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || "";
          name = user.name || "";
        } catch (e) {
          console.error("세션에서 사용자 정보를 파싱하는 중 오류 발생:", e);
        }
      }

      // 답글은 비밀번호 미사용
      const hasPassword =
        secretYn === "Y" &&
        formData.answerAt !== "Y" &&
        formData.password !== undefined &&
        String(formData.password).trim() !== "";

      const archiveParts =
        bbsSe === "BBST03"
          ? buildArchiveImageSubmitParts(archiveImageRows)
          : null;

      const params: ArticleUpdateParams = {
        nttId: formData.nttId,
        bbsId: formData.bbsId,
        nttSj: formData.nttSj,
        nttCn: nttCnOverride !== undefined ? nttCnOverride : formData.nttCn,
        noticeAt: formData.noticeAt,
        ntcrStartDt: formData.ntcrStartDt,
        ntcrEndDt: formData.ntcrEndDt,
        sttusCode: formData.sttusCode,
        ...(bbsSe === "BBST03"
          ? {
              nttData5: formData.nttData5,
              nttData6: formData.nttData6,
            }
          : {
              nttData1: formData.nttData1,
              nttData2: formData.nttData2,
              nttData3: formData.nttData3,
              nttData4: formData.nttData4,
              nttData5: formData.nttData5,
              nttData6: formData.nttData6,
            }),
        nttImgFileId: formData.nttImgFileId,
        ...(archiveParts
          ? {
              ...(archiveParts.archiveImageFiles.length > 0
                ? {
                    archiveImageFiles: archiveParts.archiveImageFiles,
                    archiveImageFileSeqs: archiveParts.archiveImageFileSeqs,
                    archiveImageFileReplaceSeqs:
                      archiveParts.archiveImageFileReplaceSeqs,
                  }
                : {}),
              archiveImageOrder: archiveParts.archiveImageOrder,
            }
          : {}),
        atchFileId: formData.atchFileId ?? "",
        articleFiles:
          selectedFiles.length > 0
            ? selectedFiles.map((item) => item.file)
            : undefined,
        uniqId: uniqId,
        name: name,
        ...(secretYn === "Y" &&
          formData.answerAt !== "Y" && {
            password:
              formData.password?.trim() !== ""
                ? formData.password?.trim()
                : undefined,
            secretAt: hasPassword ? "Y" : undefined,
          }),
      };

      const response = await ArticleService.updateArticle(params);

      if (response.result === "00") {
        setMessageDialogTitle("수정 완료");
        setMessageDialogMessage(
          response.message || "정상적으로 수정되었습니다.",
        );
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        throw new Error(response.message || "게시글 수정에 실패했습니다.");
      }
    } catch (err) {
      console.error("게시글 수정 실패:", err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error("❌ 401 Unauthorized - 인증 실패");
          TokenUtils.debugToken();
          setMessageDialogTitle("인증 오류");
          setMessageDialogMessage("인증에 실패했습니다. 다시 로그인해주세요.");
          setMessageDialogType("danger");
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setMessageDialogTitle("수정 실패");
          setMessageDialogMessage(
            err.message || "게시글 수정 중 오류가 발생했습니다.",
          );
          setMessageDialogType("danger");
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "게시글 수정 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === "success") {
      // 수정 성공 시 게시글 상세 정보를 다시 조회하여 최신 데이터로 업데이트
      const fetchArticleDetail = async () => {
        if (!articleId || !bbsId) return;

        try {
          setLoading(true);
          setError("");

          const params: ArticleDetailParams = {
            nttId: articleId,
            bbsId: bbsId,
          };

          const response = await ArticleService.getArticleDetail(params);

          if (response.result === "00" && response.detail) {
            const detail = response.detail as Article;
            const imgListAfter = Array.isArray(
              (response as ArticleDetailResponse).nttImgFileList,
            )
              ? ((response as ArticleDetailResponse).nttImgFileList as ArticleFileItem[])
              : [];
            setNttImgFileList(imgListAfter);
            setFormData({
              nttSj: detail.nttSj || "",
              noticeAt: detail.noticeAt || "N",
              ntcrStartDt: detail.ntcrStartDt || "",
              ntcrEndDt: detail.ntcrEndDt || "",
              sttusCode: detail.sttusCode || "A",
              nttCn: detail.nttCn || "",
              bbsId: detail.bbsId || "",
              nttId: detail.nttId || "",
              atchFileId: detail.atchFileId || "",
              ntcrNm: detail.ntcrNm || "",
              rdcnt: detail.rdcnt || "0",
              ntcrDt: detail.ntcrDt || "",
              password: "",
              answerAt: detail.answerAt ?? (detail as any).ANSWER_AT ?? "N",
              nttData1: detail.nttData1 ?? detail.NTT_DATA1 ?? "",
              nttData2: detail.nttData2 ?? detail.NTT_DATA2 ?? "",
              nttData3: detail.nttData3 ?? detail.NTT_DATA3 ?? "",
              nttData4: detail.nttData4 ?? detail.NTT_DATA4 ?? "",
              nttData5: detail.nttData5 ?? detail.NTT_DATA5 ?? "",
              nttData6: detail.nttData6 ?? detail.NTT_DATA6 ?? "",
              nttImgFileId: resolveNttImgFileIdForForm(detail, imgListAfter),
            });
            setFileList(
              Array.isArray((response as ArticleDetailResponse).fileList)
                ? (response as ArticleDetailResponse).fileList!
                : [],
            );
            if (imgListAfter.length > 0) {
              const sortedAfter = [...imgListAfter].sort(
                (a, b) => Number(a.seq) - Number(b.seq),
              );
              setArchiveImageRows(
                ensureTrailingEmptySlot(
                  sortedAfter.map((item) => ({
                    id: createArchiveImageRowId(),
                    file: null,
                    serverFileId: String(item.fileId),
                    serverSeq: String(item.seq),
                    serverSaveNm:
                      item.saveNm != null ? String(item.saveNm) : undefined,
                  })),
                ),
              );
            } else {
              const rawImg = String(
                detail.nttImgFileId ??
                  detail.NTT_IMG_FILE_ID ??
                  detail.nttImgUrl ??
                  detail.NTT_IMG_URL ??
                  "",
              ).trim();
              if (/^\d+$/.test(rawImg)) {
                setArchiveImageRows(
                  ensureTrailingEmptySlot([
                    {
                      id: createArchiveImageRowId(),
                      file: null,
                      serverFileId: rawImg,
                      serverSeq: "0",
                    },
                  ]),
                );
              } else {
                setArchiveImageRows([
                  { id: createArchiveImageRowId(), file: null },
                ]);
              }
            }
            // 수정 시 새로 추가했던 파일 목록 비우기 (서버 fileList에 반영되었으므로 중복 표시 방지)
            setSelectedFiles([]);
          }
        } catch (err) {
          console.error("게시글 상세 재조회 실패:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchArticleDetail();
    }
  };

  const downloadExistingAttachment = useCallback(
    async (
      fileId: string | number,
      seq: string | number,
      fallbackFileName?: string,
    ) => {
      if (fileId === "" || fileId == null || seq === "" || seq == null) {
        setMessageDialogTitle("다운로드 실패");
        setMessageDialogMessage("파일 정보가 올바르지 않습니다.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      try {
        await downloadEdreamAttachment(fileId, seq, fallbackFileName);
      } catch (err) {
        setMessageDialogTitle("다운로드 실패");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "파일 다운로드 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    },
    [],
  );

  // 목록으로 돌아가기 (상태 유지)
  const handleList = () => {
    const params = new URLSearchParams();
    if (bbsId) params.set("bbsId", bbsId);
    if (urlBbsNm) params.set("bbsNm", urlBbsNm);
    if (urlSearchCondition) params.set("searchCondition", urlSearchCondition);
    if (urlSearchKeyword) params.set("searchKeyword", urlSearchKeyword);
    if (urlPage && urlPage !== "1") params.set("page", urlPage);

    const queryString = params.toString();
    router.push(
      queryString
      ? `/adminWeb/board/list/article/list?${queryString}`
      : "/adminWeb/board/list/article/list",
    );
  };

  return {
    formData,
    loading,
    updating,
    error,
    errors,
    atchFileCnt,
    secretYn,
    bbsSe,
    fileList,
    nttImgFileList,
    selectedFiles,
    archiveImageRows,
    archiveImageMax: ARCHIVE_REGISTER_IMAGE_MAX,
    removeArchiveImageRow,
    reorderArchiveImageRows,
    handleArchiveImageSelected,
    handleFilesSelected,
    removeFile,
    handleDeleteFile,
    downloadExistingAttachment,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleContentChange,
    handleRadioChange,
    handleDateChange,
    handleEdit,
    handleList,
    handleMessageDialogClose,
  };
}
