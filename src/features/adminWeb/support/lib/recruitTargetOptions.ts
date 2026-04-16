import { useState, useEffect } from "react";
import { CmmCodeService } from "@/entities/adminWeb/code/api";
import type { DetailCodeItem } from "@/entities/adminWeb/code/api";

/** 사업대상 공통코드 ID (EDR003: 초등/중등/고등/영유아/일반/기타) */
export const RECRUIT_TARGET_CODE_ID = "EDR003";

/**
 * 공부의 명수(온라인튜터링·인생등대) 사업대상에서 제외할 EDR003 대분류 접두.
 * Y=영유아, E=초등학교, O=일반 — 중·고·기타(T)만 선택 가능.
 */
export const GSTUDY_RECRUIT_TARGET_EXCLUDED_PREFIXES: readonly string[] = [
  "Y",
  "E",
  "O",
];

export interface RecruitTargetGroup {
  groupLabel: string;
  values: string[];
  labels: string[];
}

export interface RecruitTargetOtherItem {
  value: string;
  label: string;
}

/**
 * EDR003 소분류 코드 목록을 그룹별로 분류
 * E* → 초등학교, J* → 중학교, H* → 고등학교, Y* → 영유아, O* → 일반, T* → 기타
 */
export function groupRecruitTargetOptions(
  items: DetailCodeItem[],
  opts?: { excludeGroupPrefixes?: readonly string[] },
): {
  targetGroups: RecruitTargetGroup[];
  otherItems: RecruitTargetOtherItem[];
} {
  const excluded = new Set(
    (opts?.excludeGroupPrefixes ?? []).map((p) => p.toUpperCase()),
  );
  const groupConfig: { prefix: string; groupLabel: string }[] = [
    { prefix: "Y", groupLabel: "영유아" },
    { prefix: "E", groupLabel: "초등학교" },
    { prefix: "J", groupLabel: "중학교" },
    { prefix: "H", groupLabel: "고등학교" },
    { prefix: "O", groupLabel: "일반" },
  ].filter(({ prefix }) => !excluded.has(prefix.toUpperCase()));

  const targetGroups: RecruitTargetGroup[] = groupConfig
    .map(({ prefix, groupLabel }) => {
      const groupItems = items.filter(
        (item) => item.code && item.code.toUpperCase().startsWith(prefix),
      );
      return {
        groupLabel,
        values: groupItems.map((item) => item.code),
        labels: groupItems.map((item) => item.codeNm || item.code),
      };
    })
    .filter((g) => g.values.length > 0);

  const otherItems: RecruitTargetOtherItem[] = items
    .filter((item) => item.code && item.code.toUpperCase().startsWith("T"))
    .map((item) => ({ value: item.code, label: item.codeNm || item.code }));

  return { targetGroups, otherItems };
}

export interface UseRecruitTargetOptionsParams {
  /** EDR003 대분류 접두(Y,E,J,H,O) — 해당 그룹은 목록에서 제외 */
  excludeGroupPrefixes?: readonly string[];
}

export interface UseRecruitTargetOptionsResult {
  targetGroups: RecruitTargetGroup[];
  otherItems: RecruitTargetOtherItem[];
  loading: boolean;
  error: string;
}

/** 사업대상 옵션 조회 훅 (EDR003 API 호출 후 그룹핑) */
export function useRecruitTargetOptions(
  params?: UseRecruitTargetOptionsParams,
): UseRecruitTargetOptionsResult {
  const [targetGroups, setTargetGroups] = useState<RecruitTargetGroup[]>([]);
  const [otherItems, setOtherItems] = useState<RecruitTargetOtherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const excludeDep =
    params?.excludeGroupPrefixes === undefined
      ? ""
      : [...params.excludeGroupPrefixes].sort().join(",");

  useEffect(() => {
    let cancelled = false;

    async function fetchOptions() {
      setLoading(true);
      setError("");
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId(
          RECRUIT_TARGET_CODE_ID,
        );
        if (cancelled) return;
        const { targetGroups: groups, otherItems: others } =
          groupRecruitTargetOptions(list, {
            excludeGroupPrefixes: params?.excludeGroupPrefixes,
          });
        setTargetGroups(groups);
        setOtherItems(others);
      } catch (err) {
        if (!cancelled) {
          console.error("사업대상 코드 조회 실패:", err);
          setError("사업대상 목록을 불러오지 못했습니다.");
          setTargetGroups([]);
          setOtherItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [excludeDep]);

  return { targetGroups, otherItems, loading, error };
}
