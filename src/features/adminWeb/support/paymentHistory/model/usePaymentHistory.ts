import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFeeListRowByBusinessId } from "@/features/adminWeb/support/list/model/feeListMockData";
import { decodeDisplayText } from "@/shared/lib";

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
  const proId = searchParams.get("proId");
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const row = useMemo(
    () => getFeeListRowByBusinessId(proId),
    [proId],
  );

  const { applicantNm, zipCode, adres, detailAdres } = useMemo(() => {
    if (!row) {
      return {
        applicantNm: "",
        zipCode: "",
        adres: "",
        detailAdres: "",
      };
    }
    const rowAny = row as Record<string, unknown>;
    const name = decodeDisplayText(
      String(rowAny.applicantNm ?? row.businessNm ?? ""),
    );
    const raw = decodeDisplayText(
      String(rowAny.addr ?? rowAny.address ?? ""),
    );
    const s = splitAddrForReadonly(raw);
    return {
      applicantNm: name,
      zipCode: s.zip,
      adres: s.road,
      detailAdres: s.detail,
    };
  }, [row]);

  const handleBack = useCallback(() => {
    router.push("/adminWeb/support/list");
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!row) return;
    setLoading(true);
    try {
      await new Promise((r) => {
        setTimeout(r, 200);
      });
      // TODO: 납부내역 저장 API — `proId`·원인자부담 납부내역 폼 payload 전송
      setShowSaveDialog(true);
    } finally {
      setLoading(false);
    }
  }, [row]);

  const handleSaveDialogClose = useCallback(() => {
    setShowSaveDialog(false);
  }, []);

  const noopChange = useCallback(() => {}, []);

  return {
    proId,
    found: row !== undefined,
    applicantNm,
    zipCode,
    adres,
    detailAdres,
    loading,
    showSaveDialog,
    handleBack,
    handleSave,
    handleSaveDialogClose,
    noopChange,
  };
}
