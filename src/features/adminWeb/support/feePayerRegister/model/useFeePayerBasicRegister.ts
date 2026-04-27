import { useState, useCallback, useEffect, useMemo, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  openDaumPostcode,
  type DaumPostcodeData,
} from "@/shared/lib/daumPostcode";
import {
  formatPhoneWithHyphen,
  numericOnly,
} from "@/shared/lib/inputValidation";
import { getFeeListRowByBusinessId } from "@/features/adminWeb/support/list/model/feeListMockData";
import {
  buildSewageEstimateEntriesFromFeeRow,
  getFeePayerBasicSeedFromSupportRow,
} from "./useFeePayerBasicDetail";

export interface FeePayerBasicErrors {
  applicantNm?: string;
  telNo?: string;
  zipCode?: string;
  adres?: string;
  detailAdres?: string;
}

const noopInputChange = () => {};

export interface UseFeePayerBasicRegisterOptions {
  /** 목 `businessId` 등 — 있으면 기본정보·오수량 산정을 해당 행으로 채움(상세=등록과 동일 편집) */
  seedProId?: string | null;
}

export function useFeePayerBasicRegister(
  options: UseFeePayerBasicRegisterOptions = {},
) {
  const { seedProId } = options;
  const router = useRouter();
  const [applicantNm, setApplicantNm] = useState("");
  const [telNo, setTelNo] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [errors, setErrors] = useState<FeePayerBasicErrors>({});
  const [loading, setLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const rowForSeed = useMemo(
    () =>
      seedProId?.trim()
        ? getFeeListRowByBusinessId(seedProId.trim())
        : undefined,
    [seedProId],
  );

  const seedInvalid = Boolean(seedProId?.trim()) && rowForSeed === undefined;

  const sewageInitialEntries = useMemo(() => {
    if (!rowForSeed) return undefined;
    return buildSewageEstimateEntriesFromFeeRow(rowForSeed);
  }, [rowForSeed]);

  useEffect(() => {
    if (!seedProId?.trim() || !rowForSeed) return;
    const b = getFeePayerBasicSeedFromSupportRow(rowForSeed);
    setApplicantNm(b.applicantNm);
    const telDigits = numericOnly(b.telNo).slice(0, 11);
    setTelNo(telDigits ? formatPhoneWithHyphen(telDigits) : "");
    setZipCode(b.zipCode);
    setAdres(b.adres);
    setDetailAdres(b.detailAdres);
    setErrors({});
  }, [seedProId, rowForSeed]);

  const saveInfoMessage = seedProId?.trim()
    ? "수정 API는 아직 연결되지 않았습니다. 목록으로 이동합니다."
    : "등록 API는 아직 연결되지 않았습니다. 목록으로 이동합니다.";

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
      if (name === "telNo") {
        const digits = numericOnly(value).slice(0, 11);
        setTelNo(formatPhoneWithHyphen(digits));
        setErrors((prev) => ({ ...prev, telNo: undefined }));
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
    const telDigits = numericOnly(telNo);
    if (!telDigits.length) {
      next.telNo = "전화번호를 입력해주세요.";
    } else if (telDigits.length < 9 || telDigits.length > 11) {
      next.telNo = "올바른 전화번호 형식이 아닙니다.";
    }
    if (!zipCode.trim()) {
      next.zipCode = "우편번호를 입력하거나 주소 검색을 이용해주세요.";
    }
    if (!adres.trim()) {
      next.adres = "주소를 입력하거나 주소 검색을 이용해주세요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [applicantNm, telNo, zipCode, adres]);

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
    telNo,
    zipCode,
    adres,
    detailAdres,
    errors,
    loading,
    showInfoDialog,
    saveInfoMessage,
    seedInvalid,
    sewageInitialEntries,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  };
}
