import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type MutableRefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  openDaumPostcode,
  type DaumPostcodeData,
} from "@/shared/lib/daumPostcode";
import {
  formatPhoneWithHyphen,
  numericOnly,
} from "@/shared/lib/inputValidation";
import {
  getFeePayerDetail,
  postFeePayerRegister,
  type SupportFeePayerBasicInfoRequest,
  type SupportFeePayerRegisterRequest,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import { ApiError } from "@/shared/lib/apiClient";
import { mapFeePayerDetailDtoToInitialForm } from "./useFeePayerBasicDetail";
import type { SewageEstimateEntry } from "./useFeePayerSewageVolumeEstimate";

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
  /** `FeePayerSewageVolumeEstimateSection`이 저장 본문 조립기를 넣는 ref */
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportFeePayerRegisterRequest | null) | null
  >;
}

export function useFeePayerBasicRegister(
  options: UseFeePayerBasicRegisterOptions = {},
) {
  const { seedProId, persistRequestBuilderRef } = options;
  const router = useRouter();
  const internalPersistRef = useRef<
    (() => SupportFeePayerRegisterRequest | null) | null
  >(null);
  const persistBuildStateRef = useRef<"invalid_required" | "no_changes" | null>(
    null,
  );
  const persistRef = persistRequestBuilderRef ?? internalPersistRef;
  const [applicantNm, setApplicantNm] = useState("");
  const [telNo, setTelNo] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [errors, setErrors] = useState<FeePayerBasicErrors>({});
  const [loading, setLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState("알림");
  const [infoDialogMessage, setInfoDialogMessage] = useState("");
  const [infoDialogType, setInfoDialogType] = useState<
    "success" | "danger" | "primary"
  >("primary");
  /** 계산·등록 API 선저장 후 서버 ITEM_ID */
  const [feePayerItemId, setFeePayerItemId] = useState<string | undefined>(
    undefined,
  );

  const [detailPhase, setDetailPhase] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [feePayerDetailEntries, setFeePayerDetailEntries] = useState<
    SewageEstimateEntry[] | undefined
  >(undefined);

  const detailLoading = Boolean(seedProId?.trim()) && detailPhase === "loading";
  const seedInvalid =
    Boolean(seedProId?.trim()) && detailPhase === "failed";

  const sewageInitialEntries = useMemo(() => {
    if (!seedProId?.trim()) return undefined;
    if (detailPhase !== "ready") return undefined;
    return feePayerDetailEntries;
  }, [seedProId, detailPhase, feePayerDetailEntries]);

  useEffect(() => {
    const id = seedProId?.trim();
    if (!id) {
      setDetailPhase("idle");
      setDetailErrorMessage("");
      setFeePayerDetailEntries(undefined);
      return;
    }

    let cancelled = false;
    setDetailPhase("loading");
    setDetailErrorMessage("");

    void (async () => {
      try {
        const env = await getFeePayerDetail(id);
        if (cancelled) return;
        const raw = env.data;
        if (!raw) {
          setDetailPhase("failed");
          setDetailErrorMessage("상세 데이터가 없습니다.");
          return;
        }
        const mapped = mapFeePayerDetailDtoToInitialForm(raw);
        const b = mapped.basic;
        setApplicantNm(b.applicantNm);
        const telDigits = numericOnly(b.telNo).slice(0, 11);
        setTelNo(telDigits ? formatPhoneWithHyphen(telDigits) : "");
        setZipCode(b.zipCode);
        setAdres(b.adres);
        setDetailAdres(b.detailAdres);
        setErrors({});
        setFeePayerDetailEntries(
          mapped.entries.length > 0 ? mapped.entries : undefined,
        );
        const wid = mapped.itemId || id;
        setFeePayerItemId(wid);
        setDetailPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setDetailPhase("failed");
        const msg =
          err instanceof ApiError
            ? String(err.message || "").trim()
            : "상세를 불러오는 중 오류가 발생했습니다.";
        setDetailErrorMessage(msg || "상세를 불러오는 중 오류가 발생했습니다.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seedProId]);

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

  const getBasicInfoBody =
    useCallback((): SupportFeePayerBasicInfoRequest | null => {
      const telDigits = numericOnly(telNo);
      if (!applicantNm.trim() || !adres.trim()) {
        return null;
      }
      const body: SupportFeePayerBasicInfoRequest = {
        userNm: applicantNm.trim(),
        zip: zipCode.trim(),
        adresLot: "",
        adres: adres.trim(),
        detailAdres: detailAdres.trim(),
      };
      if (telDigits.length > 0) {
        body.usrTelno = telDigits;
      }
      return body;
    }, [applicantNm, telNo, zipCode, adres, detailAdres]);

  const validate = useCallback((): boolean => {
    const next: FeePayerBasicErrors = {};
    if (!applicantNm.trim()) {
      next.applicantNm = "성명을 입력해주세요.";
    }
    const telDigits = numericOnly(telNo);
    if (
      telDigits.length > 0 &&
      (telDigits.length < 9 || telDigits.length > 11)
    ) {
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
      const build = persistRef.current;
      if (!build) {
        window.alert("오수량 산정 영역이 준비되지 않았습니다.");
        return;
      }
      const body = build();
      if (!body) {
        if (persistBuildStateRef.current === "no_changes") {
          window.alert("변경된 내용이 없습니다.");
        } else {
          window.alert(
            "구분·유형·통지일 등 오수량 산정 필수 항목을 확인해 주세요.",
          );
        }
        return;
      }
      setLoading(true);
      try {
        const res = await postFeePayerRegister(body);
        const wid = String(res.itemId ?? "").trim();
        if (wid) setFeePayerItemId(wid);
        const isUpdate = Boolean(seedProId?.trim() || body.itemId?.trim());
        setInfoDialogTitle(isUpdate ? "수정 완료" : "등록 완료");
        setInfoDialogMessage(
          String(res.message ?? "").trim() ||
            (isUpdate
              ? "정상적으로 수정되었습니다."
              : "정상적으로 등록되었습니다."),
        );
        setInfoDialogType("success");
        setShowInfoDialog(true);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? String(err.message || "").trim()
            : "저장 중 오류가 발생했습니다.";
        setInfoDialogTitle("오류");
        setInfoDialogMessage(msg || "저장 중 오류가 발생했습니다.");
        setInfoDialogType("danger");
        setShowInfoDialog(true);
      } finally {
        setLoading(false);
      }
    },
    [validate, persistRef, seedProId],
  );

  const handleCancel = useCallback(() => {
    router.push("/adminWeb/support/list");
  }, [router]);

  const handleInfoDialogClose = useCallback(() => {
    const wasSuccess = infoDialogType === "success";
    setShowInfoDialog(false);
    if (wasSuccess) {
      router.push("/adminWeb/support/list");
    }
  }, [router, infoDialogType]);

  return {
    applicantNm,
    telNo,
    zipCode,
    adres,
    detailAdres,
    errors,
    loading,
    showInfoDialog,
    infoDialogTitle,
    infoDialogMessage,
    infoDialogType,
    seedInvalid,
    detailLoading,
    detailErrorMessage,
    sewageInitialEntries,
    feePayerItemId,
    setFeePayerItemId,
    getBasicInfoBody,
    persistBuildStateRef,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  };
}
