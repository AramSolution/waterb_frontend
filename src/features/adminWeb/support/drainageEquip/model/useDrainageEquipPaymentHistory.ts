import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getDrainageEquipPaymentDetail,
  postDrainageEquipPaymentSave,
  type SupportDrainageEquipPaymentSaveRequest,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { mapDrainageEquipPaymentDetailToForm } from "../lib/mapDrainageEquipPaymentFromApi";
import type { DrainageEquipPaymentEntry } from "../lib/mapDrainageEquipPaymentFromApi";
import { ApiError } from "@/shared/lib/apiClient";

const LIST_PATH = "/adminWeb/support/drainage-equip";

export function useDrainageEquipPaymentHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemIdParam = (searchParams.get("itemId") ?? "").trim();

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [found, setFound] = useState(false);
  const [userNm, setUserNm] = useState("");
  const [telNo, setTelNo] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [detailEntries, setDetailEntries] = useState<DrainageEquipPaymentEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogTitle, setSaveDialogTitle] = useState("알림");
  const [saveDialogMessage, setSaveDialogMessage] = useState("");
  const [saveDialogVariant, setSaveDialogVariant] = useState<
    "primary" | "danger" | "success"
  >("primary");

  const persistRequestBuilderRef = useRef<
    (() => SupportDrainageEquipPaymentSaveRequest | null) | null
  >(null);
  const preSaveValidateRef: MutableRefObject<(() => string | null) | null> =
    useRef(null);

  const loadPaymentDetail = useCallback(async () => {
    if (!itemIdParam) {
      setFound(false);
      setDetailEntries([]);
      setDetailErrorMessage("조회할 수 없는 대상이거나 잘못된 링크입니다.");
      return;
    }
    setDetailLoading(true);
    setDetailErrorMessage("");
    try {
      const res = await getDrainageEquipPaymentDetail(itemIdParam);
      const data = res.data;
      if (!data) {
        setFound(false);
        setDetailEntries([]);
        setDetailErrorMessage("조회 결과가 없습니다.");
        return;
      }
      const mapped = mapDrainageEquipPaymentDetailToForm(data);
      setUserNm(mapped.userNm);
      setTelNo(mapped.telNo);
      setZipCode(mapped.zipCode);
      setAdres(mapped.adres);
      setDetailAdres(mapped.detailAdres);
      setDetailEntries(mapped.entries);
      setFound(true);
    } catch (e) {
      setFound(false);
      setDetailEntries([]);
      setDetailErrorMessage(
        e instanceof ApiError
          ? e.message
          : "납부내역 상세를 불러오는 중 오류가 발생했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, [itemIdParam]);

  useEffect(() => {
    void loadPaymentDetail();
  }, [loadPaymentDetail]);

  const handleBack = useCallback(() => {
    router.push(LIST_PATH);
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!found) return;
    const validationMessage = preSaveValidateRef.current?.() ?? null;
    if (validationMessage) {
      setSaveDialogTitle("오류");
      setSaveDialogVariant("danger");
      setSaveDialogMessage(validationMessage);
      setShowSaveDialog(true);
      return;
    }
    const body = persistRequestBuilderRef.current?.();
    if (!body) {
      setSaveDialogTitle("알림");
      setSaveDialogVariant("primary");
      setSaveDialogMessage("등록/삭제할 납부내역 변경사항이 없습니다.");
      setShowSaveDialog(true);
      return;
    }
    setLoading(true);
    try {
      await postDrainageEquipPaymentSave(body);
      setSaveDialogTitle("수정 완료");
      setSaveDialogVariant("success");
      setSaveDialogMessage("정상적으로 수정되었습니다.");
      await loadPaymentDetail();
      setShowSaveDialog(true);
    } catch (e) {
      setSaveDialogTitle("오류");
      setSaveDialogVariant("danger");
      setSaveDialogMessage(
        e instanceof ApiError
          ? e.message
          : "납부내역 저장 중 오류가 발생했습니다.",
      );
      setShowSaveDialog(true);
    } finally {
      setLoading(false);
    }
  }, [found, loadPaymentDetail]);

  const handleSaveDialogClose = useCallback(() => {
    setShowSaveDialog(false);
    setSaveDialogTitle("알림");
    setSaveDialogVariant("primary");
  }, []);

  const noopChange = useCallback(() => {}, []);

  return {
    itemId: itemIdParam,
    found,
    detailLoading,
    detailErrorMessage,
    userNm,
    telNo,
    zipCode,
    adres,
    detailAdres,
    detailEntries,
    persistRequestBuilderRef,
    preSaveValidateRef,
    loading,
    showSaveDialog,
    saveDialogTitle,
    saveDialogVariant,
    saveDialogMessage,
    reloadPaymentDetail: loadPaymentDetail,
    handleBack,
    handleSave,
    handleSaveDialogClose,
    noopChange,
  };
}
