/**
 * 멘토 공부의 명수(proGb 08) 신청 — 희망과목·희망시간대 API 코드 직렬화.
 * 규칙은 BizInputGstudySection과 동일(PRO_TARGET·보조 schoolGb).
 */

const GSTUDY_APPLY_SUBJECT_VALUES = [
  "korean",
  "english",
  "math",
  "social",
  "science",
] as const;

export type GstudyMentorApplySubject =
  | ""
  | (typeof GSTUDY_APPLY_SUBJECT_VALUES)[number];

const GSTUDY_MIDDLE_REQ_SUB_BY_SUBJECT: Record<
  "korean" | "english" | "math" | "social" | "science",
  string
> = {
  korean: "0101",
  english: "0102",
  math: "0103",
  social: "0104",
  science: "0105",
};

const GSTUDY_HIGH_REQ_SUB_BY_SUBJECT: Record<
  "korean" | "english" | "math" | "social" | "science",
  string
> = {
  korean: "0201",
  english: "0202",
  math: "0203",
  social: "0204",
  science: "0205",
};

const GSTUDY_PRO_TARGET_MIDDLE_CODES = new Set(["J1", "J2", "J3"]);
const GSTUDY_PRO_TARGET_HIGH_CODES = new Set(["H1", "H2", "H3"]);

function gstudyProTargetTokens(proTarget: string): string[] {
  return String(proTarget ?? "")
    .split(/[|,]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

export function isGstudyMiddleSchoolReqSubMapping(
  proTarget: string,
  schoolGb: string,
): boolean {
  const tokens = gstudyProTargetTokens(proTarget);
  const hasMiddle = tokens.some((t) => GSTUDY_PRO_TARGET_MIDDLE_CODES.has(t));
  const hasHigh = tokens.some((t) => GSTUDY_PRO_TARGET_HIGH_CODES.has(t));
  if (hasMiddle && !hasHigh) return true;
  if (hasHigh && !hasMiddle) return false;
  return String(schoolGb ?? "").trim().toUpperCase() === "J";
}

export function gstudyMentorApplySubjectRadioOptions(
  proTarget: string,
  schoolGb: string,
): { value: Exclude<GstudyMentorApplySubject, "">; label: string }[] {
  const isMiddle = isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb);
  return [
    { value: "korean", label: "국어" },
    { value: "english", label: "영어" },
    { value: "math", label: "수학" },
    { value: "social", label: isMiddle ? "사회" : "공통사회" },
    { value: "science", label: isMiddle ? "과학" : "공통과학" },
  ];
}

export function serializeGstudyMentorApplySubjectForApi(
  subject: GstudyMentorApplySubject,
  proTarget: string,
  schoolGb: string,
): string {
  if (!subject) return "";
  const key = subject as keyof typeof GSTUDY_MIDDLE_REQ_SUB_BY_SUBJECT;
  if (isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb)) {
    return GSTUDY_MIDDLE_REQ_SUB_BY_SUBJECT[key] ?? "";
  }
  return GSTUDY_HIGH_REQ_SUB_BY_SUBJECT[key] ?? "";
}

export const GSTUDY_MENTOR_HOPE_TIME_OPTIONS = [
  { value: "weekday_pm" as const, label: "평일 오후(16~18시)" },
  { value: "weekday_ev" as const, label: "평일 저녁(18~22시)" },
  { value: "weekend_am" as const, label: "주말 오전(09~13시)" },
  { value: "weekend_pm" as const, label: "주말 오후(14~18시)" },
  { value: "weekend_ev" as const, label: "주말 저녁(18~22시)" },
];

export type GstudyMentorHopeTimeCode =
  (typeof GSTUDY_MENTOR_HOPE_TIME_OPTIONS)[number]["value"];

const HOPE_TIME_CODE_ORDER = GSTUDY_MENTOR_HOPE_TIME_OPTIONS.map((o) => o.value);

const GSTUDY_MIDDLE_JOIN_TIME_BY_HOPE: Record<GstudyMentorHopeTimeCode, string> =
  {
    weekday_pm: "0301",
    weekday_ev: "0302",
    weekend_am: "0303",
    weekend_pm: "0304",
    weekend_ev: "0305",
  };

const GSTUDY_HIGH_JOIN_TIME_BY_HOPE: Record<GstudyMentorHopeTimeCode, string> = {
  weekday_pm: "0401",
  weekday_ev: "0402",
  weekend_am: "0403",
  weekend_pm: "0404",
  weekend_ev: "0405",
};

export function serializeGstudyMentorHopeTimeForApi(
  parts: readonly GstudyMentorHopeTimeCode[],
  proTarget: string,
  schoolGb: string,
): string {
  const byHope = isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb)
    ? GSTUDY_MIDDLE_JOIN_TIME_BY_HOPE
    : GSTUDY_HIGH_JOIN_TIME_BY_HOPE;
  const set = new Set(parts);
  return HOPE_TIME_CODE_ORDER.filter((c) => set.has(c))
    .map((c) => byHope[c as GstudyMentorHopeTimeCode])
    .join("|");
}

/** DB REQ_SUB 4자(복수 시 첫 코드) → 라디오 값 */
const REQ_SUB_CODE_TO_SUBJECT: Record<string, GstudyMentorApplySubject> = {
  "0101": "korean",
  "0102": "english",
  "0103": "math",
  "0104": "social",
  "0105": "science",
  "0201": "korean",
  "0202": "english",
  "0203": "math",
  "0204": "social",
  "0205": "science",
};

export function parseGstudyMentorApplySubjectFromApi(
  reqSub: string,
): GstudyMentorApplySubject {
  const raw = String(reqSub ?? "").trim();
  if (!raw) return "";
  const code = raw.split(/[|]/)[0]?.trim() ?? "";
  return REQ_SUB_CODE_TO_SUBJECT[code] ?? "";
}

const MIDDLE_JOIN_CODE_TO_HOPE: Record<string, GstudyMentorHopeTimeCode> = {
  "0301": "weekday_pm",
  "0302": "weekday_ev",
  "0303": "weekend_am",
  "0304": "weekend_pm",
  "0305": "weekend_ev",
};

const HIGH_JOIN_CODE_TO_HOPE: Record<string, GstudyMentorHopeTimeCode> = {
  "0401": "weekday_pm",
  "0402": "weekday_ev",
  "0403": "weekend_am",
  "0404": "weekend_pm",
  "0405": "weekend_ev",
};

/**
 * API joinTime(0301|0302 또는 0401|…) → 체크박스 값.
 * 코드 접두(03/04)로 중·고를 먼저 판별하고, 혼재 시에는 proTarget·schoolGb 규칙을 따른다.
 */
export function parseGstudyMentorHopeTimeFromApi(
  joinTime: string,
  proTarget: string,
  schoolGb: string,
): GstudyMentorHopeTimeCode[] {
  const parts = String(joinTime ?? "")
    .split(/[|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  const has03 = parts.some((p) => p.startsWith("03"));
  const has04 = parts.some((p) => p.startsWith("04"));
  let useMiddle: boolean;
  if (has03 && !has04) useMiddle = true;
  else if (has04 && !has03) useMiddle = false;
  else useMiddle = isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb);
  const map = useMiddle ? MIDDLE_JOIN_CODE_TO_HOPE : HIGH_JOIN_CODE_TO_HOPE;
  const picked = new Set<GstudyMentorHopeTimeCode>();
  for (const p of parts) {
    const h = map[p];
    if (h) picked.add(h);
  }
  return HOPE_TIME_CODE_ORDER.filter((c) => picked.has(c));
}
