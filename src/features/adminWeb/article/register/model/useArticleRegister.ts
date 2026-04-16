import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ArchiveImageOrderEntry } from "@/entities/adminWeb/article/api/articleApi";
import { ArticleService } from "@/entities/adminWeb/article/api";
import { BoardService } from "@/entities/adminWeb/board/api";
import { ApiError } from "@/shared/lib/apiClient";

interface ArticleRegisterFormData {
  nttSj: string; // 게시글 제목
  noticeAt: string; // 공지여부 (Y/N)
  ntcrStartDt: string; // 게시기간 시작일
  ntcrEndDt: string; // 게시기간 종료일
  sttusCode: string; // 상태코드 (A/D)
  nttCn: string; // 게시글 내용
  bbsId: string; // 게시판ID
  password: string; // 비밀글 비밀번호 (게시판 SECRET_YN=Y일 때)
}

interface ArticleRegisterErrors {
  nttSj?: string;
  noticeAt?: string;
  ntcrStartDt?: string;
  ntcrEndDt?: string;
  sttusCode?: string;
  nttCn?: string;
  password?: string;
}

/** 아카이브(BBST03) 등록 시 추가 전달 — 소개·자료출처만 (지정별~소재지 미사용) */
export interface ArchiveRegisterPayload {
  nttData5?: string; // 자료출처
  nttData6?: string; // 소개
}

/** 아카이브 이미지 다중 선택 UI (최대 10행). 선택한 파일 전부 archiveImageFiles + seq로 등록 */
export const ARCHIVE_REGISTER_IMAGE_MAX = 10;

export type ArchiveImageRow = {
  id: string;
  file: File | null;
  /** 상세 수정: 서버에 저장된 이미지(행 단위로 미리보기·순서 유지) */
  serverFileId?: string;
  serverSeq?: string;
  /** ARTFILE.STRE_FILE_NM 등 저장 파일명 — 미리보기 URL 캐시 무효화용 */
  serverSaveNm?: string;
  /**
   * 기존 슬롯에 새 파일을 골랐을 때만: 교체 대상 ARTFILE.SEQ.
   * 저장 시 multipart에서 해당 seq 행을 update(추가 insert 아님).
   */
  replaceTargetSeq?: number;
};

export function createArchiveImageRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 로컬 파일 또는 서버 저장 이미지가 있는 슬롯(빈 업로드 칸 제외) */
export function archiveRowHasImage(r: ArchiveImageRow): boolean {
  if (r.file) return true;
  const fid = r.serverFileId != null ? String(r.serverFileId).trim() : "";
  const seq = r.serverSeq != null ? String(r.serverSeq).trim() : "";
  return fid !== "" && seq !== "";
}

/**
 * 마지막 슬롯에 이미지가 있고 전체가 10개 미만이면 오른쪽에 빈 업로드 칸 1개를 붙인다.
 * 업로드 직후·삭제 후·순서 변경 후·상세 로드 후에 호출해 자동 확장 UX를 맞춘다.
 */
export function ensureTrailingEmptySlot(rows: ArchiveImageRow[]): ArchiveImageRow[] {
  if (rows.length === 0) {
    return [{ id: createArchiveImageRowId(), file: null }];
  }
  if (rows.length >= ARCHIVE_REGISTER_IMAGE_MAX) return rows;
  const last = rows[rows.length - 1];
  if (!archiveRowHasImage(last)) return rows;
  return [...rows, { id: createArchiveImageRowId(), file: null }];
}

/** 슬롯 순서대로 multipart 파일·seq·서버 순서 명세 생성 (등록/수정 공통) */
export function buildArchiveImageSubmitParts(rows: ArchiveImageRow[]): {
  archiveImageFiles: File[];
  archiveImageFileSeqs: number[];
  archiveImageFileReplaceSeqs: number[];
  archiveImageOrder: ArchiveImageOrderEntry[];
} {
  const archiveImageFiles: File[] = [];
  const archiveImageFileSeqs: number[] = [];
  /** 백엔드와 동일 인덱스: -1 이면 append, >=0 이면 해당 seq 행 교체 */
  const archiveImageFileReplaceSeqs: number[] = [];
  const archiveImageOrder: ArchiveImageOrderEntry[] = [];
  let newIndex = 0;
  for (let slotIndex = 0; slotIndex < rows.length; slotIndex++) {
    const r = rows[slotIndex];
    if (r.file) {
      archiveImageFiles.push(r.file);
      archiveImageFileSeqs.push(slotIndex);
      const rep =
        r.replaceTargetSeq != null &&
        Number.isFinite(r.replaceTargetSeq) &&
        r.replaceTargetSeq >= 0
          ? Math.floor(r.replaceTargetSeq)
          : -1;
      archiveImageFileReplaceSeqs.push(rep);
      if (rep >= 0) {
        /** 교체 후에도 같은 seq이므로 existing으로 최종 순서만 잡으면 됨 */
        archiveImageOrder.push({ type: "existing", seq: rep });
      } else {
        archiveImageOrder.push({ type: "new", index: newIndex++ });
      }
    } else if (r.serverFileId != null && r.serverSeq != null) {
      archiveImageOrder.push({ type: "existing", seq: Number(r.serverSeq) });
    }
  }
  return {
    archiveImageFiles,
    archiveImageFileSeqs,
    archiveImageFileReplaceSeqs,
    archiveImageOrder,
  };
}

export function useArticleRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 게시판ID와 게시판명 가져오기
  const urlBbsId = searchParams?.get("bbsId") ?? "";
  const urlBbsNm = searchParams?.get("bbsNm") ?? "";

  // 당일 날짜 YYYY-MM-DD (게시기간 시작일 기본값용, 로컬 기준)
  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<ArticleRegisterFormData>({
    nttSj: "",
    noticeAt: "N", // 기본값: 미사용
    ntcrStartDt: getTodayString(), // 기본값: 당일
    ntcrEndDt: "9999-12-31", // 기본값: 9999-12-31
    sttusCode: "A", // 기본값: 사용
    nttCn: "", // 게시글 내용
    bbsId: urlBbsId,
    password: "",
  });

  const [atchFileCnt, setAtchFileCnt] = useState<number>(0); // 게시판 파일 개수
  const [secretYn, setSecretYn] = useState<string>("N"); // 게시판 비밀글 사용 여부
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]); // 첨부파일 목록 (adms documentManagement 방식)
  const [archiveImageRows, setArchiveImageRows] = useState<ArchiveImageRow[]>(
    () => [{ id: createArchiveImageRowId(), file: null }],
  );

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

  const handleArchiveImageSelected = useCallback(
    (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }
      setError("");
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
    },
    [],
  );

  const [errors, setErrors] = useState<ArticleRegisterErrors>({});
  const [bbsSe, setBbsSe] = useState<string>("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("danger");

  // URL 파라미터가 변경되면 bbsId 업데이트 및 게시판 상세 정보 조회
  useEffect(() => {
    if (!urlBbsId) {
      setBbsSe("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      bbsId: urlBbsId,
    }));

    // 게시판 상세 정보 조회하여 atchFileCnt, bbsSe 등 가져오기
    const fetchBoardDetail = async () => {
      try {
        const response = await BoardService.getBoardDetail({
          bbsId: urlBbsId,
        });

        if (response && typeof response === "object") {
          const responseAny = response as Record<string, unknown>;
          const dataField = responseAny.data;
          const nestedDetail =
            dataField &&
            typeof dataField === "object" &&
            !Array.isArray(dataField) &&
            "detail" in dataField
              ? (dataField as Record<string, unknown>).detail
              : undefined;

          // 다양한 응답 구조 대응
          let detailData = responseAny.detail ?? nestedDetail;

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
            const dataObj = responseAny.data as Record<string, unknown>;
            const dataKeys = Object.keys(dataObj);
            if (
              dataKeys.length > 0 &&
              (dataObj.bbsId ||
                dataObj.BBS_ID ||
                dataObj.bbsNm ||
                dataObj.BBS_NM)
            ) {
              detailData = dataObj;
            }
          }

          if (detailData && typeof detailData === "object") {
            const d = detailData as Record<string, unknown>;
            // camelCase와 UPPER_SNAKE_CASE 모두 확인
            const fileCntStr = d.atchFileCnt || d.ATCH_FILE_CNT || "0";
            const fileCnt = parseInt(String(fileCntStr), 10);
            setAtchFileCnt(isNaN(fileCnt) ? 0 : fileCnt);
            const secret = d.secretYn ?? d.SECRET_YN ?? "N";
            setSecretYn(String(secret));
            const bbsSeValue = String(d.bbsSe ?? d.BBS_SE ?? "");
            setBbsSe(bbsSeValue);
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
      } catch {
        // 게시판 상세 조회 실패 시 기본값 사용
        setAtchFileCnt(0);
        setSecretYn("N");
        setBbsSe("");
      }
    };

    fetchBoardDetail();
  }, [urlBbsId]);

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
    // 해당 필드의 에러 제거
    if (errors[name as keyof ArticleRegisterErrors]) {
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
    if (errors[name as keyof ArticleRegisterErrors]) {
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
    // 해당 필드의 에러 제거
    if (errors[name as keyof ArticleRegisterErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /** 첨부파일 추가 (adms documentManagement 방식: 아이콘 클릭으로 선택, 최대 atchFileCnt개) */
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setSelectedFiles((prev) => {
      const remain = Math.max(0, atchFileCnt - prev.length);
      if (remain <= 0) return prev;
      const toAdd = fileArray.slice(0, remain).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }));
      return [...prev, ...toAdd];
    });
  };

  /** 첨부파일 개별 삭제 */
  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const validateForm = (): boolean => {
    const newErrors: ArticleRegisterErrors = {};

    // 게시글 제목 필수 체크
    if (!formData.nttSj.trim()) {
      newErrors.nttSj = "게시글 제목을 입력해주세요.";
    }

    // 게시기간 시작일 필수 체크
    if (!formData.ntcrStartDt.trim()) {
      newErrors.ntcrStartDt = "시작일을 선택해주세요.";
    }

    // 게시기간 종료일 필수 체크
    if (!formData.ntcrEndDt.trim()) {
      newErrors.ntcrEndDt = "종료일을 선택해주세요.";
    }

    // 게시기간 날짜 순서 검증
    if (formData.ntcrStartDt && formData.ntcrEndDt) {
      if (formData.ntcrStartDt > formData.ntcrEndDt) {
        newErrors.ntcrEndDt = "종료일은 시작일 이후여야 합니다.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** nttCnOverride: 리치 에디터 ref.getValue() — 표 HTML 정리(deleteTableTemporary 등) 반영 */
  const handleSubmit = async (
    e: React.FormEvent,
    nttCnOverride?: string,
    archivePayload?: ArchiveRegisterPayload,
  ) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const nttCnToSave =
      nttCnOverride !== undefined ? nttCnOverride : formData.nttCn;

    setLoading(true);
    setError("");

    try {
      // sessionStorage에서 user 객체를 가져와서 uniqId와 name 추출
      const userStr = sessionStorage.getItem("user");
      let uniqId = "";
      let name = "";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || "";
          name = user.name || "";
        } catch (error) {
          console.error("user 객체 파싱 오류:", error);
        }
      }

      const articleFiles =
        selectedFiles.length > 0
          ? selectedFiles.map((item) => item.file)
          : undefined;

      const archiveParts =
        bbsSe === "BBST03"
          ? buildArchiveImageSubmitParts(archiveImageRows)
          : null;

      const hasPassword =
        secretYn === "Y" &&
        formData.password !== undefined &&
        String(formData.password).trim() !== "";

      const response = await ArticleService.createArticle({
        bbsId: formData.bbsId,
        nttSj: formData.nttSj,
        nttCn: nttCnToSave,
        noticeAt: formData.noticeAt,
        ntcrStartDt: formData.ntcrStartDt,
        ntcrEndDt: formData.ntcrEndDt,
        sttusCode: formData.sttusCode,
        uniqId: uniqId,
        name: name,
        articleFiles,
        ...archivePayload,
        ...(archiveParts &&
          archiveParts.archiveImageFiles.length > 0 && {
            archiveImageFiles: archiveParts.archiveImageFiles,
            archiveImageFileSeqs: archiveParts.archiveImageFileSeqs,
            archiveImageFileReplaceSeqs:
              archiveParts.archiveImageFileReplaceSeqs,
            archiveImageOrder: archiveParts.archiveImageOrder,
          }),
        ...(secretYn === "Y" && {
          password: formData.password?.trim() || undefined,
          secretAt: hasPassword ? "Y" : "N",
        }),
      });

      if (response.result === "00") {
        setMessageDialogTitle("등록 완료");
        setMessageDialogMessage(
          response.message || "게시글이 성공적으로 등록되었습니다.",
        );
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        throw new Error(response.message || "게시글 등록에 실패했습니다.");
      }
    } catch (err) {
      console.error("게시글 등록 오류:", err);
      if (err instanceof ApiError) {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(
          err.message || "게시글 등록 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      } else {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(
          "게시글 등록 중 알 수 없는 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      }
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === "success") {
      // 등록 성공 시 게시글 목록으로 이동
      const params = new URLSearchParams();
      if (formData.bbsId) params.set("bbsId", formData.bbsId);
      if (urlBbsNm) params.set("bbsNm", urlBbsNm);
      router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
    }
  };

  const handleCancel = () => {
    // 게시글 목록으로 이동
    const params = new URLSearchParams();
    if (formData.bbsId) params.set("bbsId", formData.bbsId);
    if (urlBbsNm) params.set("bbsNm", urlBbsNm);
    router.push(`/adminWeb/board/list/article/list?${params.toString()}`);
  };

  return {
    formData,
    bbsSe,
    loading,
    error,
    errors,
    atchFileCnt,
    secretYn,
    selectedFiles,
    archiveImageRows,
    archiveImageMax: ARCHIVE_REGISTER_IMAGE_MAX,
    removeArchiveImageRow,
    reorderArchiveImageRows,
    handleArchiveImageSelected,
    handleFilesSelected,
    removeFile,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleContentChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
  };
}

/** 게시판 유형(bbsSe)에 따른 등록 화면 페이지 제목·브레드크럼 라벨 */
export function getArticleRegisterPageTitle(bbsSe: string): string {
  if (bbsSe === "BBST03") return "아카이브 등록";
  if (bbsSe === "BBST02") return "갤러리등록";
  return "게시글등록";
}

/** 카드 헤더(○○ 정보) 문구 */
export function getArticleRegisterSectionTitle(bbsSe: string): string {
  if (bbsSe === "BBST03") return "아카이브 정보";
  if (bbsSe === "BBST02") return "갤러리 정보";
  return "게시글 정보";
}

export type ArticleRegisterViewModel = ReturnType<typeof useArticleRegister>;
