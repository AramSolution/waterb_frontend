import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  computeLineSewageQty,
  getSewageCalcModeForLine,
} from "@/features/adminWeb/support/lib/sewageVolumeCalc";
import {
  isOtherActCategory,
  SEWAGE_CATEGORY,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import { buildSupportFeePayerRegisterRequest } from "../lib/buildSupportFeePayerRegisterRequest";
import type { DetailCodeItem } from "@/entities/adminWeb/code/api/cmmCodeApi";
import { CmmCodeService } from "@/entities/adminWeb/code/api/cmmCodeApi";
import {
  getFeePayerDetail,
  postFeePayerCalculate,
  type SupportFeePayerBasicInfoRequest,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import { ApiError } from "@/shared/lib/apiClient";

/** 층수~삭제 한 줄(통지일 블록 당 1..n행) */
export type SewageDetailLine = {
  id: string;
  floor: string;
  usage: string;
  area: string;
  dailySewage: string;
  /** WAT002 소분류 code(용도조회 `gubun2`) — 오수량 식 분기 우선 */
  buildingUseSubCode: string;
  /** 건축물(ARMBUILD) ID — 계산·저장 API `buildId` 전용 (`gubun2`와 분리) */
  armbuildBuildId?: string;
  /** 용도조회 분류 상위 라벨(예: 주거시설) — 표시·레거시 보조 */
  midCategoryLabel: string;
  /** 단독·공동(다중) 산정용 방수 */
  roomCount: string;
  /** 공동주택 산정용 세대수 */
  householdCount: string;
  /** 층수·용도 행 옆 표시용 오수량(계산 결과) */
  sewageQty: string;
  selected: boolean;
  /** ARTITEC.seq2 — 재계산 시 U 행 동기화용(서버 상세 조회로 채움) */
  calcSeq2?: number;
};

/** 오수량 발생량 산정: 상단 공통(상태~통지일·기준단가~계산) + 층수/용도 상세 `lines` */
export type SewageEstimateEntry = {
  id: string;
  status: string;
  category: string;
  type: string;
  notifyDate: string;
  unitPrice: string;
  sewageVolume: string;
  causerCharge: string;
  sewageLevyAmount: string;
  lines: SewageDetailLine[];
  /** ARTITED.SEQ — 계산 API 응답 후 갱신 */
  detailSeq?: number;
};

export interface FeePayerSewageApiBridge {
  getBasicInfoBody: () => SupportFeePayerBasicInfoRequest | null;
  feePayerItemId?: string | null;
  onFeePayerItemId?: (itemId: string) => void;
}

/** `<input type="date">`용 로컬 당일 `YYYY-MM-DD` */
function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseBaseCostFromWat003(items: DetailCodeItem[]): number | undefined {
  const row = items[0];
  if (!row) return undefined;
  const raw = `${row.codeDc ?? ""} ${row.codeNm ?? ""}`;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : undefined;
}

function formatIntKo(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatMetricKo(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function withSewageQty(line: SewageDetailLine): SewageDetailLine {
  return {
    ...line,
    sewageQty: computeLineSewageQty({
      buildingUseSubCode: line.buildingUseSubCode,
      buildingUse: line.usage,
      midCategoryLabel: line.midCategoryLabel,
      area: line.area,
      dailySewage: line.dailySewage,
      roomCount: line.roomCount,
      householdCount: line.householdCount,
      selected: line.selected,
    }),
  };
}

function createDetailLine(): SewageDetailLine {
  return withSewageQty({
    id: crypto.randomUUID(),
    floor: "1",
    usage: "",
    buildingUseSubCode: "",
    midCategoryLabel: "",
    area: "",
    dailySewage: "",
    roomCount: "",
    householdCount: "",
    sewageQty: "",
    selected: false,
  });
}

function isEntryPaid(entry: SewageEstimateEntry): boolean {
  return entry.status === "PAID";
}

function createEntry(): SewageEstimateEntry {
  return {
    id: crypto.randomUUID(),
    status: "UNPAID",
    category: "",
    type: "",
    notifyDate: getTodayYmd(),
    unitPrice: "",
    sewageVolume: "",
    causerCharge: "",
    sewageLevyAmount: "",
    lines: [createDetailLine()],
  };
}

function normalizeDetailLine(l: SewageDetailLine): SewageDetailLine {
  const bul = (l.armbuildBuildId ?? "").trim();
  const merged: SewageDetailLine = {
    ...l,
    buildingUseSubCode: l.buildingUseSubCode ?? "",
    midCategoryLabel: l.midCategoryLabel ?? "",
    roomCount: l.roomCount ?? "",
    householdCount: l.householdCount ?? "",
    calcSeq2: l.calcSeq2,
    armbuildBuildId: bul || undefined,
  };
  return withSewageQty(merged);
}

function normalizeEntry(e: SewageEstimateEntry): SewageEstimateEntry {
  return {
    ...e,
    detailSeq: e.detailSeq,
    lines: e.lines.map(normalizeDetailLine),
  };
}

function initialEntriesOrDefault(
  initial?: SewageEstimateEntry[],
): SewageEstimateEntry[] {
  if (initial && initial.length > 0) return initial.map(normalizeEntry);
  return [createEntry()];
}

/**
 * @param initialEntries 상세 등에서 목 데이터·API 스냅샷으로 채울 때 전달. 미전달 시 등록용 기본 1블록.
 * @param apiBridge 등록 폼에서 계산 API·기준단가 연동 시 전달.
 */
export function useFeePayerSewageVolumeEstimate(
  initialEntries?: SewageEstimateEntry[],
  apiBridge?: FeePayerSewageApiBridge | null,
) {
  const [entries, setEntries] = useState<SewageEstimateEntry[]>(() =>
    initialEntriesOrDefault(initialEntries),
  );
  const [calcBusyEntryId, setCalcBusyEntryId] = useState<string | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  /** 저장 시 `details[].rowStatus=D` 로 보낼 ARTITED.SEQ (통지일 블록 삭제) */
  const removedDetailSeqsRef = useRef<number[]>([]);
  /** 저장 시 `calculations[].rowStatus=D` — 기존 `seq`·`seq2` 필요 */
  const removedCalcsRef = useRef<Array<{ seq: number; seq2: number }>>([]);

  useEffect(() => {
    if (initialEntries === undefined) return;
    setEntries(initialEntriesOrDefault(initialEntries));
    removedDetailSeqsRef.current = [];
    removedCalcsRef.current = [];
  }, [initialEntries]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => {
      if (!prev.every((e) => e.status === "PAID")) return prev;
      return [...prev, createEntry()];
    });
  }, []);

  const handleAddDetailLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        if (isEntryPaid(e)) return e;
        return { ...e, lines: [...e.lines, createDetailLine()] };
      }),
    );
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      const victim = prev.find((e) => e.id === entryId);
      if (victim && isEntryPaid(victim)) return prev;
      const ds = victim?.detailSeq;
      if (victim != null && ds != null && ds > 0) {
        removedDetailSeqsRef.current.push(ds);
      }
      return prev.filter((e) => e.id !== entryId);
    });
  }, []);

  const handleRemoveDetailLine = useCallback(
    (entryId: string, lineId: string) => {
      setEntries((prev) => {
        const e = prev.find((x) => x.id === entryId);
        if (!e) return prev;
        if (isEntryPaid(e)) return prev;
        const line = e.lines.find((l) => l.id === lineId);
        const seq = e.detailSeq;
        const s2 = line?.calcSeq2;
        if (line != null && seq != null && seq > 0 && s2 != null && s2 > 0) {
          removedCalcsRef.current.push({ seq, seq2: s2 });
        }
        if (e.lines.length > 1) {
          return prev.map((x) =>
            x.id === entryId
              ? { ...x, lines: x.lines.filter((l) => l.id !== lineId) }
              : x,
          );
        }
        if (e.lines[0]?.id !== lineId) return prev;
        if (prev.length > 1) {
          if (seq != null && seq > 0) {
            removedDetailSeqsRef.current.push(seq);
          }
          return prev.filter((x) => x.id !== entryId);
        }
        return prev;
      });
    },
    [],
  );

  const handleEntryFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      const { name, value, type, checked } = target;
      const entryId = target.dataset.entryId;
      if (!entryId) return;
      const lineId = target.dataset.lineId;

      if (lineId) {
        const host = entriesRef.current.find((en) => en.id === entryId);
        if (host && isEntryPaid(host)) return;

        if (name === "selected" && type === "checkbox") {
          setEntries((prev) =>
            prev.map((en) => {
              if (en.id !== entryId) return en;
              return {
                ...en,
                lines: en.lines.map((L) =>
                  L.id === lineId ? withSewageQty({ ...L, selected: checked }) : L,
                ),
              };
            }),
          );
          return;
        }
        const key = name as keyof SewageDetailLine;
        if (
          key === "id" ||
          key === "sewageQty" ||
          key === "midCategoryLabel" ||
          key === "buildingUseSubCode" ||
          key === "armbuildBuildId" ||
          key === "calcSeq2"
        )
          return;
        if (key === "usage") {
          setEntries((prev) =>
            prev.map((en) => {
              if (en.id !== entryId) return en;
              return {
                ...en,
                lines: en.lines.map((L) =>
                  L.id === lineId
                    ? withSewageQty({
                        ...L,
                        usage: value,
                        buildingUseSubCode: "",
                        armbuildBuildId: undefined,
                      })
                    : L,
                ),
              };
            }),
          );
          return;
        }
        setEntries((prev) =>
          prev.map((en) => {
            if (en.id !== entryId) return en;
            return {
              ...en,
              lines: en.lines.map((L) =>
                L.id === lineId
                  ? withSewageQty({ ...L, [key]: value })
                  : L,
              ),
            };
          }),
        );
        return;
      }

      const key = name as keyof SewageEstimateEntry;
      if (key === "id" || key === "lines") return;

      const hostEntry = entriesRef.current.find((en) => en.id === entryId);
      if (hostEntry && isEntryPaid(hostEntry)) return;

      if (key === "category") {
        setEntries((prev) =>
          prev.map((row) =>
            row.id === entryId ? { ...row, category: value, type: "" } : row,
          ),
        );
        const cat = value.trim();
        if (!cat || cat === SEWAGE_CATEGORY.PERMIT_CHANGE) return;
        void (async () => {
          try {
            const rows = await CmmCodeService.getBuildingUseCodeUnitPrice(
              isOtherActCategory(cat),
            );
            const n = parseBaseCostFromWat003(rows);
            if (n == null) return;
            setEntries((prev) =>
              prev.map((row) =>
                row.id === entryId
                  ? { ...row, unitPrice: formatIntKo(n) }
                  : row,
              ),
            );
          } catch {
            /* 기준단가 조회 실패 시 수동 입력 대기 */
          }
        })();
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

  const handleCalculateEntry = useCallback(
    async (entryId: string) => {
      const targetEntry = entriesRef.current.find((e) => e.id === entryId);
      if (targetEntry && isEntryPaid(targetEntry)) {
        return;
      }
      if (targetEntry?.category === SEWAGE_CATEGORY.PERMIT_CHANGE) {
        return;
      }

      const bridge = apiBridge;
      if (!bridge?.getBasicInfoBody) {
        setEntries((prev) =>
          prev.map((row) => {
            if (row.id !== entryId) return row;
            const price = Number(
              String(row.unitPrice).replace(/,/g, "").trim(),
            );
            const vol = Number(
              String(row.sewageVolume).replace(/,/g, "").trim(),
            );
            if (!Number.isFinite(price) || !Number.isFinite(vol)) {
              return row;
            }
            const won = Math.round(price * vol);
            return {
              ...row,
              causerCharge: won > 0 ? `${formatIntKo(won)}원` : "",
            };
          }),
        );
        return;
      }

      const basicInfo = bridge.getBasicInfoBody();
      if (!basicInfo) {
        window.alert(
          "계산을 위해 기본정보(성명·주소)를 먼저 입력해 주세요.",
        );
        return;
      }

      const snapshot = entriesRef.current;
      const body = buildSupportFeePayerRegisterRequest({
        basicInfo,
        itemId: bridge.feePayerItemId,
        entries: snapshot,
        calculateTargetEntryId: entryId,
      });
      if (!body) {
        window.alert("구분·유형·통지일 등 필수 항목을 확인해 주세요.");
        return;
      }

      setCalcBusyEntryId(entryId);
      try {
        const res = await postFeePayerCalculate(body);
        const wid = String(res.itemId ?? "").trim();
        if (wid && bridge.onFeePayerItemId) {
          bridge.onFeePayerItemId(wid);
        }
        const seq = res.seq != null ? Number(res.seq) : NaN;
        const wc = res.waterCost != null ? Number(res.waterCost) : NaN;
        const wv = res.waterVal != null ? Number(res.waterVal) : NaN;
        const ws = res.waterSum != null ? Number(res.waterSum) : NaN;

        setEntries((prev) =>
          prev.map((en) => {
            if (en.id !== entryId) return en;
            return {
              ...en,
              detailSeq: Number.isFinite(seq) ? seq : en.detailSeq,
              causerCharge: Number.isFinite(wc)
                ? `${formatIntKo(Math.round(wc))}원`
                : en.causerCharge,
              sewageLevyAmount: Number.isFinite(wv)
                ? formatMetricKo(wv)
                : en.sewageLevyAmount,
              sewageVolume: Number.isFinite(ws)
                ? formatMetricKo(ws)
                : en.sewageVolume,
            };
          }),
        );

        if (wid && Number.isFinite(seq)) {
          try {
            const detail = await getFeePayerDetail(wid);
            const blocks = detail.data?.details ?? [];
            const block = blocks.find((b) => Number(b.seq) === Number(seq));
            const calcs = [...(block?.calculations ?? [])].sort(
              (a, b) => Number(a.seq2 ?? 0) - Number(b.seq2 ?? 0),
            );
            setEntries((prev) =>
              prev.map((en) => {
                if (en.id !== entryId) return en;
                const nextLines = en.lines.map((line, i) => ({
                  ...line,
                  calcSeq2:
                    calcs[i]?.seq2 != null
                      ? Number(calcs[i].seq2)
                      : line.calcSeq2,
                }));
                return { ...en, lines: nextLines };
              }),
            );
          } catch {
            /* seq2 동기화 실패해도 금액 반영은 유지 */
          }
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? String(err.message || "").trim()
            : "계산 요청 중 오류가 발생했습니다.";
        window.alert(msg || "계산 요청 중 오류가 발생했습니다.");
      } finally {
        setCalcBusyEntryId(null);
      }
    },
    [apiBridge],
  );

  const applyUsageFromLookup = useCallback(
    (
      entryId: string,
      lineId: string,
      picked: {
        buildingUse: string;
        dailySewage: string;
        midCategoryLabel: string;
        gubun2: string;
        armbuildBuildId?: string;
      },
    ) => {
      const midTrim = (picked.midCategoryLabel ?? "").trim();
      const g2 = (picked.gubun2 ?? "").trim();
      const bul = (picked.armbuildBuildId ?? "").trim();
      if (process.env.NODE_ENV === "development") {
        console.log("[FeePayer 오수량 산정] applyUsageFromLookup", {
          entryId,
          lineId,
          gubun2: g2,
          midCategoryLabel: midTrim,
          calcMode: getSewageCalcModeForLine({
            buildingUseSubCode: g2,
            buildingUse: picked.buildingUse,
            midCategoryLabel: midTrim,
          }),
          buildingUse: picked.buildingUse,
          dailySewage: picked.dailySewage,
        });
      }
      const cur = entriesRef.current.find((e) => e.id === entryId);
      if (cur && isEntryPaid(cur)) return;

      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          return {
            ...e,
            lines: e.lines.map((L) => {
              if (L.id !== lineId) return L;
              const next: SewageDetailLine = {
                ...L,
                usage: picked.buildingUse,
                buildingUseSubCode: g2,
                midCategoryLabel: midTrim,
                armbuildBuildId: bul || undefined,
                ...(picked.dailySewage.trim()
                  ? { dailySewage: picked.dailySewage.trim() }
                  : {}),
              };
              return withSewageQty(next);
            }),
          };
        }),
      );
    },
    [],
  );

  return {
    entries,
    calcBusyEntryId,
    removedDetailSeqsRef,
    removedCalcsRef,
    handleAddEntry,
    handleAddDetailLine,
    handleRemoveEntry,
    handleRemoveDetailLine,
    handleEntryFieldChange,
    handleCalculateEntry,
    applyUsageFromLookup,
  };
}
