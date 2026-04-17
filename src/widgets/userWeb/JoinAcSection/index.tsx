"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { openDaumPostcode } from "@/shared/lib/daumPostcode";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import { UserMemberService } from "@/entities/userWeb/member/api/memberApi";
import { AuthService } from "@/entities/auth/api";
import type {
  ArmuserInsertRequest,
  ArmuserUpdateRequest,
  ArmuserDetailResponse,
} from "@/entities/adminWeb/armuser/api";
import { API_ENDPOINTS, API_CONFIG } from "@/shared/config/apiUser";
import { ApiError } from "@/shared/lib/apiClient";
import { apiClient, downloadWaterbAttachmentOrOpenView } from "@/shared/lib";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";

const IMG = "/images/userWeb";
const ICON = "/images/userWeb/icon";

/** ?•ì¥?ë¡œ gunsan ?¤í????Œì¼ ?€???´ë˜??ë°˜í™˜ (.file.hwp, .file.pdf ?? */
function getFileTypeClass(filename: string): string {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "img";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "";
}

/**
 * ?™ì› ?Œì›ê°€????
 * join_ac.html êµ¬ì¡°Â·?´ë˜?¤ëª… ? ì? (join_ac.css)
 * ?ë³¸: source/gunsan/join_ac.html
 * ?™ìƒ/?™ë?ëª?JoinStudentSection, JoinParentSection ?¨í„´ ì°¸ê³ 
 * mode="mypage": MY PAGE ?˜ì˜?•ë³´?ì„œ ?¬ìš© ???ë‹¨ ?œëª©Â·section ?˜í¼ ?†ì´ ?¼ë§Œ ?Œë”
 * initialData: MY PAGE?ì„œ GET ?ì„¸ ì¡°íšŒ ???„ë‹¬ ????ì´ˆê¸°ê°’ìœ¼ë¡??¬ìš©
 */
const JoinAcSection: React.FC<{
  mode?: "join" | "mypage";
  initialData?: ArmuserDetailResponse | null;
  onDetailUpdated?: () => void;
}> = ({ mode = "join", initialData, onDetailUpdated }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [academyNm, setAcademyNm] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [ceoNm, setCeoNm] = useState("");
  const [telno, setTelno] = useState("");
  const [officeTelno, setOfficeTelno] = useState("");
  const [faxNo, setFaxNo] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [email, setEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  /** ?™ì›?Œê°œ (PROFILE_DESC ?€?¥ìš©) */
  const [profileDesc, setProfileDesc] = useState("");
  /** ì²¨ë??Œì¼ (?¬ëŸ¬ ê°? */
  const [pendingAttachFiles, setPendingAttachFiles] = useState<
    { id: string; file: File }[]
  >([]);
  /** ?¬ì—…?ë“±ë¡ì¦ (1ê°? */
  const [bizCertFile, setBizCertFile] = useState<File | null>(null);
  /** ?Œì›ê°€?? ?½ê? ?˜ì´ì§€ ë³¸ì¸?¸ì¦ ???„ë‹¬???°ì´?°ë¡œ ì±„ìš´ ê²½ìš° ?˜ì • ë¶ˆê? */
  const [certDataFromJoin, setCertDataFromJoin] = useState(false);
  /** ?Œì›ê°€?? ë³¸ì¸?¸ì¦ ?„ë£Œ ???€?¥ëœ DI(ê°œì¸?ë³„ì½”ë“œ) - ê°€??API ?„ì†¡??*/
  const [certDi, setCertDi] = useState("");
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState("");
  const [isDuplicateUserId, setIsDuplicateUserId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** ?Œì›ê°€?? ?½ê? ?˜ì´ì§€ ë³¸ì¸?¸ì¦ ??sessionStorage???€?¥ëœ ?°ì´???ìš© (?€?œì´?? ?°ë½ì²? */
  useEffect(() => {
    if (mode !== "join" || typeof window === "undefined") return;
    let cancelled = false;
    try {
      const raw = sessionStorage.getItem("joinCertData");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        userName?: string;
        celNo?: string;
        di?: string;
      };
      sessionStorage.removeItem("joinCertData");
      const userName = (parsed.userName ?? "").trim();
      const celNo = (parsed.celNo ?? "").trim().replace(/\D/g, "");
      const di = (parsed.di ?? "").trim();
      if (userName) setCeoNm(userName);
      if (celNo) setTelno(formatPhoneWithHyphen(celNo));
      if (di) setCertDi(di);
      if (di) {
        (async () => {
          try {
            const res = await apiClient.get<{ exist?: number }>(
              "/api/user/armuser/crtfc-dn-value-check?crtfcDnValue=" +
                encodeURIComponent(di),
            );
            if (cancelled) return;
            if (res?.exist === 1) {
              afterAlertCloseRef.current = () => {
                if (window.history.length > 1) window.history.back();
                else window.location.href = "/";
              };
              showAlert(
                "?Œë¦¼",
                "?´ë? ë³¸ì¸?¸ì¦?¼ë¡œ ê°€?…ëœ ?Œì›?…ë‹ˆ??",
                "danger",
              );
            }
          } catch {
            // ì¤‘ë³µ?•ì¸ ?¤íŒ¨??UX ì°¨ë‹¨?˜ì? ?ŠìŒ
          }
        })();
      }
      if (userName || celNo) setCertDataFromJoin(true);
    } catch {
      // ?Œì‹± ?¤ë¥˜ ??ë¬´ì‹œ
    }
    return () => {
      cancelled = true;
    };
  }, [mode]);
  const attachFileInputRef = useRef<HTMLInputElement>(null);
  const bizCertInputRef = useRef<HTMLInputElement>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const afterAlertCloseRef = useRef<(() => void) | null>(null);
  const focusAfterAlertRef = useRef<string | null>(null);
  const [showConfirmDeletePic, setShowConfirmDeletePic] = useState(false);
  const [confirmUnlinkService, setConfirmUnlinkService] = useState<
    "naver" | "kakao" | null
  >(null);
  /** MY PAGE: ê¸°ì¡´ ì²¨ë??Œì¼/?¬ì—…?ë“±ë¡ì¦ ?? œ ?•ì¸ (type, fileId, seq). fileId??18?ë¦¬ ?•ë???? ì?ë¥??„í•´ string */
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{
    type: "atta" | "bizno";
    fileId: string;
    seq: number;
  } | null>(null);

  /** MY PAGE: ?ì„¸ ì¡°íšŒ ?°ì´?°ë¡œ ??ì´ˆê¸°ê°?ì±„ìš°ê¸?*/
  useEffect(() => {
    if (mode !== "mypage" || !initialData?.detail) return;
    const d = initialData.detail;
    setUserId((d.userId ?? "").trim());
    setAcademyNm((d.userNm ?? "").trim());
    const biz = (d.bizrno ?? "").trim().replace(/-/g, "");
    setBizNo(
      biz.length >= 10
        ? `${biz.slice(0, 3)}-${biz.slice(3, 5)}-${biz.slice(5)}`
        : biz,
    );
    setCeoNm((d.cxfc ?? "").trim());
    setTelno((d.mbtlnum ?? "").trim());
    setOfficeTelno((d.offmTelno ?? "").trim());
    setFaxNo((d.fxnum ?? "").trim());
    setZip((d.zip ?? "").trim());
    setAddress((d.adres ?? "").trim());
    setDetailAddress((d.detailAdres ?? "").trim());
    setEmail((d.emailAdres ?? "").trim());
    setProfileDesc((d.profileDesc ?? "").trim());
    const pics = initialData.userPicFiles;
    if (
      pics &&
      pics.length > 0 &&
      pics[0].fileId != null &&
      pics[0].seq != null
    ) {
      const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
      const viewUrl = base
        ? `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(pics[0].fileId))}&seq=${encodeURIComponent(String(pics[0].seq))}`
        : "";
      if (viewUrl) setLogoPreview(viewUrl);
    }
  }, [mode, initialData]);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertModalType = "success",
      focusId?: string,
    ) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      focusAfterAlertRef.current = focusId ?? null;
      setShowAlertModal(true);
    },
    [],
  );

  const handleAlertConfirm = useCallback(() => {
    setShowAlertModal(false);
    afterAlertCloseRef.current?.();
    afterAlertCloseRef.current = null;
    const focusId = focusAfterAlertRef.current;
    focusAfterAlertRef.current = null;
    if (focusId) {
      requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
    }
  }, []);

  /** MY PAGE: ë°±ì—”??OAuth ë¦¬ë‹¤?´ë ‰?????°ê²° ê²°ê³¼ ì¿¼ë¦¬ ì²˜ë¦¬ */
  useEffect(() => {
    if (mode !== "mypage" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("oauth_link");
    const oauthErr = params.get("oauth_link_error");
    if (!ok && !oauthErr) return;
    const path = window.location.pathname;
    params.delete("oauth_link");
    params.delete("oauth_link_error");
    const q = params.toString();
    window.history.replaceState(null, "", q ? `${path}?${q}` : path);
    if (ok === "ok") {
      showAlert("?Œë¦¼", "SNS ê³„ì •???°ê²°?˜ì—ˆ?µë‹ˆ??");
      onDetailUpdated?.();
    } else if (oauthErr) {
      const msg =
        oauthErr === "already_linked"
          ? "?´ë? ?¤ë¥¸ ê³„ì •???°ê²°??SNS ê³„ì •?…ë‹ˆ??"
          : oauthErr === "user_mismatch"
            ? "ë³¸ì¸ ?•ì¸???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ë¡œê·¸?????œë„??ì£¼ì„¸??"
            : oauthErr === "invalid_link_token"
              ? "?°ê²° ?œê°„??ë§Œë£Œ?˜ì—ˆê±°ë‚˜ ? íš¨?˜ì? ?Šì? ?”ì²­?…ë‹ˆ?? ?¤ì‹œ ?œë„??ì£¼ì„¸??"
              : oauthErr === "no_oauth_id"
                ? "SNS?ì„œ ê³„ì • ?ë³„ ?•ë³´ë¥?ë°›ì? ëª»í–ˆ?µë‹ˆ??"
                : oauthErr === "cancelled"
                  ? "SNS ?°ê²°??ì·¨ì†Œ?ˆìŠµ?ˆë‹¤."
                  : oauthErr === "no_code"
                    ? "SNS ?¸ì¦ ì½”ë“œë¥?ë°›ì? ëª»í–ˆ?µë‹ˆ?? ?¤ì‹œ ?œë„??ì£¼ì„¸??"
                    : "SNS ?°ê²°???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      showAlert("?Œë¦¼", msg, "danger");
    }
  }, [mode, showAlert, onDetailUpdated]);

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    },
    [],
  );

  /** MY PAGE: ?œë²„???€?¥ëœ ?¬ì§„ ?? œ ???•ì¸ ??API ?¸ì¶œ */
  const handleConfirmDeleteUserPic = useCallback(async () => {
    setShowConfirmDeletePic(false);
    const esntlId = initialData?.detail?.esntlId;
    const pic = initialData?.userPicFiles?.[0];
    if (!esntlId || pic?.fileId == null || pic?.seq == null) return;
    try {
      await UserArmuserService.deleteUserPic(
        esntlId,
        String(pic.fileId),
        Number(pic.seq),
      );
      setLogoFile(null);
      if (logoPreview && logoPreview.startsWith("blob:"))
        URL.revokeObjectURL(logoPreview);
      setLogoPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      showAlert("?? œ ?„ë£Œ", "?¬ì§„ë¡œê³ ê°€ ?? œ?˜ì—ˆ?µë‹ˆ??");
      onDetailUpdated?.();
    } catch (e) {
      console.error("?¬ì§„ë¡œê³  ?? œ ?¤íŒ¨:", e);
      showAlert(
        "?? œ ?¤íŒ¨",
        e instanceof Error
          ? e.message
          : "?¬ì§„ë¡œê³  ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        "danger",
      );
    }
  }, [
    initialData?.detail?.esntlId,
    initialData?.userPicFiles,
    logoPreview,
    onDetailUpdated,
  ]);

  const handleLogoRemove = useCallback(() => {
    if (
      mode === "mypage" &&
      initialData?.userPicFiles?.[0] &&
      initialData.userPicFiles[0].fileId != null &&
      initialData.userPicFiles[0].seq != null &&
      logoPreview &&
      !logoPreview.startsWith("blob:")
    ) {
      setShowConfirmDeletePic(true);
      return;
    }
    setLogoFile(null);
    if (logoPreview && logoPreview.startsWith("blob:"))
      URL.revokeObjectURL(logoPreview);
    setLogoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [mode, initialData?.userPicFiles, logoPreview]);

  const handleUserIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextUserId = e.target.value;
      setUserId(nextUserId);
      if (checkedUserId && checkedUserId !== nextUserId.trim()) {
        setCheckedUserId("");
      }
    },
    [checkedUserId],
  );

  const handleCheckUserId = useCallback(async () => {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      showAlert("?Œë¦¼", "?„ì´?”ë? ?…ë ¥?˜ì„¸??", "danger", "academyUserId");
      return;
    }
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLike.test(trimmedUserId)) {
      showAlert(
        "?Œë¦¼",
        "?´ë©”???•ì‹???•ì¸?´ì£¼?¸ìš”.",
        "danger",
        "academyUserId",
      );
      return;
    }

    setIsCheckingUserId(true);
    try {
      const res = await UserMemberService.checkMemberId(trimmedUserId);
      if (res.result === "01") {
        showAlert(
          "?Œë¦¼",
          res.message || "?„ì´??ì¤‘ë³µ ?•ì¸???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
          "danger",
          "academyUserId",
        );
        return;
      }
      if (res.exist === 1) {
        setCheckedUserId("");
        setIsDuplicateUserId(true);
        showAlert(
          "?Œë¦¼",
          "?´ë? ?¬ìš© ì¤‘ì¸ ?„ì´?”ì…?ˆë‹¤. ?¤ë¥¸ ?„ì´?”ë? ?…ë ¥??ì£¼ì„¸??",
          "danger",
          "academyUserId",
        );
        return;
      }
      if (res.exist === 0) {
        setCheckedUserId(trimmedUserId);
        setIsDuplicateUserId(false);
        showAlert("?Œë¦¼", "?¬ìš© ê°€?¥í•œ ?„ì´?”ì…?ˆë‹¤.", "success");
        return;
      }
      showAlert(
        "?Œë¦¼",
        res.message || "?„ì´??ì¤‘ë³µ ?•ì¸???¤íŒ¨?ˆìŠµ?ˆë‹¤.",
        "danger",
        "academyUserId",
      );
    } catch (err) {
      console.error("?™ì› ?Œì›ê°€???„ì´??ì¤‘ë³µ?•ì¸ ?¤íŒ¨:", err);
      showAlert(
        "?Œë¦¼",
        err instanceof ApiError
          ? err.message || "?„ì´??ì¤‘ë³µ ?•ì¸???¤íŒ¨?ˆìŠµ?ˆë‹¤."
          : "?„ì´??ì¤‘ë³µ ?•ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        "danger",
        "academyUserId",
      );
    } finally {
      setIsCheckingUserId(false);
    }
  }, [showAlert, userId]);

  /** MY PAGE: ê¸°ì¡´ ì²¨ë??Œì¼ ?ëŠ” ?¬ì—…?ë“±ë¡ì¦ ?? œ ?•ì¸ ??API ?¸ì¶œ */
  const handleConfirmDeleteFile = useCallback(async () => {
    const payload = confirmDeleteFile;
    setConfirmDeleteFile(null);
    if (!payload || !initialData?.detail?.esntlId) return;
    const esntlId = initialData.detail.esntlId.trim();
    try {
      if (payload.type === "atta") {
        await UserArmuserService.deleteAttaFile(
          esntlId,
          payload.fileId,
          payload.seq,
        );
        showAlert("?? œ ?„ë£Œ", "ì²¨ë??Œì¼???? œ?˜ì—ˆ?µë‹ˆ??");
      } else {
        await UserArmuserService.deleteBiznoFile(
          esntlId,
          payload.fileId,
          payload.seq,
        );
        showAlert("?? œ ?„ë£Œ", "?¬ì—…?ë“±ë¡ì¦???? œ?˜ì—ˆ?µë‹ˆ??");
      }
      onDetailUpdated?.();
    } catch (e) {
      console.error("?Œì¼ ?? œ ?¤íŒ¨:", e);
      showAlert(
        "?? œ ?¤íŒ¨",
        e instanceof Error ? e.message : "?Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
        "danger",
      );
    }
  }, [
    confirmDeleteFile,
    initialData?.detail?.esntlId,
    onDetailUpdated,
    showAlert,
  ]);

  const handleAttachFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const next = Array.from(files).map((file) => ({
        id: `attach-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }));
      setPendingAttachFiles((prev) => [...prev, ...next]);
      e.target.value = "";
      if (attachFileInputRef.current) attachFileInputRef.current.value = "";
    },
    [],
  );

  const removeAttachFile = useCallback((id: string) => {
    setPendingAttachFiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleBizCertChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setBizCertFile(file ?? null);
    },
    [],
  );

  const removeBizCert = useCallback(() => {
    setBizCertFile(null);
    if (bizCertInputRef.current) bizCertInputRef.current.value = "";
  }, []);

  const handleTelnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setTelno(formatPhoneWithHyphen(digits));
  };

  const handleOfficeTelnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setOfficeTelno(formatPhoneWithHyphen(digits));
  };

  const handleFaxNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setFaxNo(formatPhoneWithHyphen(digits));
  };

  const handleAddressSearch = useCallback(() => {
    openDaumPostcode((data) => {
      const fullAddress =
        data.userSelectedType === "R"
          ? data.roadAddress
          : data.jibunAddress || data.roadAddress;
      const extra = data.buildingName ? ` ${data.buildingName}` : "";
      setZip(data.zonecode || "");
      setAddress(fullAddress + extra);
    });
  }, []);

  const handleReset = useCallback(() => {
    setCertDataFromJoin(false);
    setCertDi("");
    setCheckedUserId("");
    setIsDuplicateUserId(false);
    setUserId("");
    setPassword("");
    setPasswordConfirm("");
    setAcademyNm("");
    setBizNo("");
    setCeoNm("");
    setTelno("");
    setOfficeTelno("");
    setFaxNo("");
    setZip("");
    setAddress("");
    setDetailAddress("");
    setEmail("");
    setProfileDesc("");
    setPendingAttachFiles([]);
    setBizCertFile(null);
    if (attachFileInputRef.current) attachFileInputRef.current.value = "";
    if (bizCertInputRef.current) bizCertInputRef.current.value = "";
    handleLogoRemove();
  }, [handleLogoRemove]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!userId.trim()) {
        showAlert("?Œë¦¼", "?„ì´?”ë? ?…ë ¥?˜ì„¸??", "danger", "academyUserId");
        return;
      }
      if (mode !== "mypage") {
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailLike.test(userId.trim())) {
          showAlert(
            "?Œë¦¼",
            "?„ì´?”ëŠ” ?´ë©”???•ì‹?¼ë¡œ ?…ë ¥?´ì£¼?¸ìš”.",
            "danger",
            "academyUserId",
          );
          return;
        }
        if (checkedUserId !== userId.trim()) {
          showAlert(
            "?Œë¦¼",
            "?„ì´??ì¤‘ë³µ ?•ì¸???´ì£¼?¸ìš”.",
            "danger",
            "academyUserId",
          );
          return;
        }
      }
      if (mode !== "mypage") {
        if (!password) {
          showAlert(
            "?Œë¦¼",
            "ë¹„ë?ë²ˆí˜¸ë¥??…ë ¥?˜ì„¸??",
            "danger",
            "academyPassword",
          );
          return;
        }
        if (!passwordConfirm) {
          showAlert(
            "?Œë¦¼",
            "ë¹„ë?ë²ˆí˜¸ ?•ì¸???…ë ¥?˜ì„¸??",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
        if (password !== passwordConfirm) {
          showAlert(
            "?Œë¦¼",
            "ë¹„ë?ë²ˆí˜¸?€ ë¹„ë?ë²ˆí˜¸ ?•ì¸???¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤.",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          showAlert(
            "?Œë¦¼",
            "ë¹„ë?ë²ˆí˜¸?€ ë¹„ë?ë²ˆí˜¸ ?•ì¸???¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤.",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
      }
      if (!academyNm.trim()) {
        showAlert("?Œë¦¼", "?™ì›ëª…ì„ ?…ë ¥?˜ì„¸??", "danger", "academyNm");
        return;
      }
      if (!bizNo.trim()) {
        showAlert(
          "?Œë¦¼",
          "?¬ì—…?ë“±ë¡ë²ˆ?¸ë? ?…ë ¥?˜ì„¸??",
          "danger",
          "academyBizNo",
        );
        return;
      }
      if (!ceoNm.trim()) {
        showAlert("?Œë¦¼", "?€?œì´?¬ë? ?…ë ¥?˜ì„¸??", "danger", "academyCeoNm");
        return;
      }
      if (!telno.trim()) {
        showAlert("?Œë¦¼", "?°ë½ì²˜ë? ?…ë ¥?˜ì„¸??", "danger", "academyTelno");
        return;
      }
      if (!email.trim()) {
        showAlert("?Œë¦¼", "?´ë©”?¼ì£¼?Œë? ?…ë ¥?˜ì„¸??", "danger", "academyEmail");
        return;
      }

      setSubmitLoading(true);
      try {
        if (mode === "mypage") {
          const esntlId = initialData?.detail?.esntlId?.trim();
          if (!esntlId) {
            showAlert("?Œë¦¼", "?Œì› ?•ë³´ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.", "danger");
            return;
          }
          const updateRequest: ArmuserUpdateRequest = {
            esntlId,
            userSe: "ANR",
            userId: userId.trim(),
            userNm: academyNm.trim(),
            bizrno: bizNo.trim().replace(/-/g, "") || undefined,
            cxfc: ceoNm.trim() || undefined,
            mbtlnum: telno.trim() || undefined,
            offmTelno: officeTelno.trim() || undefined,
            fxnum: faxNo.trim() || undefined,
            emailAdres: email.trim() || undefined,
            zip: zip.trim() || undefined,
            adres: address.trim() || undefined,
            detailAdres: detailAddress.trim() || undefined,
            profileDesc: profileDesc.trim() || undefined,
          };
          if (password && password.trim()) {
            updateRequest.password = password;
          }
          const res = await UserArmuserService.updateArmuserMultipart(
            esntlId,
            updateRequest,
            logoFile ?? undefined,
            {
              attachFiles:
                pendingAttachFiles.length > 0
                  ? pendingAttachFiles.map((p) => p.file)
                  : undefined,
              bizCertFile: bizCertFile ?? undefined,
            },
          );
          if (res.result === "01") {
            showAlert("?Œë¦¼", res.message || "?˜ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤.", "danger");
            return;
          }
          onDetailUpdated?.();
          showAlert("?Œë¦¼", "?˜ì •???„ë£Œ?˜ì—ˆ?µë‹ˆ??", "success");
        } else {
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const request: ArmuserInsertRequest = {
            userSe: "ANR",
            userId: userId.trim(),
            password,
            userNm: academyNm.trim(),
            bizrno: bizNo.trim().replace(/-/g, "") || undefined,
            cxfc: ceoNm.trim() || undefined,
            mbtlnum: telno.trim() || undefined,
            offmTelno: officeTelno.trim() || undefined,
            fxnum: faxNo.trim() || undefined,
            emailAdres: email.trim() || undefined,
            zip: zip.trim() || undefined,
            adres: address.trim() || undefined,
            detailAdres: detailAddress.trim() || undefined,
            profileDesc: profileDesc.trim() || undefined,
            mberSttus: "A",
            sbscrbDe: today,
            crtfcDnValue: certDi || undefined,
          };
          const res = await UserArmuserService.insertArmuserMultipartFull(
            request,
            {
              userPic: logoFile ?? undefined,
              attachFiles:
                pendingAttachFiles.length > 0
                  ? pendingAttachFiles.map((p) => p.file)
                  : undefined,
              bizCertFile: bizCertFile ?? undefined,
            },
          );
          if (res.result === "50") {
            showAlert(
              "?Œë¦¼",
              res.message || "?´ë? ?¬ìš© ì¤‘ì¸ ?„ì´?”ì…?ˆë‹¤.",
              "danger",
              "academyUserId",
            );
            return;
          }
          if (res.result === "01") {
            showAlert("?Œë¦¼", res.message || "?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.", "danger");
            return;
          }
          if (res.result === "51") {
            showAlert(
              "?Œë¦¼",
              res.message || "?´ë? ë³¸ì¸?¸ì¦?¼ë¡œ ê°€?…ëœ ?Œì›?…ë‹ˆ??",
              "danger",
            );
            return;
          }
          afterAlertCloseRef.current = handleReset;
          showAlert("?Œë¦¼", "? ì²­???„ë£Œ?˜ì—ˆ?µë‹ˆ??", "success");
        }
      } catch (err) {
        console.error(
          mode === "mypage" ? "?™ì› ?•ë³´ ?˜ì • ?¤íŒ¨:" : "?™ì› ?Œì›ê°€???¤íŒ¨:",
          err,
        );
        if (err instanceof ApiError) {
          showAlert(
            "?Œë¦¼",
            err.message ||
              (mode === "mypage"
                ? "?˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."
                : "?Œì›ê°€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."),
            "danger",
          );
        } else {
          showAlert(
            "?Œë¦¼",
            mode === "mypage"
              ? "?˜ì • ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."
              : "?Œì›ê°€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
            "danger",
          );
        }
      } finally {
        setSubmitLoading(false);
      }
    },
    [
      mode,
      initialData?.detail?.esntlId,
      userId,
      checkedUserId,
      password,
      passwordConfirm,
      academyNm,
      bizNo,
      ceoNm,
      telno,
      officeTelno,
      faxNo,
      email,
      zip,
      address,
      detailAddress,
      profileDesc,
      logoFile,
      pendingAttachFiles,
      bizCertFile,
      certDi,
      handleReset,
      showAlert,
    ],
  );

  const formBlock = (
    <div className="mainBg">
      <div className="registrationContainer joinInput">
        <form className="mainForm" onSubmit={handleSubmit}>
          <section className="formSection">
            {mode !== "mypage" && (
              <div
                className={`joinStatus ${
                  initialData?.detail?.mberSttus === "P"
                    ? "join"
                    : initialData?.detail?.mberSttus === "D"
                      ? "out"
                      : "register"
                }`}
              >
                {initialData?.detail?.mberSttus === "P"
                  ? "?¬ìš©"
                  : initialData?.detail?.mberSttus === "D"
                    ? "?ˆí‡´"
                    : "? ì²­"}
              </div>
            )}
            <div className="sectionHeader">
              <div className="sectionTitle">?™ì›?•ë³´ ?…ë ¥</div>
            </div>
            <div className="formGrid">
              {/* ?„ì´??/ ?™ì›ëª?*/}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyUserId" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?„ì´??
                  </label>
                  <div className="formControl">
                    {mode === "join" ? (
                      <div className="inputWithBtn">
                        <input
                          type="text"
                          id="academyUserId"
                          className="inputField"
                          placeholder="?´ë©”???•ì‹?¼ë¡œ ?…ë ¥?´ì£¼?¸ìš”"
                          value={userId}
                          onChange={handleUserIdChange}
                          style={
                            isDuplicateUserId
                              ? {
                                  borderColor: "#ef4444",
                                  backgroundColor: "#fef2f2",
                                }
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          className="btnSearch"
                          onClick={handleCheckUserId}
                          disabled={isCheckingUserId}
                          style={
                            isDuplicateUserId
                              ? {
                                  borderColor: "#ef4444",
                                  backgroundColor: "#fee2e2",
                                  color: "#dc2626",
                                }
                              : undefined
                          }
                        >
                          {isCheckingUserId ? "?•ì¸ ì¤?.." : "ì¤‘ë³µ?•ì¸"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        id="academyUserId"
                        className="inputField"
                        placeholder="?´ë©”???•ì‹?¼ë¡œ ?…ë ¥?´ì£¼?¸ìš”"
                        value={userId}
                        onChange={handleUserIdChange}
                        readOnly
                        aria-readonly="true"
                      />
                    )}
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyNm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?™ì›ëª?
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyNm"
                      className="inputField"
                      placeholder="?™ì›ëª…ì„ ?…ë ¥?´ì£¼?¸ìš”"
                      value={academyNm}
                      onChange={(e) => setAcademyNm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* ë¹„ë?ë²ˆí˜¸ / ë¹„ë?ë²ˆí˜¸ ?•ì¸ */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyPassword" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ë¹„ë?ë²ˆí˜¸
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="academyPassword"
                      className="inputField"
                      placeholder="ë¹„ë?ë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyPasswordConfirm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ë¹„ë?ë²ˆí˜¸ ?•ì¸
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="academyPasswordConfirm"
                      className="inputField"
                      placeholder="ë¹„ë?ë²ˆí˜¸ë¥??¤ì‹œ ?…ë ¥?´ì£¼?¸ìš”"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* ?¬ì—…?ë“±ë¡ë²ˆ??/ ?€?œì´??*/}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyBizNo" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?¬ì—…?ë“±ë¡ë²ˆ??
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyBizNo"
                      className="inputField"
                      placeholder="?¬ì—…?ë“±ë¡ë²ˆ?¸ë? ?…ë ¥?´ì£¼?¸ìš”"
                      value={bizNo}
                      onChange={(e) => setBizNo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyCeoNm" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?€?œì´??
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyCeoNm"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="?€?œì´?¬ë? ?…ë ¥?´ì£¼?¸ìš”"
                      value={ceoNm}
                      onChange={(e) => setCeoNm(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
              </div>
              {/* ?°ë½ì²?/ ?¬ë¬´?¤ë²ˆ??*/}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyTelno" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?°ë½ì²?
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyTelno"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="?«ìë§??…ë ¥?´ì£¼?¸ìš”"
                      value={telno}
                      onChange={handleTelnoChange}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyOfficeTelno" className="formLabel">
                    ?¬ë¬´?¤ë²ˆ??
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyOfficeTelno"
                      className="inputField"
                      placeholder="?«ìë§??…ë ¥?´ì£¼?¸ìš”"
                      value={officeTelno}
                      onChange={handleOfficeTelnoChange}
                    />
                  </div>
                </div>
              </div>
              {/* ?´ë©”?¼ì£¼??/ ?Œì›?©ìŠ¤ë²ˆí˜¸ */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyEmail" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    ?´ë©”?¼ì£¼??
                  </label>
                  <div className="formControl">
                    <input
                      type="email"
                      id="academyEmail"
                      className="inputField"
                      placeholder="?´ë©”?¼ì„ ?…ë ¥?´ì£¼?¸ìš”"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyFaxNo" className="formLabel">
                    ?Œì›?©ìŠ¤ë²ˆí˜¸
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyFaxNo"
                      className="inputField"
                      placeholder="?«ìë§??…ë ¥?´ì£¼?¸ìš”"
                      value={faxNo}
                      onChange={handleFaxNoChange}
                    />
                  </div>
                </div>
              </div>
              {/* ?°í¸ë²ˆí˜¸, ì£¼ì†Œ, ?ì„¸ì£¼ì†Œ (?¤ë¥¸ ?Œì›ê°€?…ê³¼ ?™ì¼ UI) */}
              <div className="formRow">
                <label className="formLabel" id="lblAcademyAddress">
                  ì£¼ì†Œ
                </label>
                <div className="formControl addressContainer">
                  <div className="inputWithBtn">
                    <input
                      type="text"
                      className="inputField bgGray addressZip"
                      readOnly
                      title="?°í¸ë²ˆí˜¸"
                      value={zip}
                      placeholder="?°í¸ë²ˆí˜¸"
                      aria-label="?°í¸ë²ˆí˜¸"
                    />
                    <input
                      type="text"
                      className="inputField bgGray"
                      readOnly
                      title="ê¸°ë³¸ì£¼ì†Œ"
                      value={address}
                      placeholder="ì£¼ì†Œ"
                      aria-label="ê¸°ë³¸ì£¼ì†Œ"
                    />
                    <button
                      type="button"
                      className="btnSearch"
                      onClick={handleAddressSearch}
                      title="ì£¼ì†Œ ê²€??
                      aria-label="ì£¼ì†Œ ê²€??
                    >
                      ì£¼ì†Œê²€??
                    </button>
                  </div>
                  <input
                    type="text"
                    className="inputField"
                    placeholder="?ì„¸ì£¼ì†Œë¥??…ë ¥?´ì£¼?¸ìš”"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    aria-label="?ì„¸ì£¼ì†Œ"
                  />
                </div>
              </div>
              {/* ?¬ì§„ë¡œê³  (?´ë?ì§€ ? íƒ ??ë¯¸ë¦¬ë³´ê¸°) */}
              <div className="formRow">
                <div className="fieldUnit">
                  <label htmlFor="academyLogoInput" className="formLabel">
                    ?¬ì§„ë¡œê³ 
                  </label>
                  <div className="formControl">
                    <div className="imageUploadContainer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="academyLogoInput"
                        className="hiddenInput"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                      <label
                        htmlFor="academyLogoInput"
                        className="btnImageAdd"
                        role="button"
                        aria-label="?´ë?ì§€ ?Œì¼ ì²¨ë??˜ê¸°"
                      >
                        <img
                          src={logoPreview || `${IMG}/img_noImg.png`}
                          alt=""
                          aria-hidden="true"
                          onClick={(e) => {
                            if (!logoPreview) return;
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              logoPreview,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          className={logoPreview ? "cursor-pointer" : undefined}
                        />
                        <span className="srOnly">?´ë?ì§€ ì²¨ë??˜ê¸°</span>
                      </label>
                      {logoPreview && (
                        <button
                          type="button"
                          className="btnImageDel"
                          aria-label="ì²¨ë????´ë?ì§€ ?? œ"
                          onClick={handleLogoRemove}
                        >
                          <span className="iconDel sr-only" aria-hidden="true">
                            ?? œ
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ?™ì›?Œê°œ (PROFILE_DESC ?€?? - bizInput ëª©ì /?œë™?´ìš© UI */}
              <div className="formRow">
                <label htmlFor="academyProfileDesc" className="formLabel">
                  ?™ì›?Œê°œ
                </label>
                <div className="formControl">
                  <textarea
                    id="academyProfileDesc"
                    className="textAreaField"
                    placeholder="?™ì›?Œê°œ ?´ìš©???…ë ¥?´ì£¼?¸ìš”"
                    value={profileDesc}
                    onChange={(e) => setProfileDesc(e.target.value)}
                  />
                </div>
              </div>
              {/* ì²¨ë??Œì¼ (?¬ëŸ¬ ê°? - bizInputì²˜ëŸ¼ ?¼ë²¨ ?’ì´ ì¤„ì„ */}
              <div className="formRow formRowFile">
                <span className="formLabel">
                  ì²¨ë??Œì¼
                  <input
                    ref={attachFileInputRef}
                    type="file"
                    id="academyAttachInput"
                    className="hiddenInput"
                    multiple
                    onChange={handleAttachFileSelect}
                  />
                  <label
                    htmlFor="academyAttachInput"
                    className="btnFileAdd"
                    aria-label="?Œì¼ ì²¨ë??˜ê¸°"
                  >
                    <img
                      src={`${ICON}/ico_file_add.png`}
                      alt=""
                      aria-hidden="true"
                    />
                  </label>
                </span>
                <div className="formControl fileListContainer">
                  {mode === "mypage" &&
                    initialData?.attaFiles?.map((f, idx) => {
                      const fileId = f.fileId;
                      const seq = f.seq;
                      if (fileId == null || seq == null) return null;
                      const base =
                        API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
                      const viewUrl = base
                        ? `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(fileId))}&seq=${encodeURIComponent(String(seq))}`
                        : "#";
                      const label = f.orgfNm?.trim() || "ì²¨ë??Œì¼";
                      const typeClass = getFileTypeClass(label);
                      return (
                        <div
                          key={`atta-${fileId}-${seq}-${idx}`}
                          className={`file ${typeClass}`.trim()}
                        >
                          <a
                            href={viewUrl}
                            className="fileLink"
                            onClick={(e) => {
                              e.preventDefault();
                              void downloadWaterbAttachmentOrOpenView(
                                String(fileId),
                                Number(seq),
                                viewUrl,
                                label || undefined,
                              );
                            }}
                          >
                            {label}
                          </a>
                          <button
                            type="button"
                            className="btnFileDel"
                            aria-label={`${label} ?Œì¼ ?? œ`}
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setConfirmDeleteFile({
                                type: "atta",
                                fileId: String(fileId),
                                seq: Number(seq),
                              });
                            }}
                          >
                            <img
                              src={`${ICON}/ico_file_del.png`}
                              alt=""
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      );
                    })}
                  {pendingAttachFiles.map(({ id, file }) => {
                    const label = file.name;
                    const typeClass = getFileTypeClass(label);
                    return (
                      <div key={id} className={`file ${typeClass}`.trim()}>
                        <span>{label}</span>
                        <button
                          type="button"
                          className="btnFileDel"
                          aria-label={`${label} ?Œì¼ ?? œ`}
                          onClick={() => removeAttachFile(id)}
                        >
                          <img
                            src={`${ICON}/ico_file_del.png`}
                            alt=""
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    );
                  })}
                  {!(mode === "mypage" && initialData?.attaFiles?.length) &&
                    pendingAttachFiles.length === 0 && (
                      <span className="fileListEmpty">
                        ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                      </span>
                    )}
                </div>
              </div>
              {/* ?¬ì—…?ë“±ë¡ì¦ (1ê°? - bizInputì²˜ëŸ¼ ?¼ë²¨ ?’ì´ ì¤„ì„ */}
              <div className="formRow formRowFile">
                <span className="formLabel">
                  ?¬ì—…?ë“±ë¡ì¦
                  <input
                    ref={bizCertInputRef}
                    type="file"
                    id="academyBizCertInput"
                    className="hiddenInput"
                    onChange={handleBizCertChange}
                  />
                  <label
                    htmlFor="academyBizCertInput"
                    className="btnFileAdd"
                    aria-label="?Œì¼ ì²¨ë??˜ê¸°"
                  >
                    <img
                      src={`${ICON}/ico_file_add.png`}
                      alt=""
                      aria-hidden="true"
                    />
                  </label>
                </span>
                <div className="formControl fileListContainer">
                  {mode === "mypage" &&
                    initialData?.biznoFiles?.[0] &&
                    (() => {
                      const f = initialData.biznoFiles[0];
                      const fileId = f.fileId;
                      const seq = f.seq;
                      if (fileId == null || seq == null) return null;
                      const base =
                        API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
                      const viewUrl = base
                        ? `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(fileId))}&seq=${encodeURIComponent(String(seq))}`
                        : "#";
                      const label = f.orgfNm?.trim() || "?¬ì—…?ë“±ë¡ì¦";
                      const typeClass = getFileTypeClass(label);
                      return (
                        <div
                          key={`bizno-${fileId}-${seq}`}
                          className={`file ${typeClass}`.trim()}
                        >
                          <a
                            href={viewUrl}
                            className="fileLink"
                            onClick={(e) => {
                              e.preventDefault();
                              void downloadWaterbAttachmentOrOpenView(
                                String(fileId),
                                Number(seq),
                                viewUrl,
                                label || undefined,
                              );
                            }}
                          >
                            {label}
                          </a>
                          <button
                            type="button"
                            className="btnFileDel"
                            aria-label={`${label} ?Œì¼ ?? œ`}
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setConfirmDeleteFile({
                                type: "bizno",
                                fileId: String(fileId),
                                seq: Number(seq),
                              });
                            }}
                          >
                            <img
                              src={`${ICON}/ico_file_del.png`}
                              alt=""
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      );
                    })()}
                  {bizCertFile && (
                    <div
                      className={`file ${getFileTypeClass(bizCertFile.name)}`.trim()}
                    >
                      <span>{bizCertFile.name}</span>
                      <button
                        type="button"
                        className="btnFileDel"
                        aria-label={`${bizCertFile.name} ?Œì¼ ?? œ`}
                        onClick={removeBizCert}
                      >
                        <img
                          src={`${ICON}/ico_file_del.png`}
                          alt=""
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}
                  {!(mode === "mypage" && initialData?.biznoFiles?.length) &&
                    !bizCertFile && (
                      <span className="fileListEmpty">
                        ì²¨ë????Œì¼???†ìŠµ?ˆë‹¤.
                      </span>
                    )}
                </div>
              </div>
              {mode === "mypage" && (
                <div className="formRow mypageSnsLinkRow">
                  <span className="formLabel">ê°„í¸ë¡œê·¸?¸ì—°ê²?/span>
                  <div className="formControl mypageSnsLinkControl">
                    <div className="mypageSnsLinkItem">
                      <span className="mypageSnsLinkBadge mypageBadgeNaver">
                        <img
                          src="/images/userWeb/icon/ico_sns_naver.png"
                          alt="?¤ì´ë²?
                        />
                        ?¤ì´ë²?
                      </span>
                      {String(initialData?.detail?.naverAuthId ?? "").trim() !==
                      "" ? (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                          onClick={() => setConfirmUnlinkService("naver")}
                        >
                          ?´ì?
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn"
                          onClick={async () => {
                            try {
                              const url = await AuthService.getOAuthUrl(
                                "naver",
                                "academy",
                                { mode: "mypage_link" },
                              );
                              if (url) window.location.href = url;
                            } catch {
                              showAlert(
                                "?Œë¦¼",
                                "?¤ì´ë²??°ê²° ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
                                "danger",
                              );
                            }
                          }}
                        >
                          ?°ê²°
                        </button>
                      )}
                    </div>
                    <div className="mypageSnsLinkItem">
                      <span className="mypageSnsLinkBadge mypageBadgeKakao">
                        <img
                          src="/images/userWeb/icon/ico_sns_kakao.png"
                          alt="ì¹´ì¹´??
                        />
                        ì¹´ì¹´??
                      </span>
                      {String(initialData?.detail?.kakaoAuthId ?? "").trim() !==
                      "" ? (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                          onClick={() => setConfirmUnlinkService("kakao")}
                        >
                          ?´ì?
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn"
                          onClick={async () => {
                            try {
                              const url = await AuthService.getOAuthUrl(
                                "kakao",
                                "academy",
                                { mode: "mypage_link" },
                              );
                              if (url) window.location.href = url;
                            } catch {
                              showAlert(
                                "?Œë¦¼",
                                "ì¹´ì¹´???°ê²° ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
                                "danger",
                              );
                            }
                          }}
                        >
                          ?°ê²°
                        </button>
                      )}
                      {mode === "mypage" && (
                        <a
                          href="#"
                          className="mypageWithdrawPlain"
                          onClick={(e) => e.preventDefault()}
                        >
                          ?Œì›?ˆí‡´
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          <div className="formActions">
            {mode !== "mypage" && (
              <button type="button" className="btnWhite" onClick={handleReset}>
                ì´ˆê¸°??
              </button>
            )}
            <button
              type="submit"
              className="btnSubmit"
              disabled={submitLoading}
              aria-label={mode === "mypage" ? "?€?¥í•˜ê¸? : "? ì²­?˜ê¸°"}
            >
              {submitLoading
                ? "ì²˜ë¦¬ ì¤?.."
                : mode === "mypage"
                  ? "?€?¥í•˜ê¸?
                  : "? ì²­?˜ê¸°"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const modals = (
    <>
      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={handleAlertConfirm}
      />
      <ConfirmModal
        isOpen={showConfirmDeletePic}
        title="?¬ì§„ë¡œê³  ?? œ"
        message="?¬ì§„ë¡œê³ ë¥??? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?"
        confirmText="?? œ"
        cancelText="?«ê¸°"
        onConfirm={handleConfirmDeleteUserPic}
        onCancel={() => setShowConfirmDeletePic(false)}
      />
      <ConfirmModal
        isOpen={!!confirmDeleteFile}
        title={
          confirmDeleteFile?.type === "atta"
            ? "ì²¨ë??Œì¼ ?? œ"
            : "?¬ì—…?ë“±ë¡ì¦ ?? œ"
        }
        message="?´ë‹¹ ?Œì¼???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?"
        confirmText="?? œ"
        cancelText="?«ê¸°"
        onConfirm={handleConfirmDeleteFile}
        onCancel={() => setConfirmDeleteFile(null)}
      />
      <ConfirmModal
        isOpen={confirmUnlinkService !== null}
        title="ê°„í¸ë¡œê·¸???°ê²° ?´ì?"
        message="?°ê²°???´ì??˜ì‹œê² ìŠµ?ˆê¹Œ?"
        confirmText="?´ì?"
        cancelText="?«ê¸°"
        onConfirm={async () => {
          const svc = confirmUnlinkService;
          setConfirmUnlinkService(null);
          if (!svc) return;
          try {
            await AuthService.unlinkOAuthLink(svc);
            showAlert(
              "?Œë¦¼",
              svc === "naver"
                ? "?¤ì´ë²??°ê²° ?´ì??˜ì—ˆ?µë‹ˆ??"
                : "ì¹´ì¹´???°ê²° ?´ì??˜ì—ˆ?µë‹ˆ??",
            );
            onDetailUpdated?.();
          } catch {
            showAlert(
              "?Œë¦¼",
              svc === "naver"
                ? "?¤ì´ë²??°ê²° ?´ì? ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."
                : "ì¹´ì¹´???°ê²° ?´ì? ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
              "danger",
            );
          }
        }}
        onCancel={() => setConfirmUnlinkService(null)}
      />
    </>
  );

  if (mode === "mypage")
    return (
      <>
        {formBlock}
        {modals}
      </>
    );

  return (
    <>
      <section className="inner">
        <div className="mainTitle">?Œì›ê°€??/div>
        {formBlock}
      </section>
      {modals}
    </>
  );
};

export default JoinAcSection;
