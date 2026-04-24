import { useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  openDaumPostcode,
  type DaumPostcodeData,
} from "@/shared/lib/daumPostcode";

export interface FeePayerBasicErrors {
  applicantNm?: string;
  zipCode?: string;
  adres?: string;
  detailAdres?: string;
}

const noopInputChange = () => {};

export function useFeePayerBasicRegister() {
  const router = useRouter();
  const [applicantNm, setApplicantNm] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [errors, setErrors] = useState<FeePayerBasicErrors>({});
  const [loading, setLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const clearAddressErrors = useCallback(() => {
    setErrors((prev) => ({
      ...prev,
      zipCode: undefined,
      adres: undefined,
      detailAdres: undefined,
    }));
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === "applicantNm") {
        setApplicantNm(value);
        setErrors((prev) => ({ ...prev, applicantNm: undefined }));
        return;
      }
      if (name === "detailAdres") {
        setDetailAdres(value);
        setErrors((prev) => ({ ...prev, detailAdres: undefined }));
      }
    },
    [],
  );

  const applyDaumPostcodeResult = useCallback(
    (data: DaumPostcodeData) => {
      setZipCode((data.zonecode || "").trim());
      const useJibun = data.userSelectedType === "J";
      const line = useJibun
        ? (data.jibunAddress || "").trim()
        : (data.roadAddress || "").trim();
      setAdres(line);
      clearAddressErrors();
    },
    [clearAddressErrors],
  );

  const handleAddressSearch = useCallback(() => {
    openDaumPostcode(applyDaumPostcodeResult, (message) => {
      setErrors((prev) => ({ ...prev, adres: message }));
    });
  }, [applyDaumPostcodeResult]);

  const validate = useCallback((): boolean => {
    const next: FeePayerBasicErrors = {};
    if (!applicantNm.trim()) {
      next.applicantNm = "성명을 입력해주세요.";
    }
    if (!zipCode.trim()) {
      next.zipCode = "우편번호를 입력하거나 주소 검색을 이용해주세요.";
    }
    if (!adres.trim()) {
      next.adres = "주소를 입력하거나 주소 검색을 이용해주세요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [applicantNm, zipCode, adres]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validate()) return;
      setLoading(true);
      try {
        await new Promise((r) => {
          setTimeout(r, 150);
        });
        setShowInfoDialog(true);
      } finally {
        setLoading(false);
      }
    },
    [validate],
  );

  const handleCancel = useCallback(() => {
    router.push("/adminWeb/support/list");
  }, [router]);

  const handleInfoDialogClose = useCallback(() => {
    setShowInfoDialog(false);
    router.push("/adminWeb/support/list");
  }, [router]);

  return {
    applicantNm,
    zipCode,
    adres,
    detailAdres,
    errors,
    loading,
    showInfoDialog,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  };
}
