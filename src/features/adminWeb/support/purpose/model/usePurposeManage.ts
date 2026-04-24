"use client";

import { useCallback, useMemo, useState } from "react";

export type PurposeCategoryNode = {
  id: string;
  label: string;
  children?: PurposeCategoryNode[];
};

export type PurposeRow = {
  rowId: string;
  buildingUse: string;
  dailySewage: string;
  remarks: string;
};

export type PurposeRowFieldErrors = {
  buildingUse?: string;
  dailySewage?: string;
  remarks?: string;
};

/** 백엔드 연동 전: 분류 트리 샘플 (화면·동작 확인용) */
export const PURPOSE_CATEGORY_TREE: PurposeCategoryNode[] = [
  {
    id: "major-en",
    label: "영문명",
    children: [
      { id: "leaf-en-jone", label: "Jone" },
      { id: "leaf-en-lin", label: "Lin" },
      { id: "leaf-en-smith", label: "Smith" },
      { id: "leaf-en-jane", label: "Jane" },
      { id: "leaf-en-james", label: "James" },
    ],
  },
  {
    id: "major-joseon",
    label: "조선시대",
    children: [
      { id: "leaf-js-sejong", label: "세종대왕" },
      { id: "leaf-js-yisunshin", label: "이순신" },
      { id: "leaf-js-jeongyakyong", label: "정약용" },
      { id: "leaf-js-heojun", label: "허준" },
    ],
  },
];

function collectLeafIds(nodes: PurposeCategoryNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (n.children?.length) out.push(...collectLeafIds(n.children));
    else out.push(n.id);
  }
  return out;
}

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyRowsMap(leafIds: string[]): Record<string, PurposeRow[]> {
  return Object.fromEntries(leafIds.map((id) => [id, [] as PurposeRow[]]));
}

function parseDailySewage(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  if (Number.isNaN(n)) return NaN;
  return n;
}

export function usePurposeManage() {
  const leafIds = useMemo(
    () => collectLeafIds(PURPOSE_CATEGORY_TREE),
    [],
  );

  const [expandedMajorIds, setExpandedMajorIds] = useState<Set<string>>(
    () => new Set(PURPOSE_CATEGORY_TREE.map((m) => m.id)),
  );
  const [selectedLeafId, setSelectedLeafId] = useState<string | null>(null);
  const [itemsByLeafId, setItemsByLeafId] = useState<Record<string, PurposeRow[]>>(
    () => emptyRowsMap(leafIds),
  );
  const [rowFieldErrors, setRowFieldErrors] = useState<
    Record<string, PurposeRowFieldErrors>
  >({});

  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultDialogTitle, setResultDialogTitle] = useState("");
  const [resultDialogMessage, setResultDialogMessage] = useState("");
  const [resultDialogType, setResultDialogType] = useState<
    "danger" | "success" | "primary"
  >("success");

  const toggleMajor = useCallback((majorId: string) => {
    setExpandedMajorIds((prev) => {
      const next = new Set(prev);
      if (next.has(majorId)) next.delete(majorId);
      else next.add(majorId);
      return next;
    });
  }, []);

  const clearErrorsForRow = useCallback((rowId: string) => {
    setRowFieldErrors((prev) => {
      if (!prev[rowId]) return prev;
      const { [rowId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleSelectLeaf = useCallback((leafId: string) => {
    setSelectedLeafId(leafId);
  }, []);

  const handleAddRow = useCallback(() => {
    if (!selectedLeafId) return;
    const row: PurposeRow = {
      rowId: newRowId(),
      buildingUse: "",
      dailySewage: "",
      remarks: "",
    };
    setItemsByLeafId((prev) => ({
      ...prev,
      [selectedLeafId]: [...(prev[selectedLeafId] ?? []), row],
    }));
  }, [selectedLeafId]);

  const handleDeleteRow = useCallback((leafId: string, rowId: string) => {
    setItemsByLeafId((prev) => ({
      ...prev,
      [leafId]: (prev[leafId] ?? []).filter((r) => r.rowId !== rowId),
    }));
    setRowFieldErrors((prev) => {
      if (!prev[rowId]) return prev;
      const { [rowId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleRowChange = useCallback(
    (
      leafId: string,
      rowId: string,
      field: keyof Pick<PurposeRow, "buildingUse" | "dailySewage" | "remarks">,
      value: string,
    ) => {
      clearErrorsForRow(rowId);
      setItemsByLeafId((prev) => ({
        ...prev,
        [leafId]: (prev[leafId] ?? []).map((r) =>
          r.rowId === rowId ? { ...r, [field]: value } : r,
        ),
      }));
    },
    [clearErrorsForRow],
  );

  const validateAll = useCallback((): boolean => {
    const nextErrors: Record<string, PurposeRowFieldErrors> = {};
    let ok = true;

    for (const leafId of leafIds) {
      const rows = itemsByLeafId[leafId] ?? [];
      for (const row of rows) {
        const e: PurposeRowFieldErrors = {};
        if (!row.buildingUse.trim()) {
          e.buildingUse = "건축물 용도를 입력해주세요.";
          ok = false;
        }
        const sewage = parseDailySewage(row.dailySewage);
        if (row.dailySewage.trim() === "") {
          e.dailySewage = "1일 오수발생량을 입력해주세요.";
          ok = false;
        } else if (sewage === null || Number.isNaN(sewage)) {
          e.dailySewage = "숫자만 입력할 수 있습니다.";
          ok = false;
        } else if (sewage < 0) {
          e.dailySewage = "0 이상의 값을 입력해주세요.";
          ok = false;
        }
        if (row.remarks.length > 500) {
          e.remarks = "비고는 500자 이내로 입력해주세요.";
          ok = false;
        }
        if (Object.keys(e).length) nextErrors[row.rowId] = e;
      }
    }

    setRowFieldErrors(nextErrors);
    return ok;
  }, [itemsByLeafId, leafIds]);

  const handleSave = useCallback(() => {
    if (!validateAll()) {
      setResultDialogType("danger");
      setResultDialogTitle("저장 실패");
      setResultDialogMessage("입력값을 확인해주세요.");
      setShowResultDialog(true);
      return;
    }
    // TODO: 백엔드 저장 API 연동 시 payload 전송
    setResultDialogType("success");
    setResultDialogTitle("저장 완료");
    setResultDialogMessage("정상적으로 저장되었습니다.");
    setShowResultDialog(true);
  }, [validateAll]);

  const closeResultDialog = useCallback(() => {
    setShowResultDialog(false);
  }, []);

  const currentRows = selectedLeafId
    ? itemsByLeafId[selectedLeafId] ?? []
    : [];

  return {
    expandedMajorIds,
    toggleMajor,
    selectedLeafId,
    handleSelectLeaf,
    itemsByLeafId,
    currentRows,
    rowFieldErrors,
    handleAddRow,
    handleDeleteRow,
    handleRowChange,
    handleSave,
    showResultDialog,
    resultDialogTitle,
    resultDialogMessage,
    resultDialogType,
    closeResultDialog,
  };
}
