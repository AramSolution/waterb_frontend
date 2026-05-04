"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import ExcelJS from "exceljs";
import {
  addAdminStyledListSheet,
  loadXlsxFirstSheetMatrix,
  writeWorkbookToXlsxDownload,
} from "@/shared/lib/exceljsAdminExcel";
import { AdminExcelDownloadButton } from "@/shared/ui/adminWeb";
import {
  MemberService,
  type MemberArtchoiListItem,
} from "@/entities/adminWeb/member/api";
import "@/shared/styles/admin/search-form.css";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/dialog.css";
import { startDomRegionRecording } from "@/features/adminWeb/member/selection/lib/selectionDomRegionRecording";
import {
  downloadRecordingBlob,
  formatSelectionRecordingFilename,
  type SelectionRecordingHandle,
} from "@/features/adminWeb/member/selection/lib/selectionScreenRecording";

type ResultGb = "Y" | "R" | "N";

interface SelectionRow {
  id: string;
  name: string;
  resultGb: ResultGb;
  /** 선정업무, ITEM1~ITEM20 등 엑셀 헤더 그대로 키 */
  extra: Record<string, string>;
}

const RESULT_OPTIONS: { value: ResultGb; label: string }[] = [
  { value: "Y", label: "선정" },
  { value: "R", label: "예비" },
  { value: "N", label: "미선정" },
];
const MAX_ITEM_COLUMN_COUNT = 20;
const NON_ITEM_LABELS = new Set(["고유번호", "이름", "선정여부", "순번"]);

/** 선정 진행 팝업이 닫힌 뒤 추가로 녹화할 시간(ms) */
const SELECTION_RECORDING_POST_CLOSE_MS = 2000;

/** 가상 스크롤: 고정 행 높이(estimate), 실제와 크게 어긋나면 스크롤바가 어색해질 수 있음 */
const SELECTION_TABLE_ROW_HEIGHT_PX = 44;
const SELECTION_TABLE_VIRTUAL_MIN_ROWS = 60;

/** 엑셀 셀 값을 문자열로 */
function cellStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  return String(val).trim();
}

/** 선정여부 문자열 → ResultGb */
function normalizeResultGb(val: string): ResultGb {
  const v = cellStr(val).toUpperCase();
  if (v === "Y" || v === "선정") return "Y";
  if (v === "R" || v === "예비") return "R";
  return "N";
}

function extractItemLabels(labels: string[]): string[] {
  return labels.filter((l) => l && !NON_ITEM_LABELS.has(l));
}

/** 선정·표시 대상 행: 고유번호가 있는 행만 신청으로 간주 */
function rowHasEligibleKey(row: SelectionRow): boolean {
  return (row.extra["고유번호"] ?? "").trim() !== "";
}

/** 테이블 표시 순서: 선정 → 예비 → 미선정, 신청 키 없는 행은 맨 아래 */
function resultGbSortRank(row: SelectionRow): number {
  if (!rowHasEligibleKey(row)) return 3;
  if (row.resultGb === "Y") return 0;
  if (row.resultGb === "R") return 1;
  return 2;
}

function resultGbLabel(gb: ResultGb): string {
  return gb === "Y" ? "선정" : gb === "R" ? "예비" : "미선정";
}

/** 팝업 표시용: 고유번호 */
function rowUniqueIdForReveal(row: SelectionRow): string {
  const u = (row.extra["고유번호"] ?? "").trim();
  if (u) return u;
  return "—";
}

type LotteryRevealItem = { uniqueId: string; resultGb: ResultGb };

/**
 * 서버 조회 결과(ARTCHOI)에서 CHOI_SEQ별 결과 맵 생성.
 * baseId 중복이 있어도 CHOI_SEQ는 고유이므로 덮어쓰기 문제가 없다.
 */
function buildResultMapByChoiSeq(items: MemberArtchoiListItem[]): Map<number, ResultGb> {
  const map = new Map<number, ResultGb>();
  for (const item of items) {
    const seq = Number(item.choiSeq);
    if (!Number.isInteger(seq) || seq <= 0) continue;
    map.set(seq, normalizeResultGb(item.resultGb ?? "N"));
  }
  return map;
}

/**
 * 업로드된 eligible 행 순서와 CHOI_SEQ(1..N)를 일치시켜 서버 결과를 반영.
 * INSERT 시 CHOI_SEQ를 idx+1로 저장하므로 동일 순서 매핑이 가능하다.
 */
function applyServerResultByChoiSeq(
  prev: SelectionRow[],
  resultMap: Map<number, ResultGb>,
): SelectionRow[] {
  let choiSeq = 0;
  return prev.map((row) => {
    if (!rowHasEligibleKey(row)) return row;
    choiSeq += 1;
    const gb = resultMap.get(choiSeq) ?? "N";
    return { ...row, resultGb: gb };
  });
}

function sortRowsBySelectionOrder(rows: SelectionRow[]): SelectionRow[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const d = resultGbSortRank(a.row) - resultGbSortRank(b.row);
      if (d !== 0) return d;
      return a.i - b.i;
    })
    .map(({ row }) => row);
}

/** 서버 조회 결과로 표시용 목록·팝업 시퀀스 생성 (행 순서는 prev와 동일한 merged 기준) */
function buildRevealSequenceFromMerged(
  prev: SelectionRow[],
  merged: SelectionRow[],
): LotteryRevealItem[] {
  const eligibleIndices = prev
    .map((row, i) => i)
    .filter((i) => rowHasEligibleKey(prev[i]))
    .sort((a, b) => a - b);
  return eligibleIndices.map((idx) => ({
    uniqueId: rowUniqueIdForReveal(prev[idx]),
    resultGb: merged[idx].resultGb,
  }));
}

export const SelectionWorkPageView: React.FC = () => {
  /** 데이터 표 + 선정 진행 모달(포털) — html2canvas가 동일 서브트리에 있어야 녹화에 포함됨 */
  const selectionTableRecordRef = useRef<HTMLDivElement>(null);
  const [selectionPortalRoot, setSelectionPortalRoot] =
    useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableHScrollRef = useRef<HTMLDivElement>(null);
  const bottomHScrollRef = useRef<HTMLDivElement>(null);
  const hScrollSyncLock = useRef(false);
  const [hScrollMetrics, setHScrollMetrics] = useState({ sw: 0, cw: 0 });
  const [list, setList] = useState<SelectionRow[]>([]);
  const listRef = useRef<SelectionRow[]>([]);
  const pendingNewListRef = useRef<SelectionRow[] | null>(null);
  const choiceRevealScrollRef = useRef<HTMLDivElement>(null);
  const [choiceRevealSession, setChoiceRevealSession] = useState<{
    sequence: LotteryRevealItem[];
  } | null>(null);
  const [choiceRevealShown, setChoiceRevealShown] = useState<LotteryRevealItem[]>(
    [],
  );
  const [selectedCount, setSelectedCount] = useState("0");
  const [reserveCount, setReserveCount] = useState("0");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [excelColumnLabels, setExcelColumnLabels] = useState<string[]>([]);
  /** 엑셀 컬럼 라벨에 따른 표시용 값 (테이블, UI용 선정여부 열은 라디오로만 표시) */
  const getDisplayValue = (row: SelectionRow, label: string): string => {
    if (label === "선정여부") {
      return row.resultGb === "Y" ? "선정" : row.resultGb === "R" ? "예비" : "미선정";
    }
    if (label === "이름") return row.name;
    return row.extra[label] ?? "";
  };
  /** 엑셀 다운로드용 셀 값 */
  const getCellValueForExport = (row: SelectionRow, label: string): string => {
    if (label === "선정여부") {
      return row.resultGb === "Y" ? "선정" : row.resultGb === "R" ? "예비" : "미선정";
    }
    if (label === "이름") return row.name;
    return row.extra[label] ?? "";
  };
  /** 순번 미표시. 선정여부/고유번호 고정 컬럼을 위해 앞쪽으로 정렬 */
  const displayColumnLabels = (() => {
    const labels = excelColumnLabels.filter(
      (l) => l !== "순번" && l !== "선정여부",
    );
    const withoutUniqueId = labels.filter((l) => l !== "고유번호");
    return ["선정여부", ...(labels.includes("고유번호") ? ["고유번호"] : []), ...withoutUniqueId];
  })();
  const fixedSelectionWidth = 260;
  const fixedUniqueIdWidth = 160;
  const fixedColumnsTotalWidth = fixedSelectionWidth + fixedUniqueIdWidth;
  const isFixedColumn = (label: string) =>
    label === "선정여부" || label === "고유번호";
  const fixedLeft = (label: string) => {
    if (label === "선정여부") return 0;
    if (label === "고유번호") return fixedSelectionWidth;
    return undefined;
  };
  const columnMinWidth = (label: string) => {
    if (label === "선정여부") return fixedSelectionWidth;
    if (label === "고유번호") return fixedUniqueIdWidth;
    return 100;
  };
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  const recordingHandleRef = useRef<SelectionRecordingHandle | null>(null);
  const recordingPostCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const recordingWaitRevealRef = useRef(false);
  /** 성공 시 다운로드 파일 접두사용 (마지막 녹화 종류) */
  const recordingSuccessPrefixRef = useRef<string>("선정녹화");

  useEffect(() => {
    if (choiceRevealSession !== null) return;
    if (!recordingWaitRevealRef.current || !recordingHandleRef.current) return;
    const handle = recordingHandleRef.current;
    const prefix = recordingSuccessPrefixRef.current;
    recordingWaitRevealRef.current = false;

    recordingPostCloseTimerRef.current = setTimeout(() => {
      recordingPostCloseTimerRef.current = null;
      if (recordingHandleRef.current === handle) {
        recordingHandleRef.current = null;
      }
      void handle
        .stop()
        .then((blob) => {
          downloadRecordingBlob(blob, formatSelectionRecordingFilename(prefix));
        })
        .catch((err) => {
          console.error("선정 녹화 저장 오류:", err);
        });
    }, SELECTION_RECORDING_POST_CLOSE_MS);

    return () => {
      if (recordingPostCloseTimerRef.current) {
        clearTimeout(recordingPostCloseTimerRef.current);
        recordingPostCloseTimerRef.current = null;
      }
    };
  }, [choiceRevealSession]);

  useEffect(() => {
    return () => {
      if (recordingPostCloseTimerRef.current) {
        clearTimeout(recordingPostCloseTimerRef.current);
        recordingPostCloseTimerRef.current = null;
      }
      if (recordingHandleRef.current) {
        recordingHandleRef.current.dispose();
        recordingHandleRef.current = null;
      }
      recordingWaitRevealRef.current = false;
    };
  }, []);

  const eligibleCount = list.filter((r) => rowHasEligibleKey(r)).length;
  const countSelected = list.filter((r) => r.resultGb === "Y").length;
  const countReserve = list.filter((r) => r.resultGb === "R").length;
  const countUnselected = list.filter((r) => r.resultGb === "N").length;

  const updateRow = (id: string, value: ResultGb) => {
    setList((prev) =>
      prev.map((row) => (row.id === id ? { ...row, resultGb: value } : row))
    );
  };

  const updateHScrollMetrics = useCallback(() => {
    const el = tableHScrollRef.current;
    if (!el) {
      setHScrollMetrics({ sw: 0, cw: 0 });
      return;
    }
    setHScrollMetrics({ sw: el.scrollWidth, cw: el.clientWidth });
  }, []);

  useLayoutEffect(() => {
    updateHScrollMetrics();
  }, [list, excelColumnLabels, updateHScrollMetrics]);

  useEffect(() => {
    const el = tableHScrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => updateHScrollMetrics());
    ro.observe(el);
    window.addEventListener("resize", updateHScrollMetrics);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHScrollMetrics);
    };
  }, [excelColumnLabels.length, list.length, updateHScrollMetrics]);

  const useTableVirtual = list.length >= SELECTION_TABLE_VIRTUAL_MIN_ROWS;
  const rowVirtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => tableHScrollRef.current,
    estimateSize: () => SELECTION_TABLE_ROW_HEIGHT_PX,
    overscan: 12,
    enabled: useTableVirtual,
  });

  const virtualItems = useTableVirtual ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop =
    useTableVirtual && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const virtualPaddingBottom =
    useTableVirtual && virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  useLayoutEffect(() => {
    if (list.length >= SELECTION_TABLE_VIRTUAL_MIN_ROWS) {
      rowVirtualizer.measure();
    }
  }, [list.length, excelColumnLabels.length, rowVirtualizer]);

  /** 선정 팝업: 한 줄씩 공개 후 자동 스크롤, 끝나면 목록 반영·닫기 */
  useEffect(() => {
    if (!choiceRevealSession) return;
    const { sequence } = choiceRevealSession;
    if (sequence.length === 0) {
      if (pendingNewListRef.current) {
        setList(pendingNewListRef.current);
        pendingNewListRef.current = null;
      }
      setChoiceRevealSession(null);
      setChoiceRevealShown([]);
      return;
    }

    let index = 0;

    const maxTicks = sequence.length > 800 ? 15 : sequence.length > 300 ? 35 : 100;
    const chunkSize = Math.max(1, Math.ceil(sequence.length / maxTicks));
    const tickCount = Math.ceil(sequence.length / chunkSize);
    const totalRevealMs = Math.min(900, Math.max(180, tickCount * 16));
    const delayMs = Math.min(24, Math.max(8, Math.floor(totalRevealMs / tickCount)));
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const finishAndClose = () => {
      closeTimer = setTimeout(() => {
        if (pendingNewListRef.current) {
          setList(pendingNewListRef.current);
          pendingNewListRef.current = null;
        }
        setChoiceRevealSession(null);
        setChoiceRevealShown([]);
      }, 60);
    };

    const scheduleNext = () => {
      if (index >= sequence.length) {
        finishAndClose();
        return;
      }
      const nextIndex = Math.min(index + chunkSize, sequence.length);
      const chunk = sequence.slice(index, nextIndex);
      index = nextIndex;
      setChoiceRevealShown((prev) => [...prev, ...chunk]);
      if (index >= sequence.length) {
        finishAndClose();
      } else {
        timer = setTimeout(scheduleNext, delayMs);
      }
    };

    timer = setTimeout(scheduleNext, delayMs);

    return () => {
      if (timer) clearTimeout(timer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [choiceRevealSession]);

  useLayoutEffect(() => {
    const el = choiceRevealScrollRef.current;
    if (!el || !choiceRevealSession) return;
    el.scrollTop = el.scrollHeight;
  }, [choiceRevealShown.length, choiceRevealSession]);

  const showBottomHScroll =
    excelColumnLabels.length > 0 && hScrollMetrics.sw > hScrollMetrics.cw + 2;
  const bottomScrollInnerWidth = Math.max(
    1,
    hScrollMetrics.sw - fixedColumnsTotalWidth,
  );

  useLayoutEffect(() => {
    if (!showBottomHScroll) return;
    const t = tableHScrollRef.current;
    const b = bottomHScrollRef.current;
    if (t && b) b.scrollLeft = t.scrollLeft;
  }, [showBottomHScroll, hScrollMetrics.sw]);

  const onTableHScroll = () => {
    if (hScrollSyncLock.current) return;
    hScrollSyncLock.current = true;
    const t = tableHScrollRef.current;
    const b = bottomHScrollRef.current;
    if (t && b) b.scrollLeft = t.scrollLeft;
    requestAnimationFrame(() => {
      hScrollSyncLock.current = false;
    });
  };

  const onBottomHScroll = () => {
    if (hScrollSyncLock.current) return;
    hScrollSyncLock.current = true;
    const t = tableHScrollRef.current;
    const b = bottomHScrollRef.current;
    if (t && b) t.scrollLeft = b.scrollLeft;
    requestAnimationFrame(() => {
      hScrollSyncLock.current = false;
    });
  };

  const handleUploadClick = () => {
    setSaveError(null);
    setSaveSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setSaveError("엑셀 파일(.xlsx)만 업로드할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      void (async () => {
        try {
          const data = ev.target?.result;
          if (!data || !(data instanceof ArrayBuffer)) {
            setSaveError("파일을 읽을 수 없습니다.");
            return;
          }
          const rows = await loadXlsxFirstSheetMatrix(data);
          if (!rows.length) {
            setSaveError("엑셀에 시트가 없거나 데이터가 없습니다.");
            return;
          }
        // 헤더 행 찾기: "고유번호" 열이 있는 첫 행
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          for (let j = 0; j < row.length; j++) {
            const cell = cellStr((row as unknown[])[j]);
            if (cell === "고유번호") {
              headerRowIndex = i;
              break;
            }
          }
          if (headerRowIndex >= 0) break;
        }
        if (headerRowIndex < 0) {
          setSaveError("엑셀에서 '고유번호' 헤더가 있는 행을 찾을 수 없습니다.");
          return;
        }
        const headerRow = rows[headerRowIndex] as unknown[];
        const labels = headerRow.map((c) => cellStr(c));
        const itemLabels = extractItemLabels(labels);
        if (itemLabels.length > MAX_ITEM_COLUMN_COUNT) {
          setSaveError(
            `업로드 가능한 항목 컬럼은 최대 ${MAX_ITEM_COLUMN_COUNT}개입니다. 현재 ${itemLabels.length}개입니다.`,
          );
          return;
        }
        const allowedLabels = new Set([
          ...Array.from(NON_ITEM_LABELS),
          ...itemLabels.slice(0, MAX_ITEM_COLUMN_COUNT),
        ]);
        const limitedLabels = labels.filter((label) => label && allowedLabels.has(label));
        setExcelColumnLabels(limitedLabels);

        const dataRows = rows.slice(headerRowIndex + 1).filter((row) => {
          if (!Array.isArray(row)) return false;
          return (row as unknown[]).some((c) => cellStr(c) !== "");
        });

        const parsed: SelectionRow[] = dataRows
          .filter((row) => Array.isArray(row) && (row as unknown[]).some((c) => cellStr(c) !== ""))
          .map((row, i) => {
            const r = row as unknown[];
            let name = "";
            let resultGb: ResultGb = "N";
            const extra: Record<string, string> = {};
            labels.forEach((label, colIndex) => {
              if (!label) return;
              if (!allowedLabels.has(label)) return;
              const val = cellStr(r[colIndex]);
              if (label === "이름") {
                name = val;
              } else if (label === "선정여부") {
                resultGb = normalizeResultGb(val);
              } else {
                extra[label] = val;
              }
            });
            return {
              id: `upload-${i}-${Date.now()}`,
              name,
              resultGb,
              extra,
            };
          });
          setList(parsed.filter((row) => rowHasEligibleKey(row)));
        } catch (err) {
          console.error("엑셀 파싱 오류:", err);
          setSaveError("엑셀 파싱 중 오류가 발생했습니다.");
        }
      })();
    };
    reader.readAsArrayBuffer(file);
  };

  type DownloadFilter = "all" | "Y" | "R" | "N";

  /** 조건에 맞는 목록을 엑셀 파일로 다운로드 (전체/선정/예비/미선정) */
  const handleDownloadClick = async (filter: DownloadFilter) => {
    const filtered =
      filter === "all"
        ? list
        : list.filter((row) => row.resultGb === filter);
    if (filtered.length === 0) {
      const label =
        filter === "all"
          ? "다운로드할"
          : filter === "Y"
            ? "선정"
            : filter === "R"
              ? "예비"
              : "미선정";
      setSaveError(`${label} 데이터가 없습니다.`);
      return;
    }
    setSaveError(null);
    const downloadColumnLabels = ["순번", ...displayColumnLabels];
    const headerRow = [...downloadColumnLabels];
    const dataRows = filtered.map((row, index) =>
      downloadColumnLabels.map((label) =>
        label === "순번" ? String(index + 1) : getCellValueForExport(row, label),
      ),
    );

    const shouldCenterColumn = (label: string) =>
      label === "순번" ||
      label === "선정여부" ||
      label === "이름" ||
      label === "고유번호" ||
      label === "선정업무" ||
      /^ITEM\d+$/i.test(label);
    const centerDataColumnIndices = downloadColumnLabels
      .map((label, i) => (shouldCenterColumn(label) ? i : -1))
      .filter((i) => i >= 0);

    const sheetName =
      filter === "all" ? "전체" : filter === "Y" ? "선정" : filter === "R" ? "예비" : "미선정";

    try {
      const wb = new ExcelJS.Workbook();
      addAdminStyledListSheet(wb, sheetName, {
        title: "선정 대상 목록",
        headers: headerRow,
        dataRows,
        columnWidths: headerRow.map(() => 18),
        centerDataColumnIndices,
      });
      await writeWorkbookToXlsxDownload(wb, `선정결과_${sheetName}`);
    } catch (err) {
      console.error("엑셀 다운로드 오류:", err);
      setSaveError("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  const [choiceLoading, setChoiceLoading] = useState(false);

  /** 선정 버튼: artchoi TRUNCATE + INSERT → f_choicelist('02') CALL → GET으로 결과 반영 → 팝업 공개 */
  const handleChoiceClick = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    const prev = listRef.current;
    const elig = prev.filter((r) => rowHasEligibleKey(r)).length;
    if (elig === 0) {
      setSaveError("고유번호 또는 이름이 있는 신청 데이터가 없습니다.");
      return;
    }
    const selectedCnt = Number(selectedCount);
    const reserveCnt = Number(reserveCount);
    if (!Number.isInteger(selectedCnt) || selectedCnt < 0) {
      setSaveError("선정인원수는 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(reserveCnt) || reserveCnt < 0) {
      setSaveError("예비인원수는 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    const dataCnt = selectedCnt + reserveCnt;
    if (dataCnt <= 0) {
      setSaveError("선정인원수와 예비인원수의 합은 1 이상이어야 합니다.");
      return;
    }
    if (selectedCnt > elig) {
      setSaveError(`선정인원수는 신청인원(${elig}명)을 초과할 수 없습니다.`);
      return;
    }
    if (reserveCnt > elig) {
      setSaveError(`예비인원수는 신청인원(${elig}명)을 초과할 수 없습니다.`);
      return;
    }
    if (dataCnt > elig) {
      setSaveError(`선정+예비 인원수 합은 신청인원(${elig}명)을 초과할 수 없습니다.`);
      return;
    }
    if (choiceRevealSession || choiceLoading) return;

    if (recordingPostCloseTimerRef.current) {
      clearTimeout(recordingPostCloseTimerRef.current);
      recordingPostCloseTimerRef.current = null;
    }
    if (recordingHandleRef.current) {
      recordingHandleRef.current.dispose();
      recordingHandleRef.current = null;
    }
    recordingWaitRevealRef.current = false;

    let recording: SelectionRecordingHandle | null = null;
    const rowCount = prev.length;
    const recordingOpts =
      rowCount >= 800
        ? { fps: 6, maxSide: 1600, scale: 1.5, maxCssHeight: 2200 }
        : rowCount >= 400
          ? { fps: 8, maxSide: 1920, scale: 1.75, maxCssHeight: 2600 }
          : rowCount >= 150
            ? { fps: 10, maxSide: 2048, scale: 2, maxCssHeight: 3200 }
            : { fps: 12, maxSide: 2560, scale: 2.5 };
    recording = await startDomRegionRecording(
      selectionTableRecordRef.current,
      recordingOpts,
    );
    recordingSuccessPrefixRef.current = "선정녹화";
    if (recording) {
      recordingHandleRef.current = recording;
    }

    /** 엑셀 라벨 → ITEM 컬럼 매핑 헬퍼 */
    const ITEM_KEYS = [
      "item1","item2","item3","item4","item5",
      "item6","item7","item8","item9","item10",
      "item11","item12","item13","item14","item15",
      "item16","item17","item18","item19","item20",
    ] as const;

    /** 엑셀 행을 artchoi INSERT용 객체로 변환
     *  - BASE_ID: 고유번호 열
     *  - ITEM1~20: 나머지 열을 순서대로 채움 (이름·선정여부 제외)
     */
    type ArtchoiItem = {
      resultGb?: string;
      baseId: string;
      item1?: string; item2?: string; item3?: string; item4?: string;
      item5?: string; item6?: string; item7?: string; item8?: string;
      item9?: string; item10?: string; item11?: string; item12?: string;
      item13?: string; item14?: string; item15?: string; item16?: string;
      item17?: string; item18?: string; item19?: string; item20?: string;
    };
    const buildItems = (): ArtchoiItem[] => {
      const itemLabels = extractItemLabels(excelColumnLabels);
      if (itemLabels.length > MAX_ITEM_COLUMN_COUNT) {
        throw new Error(
          `항목 컬럼은 최대 ${MAX_ITEM_COLUMN_COUNT}개까지만 지원됩니다.`,
        );
      }
      return prev
        .filter((row) => rowHasEligibleKey(row))
        .map((row) => {
          const obj: ArtchoiItem = {
            baseId: (row.extra["고유번호"] ?? row.name ?? "").trim(),
          };
          ITEM_KEYS.forEach((key, idx) => {
            const label = itemLabels[idx];
            obj[key] = label ? (row.extra[label] ?? "") : "";
          });
          return obj;
        });
    };

    try {
      setChoiceLoading(true);
      const requestList = buildItems().map((item) => ({
        ...item,
        resultGb: "N",
      }));
      const result = await MemberService.runMemberSelection({
        list: requestList,
        selectCnt: selectedCnt,
        reserveCnt: reserveCnt,
      });
      if (result?.result && result.result !== "00") {
        throw new Error(result?.message || "선정 처리 중 오류가 발생했습니다.");
      }

      const apiList = await MemberService.getMemberSelectionList();
      const resultMap = buildResultMapByChoiSeq(apiList);
      const merged = applyServerResultByChoiSeq(prev, resultMap);
      const sortedList = sortRowsBySelectionOrder(merged);
      const revealSequence = buildRevealSequenceFromMerged(prev, merged);

      setSaveSuccess(result?.message || "선정여부가 정상적으로 저장되었습니다.");

      pendingNewListRef.current = sortedList;
      setList(prev.map((row) => ({ ...row, resultGb: "N" as ResultGb })));
      setChoiceRevealShown([]);
      if (recording) {
        recordingWaitRevealRef.current = true;
      }
      setChoiceRevealSession({ sequence: revealSequence });
    } catch (error: any) {
      console.error("회원 선정 처리 오류:", error);
      setSaveError(error?.message ?? "선정 처리 중 오류가 발생했습니다.");
      setSaveSuccess(null);
      if (recording) {
        recordingWaitRevealRef.current = false;
        recordingHandleRef.current = null;
        const failPrefix = "선정녹화_실패";
        void recording
          .stop()
          .then((blob) => {
            downloadRecordingBlob(blob, formatSelectionRecordingFilename(failPrefix));
          })
          .catch((err) => console.error("선정 녹화(실패) 저장 오류:", err));
      }
    } finally {
      setChoiceLoading(false);
    }
  };

  const renderSelectionTableRow = (row: SelectionRow) => (
    <tr key={row.id} className="group hover:bg-gray-50">
      {displayColumnLabels.map((label, i) => (
        <td
          key={i}
          className={`whitespace-nowrap px-3 py-2 border-r border-gray-200 text-center text-[13px] text-gray-900 align-middle ${isFixedColumn(label) ? "sticky z-[2] bg-white group-hover:bg-gray-50" : ""} ${i === displayColumnLabels.length - 1 ? "border-r-0" : ""}`}
          style={{
            minWidth: columnMinWidth(label),
            left: fixedLeft(label),
          }}
        >
          {label === "선정여부" ? (
            <div className="flex flex-nowrap items-center justify-center gap-3">
              {RESULT_OPTIONS.map((opt) => {
                const rowDisabled = !rowHasEligibleKey(row);
                return (
                  <label
                    key={opt.value}
                    className={`inline-flex items-center gap-1.5 ${rowDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name={`result-${row.id}`}
                      value={opt.value}
                      checked={row.resultGb === opt.value}
                      onChange={() =>
                        !rowDisabled && updateRow(row.id, opt.value)
                      }
                      disabled={rowDisabled}
                      className="border-gray-300 disabled:cursor-not-allowed"
                    />
                    <span className="text-[13px] text-gray-800">
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <span className="block text-center">
              {getDisplayValue(row, label)}
            </span>
          )}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="page-header">
        <h1 className="page-title">선정 업무</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt; <span>선정 업무</span>
        </nav>
      </div>

      <div className="relative min-w-0 max-w-full rounded-lg border bg-white shadow">
        {/* 선정 기준 입력 */}
        <div className="border-b border-gray-200 p-0">
          <div className="border border-gray-300">
            <div className="flex flex-col md:flex-row flex-wrap">
              <div className="w-full md:w-1/2 flex flex-col md:flex-row items-stretch">
                <label className="w-full md:w-28 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300 text-[13px] font-bold">
                  선정인원수
                </label>
                <div className="w-full md:flex-1 flex items-center p-2 border-r border-gray-300">
                  <div className="relative w-full">
                    <input
                      type="number"
                      min={0}
                      value={selectedCount}
                      onChange={(e) => setSelectedCount(e.target.value)}
                      className="w-full border border-gray-300 rounded-none px-3 py-2 pr-8 text-right text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none"
                      style={{ fontSize: "14px" }}
                    >
                      명
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col md:flex-row items-stretch">
                <label className="w-full md:w-28 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300 text-[13px] font-bold">
                  예비인원수
                </label>
                <div className="w-full md:flex-1 flex items-center p-2 border-r border-gray-300">
                  <div className="relative w-full">
                    <input
                      type="number"
                      min={0}
                      value={reserveCount}
                      onChange={(e) => setReserveCount(e.target.value)}
                      className="w-full border border-gray-300 rounded-none px-3 py-2 pr-8 text-right text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none"
                      style={{ fontSize: "14px" }}
                    >
                      명
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 선정 현황 요약 바 + 선정 버튼 */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-700">
                선정인원수
              </span>
              <span className="inline-flex items-center justify-center min-w-[48px] px-3 py-1 bg-amber-100 text-amber-800 text-[13px] font-medium rounded-[5px]">
                {countSelected}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-700">
                예비인원수
              </span>
              <span className="inline-flex items-center justify-center min-w-[48px] px-3 py-1 bg-amber-100 text-amber-800 text-[13px] font-medium rounded-[5px]">
                {countReserve}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-700">
                미선정인원수
              </span>
              <span className="inline-flex items-center justify-center min-w-[48px] px-3 py-1 bg-amber-100 text-amber-800 text-[13px] font-medium rounded-[5px]">
                {countUnselected}
              </span>
            </div>
          </div>
          <div className="ml-auto flex max-w-full flex-col items-end gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center min-w-[76px] px-2.5 py-1 text-[13px] bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleChoiceClick}
              disabled={!!choiceRevealSession || choiceLoading}
            >
              {choiceLoading ? "선정 중..." : "선정"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
              aria-label="엑셀 파일 선택"
            />
            <button
              type="button"
              className="inline-flex items-center justify-center min-w-[76px] px-2.5 py-1 text-[13px] bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              onClick={handleUploadClick}
            >
              업로드
            </button>
            <AdminExcelDownloadButton
              type="button"
              className="inline-flex items-center justify-center min-w-[76px]"
              idleLabel="엑셀"
              onClick={() => handleDownloadClick("all")}
            />
          </div>
          {saveError && (
            <div className="w-full px-4 pt-2 pb-1 text-[13px] text-red-600">{saveError}</div>
          )}
          {saveSuccess && !saveError && (
            <div className="w-full px-4 pt-2 pb-1 text-[13px] text-green-700">{saveSuccess}</div>
          )}
        </div>

        {excelColumnLabels.length > 0 ? (
        <div
          ref={selectionTableRecordRef}
          className="relative w-full min-h-0 min-w-0"
        >
          <div
            className={`w-full min-w-0 border-b border-gray-200 px-4 py-3 ${showBottomHScroll ? "pb-8" : ""}`}
          >
          <div
            ref={tableHScrollRef}
            onScroll={onTableHScroll}
            className="admin-table-scroll-no-scrollbar max-h-[65vh] overflow-y-auto rounded border border-gray-300 bg-white"
          >
            <table className="mb-0 min-w-full w-max border-collapse">
            <thead className="bg-gray-100">
              <tr className="border-t border-b-2">
                {displayColumnLabels.map((label, i) => (
                  <th
                    key={i}
                    className={`sticky top-0 whitespace-nowrap px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700 ${isFixedColumn(label) ? "z-[5] bg-gray-100" : "z-[4] bg-gray-100"} ${i === displayColumnLabels.length - 1 ? "border-r-0" : ""}`}
                    style={{
                      minWidth: columnMinWidth(label),
                      left: fixedLeft(label),
                    }}
                  >
                    {label || "\u00A0"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {useTableVirtual ? (
                <>
                  {virtualPaddingTop > 0 ? (
                    <tr aria-hidden>
                      <td
                        colSpan={displayColumnLabels.length}
                        style={{
                          height: virtualPaddingTop,
                          padding: 0,
                          border: "none",
                          lineHeight: 0,
                        }}
                      />
                    </tr>
                  ) : null}
                  {virtualItems.map((vRow) => {
                    const row = list[vRow.index];
                    if (!row) return null;
                    return renderSelectionTableRow(row);
                  })}
                  {virtualPaddingBottom > 0 ? (
                    <tr aria-hidden>
                      <td
                        colSpan={displayColumnLabels.length}
                        style={{
                          height: virtualPaddingBottom,
                          padding: 0,
                          border: "none",
                          lineHeight: 0,
                        }}
                      />
                    </tr>
                  ) : null}
                </>
              ) : (
                list.map((row) => renderSelectionTableRow(row))
              )}
            </tbody>
            </table>
          </div>
          </div>
          {showBottomHScroll && (
            <div className="w-full min-w-0 px-4 pb-3">
              <div
                ref={bottomHScrollRef}
                onScroll={onBottomHScroll}
                className="admin-table-horizontal-scroll"
                style={{
                  marginLeft: fixedColumnsTotalWidth,
                  width: `calc(100% - ${fixedColumnsTotalWidth}px)`,
                }}
                aria-label="표 가로 스크롤"
              >
                <div style={{ width: bottomScrollInnerWidth, height: 1 }} aria-hidden />
              </div>
            </div>
          )}
          <div
            ref={setSelectionPortalRoot}
            className="selection-modal-portal-host pointer-events-none absolute inset-0 z-[10000] min-h-0"
            aria-hidden="true"
          />
        </div>
        ) : (
          <div
            ref={setSelectionPortalRoot}
            className="selection-modal-portal-host pointer-events-none absolute inset-0 z-[10000] min-h-0"
            aria-hidden="true"
          />
        )}
        {typeof document !== "undefined" &&
          choiceRevealSession &&
          createPortal(
            <div
              className={`pointer-events-auto flex items-center justify-center bg-black/60 p-4 ${
                selectionPortalRoot
                  ? "absolute inset-0 z-[1]"
                  : "fixed inset-0 z-[10000]"
              }`}
              role="presentation"
            >
              <div
                className="relative z-[2] flex w-[min(420px,calc(100vw-2rem))] h-[min(500px,78vh)] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="selection-reveal-title"
              >
                <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 pt-3 pb-2">
                  <h2
                    id="selection-reveal-title"
                    className="dialog-title text-left m-0 text-lg"
                  >
                    선정 진행
                  </h2>
                </div>
                <div
                  ref={choiceRevealScrollRef}
                  className="selection-popup-vscroll min-h-0 flex-1 overflow-y-scroll bg-white px-3 pb-2 pt-0 [scrollbar-gutter:stable]"
                  style={{ pointerEvents: "none" }}
                  aria-live="polite"
                  onWheel={(e) => e.preventDefault()}
                >
                  <table className="w-full border-collapse text-[13px]">
                    <thead className="sticky top-0 z-[1] bg-gray-100 shadow-sm">
                      <tr className="border-b border-gray-300">
                        <th className="px-3 py-2 text-center font-bold text-gray-800 border-r border-gray-200">
                          고유번호
                        </th>
                        <th className="px-3 py-2 text-center font-bold text-gray-800">
                          선정여부
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {choiceRevealShown.map((row, i) => (
                        <tr key={`reveal-${i}`}>
                          <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-100">
                            {row.uniqueId}
                          </td>
                          <td
                            className={`px-3 py-2 text-center font-semibold ${
                              row.resultGb === "Y"
                                ? "text-amber-800"
                                : row.resultGb === "R"
                                  ? "text-blue-800"
                                  : "text-gray-600"
                            }`}
                          >
                            {resultGbLabel(row.resultGb)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2 text-[12px] text-gray-600">
                  {choiceRevealShown.length} /{" "}
                  {choiceRevealSession.sequence.length}명
                </div>
              </div>
            </div>,
            selectionPortalRoot ?? document.body,
          )}
      </div>
    </div>
  );
};
