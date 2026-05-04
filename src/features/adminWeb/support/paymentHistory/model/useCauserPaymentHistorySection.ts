import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
} from "react";
import {
  postFeePayerPaymentSave,
  type SupportFeePayerPaymentSaveItemRequest,
  type SupportFeePayerPaymentSaveRequest,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import { ApiError } from "@/shared/lib/apiClient";

export type CauserPayLine = {
  id: string;
  paymentSeq2?: number;
  lineDate: string;
  amount: string;
  remarks: string;
};

export type CauserPaymentEntry = {
  id: string;
  detailSeq?: number;
  category: string;
  status: string;
  type: string;
  notifyDate: string;
  unitPrice: string;
  sewageVolume: string;
  causerCharge: string;
  sewageLevyAmount: string;
  paidAmount: string;
  lines: CauserPayLine[];
};

function createLine(): CauserPayLine {
  return {
    id: crypto.randomUUID(),
    lineDate: getTodayYmd(),
    amount: "",
    remarks: "",
  };
}

function createEntry(): CauserPaymentEntry {
  return {
    id: crypto.randomUUID(),
    category: "",
    status: "UNPAID",
    type: "",
    notifyDate: "2020-01-01",
    unitPrice: "12,000",
    sewageVolume: "9.8",
    causerCharge: "300,000",
    sewageLevyAmount: "9.8",
    paidAmount: "300,000",
    lines: [createLine()],
  };
}

function isEntryPaidStatus(entry: CauserPaymentEntry): boolean {
  return entry.status === "PAID";
}

/** 라인 금액 합으로 납부금액 표시만 갱신. `paySta`/상세 연동 `status`는 저장·서버 값만 따른다(입력 중 자동 미납↔납부 전환 없음). */
function syncEntryPaidAmountFromLines(entry: CauserPaymentEntry): CauserPaymentEntry {
  const paidTotal = entry.lines.reduce(
    (sum, line) => sum + parseAmount(line.amount),
    0,
  );
  const nextPaidAmount =
    paidTotal > 0 ? formatAmountInput(String(paidTotal)) : "";
  if (entry.paidAmount === nextPaidAmount) {
    return entry;
  }
  return {
    ...entry,
    paidAmount: nextPaidAmount,
  };
}

function normalizeEntries(
  src: CauserPaymentEntry[] | undefined,
): CauserPaymentEntry[] {
  if (!src || src.length === 0) return [createEntry()];
  return src.map((entry) =>
    syncEntryPaidAmountFromLines({
      ...entry,
      id: entry.id || crypto.randomUUID(),
      lines:
        entry.lines && entry.lines.length > 0
          ? entry.lines.map((line) => ({
              ...line,
              id: line.id || crypto.randomUUID(),
              lineDate: line.lineDate || getTodayYmd(),
            }))
          : [createLine()],
    }),
  );
}

export function useCauserPaymentHistorySection(
  initialEntries?: CauserPaymentEntry[],
  itemId?: string,
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportFeePayerPaymentSaveRequest | null) | null
  >,
  preSaveValidateRef?: MutableRefObject<(() => string | null) | null>,
  onReloadDetail?: () => void | Promise<void>,
) {
  const [entries, setEntries] = useState<CauserPaymentEntry[]>(() => [
    ...normalizeEntries(initialEntries),
  ]);
  const [showLineDeleteConfirm, setShowLineDeleteConfirm] = useState(false);
  const [pendingLineDelete, setPendingLineDelete] = useState<{
    entryId: string;
    lineId: string;
  } | null>(null);
  const [lineDeleteSubmitting, setLineDeleteSubmitting] = useState(false);
  const [showLineDeleteSuccess, setShowLineDeleteSuccess] = useState(false);
  const [showLineDeleteError, setShowLineDeleteError] = useState(false);
  const [lineDeleteErrorMessage, setLineDeleteErrorMessage] = useState("");

  useEffect(() => {
    if (initialEntries === undefined) return;
    setEntries(normalizeEntries(initialEntries));
  }, [initialEntries]);

  const removedPaymentsRef = useRef<Array<{ seq: number; seq2: number }>>([]);
  /** 상세 로드 시점의 `detailSeq`별 납부 상태 — 저장 시 `paySta`만 바뀐 경우 본문에 포함 */
  const initialStatusByDetailSeqRef = useRef<Map<number, string>>(new Map());
  /**
   * 조회 직후 각 납부 행(SEQ2)의 일자·금액·비고 — 변경 시 저장 본문에는 `rowStatus: U`로 전송.
   */
  const initialPaymentLineSnapshotRef = useRef<
    Map<string, { date: string; pay: number; desc: string }>
  >(new Map());

  useEffect(() => {
    if (initialEntries === undefined) return;
    removedPaymentsRef.current = [];
    const m = new Map<number, string>();
    const snap = new Map<string, { date: string; pay: number; desc: string }>();
    for (const en of initialEntries) {
      if (en.detailSeq != null && en.detailSeq > 0) {
        m.set(en.detailSeq, en.status);
        for (const L of en.lines) {
          if (L.paymentSeq2 != null && L.paymentSeq2 > 0) {
            snap.set(paymentLineSnapshotKey(en.detailSeq, L.paymentSeq2), {
              date: normalizeYmd(L.lineDate),
              pay: parseAmount(L.amount),
              desc: String(L.remarks ?? "").trim(),
            });
          }
        }
      }
    }
    initialStatusByDetailSeqRef.current = m;
    initialPaymentLineSnapshotRef.current = snap;
  }, [initialEntries]);

  const handleSelectChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      const entryId = e.target.dataset.entryId;
      if (!entryId) return;
      const key = name as "category" | "status" | "type";
      setEntries((prev) =>
        prev.map((en) => {
          if (en.id !== entryId) return en;
          if (key === "category") {
            return { ...en, category: value, type: "" };
          }
          return { ...en, [key]: value };
        }),
      );
    },
    [],
  );

  const handleFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const entryId = e.target.dataset.entryId;
      if (!entryId) return;
      setEntries((prev) =>
        prev.map((en) => {
          if (en.id !== entryId) return en;
          if (name === "sewageVolume") return { ...en, sewageVolume: value };
          if (name === "notifyDate") return { ...en, notifyDate: value };
          if (name === "causerCharge") return { ...en, causerCharge: value };
          if (name === "paidAmount") return { ...en, paidAmount: value };
          return en;
        }),
      );
    },
    [],
  );

  const handleLineFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const entryId = e.target.dataset.entryId;
      const lineId = e.target.dataset.lineId;
      if (!entryId || !lineId) return;
      setEntries((prev) =>
        prev.map((en) => {
          if (en.id !== entryId) return en;
          if (isEntryPaidStatus(en)) return en;
          const nextEntry = {
            ...en,
            lines: en.lines.map((L) => {
              if (L.id !== lineId) return L;
              if (name === "lineDate") return { ...L, lineDate: value };
              if (name === "amount") {
                return { ...L, amount: formatAmountInput(value) };
              }
              if (name === "remarks") return { ...L, remarks: value };
              return L;
            }),
          };
          return syncEntryPaidAmountFromLines(nextEntry);
        }),
      );
    },
    [],
  );

  const handleAddLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((en) => {
        if (en.id !== entryId) return en;
        if (isEntryPaidStatus(en)) return en;
        return syncEntryPaidAmountFromLines({
          ...en,
          lines: [...en.lines, createLine()],
        });
      }),
    );
  }, []);

  const applyLocalLineRemoval = useCallback(
    (entryId: string, lineId: string) => {
      setEntries((prev) =>
        prev.map((en) => {
          if (en.id !== entryId) return en;
          if (isEntryPaidStatus(en)) return en;
          if (en.lines.length <= 1) return en;
          const victim = en.lines.find((L) => L.id === lineId);
          if (
            en.detailSeq != null &&
            en.detailSeq > 0 &&
            victim?.paymentSeq2 != null &&
            victim.paymentSeq2 > 0
          ) {
            removedPaymentsRef.current.push({
              seq: en.detailSeq,
              seq2: victim.paymentSeq2,
            });
          }
          return syncEntryPaidAmountFromLines({
            ...en,
            lines: en.lines.filter((L) => L.id !== lineId),
          });
        }),
      );
    },
    [],
  );

  const requestLineDelete = useCallback((entryId: string, lineId: string) => {
    setPendingLineDelete({ entryId, lineId });
    setShowLineDeleteConfirm(true);
  }, []);

  const handleLineDeleteCancel = useCallback(() => {
    setShowLineDeleteConfirm(false);
    setPendingLineDelete(null);
    setLineDeleteSubmitting(false);
  }, []);

  const handleLineDeleteConfirm = useCallback(async () => {
    if (!pendingLineDelete) return;
    const { entryId, lineId } = pendingLineDelete;
    const entry = entries.find((e) => e.id === entryId);
    const victim = entry?.lines.find((l) => l.id === lineId);
    if (!entry || !victim) {
      handleLineDeleteCancel();
      return;
    }
    if (isEntryPaidStatus(entry) || entry.lines.length <= 1) {
      handleLineDeleteCancel();
      return;
    }

    const id = (itemId ?? "").trim();
    const hasServerRow =
      entry.detailSeq != null &&
      entry.detailSeq > 0 &&
      victim.paymentSeq2 != null &&
      victim.paymentSeq2 > 0;

    if (!hasServerRow) {
      applyLocalLineRemoval(entryId, lineId);
      handleLineDeleteCancel();
      return;
    }

    if (!id) {
      setLineDeleteErrorMessage("ITEM_ID가 없습니다.");
      handleLineDeleteCancel();
      setShowLineDeleteError(true);
      return;
    }

    setLineDeleteSubmitting(true);
    try {
      await postFeePayerPaymentSave({
        itemId: id,
        details: [
          {
            seq: entry.detailSeq as number,
            payments: [
              { rowStatus: "D", seq2: victim.paymentSeq2 as number },
            ],
          },
        ],
      });
      handleLineDeleteCancel();
      if (onReloadDetail) {
        await onReloadDetail();
      } else {
        setEntries((prev) =>
          prev.map((en) => {
            if (en.id !== entryId) return en;
            return syncEntryPaidAmountFromLines({
              ...en,
              lines: en.lines.filter((L) => L.id !== lineId),
            });
          }),
        );
      }
      setShowLineDeleteSuccess(true);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? String(e.message || "").trim()
          : "납부내역 삭제 중 오류가 발생했습니다.";
      setLineDeleteErrorMessage(msg || "납부내역 삭제 중 오류가 발생했습니다.");
      handleLineDeleteCancel();
      setShowLineDeleteError(true);
    } finally {
      setLineDeleteSubmitting(false);
    }
  }, [
    pendingLineDelete,
    entries,
    itemId,
    onReloadDetail,
    applyLocalLineRemoval,
    handleLineDeleteCancel,
  ]);

  const handleLineDeleteSuccessClose = useCallback(() => {
    setShowLineDeleteSuccess(false);
  }, []);

  const handleLineDeleteErrorClose = useCallback(() => {
    setShowLineDeleteError(false);
    setLineDeleteErrorMessage("");
  }, []);

  useEffect(() => {
    if (!preSaveValidateRef) return;
    preSaveValidateRef.current = () => {
      for (const entry of entries) {
        if (entry.detailSeq == null || entry.detailSeq <= 0) continue;
        const charge = parseAmount(entry.causerCharge);
        const paidTotal = entry.lines.reduce(
          (sum, line) => sum + parseAmount(line.amount),
          0,
        );
        if (charge > 0 && paidTotal > charge) {
          return "납부 금액 합계가 원인자부담금(부과액)보다 큽니다. 금액을 확인한 뒤 저장해 주세요.";
        }
      }
      return null;
    };
    return () => {
      preSaveValidateRef.current = null;
    };
  }, [entries, preSaveValidateRef]);

  useEffect(() => {
    if (!persistRequestBuilderRef) return;
    persistRequestBuilderRef.current = () => {
      const id = (itemId ?? "").trim();
      if (!id) return null;

      const bySeq = new Map<number, Array<{ seq2: number }>>();
      for (const r of removedPaymentsRef.current) {
        if (r.seq <= 0 || r.seq2 <= 0) continue;
        const cur = bySeq.get(r.seq) ?? [];
        cur.push({ seq2: r.seq2 });
        bySeq.set(r.seq, cur);
      }

      const details = entries
        .filter((entry) => entry.detailSeq != null && entry.detailSeq > 0)
        .map((entry) => {
          const seq = entry.detailSeq as number;
          const deleted = (bySeq.get(seq) ?? []).map((d) => ({
            rowStatus: "D",
            seq2: d.seq2,
          }));
          const replacedExisting: SupportFeePayerPaymentSaveItemRequest[] = [];
          for (const line of entry.lines) {
            if (line.paymentSeq2 == null || line.paymentSeq2 <= 0) continue;
            const key = paymentLineSnapshotKey(seq, line.paymentSeq2);
            const prev = initialPaymentLineSnapshotRef.current.get(key);
            if (!prev) continue;
            const curDate = normalizeYmd(line.lineDate);
            const curPay = parseAmount(line.amount);
            const curDesc = String(line.remarks ?? "").trim();
            if (
              curDate === prev.date &&
              curPay === prev.pay &&
              curDesc === prev.desc
            ) {
              continue;
            }
            replacedExisting.push({
              rowStatus: "U",
              seq2: line.paymentSeq2,
              payDay: line.lineDate || undefined,
              pay: curPay > 0 ? curPay : 0,
              payDesc: curDesc || undefined,
            });
          }
          const inserted = entry.lines
            .filter(
              (line) =>
                !(line.paymentSeq2 != null && line.paymentSeq2 > 0) &&
                isMeaningfulNewPaymentLine(line),
            )
            .map((line) => {
              const pay = parseAmount(line.amount);
              return {
                rowStatus: "I",
                payDay: line.lineDate || undefined,
                pay: pay > 0 ? pay : 0,
                payDesc: line.remarks.trim() || undefined,
              };
            });
          const payments = [...deleted, ...replacedExisting, ...inserted];
          const initialSt = initialStatusByDetailSeqRef.current.get(seq);
          const statusChanged =
            initialSt !== undefined && initialSt !== entry.status;
          const paySta = entry.status === "PAID" ? "02" : "01";
          if (payments.length === 0 && !statusChanged) return null;
          if (payments.length === 0 && statusChanged) {
            return { seq, paySta };
          }
          return { seq, paySta, payments };
        })
        .filter((d): d is NonNullable<typeof d> => d != null);

      if (details.length === 0) return null;
      return { itemId: id, details };
    };

    return () => {
      persistRequestBuilderRef.current = null;
    };
  }, [entries, itemId, persistRequestBuilderRef]);

  return {
    entries,
    categoryStatusOptions: {
      category: [
        { value: "INDIVIDUAL", label: "개별건축물" },
        { value: "OTHER_ACT", label: "타행위" },
        { value: "PERMIT_CHANGE", label: "허가사항변경" },
      ],
      status: [
        { value: "UNPAID", label: "미납" },
        { value: "PAID", label: "납부" },
      ],
    },
    handleSelectChange,
    handleFieldChange,
    handleLineFieldChange,
    handleAddLine,
    requestLineDelete,
    showLineDeleteConfirm,
    lineDeleteSubmitting,
    handleLineDeleteConfirm,
    handleLineDeleteCancel,
    showLineDeleteSuccess,
    handleLineDeleteSuccessClose,
    showLineDeleteError,
    lineDeleteErrorMessage,
    handleLineDeleteErrorClose,
    removedPaymentsRef,
  };
}

function parseAmount(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function formatAmountInput(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function isMeaningfulNewPaymentLine(line: CauserPayLine): boolean {
  const pay = parseAmount(line.amount);
  if (pay > 0) return true;
  if (String(line.remarks ?? "").trim() !== "") return true;
  return false;
}

function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function paymentLineSnapshotKey(detailSeq: number, seq2: number): string {
  return `${detailSeq}:${seq2}`;
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
