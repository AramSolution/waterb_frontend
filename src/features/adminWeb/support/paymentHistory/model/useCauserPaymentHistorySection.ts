import { useCallback, useState, type ChangeEvent } from "react";

export type CauserPayLine = {
  id: string;
  lineDate: string;
  amount: string;
  remarks: string;
};

export type CauserPaymentEntry = {
  id: string;
  category: string;
  status: string;
  type: string;
  notifyDate: string;
  sewageVolume: string;
  causerCharge: string;
  paidAmount: string;
  lines: CauserPayLine[];
};

function createLine(): CauserPayLine {
  return {
    id: crypto.randomUUID(),
    lineDate: "",
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
    sewageVolume: "9.8",
    causerCharge: "300,000원",
    paidAmount: "300,000원",
    lines: [createLine()],
  };
}

export function useCauserPaymentHistorySection() {
  const [entries, setEntries] = useState<CauserPaymentEntry[]>(() => [
    createEntry(),
  ]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

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
          return {
            ...en,
            lines: en.lines.map((L) => {
              if (L.id !== lineId) return L;
              if (name === "lineDate") return { ...L, lineDate: value };
              if (name === "amount") return { ...L, amount: value };
              if (name === "remarks") return { ...L, remarks: value };
              return L;
            }),
          };
        }),
      );
    },
    [],
  );

  const handleAddLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((en) =>
        en.id === entryId
          ? { ...en, lines: [...en.lines, createLine()] }
          : en,
      ),
    );
  }, []);

  const handleRemoveLine = useCallback(
    (entryId: string, lineId: string) => {
      setEntries((prev) =>
        prev.map((en) => {
          if (en.id !== entryId) return en;
          if (en.lines.length <= 1) return en;
          return {
            ...en,
            lines: en.lines.filter((L) => L.id !== lineId),
          };
        }),
      );
    },
    [],
  );

  return {
    entries,
    handleAddEntry,
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
    handleRemoveLine,
  };
}
