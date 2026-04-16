import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BannerService } from "@/entities/adminWeb/banner/api/bannerApi";
import { buildBannerInsertSaveRequest } from "@/entities/adminWeb/banner/lib/buildBannerUpdateSaveRequest";
import {
  getDefaultBannerEndDttm,
  getDefaultBannerStartDttm,
} from "@/entities/adminWeb/banner/lib/defaultPostingDttm";
import { ApiError, TokenUtils } from "@/shared/lib";

export interface BannerRegisterFormData {
  postStartDttm: string;
  postEndDttm: string;
  title: string;
  content: string;
  sortOrder: string;
  useYn: string;
}

export interface BannerFormErrors {
  postStartDttm?: string;
  postEndDttm?: string;
  title?: string;
  sortOrder?: string;
  image?: string;
}

function createInitialRegisterForm(): BannerRegisterFormData {
  const defaultStartDate = getDefaultBannerStartDttm().slice(0, 10);
  const defaultEndDate = getDefaultBannerEndDttm().slice(0, 10);
  return {
    postStartDttm: defaultStartDate,
    postEndDttm: defaultEndDate,
    title: "",
    content: "",
    sortOrder: "0",
    useYn: "Y",
  };
}

export function useBannerRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState<BannerRegisterFormData>(
    createInitialRegisterForm,
  );
  const [errors, setErrors] = useState<BannerFormErrors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleRadioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handlePhotoSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "이미지 파일만 업로드할 수 있습니다.",
        }));
        return;
      }
      setErrors((prev) => ({ ...prev, image: undefined }));
      setPhotoFile(file);
    },
    [],
  );

  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");
  const [saveLoading, setSaveLoading] = useState(false);

  const clearPhotoFile = useCallback(() => {
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setErrors((prev) => ({ ...prev, image: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: BannerFormErrors = {};
    if (!formData.title.trim()) {
      next.title = "제목을 입력해주세요.";
    }
    if (!formData.postStartDttm) {
      next.postStartDttm = "시작일시를 선택해주세요.";
    }
    if (!formData.postEndDttm) {
      next.postEndDttm = "종료일시를 선택해주세요.";
    }
    if (formData.postStartDttm && formData.postEndDttm) {
      const start = new Date(formData.postStartDttm).getTime();
      const end = new Date(formData.postEndDttm).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        next.postEndDttm = "종료일시는 시작일시 이후여야 합니다.";
      }
    }
    const order = Number(formData.sortOrder);
    if (
      formData.sortOrder === "" ||
      Number.isNaN(order) ||
      order < 0 ||
      !Number.isInteger(order)
    ) {
      next.sortOrder = "0 이상의 정수를 입력해주세요.";
    }
    if (!photoFile) {
      next.image = "이미지를 선택해주세요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [formData, photoFile]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || !photoFile) return;

      TokenUtils.debugToken();
      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage("로그인이 필요합니다. 다시 로그인해 주세요.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }

      try {
        setSaveLoading(true);
        const payload = buildBannerInsertSaveRequest(formData);
        const res = await BannerService.insertBanner(payload, photoFile);
        if (res.result && res.result !== "00") {
          setMessageDialogTitle("등록 실패");
          setMessageDialogMessage(
            res.message?.trim() || "배너 등록에 실패했습니다.",
          );
          setMessageDialogType("danger");
          setShowMessageDialog(true);
          return;
        }
        setMessageDialogTitle("등록 완료");
        setMessageDialogMessage(res.message?.trim() || "등록되었습니다.");
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "배너 등록 중 오류가 발생했습니다.";
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(msg);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      } finally {
        setSaveLoading(false);
      }
    },
    [validate, formData, photoFile],
  );

  const handleMessageDialogClose = useCallback(() => {
    setShowMessageDialog(false);
    if (messageDialogType === "success") {
      router.push("/adminWeb/banner/list");
    }
  }, [router, messageDialogType]);

  return {
    formData,
    errors,
    photoFile,
    photoInputRef,
    saveLoading,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handlePhotoSelected,
    clearPhotoFile,
    handleSubmit,
    handleMessageDialogClose,
  };
}
