"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBuildingUseCodeList,
  type BuildingUseCodeTreeDto,
} from "@/entities/adminWeb/code/api/cmmCodeApi";
import {
  deleteArmbuild,
  getArmbuildList,
  insertArmbuild,
  isArmbuildApiSuccess,
  type ArmbuildInsertBody,
  type ArmbuildListItem,
} from "@/entities/adminWeb/armbuild/api/armbuildApi";
import { ApiError } from "@/shared/lib/apiClient";
import { decodeDisplayText } from "@/shared/lib";

/** 화면용 분류 트리 — 중분류 */
export type PurposeCategoryMajor = {
  id: string;
  label: string;
  children: PurposeCategoryLeaf[];
};

/** 소분류(말단) — 선택 시 gubun1·gubun2로 목록 조회 */
export type PurposeCategoryLeaf = {
  id: string;
  label: string;
  gubun1: string;
  gubun2: string;
  parentLabel: string;
};

export type PurposeRow = {
  /** 서버 행은 buildId, 신규 행은 클라이언트 id */
  rowId: string;
  buildId?: string;
  gubun1: string;
  gubun2: string;
  buildingUse: string;
  dailySewage: string;
  remarks: string;
};

export type PurposeRowFieldErrors = {
  buildingUse?: string;
  dailySewage?: string;
  remarks?: string;
};

function mapApiTreeToCategories(
  list: BuildingUseCodeTreeDto[],
): PurposeCategoryMajor[] {
  return list.map((mid) => {
    const midName = decodeDisplayText(mid.name);
    return {
      id: mid.code,
      label: midName,
      children: (mid.children ?? []).map((c) => ({
        id: `${mid.code}__${c.code}`,
        label: decodeDisplayText(c.name),
        gubun1: mid.code,
        gubun2: c.code,
        parentLabel: midName,
      })),
    };
  });
}

function formatDayVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
}

function mapListItemToRow(
  item: ArmbuildListItem,
  gubun1: string,
  gubun2: string,
): PurposeRow {
  const bid = String(item.buildId ?? "").trim();
  return {
    rowId: bid || `tmp-${Math.random().toString(16).slice(2)}`,
    buildId: bid || undefined,
    gubun1: String(item.gubun1 ?? gubun1).trim(),
    gubun2: String(item.gubun2 ?? gubun2).trim(),
    buildingUse: decodeDisplayText(String(item.buildNm ?? "").trim()),
    dailySewage: formatDayVal(item.dayVal),
    remarks: decodeDisplayText(String(item.buildDesc ?? "").trim()),
  };
}

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseDailySewage(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  if (Number.isNaN(n)) return NaN;
  return n;
}

/** 백엔드 `@Digits(integer=4, fraction=1)` 에 맞춤 */
function toDayValForApi(raw: string): number | undefined {
  const n = parseDailySewage(raw);
  if (n === null || Number.isNaN(n)) return undefined;
  const rounded = Math.round(n * 10) / 10;
  return rounded;
}

function buildArmbuildInsertBody(row: PurposeRow): ArmbuildInsertBody {
  const dayVal = toDayValForApi(row.dailySewage);
  const body: ArmbuildInsertBody = {
    gubun1: row.gubun1.trim(),
    gubun2: row.gubun2.trim(),
    buildNm: row.buildingUse.trim(),
    buildDesc: row.remarks.trim(),
  };
  if (row.buildId) {
    body.buildId = row.buildId;
  }
  if (dayVal !== undefined) {
    body.dayVal = dayVal;
  }
  return body;
}

function validatePurposeRows(rows: PurposeRow[]): {
  ok: boolean;
  errors: Record<string, PurposeRowFieldErrors>;
} {
  const errors: Record<string, PurposeRowFieldErrors> = {};
  let ok = true;

  for (const row of rows) {
    const e: PurposeRowFieldErrors = {};
    if (!row.buildingUse.trim()) {
      e.buildingUse = "건축물 용도를 입력해주세요.";
      ok = false;
    } else if (row.buildingUse.length > 256) {
      e.buildingUse = "건축물 용도는 256자 이내로 입력해주세요.";
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
    if (row.remarks.length > 2048) {
      e.remarks = "비고는 2048자 이내로 입력해주세요.";
      ok = false;
    }
    if (Object.keys(e).length) errors[row.rowId] = e;
  }

  return { ok, errors };
}

export type PurposeSelection = {
  leafId: string;
  gubun1: string;
  gubun2: string;
  displayLabel: string;
};

export function usePurposeManage() {
  const [categoryTree, setCategoryTree] = useState<PurposeCategoryMajor[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [selection, setSelection] = useState<PurposeSelection | null>(null);

  const [listRows, setListRows] = useState<PurposeRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [expandedMajorIds, setExpandedMajorIds] = useState<Set<string>>(
    () => new Set(),
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

  /** 삭제 확인 — API 호출 시 buildId(서버 저장 건) 사용 */
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] =
    useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    rowId: string;
    buildId?: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showDialog = useCallback(
    (
      title: string,
      message: string,
      type: "danger" | "success" | "primary",
    ) => {
      setResultDialogTitle(title);
      setResultDialogMessage(message);
      setResultDialogType(type);
      setShowResultDialog(true);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTreeLoading(true);
      try {
        const raw = await getBuildingUseCodeList();
        if (cancelled) return;
        const mapped = mapApiTreeToCategories(Array.isArray(raw) ? raw : []);
        setCategoryTree(mapped);
        setExpandedMajorIds(new Set());
      } catch (e) {
        if (cancelled) return;
        setCategoryTree([]);
        const msg =
          e instanceof ApiError
            ? e.message
            : "건축용도 분류를 불러오지 못했습니다.";
        showDialog("조회 오류", msg, "danger");
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDialog]);

  useEffect(() => {
    if (!selection) {
      setListRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const res = await getArmbuildList({
          gubun1: selection.gubun1,
          gubun2: selection.gubun2,
        });
        if (cancelled) return;
        if (!isArmbuildApiSuccess(res.result)) {
          setListRows([]);
          showDialog(
            "조회 오류",
            res.message?.trim() || "건축물용도 목록을 불러오지 못했습니다.",
            "danger",
          );
          return;
        }
        const rows = (res.data ?? []).map((item) =>
          mapListItemToRow(item, selection.gubun1, selection.gubun2),
        );
        setListRows(rows);
        setRowFieldErrors({});
      } catch (e) {
        if (cancelled) return;
        setListRows([]);
        const msg =
          e instanceof ApiError
            ? e.message
            : "건축물용도 목록을 불러오지 못했습니다.";
        showDialog("조회 오류", msg, "danger");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selection, showDialog]);

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

  const handleSelectLeaf = useCallback((leaf: PurposeCategoryLeaf) => {
    setSelection({
      leafId: leaf.id,
      gubun1: leaf.gubun1,
      gubun2: leaf.gubun2,
      displayLabel: `${leaf.parentLabel} > ${leaf.label}`,
    });
  }, []);

  const handleAddRow = useCallback(() => {
    if (!selection) return;
    const row: PurposeRow = {
      rowId: newRowId(),
      gubun1: selection.gubun1,
      gubun2: selection.gubun2,
      buildingUse: "",
      dailySewage: "",
      remarks: "",
    };
    setListRows((prev) => [...prev, row]);
  }, [selection]);

  const requestDeleteRow = useCallback(
    (rowId: string) => {
      const row = listRows.find((r) => r.rowId === rowId);
      if (!row) return;
      setPendingDelete({ rowId: row.rowId, buildId: row.buildId });
      setShowDeleteConfirmDialog(true);
    },
    [listRows],
  );

  const cancelDeleteRow = useCallback(() => {
    if (deleteLoading) return;
    setShowDeleteConfirmDialog(false);
    setPendingDelete(null);
  }, [deleteLoading]);

  const confirmDeleteRow = useCallback(async () => {
    if (!pendingDelete) return;
    const { rowId, buildId } = pendingDelete;

    if (!buildId) {
      setListRows((prev) => prev.filter((r) => r.rowId !== rowId));
      setRowFieldErrors((prev) => {
        if (!prev[rowId]) return prev;
        const { [rowId]: _, ...rest } = prev;
        return rest;
      });
      setShowDeleteConfirmDialog(false);
      setPendingDelete(null);
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await deleteArmbuild(buildId);
      if (!isArmbuildApiSuccess(res.result)) {
        setShowDeleteConfirmDialog(false);
        setPendingDelete(null);
        showDialog(
          "삭제 실패",
          res.message?.trim() || "삭제에 실패했습니다.",
          "danger",
        );
        return;
      }
      setListRows((prev) => prev.filter((r) => r.rowId !== rowId));
      setRowFieldErrors((prev) => {
        if (!prev[rowId]) return prev;
        const { [rowId]: _, ...rest } = prev;
        return rest;
      });
      setShowDeleteConfirmDialog(false);
      setPendingDelete(null);
      showDialog("삭제 완료", "정상적으로 삭제되었습니다.", "success");
    } catch (e) {
      setShowDeleteConfirmDialog(false);
      setPendingDelete(null);
      const msg =
        e instanceof ApiError
          ? e.message
          : "삭제 중 오류가 발생했습니다.";
      showDialog("삭제 실패", msg, "danger");
    } finally {
      setDeleteLoading(false);
    }
  }, [pendingDelete, showDialog]);

  const handleRowChange = useCallback(
    (
      rowId: string,
      field: keyof Pick<PurposeRow, "buildingUse" | "dailySewage" | "remarks">,
      value: string,
    ) => {
      clearErrorsForRow(rowId);
      setListRows((prev) =>
        prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)),
      );
    },
    [clearErrorsForRow],
  );

  const refetchList = useCallback(async () => {
    if (!selection) return;
    setListLoading(true);
    try {
      const res = await getArmbuildList({
        gubun1: selection.gubun1,
        gubun2: selection.gubun2,
      });
      if (isArmbuildApiSuccess(res.result)) {
        setListRows(
          (res.data ?? []).map((item) =>
            mapListItemToRow(item, selection.gubun1, selection.gubun2),
          ),
        );
        setRowFieldErrors({});
      }
    } catch {
      /* 저장 직후 재조회 실패는 무시하거나 로그만 */
    } finally {
      setListLoading(false);
    }
  }, [selection]);

  const handleSave = useCallback(async () => {
    if (!selection) return;

    if (listRows.length === 0) {
      showDialog("저장", "저장할 행이 없습니다.", "primary");
      return;
    }

    const { ok, errors } = validatePurposeRows(listRows);
    setRowFieldErrors((prev) => {
      const next = { ...prev };
      for (const r of listRows) {
        delete next[r.rowId];
      }
      return { ...next, ...errors };
    });
    if (!ok) {
      showDialog("저장 실패", "입력값을 확인해주세요.", "danger");
      return;
    }

    setSaveLoading(true);
    try {
      const res = await insertArmbuild(
        listRows.map((row) => buildArmbuildInsertBody(row)),
      );
      if (!isArmbuildApiSuccess(res.result)) {
        await refetchList();
        showDialog(
          "저장 실패",
          res.message?.trim() || "등록에 실패했습니다.",
          "danger",
        );
        return;
      }
      await refetchList();
      showDialog("저장 완료", "정상적으로 저장되었습니다.", "success");
    } catch (e) {
      await refetchList();
      const msg =
        e instanceof ApiError
          ? e.message
          : "저장 중 오류가 발생했습니다.";
      showDialog("저장 실패", msg, "danger");
    } finally {
      setSaveLoading(false);
    }
  }, [listRows, refetchList, selection, showDialog]);

  const closeResultDialog = useCallback(() => {
    setShowResultDialog(false);
  }, []);

  return {
    categoryTree,
    treeLoading,
    expandedMajorIds,
    toggleMajor,
    selection,
    handleSelectLeaf,
    listRows,
    listLoading,
    saveLoading,
    rowFieldErrors,
    handleAddRow,
    requestDeleteRow,
    showDeleteConfirmDialog,
    deleteLoading,
    confirmDeleteRow,
    cancelDeleteRow,
    handleRowChange,
    handleSave,
    showResultDialog,
    resultDialogTitle,
    resultDialogMessage,
    resultDialogType,
    closeResultDialog,
  };
}
