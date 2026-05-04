import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getFeePayerPaymentDetail,
  postFeePayerPaymentSave,
  type SupportFeePayerPaymentSaveRequest,
  type SupportFeePayerPaymentSaveResponse,
  type SupportFeePayerPaymentDetailDto,
  type SupportFeePayerPaymentHistoryDto,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import {
  mapType1ToCategory,
  mapType2ToSewageTypeValue,
  SEWAGE_CATEGORY,
  SEWAGE_TYPE_VALUE,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import { decodeDisplayText } from "@/shared/lib";
import { formatPhoneWithHyphen, numericOnly } from "@/shared/lib/inputValidation";
import type { CauserPaymentEntry } from "./useCauserPaymentHistorySection";
import { ApiError } from "@/shared/lib/apiClient";

/** `addr` 한 덩어리 → 등록화면 3필드 배치(선행 5자리 우편번호가 있을 때만 분리) */
function splitAddrForReadonly(addr: string): {
  zip: string;
  road: string;
  detail: string;
} {
  const t = (addr || "").trim();
  if (!t) return { zip: "", road: "", detail: "" };
  const m = t.match(/^(\d{5})\s+(.+)$/);
  if (m) {
    return { zip: m[1], road: m[2], detail: "" };
  }
  return { zip: "", road: t, detail: "" };
}

export function usePaymentHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemIdParam =
    (searchParams.get("itemId") ?? searchParams.get("proId") ?? "").trim();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [found, setFound] = useState(false);
  const [applicantNm, setApplicantNm] = useState("");
  const [telNo, setTelNo] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [adres, setAdres] = useState("");
  const [detailAdres, setDetailAdres] = useState("");
  const [detailEntries, setDetailEntries] = useState<CauserPaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogMessage, setSaveDialogMessage] = useState("");
  const persistRequestBuilderRef = useRef<
    (() => SupportFeePayerPaymentSaveRequest | null) | null
  >(null);
  const preSaveValidateRef: MutableRefObject<(() => string | null) | null> =
    useRef(null);
  const [saveDialogVariant, setSaveDialogVariant] = useState<
    "primary" | "danger"
  >("primary");

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
      const res = await getFeePayerPaymentDetail(itemIdParam);
      const data = res.data;
      if (!data) {
        setFound(false);
        setDetailEntries([]);
        setDetailErrorMessage("조회 결과가 없습니다.");
        return;
      }

      const nm = decodeDisplayText(String(data.userNm ?? "").trim());
      const rawTel = String(data.usrTelno ?? "").trim();
      const telDigits = numericOnly(rawTel).slice(0, 11);
      const telDisplay =
        rawTel === "-" || !telDigits ? "" : formatPhoneWithHyphen(telDigits);
      const zip = String(data.zip ?? "").trim();
      const baseAddr = decodeDisplayText(
        [data.adresLot, data.adres]
          .map((x) => String(x ?? "").trim())
          .filter((x) => x !== "")
          .join(" "),
      );
      const detail = decodeDisplayText(String(data.detailAdres ?? "").trim());
      const seeded = splitAddrForReadonly(baseAddr);

      setApplicantNm(nm);
      setTelNo(telDisplay);
      setZipCode(zip || seeded.zip);
      setAdres(baseAddr || seeded.road);
      setDetailAdres(detail || seeded.detail);
      setDetailEntries((data.details ?? []).map((d) => mapPaymentDetailToEntry(d)));
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
    router.push("/adminWeb/support/list");
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!found) return;
    const validationMessage = preSaveValidateRef.current?.() ?? null;
    if (validationMessage) {
      setSaveDialogVariant("danger");
      setSaveDialogMessage(validationMessage);
      setShowSaveDialog(true);
      return;
    }
    const body = persistRequestBuilderRef.current?.();
    if (!body) {
      setSaveDialogVariant("primary");
      setSaveDialogMessage("등록/삭제할 납부내역 변경사항이 없습니다.");
      setShowSaveDialog(true);
      return;
    }
    setLoading(true);
    try {
      const res = await postFeePayerPaymentSave(body);
      setSaveDialogVariant("primary");
      setSaveDialogMessage(buildPaymentSaveMessage(res));
      await loadPaymentDetail();
      setShowSaveDialog(true);
    } catch (e) {
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
    setSaveDialogVariant("primary");
  }, []);

  const noopChange = useCallback(() => {}, []);

  return {
    itemId: itemIdParam,
    found,
    detailLoading,
    detailErrorMessage,
    applicantNm,
    telNo,
    zipCode,
    adres,
    detailAdres,
    detailEntries,
    persistRequestBuilderRef,
    preSaveValidateRef,
    loading,
    showSaveDialog,
    saveDialogVariant,
    saveDialogMessage,
    handleBack,
    handleSave,
    handleSaveDialogClose,
    noopChange,
  };
}

function normalizeYmd(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (t.length >= 10 && t[4] === "-" && t[7] === "-") return t.slice(0, 10);
  if (t.length === 8 && /^\d{8}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  }
  return t.slice(0, 10);
}

function numOrZero(v: unknown): number {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatIntKo(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

function formatMetricKo(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function mapPaymentLine(
  p: SupportFeePayerPaymentHistoryDto,
): CauserPaymentEntry["lines"][number] {
  const seq2N = p.seq2 != null ? Number(p.seq2) : NaN;
  const pay = p.pay != null ? Number(p.pay) : NaN;
  const payDay = normalizeYmd(p.payDay) || getTodayYmd();
  return {
    id: crypto.randomUUID(),
    paymentSeq2: seq2N > 0 ? seq2N : undefined,
    lineDate: payDay,
    amount:
      Number.isFinite(pay) && pay !== 0 ? formatIntKo(pay) : "",
    remarks: decodeDisplayText(String(p.payDesc ?? "").trim()),
  };
}

function mapPaymentDetailToEntry(
  d: SupportFeePayerPaymentDetailDto,
): CauserPaymentEntry {
  const seqN = d.seq != null ? Number(d.seq) : NaN;
  const type1 = String(d.type1 ?? "").trim();
  const type2 = String(d.type2 ?? "").trim();
  const category = mapType1ToCategory(type1) || SEWAGE_CATEGORY.INDIVIDUAL;
  const type =
    mapType2ToSewageTypeValue(type1, type2) || SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW;
  const payStaRaw = String(d.paySta ?? "").trim();
  const status =
    payStaRaw === "02" ||
    payStaRaw === "2" ||
    payStaRaw === "Y" ||
    payStaRaw === "납부"
      ? "PAID"
      : "UNPAID";

  const waterSum = Number(d.waterSum ?? NaN);
  const baseCost = Number(d.baseCost ?? NaN);
  const waterCost = Number(d.waterCost ?? NaN);
  const waterVal = Number(d.waterVal ?? NaN);
  const waterPay = Number(d.waterPay ?? NaN);

  const linesRaw = [...(d.payments ?? [])].sort(
    (a, b) => numOrZero(a.seq2) - numOrZero(b.seq2),
  );
  const lines = linesRaw.length > 0 ? linesRaw.map(mapPaymentLine) : [
    { id: crypto.randomUUID(), lineDate: "", amount: "", remarks: "" },
  ];

  return {
    id: crypto.randomUUID(),
    detailSeq: seqN > 0 ? seqN : undefined,
    category,
    status,
    type,
    notifyDate: normalizeYmd(d.reqDate),
    unitPrice:
      Number.isFinite(baseCost) && baseCost !== 0 ? formatIntKo(baseCost) : "",
    sewageVolume:
      Number.isFinite(waterSum) && waterSum !== 0 ? formatMetricKo(waterSum) : "",
    causerCharge:
      Number.isFinite(waterCost) && waterCost !== 0
        ? formatIntKo(waterCost)
        : "",
    sewageLevyAmount:
      Number.isFinite(waterVal) && waterVal !== 0 ? formatMetricKo(waterVal) : "",
    paidAmount:
      Number.isFinite(waterPay) && waterPay !== 0 ? formatIntKo(waterPay) : "",
    lines,
  };
}

function buildPaymentSaveMessage(
  res: SupportFeePayerPaymentSaveResponse,
): string {
  return String(res.message ?? "").trim() || "납부내역이 저장되었습니다.";
}

function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
