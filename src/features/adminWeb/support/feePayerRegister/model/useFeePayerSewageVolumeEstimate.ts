import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  computeLineSewageQty,
  getSewageCalcModeForLine,
} from "@/features/adminWeb/support/lib/sewageVolumeCalc";

/** 층수~삭제 한 줄(통지일 블록 당 1..n행) */
export type SewageDetailLine = {
  id: string;
  floor: string;
  usage: string;
  area: string;
  dailySewage: string;
  /** WAT002 소분류 code(용도조회 `gubun2`) — 오수량 식 분기 우선 */
  buildingUseSubCode: string;
  /** 용도조회 분류 상위 라벨(예: 주거시설) — 표시·레거시 보조 */
  midCategoryLabel: string;
  /** 단독·공동(다중) 산정용 방수 */
  roomCount: string;
  /** 공동주택 산정용 세대수 */
  householdCount: string;
  /** 층수·용도 행 옆 표시용 오수량(계산 결과) */
  sewageQty: string;
  selected: boolean;
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
  /** 오수부과량 (백엔드 필드명 확정 시 맞출 것) */
  sewageLevyAmount: string;
  lines: SewageDetailLine[];
};

/** `<input type="date">`용 로컬 당일 `YYYY-MM-DD` */
function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const merged: SewageDetailLine = {
    ...l,
    buildingUseSubCode: l.buildingUseSubCode ?? "",
    midCategoryLabel: l.midCategoryLabel ?? "",
    roomCount: l.roomCount ?? "",
    householdCount: l.householdCount ?? "",
  };
  return withSewageQty(merged);
}

function normalizeEntry(e: SewageEstimateEntry): SewageEstimateEntry {
  return { ...e, lines: e.lines.map(normalizeDetailLine) };
}

function initialEntriesOrDefault(
  initial?: SewageEstimateEntry[],
): SewageEstimateEntry[] {
  if (initial && initial.length > 0) return initial.map(normalizeEntry);
  return [createEntry()];
}

/**
 * @param initialEntries 상세 등에서 목 데이터·API 스냅샷으로 채울 때 전달. 미전달 시 등록용 기본 1블록.
 */
export function useFeePayerSewageVolumeEstimate(
  initialEntries?: SewageEstimateEntry[],
) {
  const [entries, setEntries] = useState<SewageEstimateEntry[]>(() =>
    initialEntriesOrDefault(initialEntries),
  );

  useEffect(() => {
    if (initialEntries === undefined) return;
    setEntries(initialEntriesOrDefault(initialEntries));
  }, [initialEntries]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

  const handleAddDetailLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, lines: [...e.lines, createDetailLine()] }
          : e,
      ),
    );
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== entryId);
    });
  }, []);

  /** 층수~삭제 행 제거. 남은 줄이 1이고 이 통지일 블록이 유일이면 항목 삭제는 하지 않음(최소 1줄). */
  const handleRemoveDetailLine = useCallback(
    (entryId: string, lineId: string) => {
      setEntries((prev) => {
        const e = prev.find((x) => x.id === entryId);
        if (!e) return prev;
        if (e.lines.length > 1) {
          return prev.map((x) =>
            x.id === entryId
              ? { ...x, lines: x.lines.filter((l) => l.id !== lineId) }
              : x,
          );
        }
        if (e.lines[0]?.id !== lineId) return prev;
        if (prev.length > 1) {
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
        if (name === "selected" && type === "checkbox") {
          setEntries((prev) =>
            prev.map((en) => {
              if (en.id !== entryId) return en;
              return {
                ...en,
                lines: en.lines.map((L) =>
                  L.id === lineId ? { ...L, selected: checked } : L,
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
          key === "buildingUseSubCode"
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

      if (key === "category") {
        setEntries((prev) =>
          prev.map((row) =>
            row.id === entryId ? { ...row, category: value, type: "" } : row,
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

  /** 용도조회 모달에서 선택한 행 → 해당 상세 줄 `용도`·`1일 오수발생량` 반영 */
  const applyUsageFromLookup = useCallback(
    (
      entryId: string,
      lineId: string,
      picked: {
        buildingUse: string;
        dailySewage: string;
        midCategoryLabel: string;
        gubun2: string;
      },
    ) => {
      const midTrim = (picked.midCategoryLabel ?? "").trim();
      const g2 = (picked.gubun2 ?? "").trim();
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
    handleAddEntry,
    handleAddDetailLine,
    handleRemoveEntry,
    handleRemoveDetailLine,
    handleEntryFieldChange,
    handleCalculateEntry,
    applyUsageFromLookup,
  };
}
