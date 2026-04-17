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
import { downloadWaterbAttachment } from "@/shared/lib";
import {
  ARCHIVE_REGISTER_IMAGE_MAX,
  archiveRowHasImage,
  buildArchiveImageSubmitParts,
  createArchiveImageRowId,
  ensureTrailingEmptySlot,
  type ArchiveImageRow,
} from "../../register/model/useArticleRegister";

/**
 * NTT_IMG_FILE_IDê°€ JSON numberë¡??¤ë©´ JS ?•ë????œê³„(?ˆì „ ?•ìˆ˜ 2^53-1)ë¥??˜ì–´ ê°’ì´ ê¹¨ì§.
 * nttImgFileList[].fileId???œë²„?ì„œ ë¬¸ì?´ë¡œ ?´ë ¤ë³´ë‚´ë¯€ë¡? ?˜ì • ?”ì²­ ??ê·¸ë£¹ IDë¡??°ì„  ?¬ìš©.
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
  password: string; // ë¹„ë?ê¸€ ë¹„ë?ë²ˆí˜¸ ë³€ê²½ìš© (?œë²„?ì„œ ?´ë ¤ì£¼ì? ?ŠìŒ, ë³€ê²??œì—ë§??…ë ¥)
  answerAt: string; // ?µê? ?¬ë? (Y/N) - ?µê??????¨ìˆœ ???œì‹œ, ë¹„ë?ë²ˆí˜¸ ?„ë“œ ?¨ê?
  nttData1: string; // ì§€?•ë³„
  nttData2: string; // ì§€?•ì¼
  nttData3: string; // ?°ë?/?œë?
  nttData4: string; // ?Œì¬ì§€
  nttData5: string; // ?ë£Œì¶œì²˜
  nttData6: string; // ?Œê°œ
  nttImgFileId: string; // ?€???´ë?ì§€ ?Œì¼ID
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
  const [atchFileCnt, setAtchFileCnt] = useState<number>(0); // ê²Œì‹œ???Œì¼ ê°œìˆ˜
  const [secretYn, setSecretYn] = useState<string>("N"); // ê²Œì‹œ??ë¹„ë?ê¸€ ?¬ìš© ?¬ë?
  const [bbsSe, setBbsSe] = useState<string>("");
  const [fileList, setFileList] = useState<ArticleFileItem[]>([]); // ?ì„¸ API?ì„œ ë°›ì? ì²¨ë??Œì¼ ëª©ë¡
  /** NTT_IMG_FILE_ID ê·¸ë£¹ ?´ë?ì§€(?„ì¹´?´ë¸Œ ?¤ì¤‘) */
  const [nttImgFileList, setNttImgFileList] = useState<ArticleFileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]); // ?ˆë¡œ ? íƒ???Œì¼ (?˜ì • ??
  const [archiveImageRows, setArchiveImageRows] = useState<ArchiveImageRow[]>(
    () => [{ id: createArchiveImageRowId(), file: null }],
  );
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");

  // ì¡°íšŒ??ì¦ê?ê°€ ?´ë? ?¸ì¶œ?˜ì—ˆ?”ì? ì¶”ì  (React Strict Modeë¡??¸í•œ ì¤‘ë³µ ?¸ì¶œ ë°©ì?)
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

  // ê²Œì‹œ???ì„¸ ?•ë³´ ì¡°íšŒ?˜ì—¬ atchFileCnt ê°€?¸ì˜¤ê¸?  useEffect(() => {
    const fetchBoardDetail = async () => {
      if (!bbsId) return;

      try {
        const response = await BoardService.getBoardDetail({ bbsId });

        if (response && typeof response === "object") {
          const responseAny = response as any;

          // ?¤ì–‘???‘ë‹µ êµ¬ì¡° ?€??          let detailData = responseAny.detail || responseAny.data?.detail;

          // detail ?„ë“œê°€ ?†ê³  ?‘ë‹µ ?ì²´ê°€ detail??ê²½ìš°
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

          // dataê°€ ì§ì ‘ detail??ê²½ìš°
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
            // camelCase?€ UPPER_SNAKE_CASE ëª¨ë‘ ?•ì¸
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
        // ê²Œì‹œ???ì„¸ ì¡°íšŒ ?¤íŒ¨ ??ê¸°ë³¸ê°??¬ìš©
        setAtchFileCnt(0);
        setSecretYn("N");
        setBbsSe("");
      }
    };

    fetchBoardDetail();
  }, [bbsId]);

  // ê²Œì‹œê¸€ ?ì„¸ ì¡°íšŒ
  useEffect(() => {
    // ì¡°íšŒ??ì¦ê? ?Œë˜ê·?ì´ˆê¸°??(articleId??bbsIdê°€ ë³€ê²½ë  ??
    viewCountUpdatedRef.current = false;

    const fetchArticleDetail = async () => {
      if (!articleId || !bbsId) {
        setError("ê²Œì‹œê¸€ ID ?ëŠ” ê²Œì‹œ??IDê°€ ?„ìš”?©ë‹ˆ??");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        TokenUtils.debugToken();

        if (!TokenUtils.isTokenValid()) {
          console.error(
            "? í°??? íš¨?˜ì? ?ŠìŠµ?ˆë‹¤. ë¡œê·¸???˜ì´ì§€ë¡??´ë™?©ë‹ˆ??",
          );
          setError("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ?? ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
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
            password: "", // ?œë²„?ì„œ ?´ë ¤ì£¼ì? ?ŠìŒ
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

          // ì¡°íšŒ??ì¦ê? API ?¸ì¶œ (??ë²ˆë§Œ ?¸ì¶œ?˜ë„ë¡?ì²´í¬)
          // React Strict Modeë¡??¸í•œ ì¤‘ë³µ ?¸ì¶œ ë°©ì?
          if (!viewCountUpdatedRef.current) {
            viewCountUpdatedRef.current = true;
            try {
              await ArticleService.updateViewCount(params);
            } catch (viewCountError) {
              // ì¡°íšŒ??ì¦ê? ?¤íŒ¨??ë¡œê·¸ë§??¨ê¸°ê³?ê³„ì† ì§„í–‰
              console.warn("ì¡°íšŒ??ì¦ê? ?¤íŒ¨:", viewCountError);
              // ?¤íŒ¨ ???Œë˜ê·¸ë? ?¤ì‹œ falseë¡??¤ì •?˜ì—¬ ?¬ì‹œ??ê°€?¥í•˜?„ë¡
              viewCountUpdatedRef.current = false;
            }
          }
        } else {
          throw new Error("ê²Œì‹œê¸€ ?ì„¸ ?•ë³´ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.");
        }
      } catch (err) {
        console.error("ê²Œì‹œê¸€ ?ì„¸ ì¡°íšŒ ?¤íŒ¨:", err);

        if (err instanceof ApiError) {
          if (err.status === 401) {
            console.error("??401 Unauthorized - ?¸ì¦ ?¤íŒ¨");
            TokenUtils.debugToken();
            setError("?¸ì¦???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
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
              : "ê²Œì‹œê¸€ ?ì„¸ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
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
    // ?´ë‹¹ ?„ë“œ???ëŸ¬ ?œê±°
    if (errors[name as keyof ArticleDetailErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /** ë¦¬ì¹˜ ?ë””??Quill) ?±ì—??HTML ?´ìš© ë³€ê²????¬ìš© */
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
    // ?´ë‹¹ ?„ë“œ???ëŸ¬ ?œê±°
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
        setMessageDialogTitle("?Œì¼ ?•ì‹ ?¤ë¥˜");
        setMessageDialogMessage("?´ë?ì§€ ?Œì¼ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.");
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

  /** ê¸°ì¡´ ì²¨ë??Œì¼ 1ê±??? œ (API ?¸ì¶œ ??fileList?ì„œ ?œê±°). fileId/seq??ë¬¸ì?´ë¡œ ?„ë‹¬??JS ?•ìˆ˜ ?¤ì°¨ ë°©ì?. */
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
        setMessageDialogTitle("?? œ ?„ë£Œ");
        setMessageDialogMessage("?? œê°€ ?„ë£Œ?˜ì—ˆ?µë‹ˆ??");
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("?Œì¼ ?? œ ?¤íŒ¨");
        setMessageDialogMessage(
          response.message || "?Œì¼???? œ?˜ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("ì²¨ë??Œì¼ ?? œ ?¤íŒ¨:", err);
      setMessageDialogTitle("?Œì¼ ?? œ ?¤íŒ¨");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : "?Œì¼???? œ?˜ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: ArticleDetailErrors = {};
    let isValid = true;

    // ê²Œì‹œê¸€ ?œëª© ?„ìˆ˜ ì²´í¬
    if (!formData.nttSj.trim()) {
      newErrors.nttSj = "ê²Œì‹œê¸€ ?œëª©???…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ê²Œì‹œê¸°ê°„ ?„ìˆ˜ ì²´í¬
    if (!formData.ntcrStartDt.trim()) {
      newErrors.ntcrStartDt = "ê²Œì‹œê¸°ê°„ ?œì‘?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }
    if (!formData.ntcrEndDt.trim()) {
      newErrors.ntcrEndDt = "ê²Œì‹œê¸°ê°„ ì¢…ë£Œ?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ê²Œì‹œê¸°ê°„ ? íš¨??ê²€??(?œì‘?¼ì´ ì¢…ë£Œ?¼ë³´???¬ë©´ ?ˆë¨)
    if (formData.ntcrStartDt && formData.ntcrEndDt) {
      const startDate = new Date(formData.ntcrStartDt);
      const endDate = new Date(formData.ntcrEndDt);
      if (startDate > endDate) {
        newErrors.ntcrEndDt = "ì¢…ë£Œ?¼ì? ?œì‘?¼ë³´???´í›„?¬ì•¼ ?©ë‹ˆ??";
        isValid = false;
      }
    }

    const isArchiveBoard = bbsSe === "BBST03";
    if (isArchiveBoard) {
      if (!formData.nttData6.trim()) {
        newErrors.nttData6 = "?Œê°œë¥??…ë ¥?´ì£¼?¸ìš”.";
        isValid = false;
      }
      if (!formData.nttData5.trim()) {
        newErrors.nttData5 = "?ë£Œì¶œì²˜ë¥??…ë ¥?´ì£¼?¸ìš”.";
        isValid = false;
      }
      const hasArchiveInRows = archiveImageRows.some((r) =>
        archiveRowHasImage(r),
      );
      if (!hasArchiveInRows) {
        newErrors.nttImgFileId = "?´ë?ì§€ë¥??±ë¡?´ì£¼?¸ìš”.";
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

  // ê²Œì‹œê¸€ ?˜ì • (nttCnOverride: ?ë””??ref?ì„œ ì§ì ‘ ê°€?¸ì˜¨ ìµœì‹  HTML)
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
        console.error("? í°??? íš¨?˜ì? ?ŠìŠµ?ˆë‹¤. ë¡œê·¸???˜ì´ì§€ë¡??´ë™?©ë‹ˆ??");
        setMessageDialogTitle("?¸ì¦ ?¤ë¥˜");
        setMessageDialogMessage("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ?? ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        setTimeout(() => {
          window.location.href = "/adminWeb/login";
        }, 2000);
        return;
      }

      // sessionStorage?ì„œ user ê°ì²´ë¥?ê°€?¸ì???uniqId?€ name ì¶”ì¶œ
      const userStr = sessionStorage.getItem("user");
      let uniqId = "";
      let name = "";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || "";
          name = user.name || "";
        } catch (e) {
          console.error("?¸ì…˜?ì„œ ?¬ìš©???•ë³´ë¥??Œì‹±?˜ëŠ” ì¤??¤ë¥˜ ë°œìƒ:", e);
        }
      }

      // ?µê??€ ë¹„ë?ë²ˆí˜¸ ë¯¸ì‚¬??      const hasPassword =
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
        setMessageDialogTitle("?˜ì • ?„ë£Œ");
        setMessageDialogMessage(
          response.message || "?•ìƒ?ìœ¼ë¡??˜ì •?˜ì—ˆ?µë‹ˆ??",
        );
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        throw new Error(response.message || "ê²Œì‹œê¸€ ?˜ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
      }
    } catch (err) {
      console.error("ê²Œì‹œê¸€ ?˜ì • ?¤íŒ¨:", err);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.error("??401 Unauthorized - ?¸ì¦ ?¤íŒ¨");
          TokenUtils.debugToken();
          setMessageDialogTitle("?¸ì¦ ?¤ë¥˜");
          setMessageDialogMessage("?¸ì¦???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
          setMessageDialogType("danger");
          setShowMessageDialog(true);
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
        } else {
          setMessageDialogTitle("?˜ì • ?¤íŒ¨");
          setMessageDialogMessage(
            err.message || "ê²Œì‹œê¸€ ?˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
          );
          setMessageDialogType("danger");
          setShowMessageDialog(true);
        }
      } else {
        setMessageDialogTitle("?˜ì • ?¤íŒ¨");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "ê²Œì‹œê¸€ ?˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
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
      // ?˜ì • ?±ê³µ ??ê²Œì‹œê¸€ ?ì„¸ ?•ë³´ë¥??¤ì‹œ ì¡°íšŒ?˜ì—¬ ìµœì‹  ?°ì´?°ë¡œ ?…ë°?´íŠ¸
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
            // ?˜ì • ???ˆë¡œ ì¶”ê??ˆë˜ ?Œì¼ ëª©ë¡ ë¹„ìš°ê¸?(?œë²„ fileList??ë°˜ì˜?˜ì—ˆ?¼ë?ë¡?ì¤‘ë³µ ?œì‹œ ë°©ì?)
            setSelectedFiles([]);
          }
        } catch (err) {
          console.error("ê²Œì‹œê¸€ ?ì„¸ ?¬ì¡°???¤íŒ¨:", err);
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
        setMessageDialogTitle("?¤ìš´ë¡œë“œ ?¤íŒ¨");
        setMessageDialogMessage("?Œì¼ ?•ë³´ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      try {
        await downloadWaterbAttachment(fileId, seq, fallbackFileName);
      } catch (err) {
        setMessageDialogTitle("?¤ìš´ë¡œë“œ ?¤íŒ¨");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "?Œì¼ ?¤ìš´ë¡œë“œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    },
    [],
  );

  // ëª©ë¡?¼ë¡œ ?Œì•„ê°€ê¸?(?íƒœ ? ì?)
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
