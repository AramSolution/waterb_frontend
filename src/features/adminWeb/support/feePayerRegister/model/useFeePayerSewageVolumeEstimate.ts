import { useCallback, useState, type ChangeEvent } from "react";

/** 오수량 발생량 산정: 화면 설계상 한 덩어리(3행)가 리스트로 반복됨 */
export type SewageEstimateEntry = {
  id: string;
  status: string;
  category: string;
  type: string;
  notifyDate: string;
  unitPrice: string;
  sewageVolume: string;
  causerCharge: string;
  floor: string;
  usage: string;
  area: string;
  dailySewage: string;
  selected: boolean;
};

/** `<input type="date">`용 로컬 당일 `YYYY-MM-DD` */
function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createEntry(): SewageEstimateEntry {
  return {
    id: crypto.randomUUID(),
    status: "",
    category: "",
    type: "",
    notifyDate: getTodayYmd(),
    unitPrice: "",
    sewageVolume: "",
    causerCharge: "",
    floor: "",
    usage: "",
    area: "",
    dailySewage: "",
    selected: false,
  };
}

export function useFeePayerSewageVolumeEstimate() {
  const [entries, setEntries] = useState<SewageEstimateEntry[]>(() => [
    createEntry(),
  ]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== entryId);
    });
  }, []);

  const handleEntryFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      const { name, value, type, checked } = target;
      const entryId = target.dataset.entryId;
      if (!entryId) return;
      const key = name as keyof SewageEstimateEntry;
      if (key === "id") return;

      if (type === "checkbox" && name === "selected") {
        setEntries((prev) =>
          prev.map((row) =>
            row.id === entryId ? { ...row, selected: checked } : row,
          ),
        );
        return;
      }

      setEntries((prev) =>
        prev.map((row) =>
          row.id === entryId ? { ...row, [key]: value } : row,
        ),
      );
    },
    [],
  );

  const handleCalculateEntry = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((row) => {
        if (row.id !== entryId) return row;
        const price = Number(String(row.unitPrice).replace(/,/g, "").trim());
        const vol = Number(String(row.sewageVolume).replace(/,/g, "").trim());
        if (!Number.isFinite(price) || !Number.isFinite(vol)) {
          return row;
        }
        const won = Math.round(price * vol);
        return {
          ...row,
          causerCharge: won > 0 ? `${won.toLocaleString("ko-KR")}원` : "",
        };
      }),
    );
  }, []);

  const handleEntrySewageButton = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((row) => {
        if (row.id !== entryId) return row;
        // TODO: API 응답으로 기준단가·오수량·1일오수발생량 등을 채움. 연동 전에는 예시 값만 세팅.
        return {
          ...row,
          unitPrice: row.unitPrice.trim() || "12,000",
          sewageVolume: row.sewageVolume.trim() || "9.8",
          dailySewage: row.dailySewage.trim() || "0",
        };
      }),
    );
  }, []);

  return {
    entries,
    handleAddEntry,
    handleRemoveEntry,
    handleEntryFieldChange,
    handleCalculateEntry,
    handleEntrySewageButton,
  };
}
