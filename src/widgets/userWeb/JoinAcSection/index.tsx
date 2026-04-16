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
import { apiClient, downloadEdreamAttachmentOrOpenView } from "@/shared/lib";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";

const IMG = "/images/userWeb";
const ICON = "/images/userWeb/icon";

/** 확장자로 gunsan 스타일 파일 타입 클래스 반환 (.file.hwp, .file.pdf 등) */
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
 * 학원 회원가입 폼
 * join_ac.html 구조·클래스명 유지 (join_ac.css)
 * 원본: source/gunsan/join_ac.html
 * 학생/학부모 JoinStudentSection, JoinParentSection 패턴 참고
 * mode="mypage": MY PAGE 나의정보에서 사용 시 상단 제목·section 래퍼 없이 폼만 렌더
 * initialData: MY PAGE에서 GET 상세 조회 후 전달 시 폼 초기값으로 사용
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
  /** 학원소개 (PROFILE_DESC 저장용) */
  const [profileDesc, setProfileDesc] = useState("");
  /** 첨부파일 (여러 개) */
  const [pendingAttachFiles, setPendingAttachFiles] = useState<
    { id: string; file: File }[]
  >([]);
  /** 사업자등록증 (1개) */
  const [bizCertFile, setBizCertFile] = useState<File | null>(null);
  /** 회원가입: 약관 페이지 본인인증 후 전달된 데이터로 채운 경우 수정 불가 */
  const [certDataFromJoin, setCertDataFromJoin] = useState(false);
  /** 회원가입: 본인인증 완료 후 저장된 DI(개인식별코드) - 가입 API 전송용 */
  const [certDi, setCertDi] = useState("");
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState("");
  const [isDuplicateUserId, setIsDuplicateUserId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 회원가입: 약관 페이지 본인인증 후 sessionStorage에 저장된 데이터 적용 (대표이사, 연락처) */
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
                "알림",
                "이미 본인인증으로 가입된 회원입니다.",
                "danger",
              );
            }
          } catch {
            // 중복확인 실패는 UX 차단하지 않음
          }
        })();
      }
      if (userName || celNo) setCertDataFromJoin(true);
    } catch {
      // 파싱 오류 등 무시
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
  /** MY PAGE: 기존 첨부파일/사업자등록증 삭제 확인 (type, fileId, seq). fileId는 18자리 정밀도 유지를 위해 string */
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{
    type: "atta" | "bizno";
    fileId: string;
    seq: number;
  } | null>(null);

  /** MY PAGE: 상세 조회 데이터로 폼 초기값 채우기 */
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

  /** MY PAGE: 백엔드 OAuth 리다이렉트 후 연결 결과 쿼리 처리 */
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
      showAlert("알림", "SNS 계정이 연결되었습니다.");
      onDetailUpdated?.();
    } else if (oauthErr) {
      const msg =
        oauthErr === "already_linked"
          ? "이미 다른 계정에 연결된 SNS 계정입니다."
          : oauthErr === "user_mismatch"
            ? "본인 확인에 실패했습니다. 다시 로그인 후 시도해 주세요."
            : oauthErr === "invalid_link_token"
              ? "연결 시간이 만료되었거나 유효하지 않은 요청입니다. 다시 시도해 주세요."
              : oauthErr === "no_oauth_id"
                ? "SNS에서 계정 식별 정보를 받지 못했습니다."
                : oauthErr === "cancelled"
                  ? "SNS 연결을 취소했습니다."
                  : oauthErr === "no_code"
                    ? "SNS 인증 코드를 받지 못했습니다. 다시 시도해 주세요."
                    : "SNS 연결에 실패했습니다.";
      showAlert("알림", msg, "danger");
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

  /** MY PAGE: 서버에 저장된 사진 삭제 시 확인 후 API 호출 */
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
      showAlert("삭제 완료", "사진로고가 삭제되었습니다.");
      onDetailUpdated?.();
    } catch (e) {
      console.error("사진로고 삭제 실패:", e);
      showAlert(
        "삭제 실패",
        e instanceof Error
          ? e.message
          : "사진로고 삭제 중 오류가 발생했습니다.",
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
      showAlert("알림", "아이디를 입력하세요.", "danger", "academyUserId");
      return;
    }
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailLike.test(trimmedUserId)) {
      showAlert(
        "알림",
        "이메일 형식을 확인해주세요.",
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
          "알림",
          res.message || "아이디 중복 확인에 실패했습니다.",
          "danger",
          "academyUserId",
        );
        return;
      }
      if (res.exist === 1) {
        setCheckedUserId("");
        setIsDuplicateUserId(true);
        showAlert(
          "알림",
          "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.",
          "danger",
          "academyUserId",
        );
        return;
      }
      if (res.exist === 0) {
        setCheckedUserId(trimmedUserId);
        setIsDuplicateUserId(false);
        showAlert("알림", "사용 가능한 아이디입니다.", "success");
        return;
      }
      showAlert(
        "알림",
        res.message || "아이디 중복 확인에 실패했습니다.",
        "danger",
        "academyUserId",
      );
    } catch (err) {
      console.error("학원 회원가입 아이디 중복확인 실패:", err);
      showAlert(
        "알림",
        err instanceof ApiError
          ? err.message || "아이디 중복 확인에 실패했습니다."
          : "아이디 중복 확인 중 오류가 발생했습니다.",
        "danger",
        "academyUserId",
      );
    } finally {
      setIsCheckingUserId(false);
    }
  }, [showAlert, userId]);

  /** MY PAGE: 기존 첨부파일 또는 사업자등록증 삭제 확인 후 API 호출 */
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
        showAlert("삭제 완료", "첨부파일이 삭제되었습니다.");
      } else {
        await UserArmuserService.deleteBiznoFile(
          esntlId,
          payload.fileId,
          payload.seq,
        );
        showAlert("삭제 완료", "사업자등록증이 삭제되었습니다.");
      }
      onDetailUpdated?.();
    } catch (e) {
      console.error("파일 삭제 실패:", e);
      showAlert(
        "삭제 실패",
        e instanceof Error ? e.message : "파일 삭제 중 오류가 발생했습니다.",
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
        showAlert("알림", "아이디를 입력하세요.", "danger", "academyUserId");
        return;
      }
      if (mode !== "mypage") {
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailLike.test(userId.trim())) {
          showAlert(
            "알림",
            "아이디는 이메일 형식으로 입력해주세요.",
            "danger",
            "academyUserId",
          );
          return;
        }
        if (checkedUserId !== userId.trim()) {
          showAlert(
            "알림",
            "아이디 중복 확인을 해주세요.",
            "danger",
            "academyUserId",
          );
          return;
        }
      }
      if (mode !== "mypage") {
        if (!password) {
          showAlert(
            "알림",
            "비밀번호를 입력하세요.",
            "danger",
            "academyPassword",
          );
          return;
        }
        if (!passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호 확인을 입력하세요.",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
      } else if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          showAlert(
            "알림",
            "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
            "danger",
            "academyPasswordConfirm",
          );
          return;
        }
      }
      if (!academyNm.trim()) {
        showAlert("알림", "학원명을 입력하세요.", "danger", "academyNm");
        return;
      }
      if (!bizNo.trim()) {
        showAlert(
          "알림",
          "사업자등록번호를 입력하세요.",
          "danger",
          "academyBizNo",
        );
        return;
      }
      if (!ceoNm.trim()) {
        showAlert("알림", "대표이사를 입력하세요.", "danger", "academyCeoNm");
        return;
      }
      if (!telno.trim()) {
        showAlert("알림", "연락처를 입력하세요.", "danger", "academyTelno");
        return;
      }
      if (!email.trim()) {
        showAlert("알림", "이메일주소를 입력하세요.", "danger", "academyEmail");
        return;
      }

      setSubmitLoading(true);
      try {
        if (mode === "mypage") {
          const esntlId = initialData?.detail?.esntlId?.trim();
          if (!esntlId) {
            showAlert("알림", "회원 정보를 불러올 수 없습니다.", "danger");
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
            showAlert("알림", res.message || "수정에 실패했습니다.", "danger");
            return;
          }
          onDetailUpdated?.();
          showAlert("알림", "수정이 완료되었습니다.", "success");
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
              "알림",
              res.message || "이미 사용 중인 아이디입니다.",
              "danger",
              "academyUserId",
            );
            return;
          }
          if (res.result === "01") {
            showAlert("알림", res.message || "등록에 실패했습니다.", "danger");
            return;
          }
          if (res.result === "51") {
            showAlert(
              "알림",
              res.message || "이미 본인인증으로 가입된 회원입니다.",
              "danger",
            );
            return;
          }
          afterAlertCloseRef.current = handleReset;
          showAlert("알림", "신청이 완료되었습니다.", "success");
        }
      } catch (err) {
        console.error(
          mode === "mypage" ? "학원 정보 수정 실패:" : "학원 회원가입 실패:",
          err,
        );
        if (err instanceof ApiError) {
          showAlert(
            "알림",
            err.message ||
              (mode === "mypage"
                ? "수정 중 오류가 발생했습니다."
                : "회원가입 중 오류가 발생했습니다."),
            "danger",
          );
        } else {
          showAlert(
            "알림",
            mode === "mypage"
              ? "수정 중 오류가 발생했습니다."
              : "회원가입 중 오류가 발생했습니다.",
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
                  ? "사용"
                  : initialData?.detail?.mberSttus === "D"
                    ? "탈퇴"
                    : "신청"}
              </div>
            )}
            <div className="sectionHeader">
              <div className="sectionTitle">학원정보 입력</div>
            </div>
            <div className="formGrid">
              {/* 아이디 / 학원명 */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyUserId" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    아이디
                  </label>
                  <div className="formControl">
                    {mode === "join" ? (
                      <div className="inputWithBtn">
                        <input
                          type="text"
                          id="academyUserId"
                          className="inputField"
                          placeholder="이메일 형식으로 입력해주세요"
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
                          {isCheckingUserId ? "확인 중..." : "중복확인"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        id="academyUserId"
                        className="inputField"
                        placeholder="이메일 형식으로 입력해주세요"
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
                    학원명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyNm"
                      className="inputField"
                      placeholder="학원명을 입력해주세요"
                      value={academyNm}
                      onChange={(e) => setAcademyNm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* 비밀번호 / 비밀번호 확인 */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyPassword" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    비밀번호
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="academyPassword"
                      className="inputField"
                      placeholder="비밀번호를 입력해주세요"
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
                    비밀번호 확인
                  </label>
                  <div className="formControl">
                    <input
                      type="password"
                      id="academyPasswordConfirm"
                      className="inputField"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* 사업자등록번호 / 대표이사 */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyBizNo" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    사업자등록번호
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyBizNo"
                      className="inputField"
                      placeholder="사업자등록번호를 입력해주세요"
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
                    대표이사
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="academyCeoNm"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="대표이사를 입력해주세요"
                      value={ceoNm}
                      onChange={(e) => setCeoNm(e.target.value)}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
              </div>
              {/* 연락처 / 사무실번호 */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyTelno" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    연락처
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyTelno"
                      className={`inputField${certDataFromJoin ? " bgGray" : ""}`}
                      placeholder="숫자만 입력해주세요"
                      value={telno}
                      onChange={handleTelnoChange}
                      readOnly={certDataFromJoin}
                      aria-readonly={certDataFromJoin}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyOfficeTelno" className="formLabel">
                    사무실번호
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyOfficeTelno"
                      className="inputField"
                      placeholder="숫자만 입력해주세요"
                      value={officeTelno}
                      onChange={handleOfficeTelnoChange}
                    />
                  </div>
                </div>
              </div>
              {/* 이메일주소 / 회원팩스번호 */}
              <div className="formRow split">
                <div className="fieldUnit">
                  <label htmlFor="academyEmail" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    이메일주소
                  </label>
                  <div className="formControl">
                    <input
                      type="email"
                      id="academyEmail"
                      className="inputField"
                      placeholder="이메일을 입력해주세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fieldUnit">
                  <label htmlFor="academyFaxNo" className="formLabel">
                    회원팩스번호
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="academyFaxNo"
                      className="inputField"
                      placeholder="숫자만 입력해주세요"
                      value={faxNo}
                      onChange={handleFaxNoChange}
                    />
                  </div>
                </div>
              </div>
              {/* 우편번호, 주소, 상세주소 (다른 회원가입과 동일 UI) */}
              <div className="formRow">
                <label className="formLabel" id="lblAcademyAddress">
                  주소
                </label>
                <div className="formControl addressContainer">
                  <div className="inputWithBtn">
                    <input
                      type="text"
                      className="inputField bgGray addressZip"
                      readOnly
                      title="우편번호"
                      value={zip}
                      placeholder="우편번호"
                      aria-label="우편번호"
                    />
                    <input
                      type="text"
                      className="inputField bgGray"
                      readOnly
                      title="기본주소"
                      value={address}
                      placeholder="주소"
                      aria-label="기본주소"
                    />
                    <button
                      type="button"
                      className="btnSearch"
                      onClick={handleAddressSearch}
                      title="주소 검색"
                      aria-label="주소 검색"
                    >
                      주소검색
                    </button>
                  </div>
                  <input
                    type="text"
                    className="inputField"
                    placeholder="상세주소를 입력해주세요"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    aria-label="상세주소"
                  />
                </div>
              </div>
              {/* 사진로고 (이미지 선택 시 미리보기) */}
              <div className="formRow">
                <div className="fieldUnit">
                  <label htmlFor="academyLogoInput" className="formLabel">
                    사진로고
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
                        aria-label="이미지 파일 첨부하기"
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
                        <span className="srOnly">이미지 첨부하기</span>
                      </label>
                      {logoPreview && (
                        <button
                          type="button"
                          className="btnImageDel"
                          aria-label="첨부된 이미지 삭제"
                          onClick={handleLogoRemove}
                        >
                          <span className="iconDel sr-only" aria-hidden="true">
                            삭제
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* 학원소개 (PROFILE_DESC 저장) - bizInput 목적/활동내용 UI */}
              <div className="formRow">
                <label htmlFor="academyProfileDesc" className="formLabel">
                  학원소개
                </label>
                <div className="formControl">
                  <textarea
                    id="academyProfileDesc"
                    className="textAreaField"
                    placeholder="학원소개 내용을 입력해주세요"
                    value={profileDesc}
                    onChange={(e) => setProfileDesc(e.target.value)}
                  />
                </div>
              </div>
              {/* 첨부파일 (여러 개) - bizInput처럼 라벨 높이 줄임 */}
              <div className="formRow formRowFile">
                <span className="formLabel">
                  첨부파일
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
                    aria-label="파일 첨부하기"
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
                      const label = f.orgfNm?.trim() || "첨부파일";
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
                              void downloadEdreamAttachmentOrOpenView(
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
                            aria-label={`${label} 파일 삭제`}
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
                          aria-label={`${label} 파일 삭제`}
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
                        첨부된 파일이 없습니다.
                      </span>
                    )}
                </div>
              </div>
              {/* 사업자등록증 (1개) - bizInput처럼 라벨 높이 줄임 */}
              <div className="formRow formRowFile">
                <span className="formLabel">
                  사업자등록증
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
                    aria-label="파일 첨부하기"
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
                      const label = f.orgfNm?.trim() || "사업자등록증";
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
                              void downloadEdreamAttachmentOrOpenView(
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
                            aria-label={`${label} 파일 삭제`}
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
                        aria-label={`${bizCertFile.name} 파일 삭제`}
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
                        첨부된 파일이 없습니다.
                      </span>
                    )}
                </div>
              </div>
              {mode === "mypage" && (
                <div className="formRow mypageSnsLinkRow">
                  <span className="formLabel">간편로그인연결</span>
                  <div className="formControl mypageSnsLinkControl">
                    <div className="mypageSnsLinkItem">
                      <span className="mypageSnsLinkBadge mypageBadgeNaver">
                        <img
                          src="/images/userWeb/icon/ico_sns_naver.png"
                          alt="네이버"
                        />
                        네이버
                      </span>
                      {String(initialData?.detail?.naverAuthId ?? "").trim() !==
                      "" ? (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                          onClick={() => setConfirmUnlinkService("naver")}
                        >
                          해지
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
                                "알림",
                                "네이버 연결 중 오류가 발생했습니다.",
                                "danger",
                              );
                            }
                          }}
                        >
                          연결
                        </button>
                      )}
                    </div>
                    <div className="mypageSnsLinkItem">
                      <span className="mypageSnsLinkBadge mypageBadgeKakao">
                        <img
                          src="/images/userWeb/icon/ico_sns_kakao.png"
                          alt="카카오"
                        />
                        카카오
                      </span>
                      {String(initialData?.detail?.kakaoAuthId ?? "").trim() !==
                      "" ? (
                        <button
                          type="button"
                          className="btnSearch mypageSnsConnectBtn mypageSnsUnlinkBtn"
                          onClick={() => setConfirmUnlinkService("kakao")}
                        >
                          해지
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
                                "알림",
                                "카카오 연결 중 오류가 발생했습니다.",
                                "danger",
                              );
                            }
                          }}
                        >
                          연결
                        </button>
                      )}
                      {mode === "mypage" && (
                        <a
                          href="#"
                          className="mypageWithdrawPlain"
                          onClick={(e) => e.preventDefault()}
                        >
                          회원탈퇴
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
                초기화
              </button>
            )}
            <button
              type="submit"
              className="btnSubmit"
              disabled={submitLoading}
              aria-label={mode === "mypage" ? "저장하기" : "신청하기"}
            >
              {submitLoading
                ? "처리 중..."
                : mode === "mypage"
                  ? "저장하기"
                  : "신청하기"}
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
        title="사진로고 삭제"
        message="사진로고를 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="닫기"
        onConfirm={handleConfirmDeleteUserPic}
        onCancel={() => setShowConfirmDeletePic(false)}
      />
      <ConfirmModal
        isOpen={!!confirmDeleteFile}
        title={
          confirmDeleteFile?.type === "atta"
            ? "첨부파일 삭제"
            : "사업자등록증 삭제"
        }
        message="해당 파일을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="닫기"
        onConfirm={handleConfirmDeleteFile}
        onCancel={() => setConfirmDeleteFile(null)}
      />
      <ConfirmModal
        isOpen={confirmUnlinkService !== null}
        title="간편로그인 연결 해지"
        message="연결을 해지하시겠습니까?"
        confirmText="해지"
        cancelText="닫기"
        onConfirm={async () => {
          const svc = confirmUnlinkService;
          setConfirmUnlinkService(null);
          if (!svc) return;
          try {
            await AuthService.unlinkOAuthLink(svc);
            showAlert(
              "알림",
              svc === "naver"
                ? "네이버 연결 해지되었습니다."
                : "카카오 연결 해지되었습니다.",
            );
            onDetailUpdated?.();
          } catch {
            showAlert(
              "알림",
              svc === "naver"
                ? "네이버 연결 해지 중 오류가 발생했습니다."
                : "카카오 연결 해지 중 오류가 발생했습니다.",
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
        <div className="mainTitle">회원가입</div>
        {formBlock}
      </section>
      {modals}
    </>
  );
};

export default JoinAcSection;
