import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
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
  getDrainageEquipDetail,
  postDrainageEquipRegister,
  type SupportDrainageEquipBasicInfoRequest,
  type SupportDrainageEquipRegisterRequest,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { mapDrainageEquipDetailDtoToForm } from "../lib/mapDrainageEquipDetailFromApi";
import type { DrainageEquipDetailEntry } from "./useDrainageEquipDetailSection";
import { ApiError } from "@/shared/lib/apiClient";

export interface DrainageEquipBasicErrors {
  userNm?: string;
  telNo?: string;
  zipCode?: string;
  adres?: string;
  detailAdres?: string;
}

const LIST_PATH = "/adminWeb/support/drainage-equip";

export interface UseDrainageEquipBasicRegisterOptions {
  /** 수정·상세 시 ITEM_ID (`?itemId=`) */
  seedItemId?: string | null;
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportDrainageEquipRegisterRequest | null) | null
  >;
}

function applyDetailFormToState(
  mapped: ReturnType<typeof mapDrainageEquipDetailDtoToForm>,
  setters: {
    setUserNm: (v: string) => void;
    setTelNo: (v: string) => void;
    setZipCode: (v: string) => void;
    setAdres: (v: string) => void;
    setDetailAdres: (v: string) => void;
    setItemId: (v: string | undefined) => void;
    setDetailEntries: (v: DrainageEquipDetailEntry[] | undefined) => void;
    setDetailReloadKey: (fn: (k: number) => number) => void;
  },
) {
  setters.setUserNm(mapped.userNm);
  setters.setTelNo(mapped.telNo);
  setters.setZipCode(mapped.zipCode);
  setters.setAdres(mapped.adres);
  setters.setDetailAdres(mapped.detailAdres);
  setters.setItemId(mapped.itemId);
  setters.setDetailEntries(
    mapped.detailEntries.length > 0 ? mapped.detailEntries : undefined,
  );
  setters.setDetailReloadKey((k) => k + 1);
}

export function useDrainageEquipBasicRegister(
  options: UseDrainageEquipBasicRegisterOptions = {},
) {
  const { seedItemId, persistRequestBuilderRef } = options;
  const internalPersistRef = useRef<
    (() => SupportDrainageEquipRegisterRequest | null) | null
  >(null);
  const persistRef = persistRequestBuilderRef ?? internalPersistRef;
  const persistBuildStateRef = useRef<
    "invalid_required" | "no_changes" | null
  >(null);
  const router = useRouter();

  const [userNm, setUserNm] = useState("");
  const [telNo, setTelNo] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [errors, setErrors] = useState<DrainageEquipBasicErrors>({});
  const [loading, setLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoDialogTitle, setInfoDialogTitle] = useState("알림");
  const [infoDialogMessage, setInfoDialogMessage] = useState("");
  const [infoDialogType, setInfoDialogType] = useState<
    "success" | "danger" | "primary"
  >("primary");
  const [infoDialogSingleAction, setInfoDialogSingleAction] = useState(false);

  const [detailPhase, setDetailPhase] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [itemId, setItemId] = useState<string | undefined>(undefined);
  const [detailEntries, setDetailEntries] = useState<
    DrainageEquipDetailEntry[] | undefined
  >(undefined);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const navigateToListAfterInfoCloseRef = useRef(false);

  const detailLoading = Boolean(seedItemId?.trim()) && detailPhase === "loading";
  const seedInvalid =
    Boolean(seedItemId?.trim()) && detailPhase === "failed";
  const isEditMode = Boolean(seedItemId?.trim());

  const loadDetail = useCallback(async (id: string, options?: { silent?: boolean }) => {
    const trimmed = id.trim();
    if (!trimmed) return;

    if (!options?.silent) {
      setDetailPhase("loading");
      setDetailErrorMessage("");
    }

    try {
      const env = await getDrainageEquipDetail(trimmed);
      const raw = env.data;
      if (!raw) {
        setDetailPhase("failed");
        setDetailErrorMessage("상세 데이터가 없습니다.");
        return;
      }
      const mapped = mapDrainageEquipDetailDtoToForm(raw, trimmed);
      applyDetailFormToState(mapped, {
        setUserNm,
        setTelNo,
        setZipCode,
        setAdres,
        setDetailAdres,
        setItemId,
        setDetailEntries,
        setDetailReloadKey,
      });
      setErrors({});
      setDetailPhase("ready");
    } catch (err) {
      setDetailPhase("failed");
      const msg =
        err instanceof ApiError
          ? String(err.message || "").trim()
          : "상세를 불러오는 중 오류가 발생했습니다.";
      setDetailErrorMessage(msg || "상세를 불러오는 중 오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    const id = seedItemId?.trim();
    if (!id) {
      setDetailPhase("idle");
      setDetailErrorMessage("");
      setDetailEntries(undefined);
      setDetailReloadKey(0);
      return;
    }

    let cancelled = false;
    void (async () => {
      await loadDetail(id);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [seedItemId, loadDetail]);

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
      if (name === "userNm") {
        setUserNm(value);
        setErrors((prev) => ({ ...prev, userNm: undefined }));
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

  const noopInputChange = useCallback(() => {}, []);

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

  const buildBasicInfoBody =
    useCallback((): SupportDrainageEquipBasicInfoRequest | null => {
      if (!userNm.trim() || !adres.trim()) {
        return null;
      }
      const telDigits = numericOnly(telNo);
      const body: SupportDrainageEquipBasicInfoRequest = {
        userNm: userNm.trim(),
        zip: zipCode.trim(),
        adresLot: "",
        adres: adres.trim(),
        detailAdres: detailAdres.trim(),
        usrTelno: telDigits.length > 0 ? telDigits : "",
      };
      return body;
    }, [userNm, telNo, zipCode, adres, detailAdres]);

  const validate = useCallback((): boolean => {
    const next: DrainageEquipBasicErrors = {};
    if (!userNm.trim()) {
      next.userNm = "성명을 입력해주세요.";
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
  }, [userNm, telNo, zipCode, adres]);

  const sewageInitialEntries = useMemo(() => {
    if (!seedItemId?.trim()) return undefined;
    if (detailPhase !== "ready") return undefined;
    return detailEntries;
  }, [seedItemId, detailPhase, detailEntries]);

  const drainageEquipApi = useMemo(
    () => ({
      getBasicInfoBody: buildBasicInfoBody,
      itemId: itemId ?? seedItemId?.trim() ?? undefined,
      onItemId: (id: string) => setItemId(id),
    }),
    [buildBasicInfoBody, itemId, seedItemId],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!validate()) return;

      const build = persistRef.current;
      if (!build) {
        window.alert("배수설비 등록분 영역이 준비되지 않았습니다.");
        return;
      }
      const body = build();
      if (!body) {
        if (persistBuildStateRef.current === "no_changes") {
          setInfoDialogTitle("알림");
          setInfoDialogMessage("변경된 내용이 없습니다.");
          setInfoDialogType("primary");
          setInfoDialogSingleAction(true);
          setShowInfoDialog(true);
        } else {
          window.alert(
            "등록분의 상태·등록일·배수설비금액 등 필수 항목을 확인해 주세요.",
          );
        }
        return;
      }

      setLoading(true);
      try {
        const res = await postDrainageEquipRegister(body);
        const existingId = (itemId ?? seedItemId ?? "").trim();
        const wid = String(res.itemId ?? existingId ?? "").trim();
        if (wid) setItemId(wid);

        const seededEdit = Boolean(seedItemId?.trim());
        navigateToListAfterInfoCloseRef.current = !seededEdit;
        setInfoDialogTitle(seededEdit ? "수정 완료" : "등록 완료");
        setInfoDialogMessage(
          seededEdit
            ? "정상적으로 수정되었습니다."
            : "정상적으로 등록되었습니다.",
        );
        setInfoDialogType("success");
        setInfoDialogSingleAction(true);
        setShowInfoDialog(true);

        if (seededEdit && wid) {
          await loadDetail(wid, { silent: true });
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? String(err.message || "").trim()
            : "저장 중 오류가 발생했습니다.";
        setInfoDialogTitle("오류");
        setInfoDialogMessage(msg || "저장 중 오류가 발생했습니다.");
        setInfoDialogType("danger");
        setInfoDialogSingleAction(true);
        setShowInfoDialog(true);
      } finally {
        setLoading(false);
      }
    },
    [
      validate,
      persistRef,
      persistBuildStateRef,
      itemId,
      seedItemId,
      loadDetail,
    ],
  );

  const handleCancel = useCallback(() => {
    router.push(LIST_PATH);
  }, [router]);

  const handleInfoDialogClose = useCallback(() => {
    setShowInfoDialog(false);
    if (navigateToListAfterInfoCloseRef.current) {
      navigateToListAfterInfoCloseRef.current = false;
      router.push(LIST_PATH);
    }
  }, [router]);

  return {
    userNm,
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
    infoDialogSingleAction,
    seedInvalid,
    detailLoading,
    detailErrorMessage,
    isEditMode,
    sewageInitialEntries,
    detailReloadKey,
    drainageEquipApi,
    persistBuildStateRef,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  };
}
