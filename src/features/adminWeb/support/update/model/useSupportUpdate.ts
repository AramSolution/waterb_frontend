import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportService,
  SupportDetailParams,
  type SupportFileItem,
} from "@/entities/adminWeb/support/api";
import { CmmCodeService } from "@/entities/adminWeb/code/api";
import { SUPPORT_CHARGE_DEPT_CODE_ID } from "@/features/adminWeb/support/lib/supportChargeDeptCodeId";
import {
  ApiError,
  TokenUtils,
  downloadWaterbAttachment,
  decodeDisplayText,
} from "@/shared/lib";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import {
  SupportRegisterFormData,
  ValidationErrors,
} from "@/features/adminWeb/support/register/model";
import {
  booleansFromYnPipe,
  ynPipeFromBooleans,
} from "@/entities/adminWeb/support/lib/proPartNature";

function fromYYYYMMDD(value?: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function useSupportUpdate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = searchParams?.get("proId") || "";
  const from = searchParams?.get("from") || ""; // study: ?¤í„°?”ì‚¬???ì„¸(ì²?†Œ???„ìš© ?„ë“œ ë¹„ë…¸ì¶?

  const [formData, setFormData] = useState<SupportRegisterFormData>({
    businessNm: "",
    businessCode: "",
    statusCode: "01", // ê¸°ë³¸ê°? ?‘ìˆ˜?ˆì •
    targetName: "",
    recruitTarget: [],
    proNature: [false, false, false, false, false],
    recruitStartDate: "",
    recruitEndDate: "",
    recruitCount: "0", // ëª¨ì§‘?¸ì›??ê¸°ë³¸ê°?0
    businessPeriodStart: "",
    businessPeriodEnd: "",
    businessSummary: "",
    businessContent: "",
    etcNm: "",
    applyMethod: "",
    homepage: "",
    reqGb: [false, false, false, false, false], // [?™ìƒ, ?™ë?ëª? ?™ì›, ë©˜í† , ?™êµ]
    chargeDept: "",
    chargePerson: "",
    contact: "",
    basicYn: "",
    poorYn: "",
    singleYn: "",
    programType: [],
  });
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");
  /** true: ?€???˜ì •) ?±ê³µ ???•ì¸ ??ëª©ë¡?¼ë¡œ ?´ë™. ì²¨ë?/?ë³´ ?Œì¼ ?? œ ?±ê³µ?€ falseë¡??ì„¸ ? ì? */
  const [messageDialogNavigateToList, setMessageDialogNavigateToList] =
    useState(false);

  // ì²¨ë??Œì¼ ê´€???íƒœ
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);
  // ?ì„¸ ì¡°íšŒ ??ê¸°ì¡´ ?Œì¼ ê·¸ë£¹ ID (?˜ì • ?????Œì¼ ì¶”ê?/?ë³´?Œì¼ êµì²´???¬ìš©)
  const [existingProFileId, setExistingProFileId] = useState("");
  const [existingFileId, setExistingFileId] = useState("");
  // ?ì„¸ ì¡°íšŒ ??ê¸°ì¡´ ?ë³´?Œì¼Â·ì²¨ë??Œì¼ ëª©ë¡ (?”ë©´ ?œì‹œ??
  const [existingProFileList, setExistingProFileList] = useState<
    SupportFileItem[]
  >([]);
  const [existingFileList, setExistingFileList] = useState<SupportFileItem[]>(
    [],
  );
  // ?ì„¸ ì¡°íšŒ ??ê¸°ì¡´ proGb ê°?(?˜ì • ??? ì?)
  const [existingProGb, setExistingProGb] = useState<string>("");

  const [chargeDeptOptions, setChargeDeptOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [chargeDeptLoading, setChargeDeptLoading] = useState(true);

  // ?Œì¼ ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·?ê´€???íƒœ
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState<
    "proFile" | "file"
  >("file");
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string | number;
    seq: string | number;
  } | null>(null);

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
        console.error("?´ë‹¹ë¶€??ì½”ë“œ ì¡°íšŒ ?¤íŒ¨:", err);
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

  // ?ì„¸ ?•ë³´ ì¡°íšŒ
  useEffect(() => {
    const fetchDetail = async () => {
      if (!proId) {
        setError("?¬ì—…IDê°€ ?„ìš”?©ë‹ˆ??");
        setDetailLoading(false);
        return;
      }

      try {
        setDetailLoading(true);
        setError("");

        if (!TokenUtils.isTokenValid()) {
          setError("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ?? ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
          return;
        }

        const params: SupportDetailParams = {
          proId: proId,
        };

        const response = await SupportService.getSupportDetail(params);

        if (response.result === "00" && response.detail) {
          const detail = response.detail;

          // ?¬ì—…?€??ë¬¸ì?´ì„ ë°°ì—´ë¡?ë³€??(DB ?•ì‹ E1|J1|H1|T1 ê·¸ë?ë¡??¬ìš©)
          const recruitTargetArray = detail.proTarget
            ? detail.proTarget
                .split("|")
                .map((v) => v.trim())
                .filter((v) => v !== "")
            : [];

          // REQ_GB ?Œì‹±: y|y|n|n|n ?•ì‹ -> [?™ìƒ, ?™ë?ëª? ?™ì›, ë©˜í† , ?™êµ] boolean ë°°ì—´
          const parseReqGb = (reqGb: string): boolean[] => {
            if (!reqGb) return [false, false, false, false, false];
            const parts = reqGb.split("|");
            const isY = (value?: string): boolean =>
              (value ?? "").trim().toLowerCase() === "y";
            return [
              isY(parts[0]),
              isY(parts[1]),
              isY(parts[2]),
              isY(parts[3]),
              isY(parts[4]),
            ];
          };

          setFormData({
            businessNm: decodeDisplayText(detail.proNm || ""),
            businessCode: detail.proId || "",
            statusCode: detail.runSta || "01", // ì§„í–‰?íƒœ (runSta ?¬ìš©)
            targetName: decodeDisplayText(
              (detail as any).proTargetNm || "",
            ),
            recruitTarget: recruitTargetArray,
            proNature: booleansFromYnPipe(
              (detail as { proPart?: string }).proPart,
              5,
            ),
            recruitStartDate: detail.recruitStartDate || "",
            recruitEndDate: detail.recruitEndDate || "",
            recruitCount: detail.recCnt?.toString() || "0", // ëª¨ì§‘?¸ì›???†ìœ¼ë©?0
            businessPeriodStart: fromYYYYMMDD(
              (detail as { proFromDd?: string }).proFromDd,
            ),
            businessPeriodEnd: fromYYYYMMDD(
              (detail as { proToDd?: string }).proToDd,
            ),
            businessSummary: decodeDisplayText(detail.proSum || ""),
            businessContent: decodeDisplayText(detail.proDesc || ""),
            etcNm: decodeDisplayText((detail as any).etcNm ?? ""),
            applyMethod: decodeDisplayText(
              (detail as { proHow?: string }).proHow || "",
            ),
            homepage: decodeDisplayText(
              (detail as { proPage?: string }).proPage || "",
            ),
            reqGb: parseReqGb(
              (detail as { reqGb?: string }).reqGb ?? "",
            ),
            chargeDept: String(
              (detail as { proDepa?: string }).proDepa ?? "",
            ).trim(),
            chargePerson: decodeDisplayText(
              (detail as { proCharge?: string }).proCharge || "",
            ),
            contact: (detail as { proTel?: string }).proTel
              ? formatPhoneWithHyphen(
                  String((detail as { proTel?: string }).proTel).replace(
                    /\D/g,
                    "",
                  ),
                )
              : "",
            // ?¤í„°?”ì‚¬???„ìš© ?„ë“œ
            basicYn: (detail as any).basicYn || "",
            poorYn: (detail as any).poorYn || "",
            singleYn: (detail as any).singleYn || "",
            programType: detail.eduGb ? [detail.eduGb] : [],
          });
          setExistingProFileId(detail.proFileId ?? "");
          setExistingFileId(detail.fileId ?? "");
          // ê¸°ì¡´ proGb ê°??€??(?˜ì • ??? ì?)
          setExistingProGb(detail.proGb || "");
          const res = response as {
            proFileList?: SupportFileItem[];
            fileList?: SupportFileItem[];
          };
          setExistingProFileList(
            Array.isArray(res.proFileList) ? res.proFileList : [],
          );
          setExistingFileList(Array.isArray(res.fileList) ? res.fileList : []);
        } else {
          setError("ì§€?ì‚¬???•ë³´ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.");
        }
      } catch (err) {
        console.error("ì§€?ì‚¬???ì„¸ ì¡°íšŒ ?¤íŒ¨:", err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("?¸ì¦???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ë¡œê·¸?¸í•´ì£¼ì„¸??");
            setTimeout(() => {
              window.location.href = "/adminWeb/login";
            }, 2000);
          } else {
            setError(
              err.message || "ì§€?ì‚¬???•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
            );
          }
        } else {
          setError("ì§€?ì‚¬???•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
        }
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [proId]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    let nextValue: string = value;
    if (name === "recruitCount") {
      nextValue = value.replace(/\D/g, "");
    } else if (name === "contact") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      nextValue = formatPhoneWithHyphen(digits);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    // ?ëŸ¬ ë©”ì‹œì§€ ì´ˆê¸°??    if (errors[name as keyof ValidationErrors]) {
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

    // ?ëŸ¬ ë©”ì‹œì§€ ì´ˆê¸°??    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // ?¤í„°?”ì‚¬?? ?¬ì—…êµ¬ë¶„(ë§ˆì¤‘ë¬??¬ë§) ì²´í¬ë°•ìŠ¤ ë³€ê²??¸ë“¤??  const handleProgramTypeChange = (value: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // ?˜ë‚˜ë§?? íƒ ê°€?? ??ê°’ìœ¼ë¡??€ì²?        return {
          ...prev,
          programType: [value],
        };
      }

      return {
        ...prev,
        programType: prev.programType.filter((item) => item !== value),
      };
    });

    if (errors.programType) {
      setErrors((prev) => ({
        ...prev,
        programType: undefined,
      }));
    }
  };

  // ? ì²­êµ¬ë¶„ ì²´í¬ë°•ìŠ¤ ë³€ê²??¸ë“¤??  const handleReqGbChange = (index: number, checked: boolean) => {
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

  // ê·¸ë£¹ë³??„ì²´ ? íƒ/?´ì œ ?¸ë“¤??  const handleGroupSelectAll = (groupValues: string[], checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // ê·¸ë£¹ ??ëª¨ë“  ??ª© ì¶”ê? (ì¤‘ë³µ ?œê±°)
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
        // ê·¸ë£¹ ??ëª¨ë“  ??ª© ?œê±°
        return {
          ...prev,
          recruitTarget: prev.recruitTarget.filter(
            (item) => !groupValues.includes(item),
          ),
        };
      }
    });

    // ?ëŸ¬ ë©”ì‹œì§€ ì´ˆê¸°??    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // ê·¸ë£¹ ?„ì²´ ? íƒ ?íƒœ ?•ì¸
  const isGroupAllSelected = (groupValues: string[]): boolean => {
    return groupValues.every((value) => formData.recruitTarget.includes(value));
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

  // ?ë³´?Œì¼ ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·??œì‹œ
  const handleDeleteProFileClick = (
    fileId: string | number,
    seq: string | number,
  ) => {
    setDeleteConfirmType("proFile");
    setFileToDelete({ fileId, seq });
    setShowDeleteConfirmDialog(true);
  };

  // ì²¨ë??Œì¼ ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·??œì‹œ
  const handleDeleteFileClick = (
    fileId: string | number,
    seq: string | number,
  ) => {
    setDeleteConfirmType("file");
    setFileToDelete({ fileId, seq });
    setShowDeleteConfirmDialog(true);
  };

  /** ?€?¥ëœ ?ë³´?Œì¼ 1ê±??? œ (API ?¸ì¶œ ??ëª©ë¡?ì„œ ?œê±°) */
  const deleteExistingProFile = async (
    fileId: string | number,
    seq: string | number,
  ) => {
    if (!proId) return;
    try {
      const response = await SupportService.deleteProFile(proId, fileId, seq);
      if (response.result === "00") {
        setExistingProFileList((prev) => {
          const next = prev.filter(
            (f) =>
              String(f.fileId) !== String(fileId) ||
              String(f.seq) !== String(seq),
          );
          if (next.length === 0) setExistingProFileId("");
          return next;
        });
        setMessageDialogTitle("?? œ ?„ë£Œ");
        setMessageDialogMessage(
          response.message || "?ë³´?Œì¼???? œ?˜ì—ˆ?µë‹ˆ??",
        );
        setMessageDialogNavigateToList(false);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("?? œ ?¤íŒ¨");
        setMessageDialogMessage(
          response.message || "?ë³´?Œì¼ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle("?? œ ?¤íŒ¨");
      setMessageDialogMessage(
        err instanceof ApiError
          ? err.message
          : "?ë³´?Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  /** ?€?¥ëœ ì²¨ë??Œì¼ 1ê±??? œ (API ?¸ì¶œ ??ëª©ë¡?ì„œ ?œê±°) */
  const deleteExistingFile = async (
    fileId: string | number,
    seq: string | number,
  ) => {
    if (!proId) return;
    try {
      const response = await SupportService.deleteFile(proId, fileId, seq);
      if (response.result === "00") {
        setExistingFileList((prev) => {
          const next = prev.filter(
            (f) =>
              String(f.fileId) !== String(fileId) ||
              String(f.seq) !== String(seq),
          );
          if (next.length === 0) setExistingFileId("");
          return next;
        });
        setMessageDialogTitle("?? œ ?„ë£Œ");
        setMessageDialogMessage(
          response.message || "ì²¨ë??Œì¼???? œ?˜ì—ˆ?µë‹ˆ??",
        );
        setMessageDialogNavigateToList(false);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("?? œ ?¤íŒ¨");
        setMessageDialogMessage(
          response.message || "ì²¨ë??Œì¼ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle("?? œ ?¤íŒ¨");
      setMessageDialogMessage(
        err instanceof ApiError
          ? err.message
          : "ì²¨ë??Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // ?¬ì—…ëª??„ìˆ˜ ì²´í¬
    if (!formData.businessNm || formData.businessNm.trim() === "") {
      newErrors.businessNm = "?¬ì—…ëª…ì„ ?…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    if (!formData.businessPeriodStart || formData.businessPeriodStart.trim() === "") {
      newErrors.businessPeriodStart = "?œì‘?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }
    if (!formData.businessPeriodEnd || formData.businessPeriodEnd.trim() === "") {
      newErrors.businessPeriodEnd = "ì¢…ë£Œ?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }
    if (formData.businessPeriodStart && formData.businessPeriodEnd) {
      if (formData.businessPeriodStart > formData.businessPeriodEnd) {
        newErrors.businessPeriodEnd = "ì¢…ë£Œ?¼ì? ?œì‘???´í›„?¬ì•¼ ?©ë‹ˆ??";
        isValid = false;
      }
    }

    // ëª¨ì§‘ê¸°ê°„ ?œì‘???„ìˆ˜ ì²´í¬
    if (!formData.recruitStartDate || formData.recruitStartDate.trim() === "") {
      newErrors.recruitStartDate = "?œì‘?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ëª¨ì§‘ê¸°ê°„ ì¢…ë£Œ???„ìˆ˜ ì²´í¬
    if (!formData.recruitEndDate || formData.recruitEndDate.trim() === "") {
      newErrors.recruitEndDate = "ì¢…ë£Œ?¼ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ëª¨ì§‘ê¸°ê°„ ? ì§œ ?œì„œ ê²€ì¦?    if (formData.recruitStartDate && formData.recruitEndDate) {
      if (formData.recruitStartDate > formData.recruitEndDate) {
        newErrors.recruitEndDate = "ì¢…ë£Œ?¼ì? ?œì‘???´í›„?¬ì•¼ ?©ë‹ˆ??";
        isValid = false;
      }
    }

    // ê¸°í??´ìš© ìµœë? 512??    if (formData.etcNm && formData.etcNm.trim().length > 512) {
      newErrors.etcNm = "ê¸°í??´ìš©?€ 512???´ë‚´ë¡??…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?¤í„°?”ì‚¬?…ì¸ ê²½ìš° ?¬ì—…êµ¬ë¶„(ë§ˆì¤‘ë¬??¬ë§) ?„ìˆ˜ ì²´í¬
    if (existingProGb === "02") {
      if (!formData.programType || formData.programType.length === 0) {
        newErrors.programType = "?¬ì—…êµ¬ë¶„??? íƒ?´ì£¼?¸ìš”.";
        isValid = false;
      }
    }

    // ? ì²­êµ¬ë¶„: ?”ë©´???¸ì¶œ?˜ëŠ” ?™ìƒÂ·?™ë?ëª?ì¤??˜ë‚˜ ?´ìƒ
    if (!formData.reqGb[0] && !formData.reqGb[1]) {
      newErrors.reqGb = "?™ìƒ ?ëŠ” ?™ë?ëª??¼ë°˜???˜ë‚˜ ?´ìƒ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName === "reqGb") {
        document
          .getElementById("support-req-gb")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstErrorFieldName) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // REQ_GB ë³€?? [?™ìƒ, ?™ë?ëª? ?™ì›, ë©˜í† , ?™êµ] ??5?ë¦¬
      const reqGbString = [
        formData.reqGb[0],
        formData.reqGb[1],
        formData.reqGb[2],
        formData.reqGb[3],
        formData.reqGb[4],
      ]
        .map((checked) => (checked ? "Y" : "N"))
        .join("|");

      // ?¤í„°?”ì‚¬?? proGb=02, eduGb=01/02(ë§ˆì¤‘ë¬??¬ë§)
      const eduGbCode = formData.programType[0] || "";

      // ë°±ì—”??API ?¸ì¶œ (???ë³´?¬ì§„Â·ì²¨ë??Œì¼ ?„ë‹¬ ??ARTFILE ?€????PRO_FILE_ID, FILE_ID ë°˜ì˜)
      const response = await SupportService.updateSupport({
        proId: proId,
        proGb: existingProGb || "01", // ê¸°ì¡´ proGb ê°?? ì? (?†ìœ¼ë©?ê¸°ë³¸ê°? 01)
        proType: "01",
        eduGb: eduGbCode,
        proNm: formData.businessNm.trim(),
        proTargetNm: formData.targetName.trim() || undefined,
        proTarget: formData.recruitTarget.join(","), // ELEMENTARY_1,HIGH_1 ?•ì‹ (?´ë??ì„œ E1,H1ë¡?ë³€??
        recFromDd: formData.recruitStartDate,
        recToDd: formData.recruitEndDate,
        recCnt: formData.recruitCount ? parseInt(formData.recruitCount, 10) : 0,
        proFromDd: formData.businessPeriodStart,
        proToDd: formData.businessPeriodEnd,
        proSum: formData.businessSummary.trim(),
        proDesc: formData.businessContent.trim(),
        etcNm: formData.etcNm.trim().slice(0, 512),
        proFileId: existingProFileId,
        fileId: existingFileId,
        runSta: formData.statusCode || "01", // RUN_STA: 01/02/04/99 (?˜í”Œ?…ë¬´)
        sttusCode: "A", // ?¬ìš©?¬ë? A(?¬ìš©)/D(?? œ)
        reqGb: reqGbString,
        proPart: ynPipeFromBooleans(formData.proNature),
        proDepa: formData.chargeDept.trim(),
        proCharge: formData.chargePerson.trim(),
        proTel: formData.contact.trim(),
        proHow: formData.applyMethod.trim(),
        proPage: formData.homepage.trim(),
        // ?¤í„°?”ì‚¬???„ìš© ?„ë“œ (?†ìœ¼ë©?N?¼ë¡œ ì²˜ë¦¬)
        basicYn: formData.basicYn || "N",
        poorYn: formData.poorYn || "N",
        singleYn: formData.singleYn || "N",
        proFile: selectedPromoFile ?? undefined,
        artpromFiles:
          selectedFiles.length > 0
            ? selectedFiles.map((item) => item.file)
            : undefined,
      });

      if (response.result === "00") {
        setMessageDialogTitle("?˜ì • ?„ë£Œ");
        setMessageDialogMessage(
          response.message || "ì§€?ì‚¬?…ì´ ?±ê³µ?ìœ¼ë¡??˜ì •?˜ì—ˆ?µë‹ˆ??",
        );
        setMessageDialogNavigateToList(true);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("?˜ì • ?¤íŒ¨");
        setMessageDialogMessage(
          response.message || "ì§€?ì‚¬???˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("ì§€?ì‚¬???˜ì • ?¤ë¥˜:", err);
      if (err instanceof ApiError) {
        setMessageDialogTitle("?˜ì • ?¤íŒ¨");
        setMessageDialogMessage(
          err.message || "ì§€?ì‚¬???˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
      } else {
        setMessageDialogTitle("?˜ì • ?¤íŒ¨");
        setMessageDialogMessage(
          "ì§€?ì‚¬???˜ì • ì¤??????†ëŠ” ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        );
        setMessageDialogType("danger");
      }
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageDialogClose = async () => {
    if (messageDialogType === "success" && messageDialogNavigateToList) {
      handleCancel();
      return;
    }
    setShowMessageDialog(false);
    setMessageDialogNavigateToList(false);
  };

  /** ?€?¥ëœ ?ë³´/ì²¨ë? ?Œì¼ ?¤ìš´ë¡œë“œ (?Œì¼ëª??´ë¦­ ?? */
  const downloadExistingAttachment = async (
    fileId: string | number,
    seq: string | number,
    fallbackFileName?: string,
  ) => {
    if (fileId === "" || fileId == null || seq === "" || seq == null) {
      setMessageDialogTitle("?¤ìš´ë¡œë“œ ?¤íŒ¨");
      setMessageDialogMessage("?Œì¼ ?•ë³´ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
      setMessageDialogType("danger");
      setMessageDialogNavigateToList(false);
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
      setMessageDialogNavigateToList(false);
      setShowMessageDialog(true);
    }
  };

  const handleCancel = () => {
    router.push("/adminWeb/support/list");
  };

  return {
    proId,
    formData,
    loading,
    detailLoading,
    error,
    errors,
    selectedFiles,
    selectedPromoFile,
    existingProFileList,
    existingFileList,
    handleFilesSelected,
    handlePromoFileSelected,
    removeFile,
    removePromoFile,
    deleteExistingProFile,
    deleteExistingFile,
    downloadExistingAttachment,
    handleDeleteProFileClick,
    handleDeleteFileClick,
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
    handleProgramTypeChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
    // ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·?    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    deleteConfirmType,
    fileToDelete,
    setFileToDelete,
    existingProGb,
    from,
    chargeDeptOptions,
    chargeDeptLoading,
  };
}
