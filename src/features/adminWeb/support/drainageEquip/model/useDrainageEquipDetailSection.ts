import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { SupportDrainageEquipBasicInfoRequest } from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { getDrainageTodayYmd } from "../lib/drainageEquipDates";

export type DrainageEquipDetailEntry = {
  id: string;
  status: "UNPAID" | "PAID";
  reqDate: string;
  equipCost: string;
  startDate: string;
  planDate: string;
  compDate: string;
  agency: string;
  detailSeq?: number;
};

export interface DrainageEquipApiBridge {
  getBasicInfoBody: () => SupportDrainageEquipBasicInfoRequest | null;
  itemId?: string | null;
  onItemId?: (itemId: string) => void;
}

export interface UseDrainageEquipDetailSectionOptions {
  onStatusChangeBlocked?: (message: string) => void;
}

function sanitizeEquipCostInput(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function sanitizeNumericField(name: string, value: string): string {
  if (name !== "equipCost") return value;
  return sanitizeEquipCostInput(value);
}

export function createDrainageEquipDetailEntry(): DrainageEquipDetailEntry {
  return {
    id: crypto.randomUUID(),
    status: "UNPAID",
    reqDate: getDrainageTodayYmd(),
    equipCost: "0",
    startDate: "",
    planDate: "",
    compDate: "",
    agency: "",
  };
}

function initialEntriesOrDefault(
  initial?: DrainageEquipDetailEntry[],
): DrainageEquipDetailEntry[] {
  if (initial && initial.length > 0) return initial.map((e) => ({ ...e }));
  return [createDrainageEquipDetailEntry()];
}

export function isDrainageEquipEntryPaid(
  entry: DrainageEquipDetailEntry,
): boolean {
  return entry.status === "PAID";
}

export function useDrainageEquipDetailSection(
  initialEntries?: DrainageEquipDetailEntry[],
  options?: UseDrainageEquipDetailSectionOptions,
) {
  const [entries, setEntries] = useState<DrainageEquipDetailEntry[]>(() =>
    initialEntriesOrDefault(initialEntries),
  );
  const entriesRef = useRef(entries);
  const removedDetailSeqsRef = useRef<number[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (initialEntries && initialEntries.length > 0) {
      setEntries(initialEntries.map((e) => ({ ...e })));
      removedDetailSeqsRef.current = [];
    }
  }, [initialEntries]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => {
      if (!prev.every((e) => e.status === "PAID")) return prev;
      return [...prev, createDrainageEquipDetailEntry()];
    });
  }, []);

  const handleEntryFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      const { name, value } = target;
      const entryId = target.dataset.entryId;
      if (!entryId) return;
      const nextValue = sanitizeNumericField(name, value);

      const key = name as keyof DrainageEquipDetailEntry;
      if (key === "id" || key === "detailSeq") return;

      if (key === "status") {
        setEntries((prev) => {
          const targetIndex = prev.findIndex((row) => row.id === entryId);
          if (targetIndex < 0) return prev;
          const row = prev[targetIndex];
          if (!row || row.status === value) return prev;

          if (value === "UNPAID") {
            const hasNewerPaid = prev
              .slice(targetIndex + 1)
              .some((r) => r.status === "PAID");
            if (hasNewerPaid) {
              const message =
                "가장 최근 등록분이 납부 상태이면 이전 등록분은 미납으로 변경할 수 없습니다.";
              if (options?.onStatusChangeBlocked) {
                options.onStatusChangeBlocked(message);
              } else {
                window.alert(message);
              }
              return prev;
            }
            return prev.map((r) =>
              r.id === entryId
                ? {
                    ...r,
                    status: "UNPAID",
                    startDate: "",
                    planDate: "",
                    compDate: "",
                    agency: "",
                  }
                : r,
            );
          }

          return prev.map((r) =>
            r.id === entryId
              ? {
                  ...r,
                  status: "PAID",
                  startDate: "",
                  planDate: "",
                  compDate: "",
                }
              : r,
          );
        });
        return;
      }

      const host = entriesRef.current.find((en) => en.id === entryId);
      if (host && isDrainageEquipEntryPaid(host) && key === "equipCost") {
        return;
      }
      if (
        host &&
        !isDrainageEquipEntryPaid(host) &&
        (key === "startDate" ||
          key === "planDate" ||
          key === "compDate" ||
          key === "agency")
      ) {
        return;
      }

      setEntries((prev) =>
        prev.map((row) =>
          row.id === entryId ? { ...row, [key]: nextValue } : row,
        ),
      );
    },
    [options],
  );

  return {
    entries,
    removedDetailSeqsRef,
    handleAddEntry,
    handleEntryFieldChange,
  };
}
