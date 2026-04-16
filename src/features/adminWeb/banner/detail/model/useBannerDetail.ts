import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BannerService,
  type BannerDetailDataResponse,
} from "@/entities/adminWeb/banner/api/bannerApi";
import { buildBannerUpdateSaveRequest } from "@/entities/adminWeb/banner/lib/buildBannerUpdateSaveRequest";
import { mapBannerDetailDataToAdminRow } from "@/entities/adminWeb/banner/lib/mapBannerDetailDataToAdminRow";
import type { AdminBannerRow } from "@/entities/adminWeb/banner/model/types";
import { API_CONFIG } from "@/shared/config/api";
import type {
  BannerRegisterFormData,
  BannerFormErrors,
} from "@/features/adminWeb/banner/register/model";
import { ApiError, TokenUtils } from "@/shared/lib";

type PicDeletePending = "newFile" | "existing" | null;

export function useBannerDetail(bannerId: string) {
  const router = useRouter();
  const [row, setRow] = useState<AdminBannerRow | null>(null);
  const [detailSource, setDetailSource] =
    useState<BannerDetailDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [formData, setFormData] = useState<BannerRegisterFormData>({
    postStartDttm: "",
    postEndDttm: "",
    title: "",
    content: "",
    sortOrder: "0",
    useYn: "Y",
  });
  const [errors, setErrors] = useState<BannerFormErrors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [showDeletePicConfirm, setShowDeletePicConfirm] = useState(false);
  const [pendingPicDelete, setPendingPicDelete] =
    useState<PicDeletePending>(null);

  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");

  useEffect(() => {
    const id = bannerId?.trim() ?? "";
    if (!id) {
      setRow(null);
      setDetailSource(null);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        TokenUtils.debugToken();
        if (!TokenUtils.isTokenValid()) {
          setError("로그인이 필요합니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
          return;
        }

        const response = await BannerService.getBannerDetail(id);
        if (cancelled) return;

        if (response.result && response.result !== "00") {
          setRow(null);
          setDetailSource(null);
          setError("배너 상세 조회에 실패했습니다.");
          return;
        }

        const data = response.data;
        if (!data?.banrCd) {
          setRow(null);
          setDetailSource(null);
          setError("배너 정보를 찾을 수 없습니다.");
          return;
        }

        setDetailSource(data);
        const mapped = mapBannerDetailDataToAdminRow(data);
        setRow(mapped);
      } catch (err) {
        if (cancelled) return;
        setRow(null);
        setDetailSource(null);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("인증에 실패했습니다. 다시 로그인해주세요.");
            setTimeout(() => {
              window.location.href = "/adminWeb/login";
            }, 2000);
          } else {
            setError(err.message);
          }
        } else {
          setError("배너 상세를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bannerId]);

  useEffect(() => {
    if (!row) return;
    setFormData({
      postStartDttm: row.postStartDttm,
      postEndDttm: row.postEndDttm,
      title: row.title,
      content: row.content,
      sortOrder: String(row.sortOrder),
      useYn: row.useYn,
    });
    setPhotoFile(null);
    setImageRemoved(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setErrors({});
  }, [row]);

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
      setImageRemoved(false);
      setPhotoFile(file);
    },
    [],
  );

  const resolveImageViewUrl = useCallback((path: string) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (typeof window !== "undefined") {
      try {
        return new URL(path, window.location.origin).href;
      } catch {
        return path;
      }
    }
    return path;
  }, []);

  const existingImageUrl = row?.imageUrl ?? "";
  const hasExistingImage = !!existingImageUrl && !imageRemoved;
  const existingFileId = (detailSource?.fileCd ?? "").trim();
  const existingFileSeq = 1;

  const buildFileApiUrl = useCallback(
    (path: string, fileId: string, seq: number): string => {
      const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") ?? "";
      const query = `fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(String(seq))}`;
      return `${base}${path}?${query}`;
    },
    [],
  );

  const fileApiViewUrl =
    existingFileId && !imageRemoved
      ? buildFileApiUrl("/api/v1/files/view", existingFileId, existingFileSeq)
      : "";
  const existingImageDownloadUrl =
    existingFileId && !imageRemoved
      ? buildFileApiUrl(
          "/api/v1/files/download",
          existingFileId,
          existingFileSeq,
        )
      : "";
  const existingImageViewUrl =
    fileApiViewUrl || resolveImageViewUrl(existingImageUrl);
  const existingImageName = detailSource?.orgfNm?.trim() || "banner-image";
  const hasExistingImageByFileApi = !!existingImageViewUrl && !imageRemoved;

  const openDeletePicDialog = useCallback(() => {
    if (photoFile) {
      setPendingPicDelete("newFile");
      setShowDeletePicConfirm(true);
      return;
    }
    if (hasExistingImage) {
      setPendingPicDelete("existing");
      setShowDeletePicConfirm(true);
    }
  }, [photoFile, hasExistingImage]);

  const confirmDeletePic = useCallback(async () => {
    if (pendingPicDelete === "newFile") {
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    } else if (pendingPicDelete === "existing") {
      const id = bannerId?.trim() ?? "";
      if (!id) {
        setMessageDialogTitle("이미지 삭제 실패");
        setMessageDialogMessage("배너 정보가 없습니다. 다시 조회해 주세요.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      try {
        const res = await BannerService.deleteBannerImage(id);
        if (res.result && res.result !== "00") {
          setMessageDialogTitle("이미지 삭제 실패");
          setMessageDialogMessage(
            res.message?.trim() || "배너 이미지 삭제에 실패했습니다.",
          );
          setMessageDialogType("danger");
          setShowMessageDialog(true);
          return;
        }
        setImageRemoved(false);
        setPhotoFile(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
        setRow((prev) => (prev ? { ...prev, imageUrl: "" } : prev));
        setDetailSource((prev) =>
          prev ? { ...prev, fileCd: "", imgUrl: "", orgfNm: "" } : prev,
        );
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "배너 이미지 삭제 중 오류가 발생했습니다.";
        setMessageDialogTitle("이미지 삭제 실패");
        setMessageDialogMessage(msg);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
    }
    setPendingPicDelete(null);
    setShowDeletePicConfirm(false);
    setErrors((prev) => ({ ...prev, image: undefined }));
  }, [pendingPicDelete, bannerId]);

  const cancelDeletePic = useCallback(() => {
    setShowDeletePicConfirm(false);
    setPendingPicDelete(null);
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
    const hasNewFile = !!photoFile;
    const clearingImageOnly = imageRemoved && !hasNewFile;
    if (!hasNewFile && !hasExistingImage && !clearingImageOnly) {
      next.image = "이미지를 선택해주세요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [formData, photoFile, hasExistingImage, imageRemoved]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      const id = bannerId?.trim() ?? "";
      if (!id || !detailSource?.banrCd) {
        setMessageDialogTitle("저장 실패");
        setMessageDialogMessage("배너 정보가 없습니다. 다시 조회해 주세요.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      if (!TokenUtils.isTokenValid()) {
        setMessageDialogTitle("저장 실패");
        setMessageDialogMessage("로그인이 필요합니다.");
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }

      try {
        setSaveLoading(true);
        const payload = buildBannerUpdateSaveRequest(detailSource, formData, {
          imageRemoved,
          hasNewImageFile: !!photoFile,
        });
        const res = await BannerService.updateBanner(id, payload, photoFile);
        if (res.result && res.result !== "00") {
          setMessageDialogTitle("저장 실패");
          setMessageDialogMessage(
            res.message?.trim() || "배너 수정에 실패했습니다.",
          );
          setMessageDialogType("danger");
          setShowMessageDialog(true);
          return;
        }
        setMessageDialogTitle("저장 완료");
        setMessageDialogMessage(res.message?.trim() || "저장되었습니다.");
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "배너 수정 중 오류가 발생했습니다.";
        setMessageDialogTitle("저장 실패");
        setMessageDialogMessage(msg);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      } finally {
        setSaveLoading(false);
      }
    },
    [validate, bannerId, detailSource, formData, imageRemoved, photoFile],
  );

  const handleMessageDialogClose = useCallback(() => {
    setShowMessageDialog(false);
    if (messageDialogType === "success") {
      router.push("/adminWeb/banner/list");
    }
  }, [router, messageDialogType]);

  const deletePicMessage =
    pendingPicDelete === "existing"
      ? "등록된 배너 이미지를 삭제하시겠습니까?"
      : "선택한 이미지를 제거하시겠습니까?";

  const canDownloadOrDelete = !!(photoFile || hasExistingImageByFileApi);

  return {
    row,
    loading,
    error,
    saveLoading,
    formData,
    errors,
    photoFile,
    photoInputRef,
    existingImageUrl,
    hasExistingImage: hasExistingImageByFileApi,
    existingImageViewUrl,
    existingImageDownloadUrl,
    existingImageName,
    resolveImageViewUrl,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    showDeletePicConfirm,
    deletePicMessage,
    canDownloadOrDelete,
    handleInputChange,
    handleRadioChange,
    handlePhotoSelected,
    openDeletePicDialog,
    confirmDeletePic,
    cancelDeletePic,
    handleSubmit,
    handleMessageDialogClose,
  };
}
