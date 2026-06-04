import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
} from "react";
import {
  deleteDrainageEquipPayment,
  type SupportDrainageEquipPaymentSaveItemRequest,
  type SupportDrainageEquipPaymentSaveRequest,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { normalizeDrainageYmd } from "../lib/drainageEquipDates";
import type {
  DrainageEquipPaymentEntry,
  DrainageEquipPaymentLine,
} from "../lib/mapDrainageEquipPaymentFromApi";
import { ApiError } from "@/shared/lib/apiClient";

function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createLine(): DrainageEquipPaymentLine {
  return {
    id: crypto.randomUUID(),
    lineDate: getTodayYmd(),
    amount: "",
    remarks: "",
  };
}

function isEntryPaid(entry: DrainageEquipPaymentEntry): boolean {
  return entry.status === "PAID";
}

function parseAmount(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^\d]/g, "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function formatAmountInput(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function syncEquipPayFromLines(
  entry: DrainageEquipPaymentEntry,
): DrainageEquipPaymentEntry {
  const paidTotal = entry.lines.reduce(
    (sum, line) => sum + parseAmount(line.amount),
    0,
  );
  const nextPay = paidTotal > 0 ? formatAmountInput(String(paidTotal)) : "";
  if (entry.equipPay === nextPay) return entry;
  return { ...entry, equipPay: nextPay };
}

function normalizeEntries(
  src: DrainageEquipPaymentEntry[] | undefined,
): DrainageEquipPaymentEntry[] {
  if (!src || src.length === 0) return [];
  return src.map((entry) =>
    syncEquipPayFromLines({
      ...entry,
      id: entry.id || crypto.randomUUID(),
      lines:
        entry.lines.length > 0
          ? entry.lines.map((line) => ({
              ...line,
              id: line.id || crypto.randomUUID(),
              lineDate: line.lineDate || getTodayYmd(),
            }))
          : [createLine()],
    }),
  );
}

function paymentLineSnapshotKey(detailSeq: number, seq2: number): string {
  return `${detailSeq}:${seq2}`;
}

function isMeaningfulNewPaymentLine(line: DrainageEquipPaymentLine): boolean {
  if (parseAmount(line.amount) > 0) return true;
  return String(line.remarks ?? "").trim() !== "";
}

export function useDrainageEquipPaymentHistorySection(
  initialEntries?: DrainageEquipPaymentEntry[],
  itemId?: string,
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportDrainageEquipPaymentSaveRequest | null) | null
  >,
  preSaveValidateRef?: MutableRefObject<(() => string | null) | null>,
  onReloadDetail?: () => void | Promise<void>,
) {
  const [entries, setEntries] = useState<DrainageEquipPaymentEntry[]>(() =>
    normalizeEntries(initialEntries),
  );
  const [showLineDeleteConfirm, setShowLineDeleteConfirm] = useState(false);
  const [pendingLineDelete, setPendingLineDelete] = useState<{
    entryId: string;
    lineId: string;
  } | null>(null);
  const [lineDeleteConfirmAmountLabel, setLineDeleteConfirmAmountLabel] =
    useState("0");
  const [lineDeleteSubmitting, setLineDeleteSubmitting] = useState(false);
  const [showLineDeleteSuccess, setShowLineDeleteSuccess] = useState(false);
  const [showLineDeleteError, setShowLineDeleteError] = useState(false);
  const [lineDeleteErrorMessage, setLineDeleteErrorMessage] = useState("");

  const removedPaymentsRef = useRef<Array<{ seq: number; seq2: number }>>([]);
  const initialStatusByDetailSeqRef = useRef<Map<number, string>>(new Map());
  const initialPaymentLineSnapshotRef = useRef<
    Map<string, { date: string; pay: number; desc: string }>
  >(new Map());

  useEffect(() => {
    if (initialEntries === undefined) return;
    setEntries(normalizeEntries(initialEntries));
  }, [initialEntries]);

  useEffect(() => {
    if (initialEntries === undefined) return;
    removedPaymentsRef.current = [];
    const statusMap = new Map<number, string>();
    const snap = new Map<string, { date: string; pay: number; desc: string }>();
    for (const en of initialEntries) {
      if (en.detailSeq != null && en.detailSeq > 0) {
        statusMap.set(en.detailSeq, en.status);
        for (const L of en.lines) {
          if (L.paymentSeq2 != null && L.paymentSeq2 > 0) {
            snap.set(paymentLineSnapshotKey(en.detailSeq, L.paymentSeq2), {
              date: normalizeDrainageYmd(L.lineDate),
              pay: parseAmount(L.amount),
              desc: String(L.remarks ?? "").trim(),
            });
          }
        }
      }
    }
    initialStatusByDetailSeqRef.current = statusMap;
    initialPaymentLineSnapshotRef.current = snap;
  }, [initialEntries]);

  const handleStatusChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const entryId = e.target.dataset.entryId;
      if (!entryId) return;
      const value = e.target.value as "UNPAID" | "PAID";
      setEntries((prev) =>
        prev.map((en) =>
          en.id === entryId && !isEntryPaid(en) ? { ...en, status: value } : en,
        ),
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
          if (en.id !== entryId || isEntryPaid(en)) return en;
          const next = {
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
          return syncEquipPayFromLines(next);
        }),
      );
    },
    [],
  );

  const handleAddLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((en) => {
        if (en.id !== entryId || isEntryPaid(en)) return en;
        return syncEquipPayFromLines({
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
          if (en.id !== entryId || isEntryPaid(en)) return en;
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
          return syncEquipPayFromLines({
            ...en,
            lines: en.lines.filter((L) => L.id !== lineId),
          });
        }),
      );
    },
    [],
  );

  const requestLineDelete = useCallback(
    (entryId: string, lineId: string) => {
      const entry = entries.find((en) => en.id === entryId);
      const line = entry?.lines.find((l) => l.id === lineId);
      const amountText = String(line?.amount ?? "").trim();
      setLineDeleteConfirmAmountLabel(amountText !== "" ? amountText : "0");
      setPendingLineDelete({ entryId, lineId });
      setShowLineDeleteConfirm(true);
    },
    [entries],
  );

  const handleLineDeleteCancel = useCallback(() => {
    setShowLineDeleteConfirm(false);
    setPendingLineDelete(null);
    setLineDeleteConfirmAmountLabel("0");
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
    if (isEntryPaid(entry) || entry.lines.length <= 1) {
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
      await deleteDrainageEquipPayment({
        itemId: id,
        seq: entry.detailSeq as number,
        seq2: victim.paymentSeq2 as number,
      });
      handleLineDeleteCancel();
      if (onReloadDetail) {
        await onReloadDetail();
      } else {
        applyLocalLineRemoval(entryId, lineId);
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
        const cost = parseAmount(entry.equipCost);
        const paidTotal = entry.lines.reduce(
          (sum, line) => sum + parseAmount(line.amount),
          0,
        );
        if (cost > 0 && paidTotal > cost) {
          return "납부 금액 합계가 배수설비금액보다 큽니다. 금액을 확인한 뒤 저장해 주세요.";
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
          const replacedExisting: SupportDrainageEquipPaymentSaveItemRequest[] =
            [];
          for (const line of entry.lines) {
            if (line.paymentSeq2 == null || line.paymentSeq2 <= 0) continue;
            const key = paymentLineSnapshotKey(seq, line.paymentSeq2);
            const prev = initialPaymentLineSnapshotRef.current.get(key);
            if (!prev) continue;
            const curDate = normalizeDrainageYmd(line.lineDate);
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
            .map((line) => ({
              rowStatus: "I",
              payDay: line.lineDate || undefined,
              pay: parseAmount(line.amount) > 0 ? parseAmount(line.amount) : 0,
              payDesc: line.remarks.trim() || undefined,
            }));
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

  const statusOptions = [
    { value: "UNPAID", label: "미납" },
    { value: "PAID", label: "납부" },
  ];

  return {
    entries,
    statusOptions,
    handleStatusChange,
    handleLineFieldChange,
    handleAddLine,
    requestLineDelete,
    showLineDeleteConfirm,
    lineDeleteConfirmAmountLabel,
    lineDeleteSubmitting,
    handleLineDeleteConfirm,
    handleLineDeleteCancel,
    showLineDeleteSuccess,
    handleLineDeleteSuccessClose,
    showLineDeleteError,
    lineDeleteErrorMessage,
    handleLineDeleteErrorClose,
  };
}
