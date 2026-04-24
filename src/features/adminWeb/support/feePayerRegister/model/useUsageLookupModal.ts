"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getBuildingUseCodeList,
  type BuildingUseCodeTreeDto,
} from "@/entities/adminWeb/code/api/cmmCodeApi";
import {
  getArmbuildList,
  isArmbuildApiSuccess,
  type ArmbuildListItem,
} from "@/entities/adminWeb/armbuild/api/armbuildApi";
import { ApiError } from "@/shared/lib/apiClient";
import { decodeDisplayText } from "@/shared/lib";

export type UsageLookupCategoryMajor = {
  id: string;
  label: string;
  children: UsageLookupCategoryLeaf[];
};

export type UsageLookupCategoryLeaf = {
  id: string;
  label: string;
  gubun1: string;
  gubun2: string;
  parentLabel: string;
};

export type UsageLookupDisplayRow = {
  rowId: string;
  buildingUse: string;
  dailySewage: string;
  remarks: string;
};

export type UsageLookupSelection = {
  leafId: string;
  gubun1: string;
  gubun2: string;
  displayLabel: string;
};

function mapTree(
  list: BuildingUseCodeTreeDto[],
): UsageLookupCategoryMajor[] {
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

function mapItemToDisplayRow(
  item: ArmbuildListItem,
  gubun1: string,
  gubun2: string,
): UsageLookupDisplayRow {
  const bid = String(item.buildId ?? "").trim();
  return {
    rowId: bid || `tmp-${Math.random().toString(16).slice(2)}`,
    buildingUse: decodeDisplayText(String(item.buildNm ?? "").trim()),
    dailySewage: formatDayVal(item.dayVal),
    remarks: decodeDisplayText(String(item.buildDesc ?? "").trim()),
  };
}

export function useUsageLookupModal(isOpen: boolean) {
  const [categoryTree, setCategoryTree] = useState<UsageLookupCategoryMajor[]>(
    [],
  );
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");

  const [expandedMajorIds, setExpandedMajorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selection, setSelection] = useState<UsageLookupSelection | null>(
    null,
  );

  const [listRows, setListRows] = useState<UsageLookupDisplayRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCategoryTree([]);
      setTreeLoading(false);
      setTreeError("");
      setExpandedMajorIds(new Set());
      setSelection(null);
      setListRows([]);
      setListLoading(false);
      setListError("");
      setKeyword("");
      setSearchQuery("");
      return;
    }

    let cancelled = false;
    (async () => {
      setTreeLoading(true);
      setTreeError("");
      try {
        const raw = await getBuildingUseCodeList();
        if (cancelled) return;
        const mapped = mapTree(Array.isArray(raw) ? raw : []);
        setCategoryTree(mapped);
      } catch (e) {
        if (cancelled) return;
        setCategoryTree([]);
        setTreeError(
          e instanceof ApiError
            ? e.message
            : "건축용도 분류를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selection) {
      if (!selection) setListRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError("");
      try {
        const res = await getArmbuildList({
          gubun1: selection.gubun1,
          gubun2: selection.gubun2,
        });
        if (cancelled) return;
        if (!isArmbuildApiSuccess(res.result)) {
          setListRows([]);
          setListError(
            res.message?.trim() || "건축물용도 목록을 불러오지 못했습니다.",
          );
          return;
        }
        setListRows(
          (res.data ?? []).map((item) =>
            mapItemToDisplayRow(item, selection.gubun1, selection.gubun2),
          ),
        );
      } catch (e) {
        if (cancelled) return;
        setListRows([]);
        setListError(
          e instanceof ApiError
            ? e.message
            : "건축물용도 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selection]);

  const toggleMajor = useCallback((majorId: string) => {
    setExpandedMajorIds((prev) => {
      const next = new Set(prev);
      if (next.has(majorId)) next.delete(majorId);
      else next.add(majorId);
      return next;
    });
  }, []);

  const selectLeaf = useCallback((leaf: UsageLookupCategoryLeaf) => {
    setSelection({
      leafId: leaf.id,
      gubun1: leaf.gubun1,
      gubun2: leaf.gubun2,
      displayLabel: `${leaf.parentLabel} > ${leaf.label}`,
    });
    setSearchQuery("");
    setKeyword("");
  }, []);

  const runSearch = useCallback(() => {
    setSearchQuery(keyword.trim());
  }, [keyword]);

  /** 검색: 건축물 용도(buildNm)만 대상 (비고·1일 오수발생량 제외) */
  const displayedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return listRows;
    return listRows.filter((r) =>
      r.buildingUse.toLowerCase().includes(q),
    );
  }, [listRows, searchQuery]);

  return {
    categoryTree,
    treeLoading,
    treeError,
    expandedMajorIds,
    toggleMajor,
    selection,
    selectLeaf,
    listRows,
    listLoading,
    listError,
    keyword,
    setKeyword,
    runSearch,
    displayedRows,
  };
}
