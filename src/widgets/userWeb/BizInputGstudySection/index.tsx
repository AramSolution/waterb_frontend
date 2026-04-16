"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import type { ArmchilChildDTO } from "@/entities/userWeb/armchil/api";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";

const ICON = "/images/userWeb/icon";

/** 확장자 → biz.css .file.* 아이콘 클래스 */
function getFileTypeClass(filename: string): string {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "img";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "";
}

function GstudyRadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  labelledBy,
  wide = true,
  firstInputId,
  disabled = false,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  labelledBy?: string;
  wide?: boolean;
  /** 첫 번째 라디오에 id 부여 시 AlertModal 확인 후 포커스 이동용 */
  firstInputId?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="householdRadioWrap"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {options.map((opt, i) => (
        <label key={opt.value} className="customItem">
          <input
            type="radio"
            id={i === 0 && firstInputId ? firstInputId : undefined}
            name={name}
            className="customInput"
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => {
              if (!disabled) onChange(opt.value);
            }}
          />
          <div className={`customBox${wide ? " widePill" : ""}`.trim()}>
            <span className="customIcon" aria-hidden="true" />
            <span className="customText">{opt.label}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

function GstudyMultiCheckboxGroup<T extends string>({
  name,
  selected,
  onToggle,
  options,
  labelledBy,
  wide = true,
  firstInputId,
  disabled = false,
}: {
  name: string;
  selected: readonly T[];
  onToggle: (value: T, checked: boolean) => void;
  options: { value: T; label: string }[];
  labelledBy?: string;
  wide?: boolean;
  firstInputId?: string;
  disabled?: boolean;
}) {
  const sel = new Set(selected);
  return (
    <div
      className="householdRadioWrap"
      role="group"
      aria-labelledby={labelledBy}
    >
      {options.map((opt, i) => (
        <label key={opt.value} className="customItem">
          <input
            type="checkbox"
            id={i === 0 && firstInputId ? firstInputId : undefined}
            name={name}
            className="customInput"
            value={opt.value}
            checked={sel.has(opt.value)}
            disabled={disabled}
            onChange={(e) => {
              if (!disabled) onToggle(opt.value, e.target.checked);
            }}
          />
          <div className={`customBox${wide ? " widePill" : ""}`.trim()}>
            <span className="customIcon" aria-hidden="true" />
            <span className="customText">{opt.label}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

/** 가구·지원 구분 — ARTAPPS.PRO_GBN 코드 (01~06, 서버·DB와 동일) */
export type GstudyHouseholdCategory =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06";

const GSTUDY_HOUSEHOLD_CODES = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
] as const satisfies readonly GstudyHouseholdCategory[];

/** 과거 잘못 저장된 영문 값 → PRO_GBN 코드 (MY PAGE 로드 호환) */
const LEGACY_HOUSEHOLD_TO_PRO_GBN: Record<string, GstudyHouseholdCategory> = {
  basic: "01",
  legal: "02",
  multiChild: "03",
  multiCulture: "04",
  normal: "05",
  other: "06",
};

function normalizeGstudyHouseholdFromApi(raw: unknown): GstudyHouseholdCategory {
  const s = String(raw ?? "").trim();
  if ((GSTUDY_HOUSEHOLD_CODES as readonly string[]).includes(s))
    return s as GstudyHouseholdCategory;
  const legacy = LEGACY_HOUSEHOLD_TO_PRO_GBN[s];
  if (legacy) return legacy;
  return "05";
}

function armuserYnIsYes(raw: unknown): boolean {
  return String(raw ?? "").trim().toUpperCase() === "Y";
}

/** ARMUSER basicYn / poorYn → 가구 구분(신규 신청 로드 시). 기초 우선, 다자녀·다문화·기타는 자동 매핑 없음. */
function gstudyHouseholdFromArmuserLowIncome(
  u: Record<string, unknown>,
): GstudyHouseholdCategory {
  if (armuserYnIsYes(u.basicYn)) return "01";
  if (armuserYnIsYes(u.poorYn)) return "02";
  return "05";
}

const HOUSEHOLD_OPTIONS: {
  value: GstudyHouseholdCategory;
  label: string;
}[] = [
  { value: "01", label: "기초생활수급자" },
  { value: "02", label: "법적차상위계층" },
  { value: "03", label: "다자녀가정" },
  { value: "04", label: "다문화가정" },
  { value: "05", label: "일반" },
];

export interface BizInputGstudySectionProps {
  proId?: string;
  fromMypage?: boolean;
  reqEsntlId?: string;
  /** MY PAGE 신청현황 → 상세: REQ_ID로 artappm by-req-id 조회 */
  reqId?: string;
}

/** API·DB 값 → 폼 선택값 (허용 목록에 없으면 미선택) */
function pickGstudyCode<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): T | "" {
  const s = String(raw ?? "").trim();
  return (allowed as readonly string[]).includes(s) ? (s as T) : "";
}

type GstudyExistingFile = { fileId: string; seq: number; orgfNm?: string };

/** MY PAGE PUT /by-req-id 시 서버가 기대하는 PK·파일 참조 */
type GstudyMypageMeta = {
  proSeq: string;
  cEsntlId: string;
  pEsntlId: string;
  reqEsntlId: string;
  fileId: string;
};

function digitsOnly(s: string): string {
  return String(s ?? "").replace(/\D/g, "");
}

/** 생년월일 → date input 값 (yyyy-MM-dd) */
function formatBrthdyForDateInput(raw: string | undefined): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 8)
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return "";
}

const GSTUDY_APPLY_SUBJECT_VALUES = [
  "korean",
  "english",
  "math",
  "social",
  "science",
] as const;

/** 중등 매핑 시 신청과목 REQ_SUB — DB `char(4)`, EDR006 국어 0101 ~ 과학 0105 (PRO_TARGET·보조 SCHOOL_GB로 결정) */
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

const GSTUDY_MIDDLE_REQ_SUB_TO_SUBJECT: Record<
  string,
  "korean" | "english" | "math" | "social" | "science"
> = {
  "0101": "korean",
  "0102": "english",
  "0103": "math", 
  "0104": "social",
  "0105": "science",
};

/** 고등(H) 및 중학 외: REQ_SUB 국어 0201, 영어 0202, 수학 0203, 공통사회 0204, 공통과학 0205 */
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

const GSTUDY_HIGH_REQ_SUB_TO_SUBJECT: Record<
  string,
  "korean" | "english" | "math" | "social" | "science"
> = {
  "0201": "korean",
  "0202": "english",
  "0203": "math",
  "0204": "social",
  "0205": "science",
};

const GSTUDY_PRO_TARGET_MIDDLE_CODES = new Set(["J1", "J2", "J3"]);
const GSTUDY_PRO_TARGET_HIGH_CODES = new Set(["H1", "H2", "H3"]);

function gstudyProTargetTokens(proTarget: string): string[] {
  return String(proTarget ?? "")
    .split(/[|,]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * ARTPROM.PRO_TARGET(사업 등록 모집대상, 예: J1|J2|H1)으로 신청과목 REQ_SUB(01/02)·희망시간 JOIN_TIME(03/04) 구분.
 * 중등 코드만 → 01xx·03xx, 고등 코드만 → 02xx·04xx, 중·고 혼합·둘 다 없음 → SCHOOL_GB `J`면 중등 매핑.
 */
function isGstudyMiddleSchoolReqSubMapping(
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

/** 신청과목 라디오 라벨: 중등 매핑이면 사회·과학, 고등 매핑이면 공통사회·공통과학 */
function gstudyApplySubjectRadioOptions(
  proTarget: string,
  schoolGb: string,
): {
  value: (typeof GSTUDY_APPLY_SUBJECT_VALUES)[number];
  label: string;
}[] {
  const isMiddle = isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb);
  return [
    { value: "korean", label: "국어" },
    { value: "english", label: "영어" },
    { value: "math", label: "수학" },
    { value: "social", label: isMiddle ? "사회" : "공통사회" },
    { value: "science", label: isMiddle ? "과학" : "공통과학" },
  ];
}

/** MY PAGE/공고 저장 시 ARTAPPS.REQ_SUB: PRO_TARGET 기준 01xx/02xx + 보조 SCHOOL_GB (컬럼 char(4); 영문 금지) */
function serializeGstudyApplySubjectForApi(
  subject: GstudyApplySubject,
  proTarget: string,
  schoolGb: string,
): string {
  if (!subject) return "";
  const key = subject as keyof typeof GSTUDY_MIDDLE_REQ_SUB_BY_SUBJECT;
  if (isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb)) {
    const code = GSTUDY_MIDDLE_REQ_SUB_BY_SUBJECT[key];
    if (code) return code;
  } else {
    const code = GSTUDY_HIGH_REQ_SUB_BY_SUBJECT[key];
    if (code) return code;
  }
  return subject;
}

/** by-req-id 등 조회값 → 폼 신청과목: 공통코드 우선, 레거시 영문 키 호환 */
function normalizeGstudyApplySubjectFromApi(
  raw: unknown,
  proTarget: string,
  schoolGb: string,
): GstudyApplySubject {
  const s = String(raw ?? "").trim();
  if (isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb)) {
    const fromCode = GSTUDY_MIDDLE_REQ_SUB_TO_SUBJECT[s];
    if (fromCode) return fromCode;
  } else {
    const fromCode = GSTUDY_HIGH_REQ_SUB_TO_SUBJECT[s];
    if (fromCode) return fromCode;
  }
  return pickGstudyCode(raw, [
    "korean",
    "english",
    "math",
    "social",
    "science",
  ] as const);
}

/**
 * EDR006 `JOIN_CNT` / `BEF_JOIN`: 중학(J)·고등(H) 공통 (`CmmCodeManage_SQL_mysql` by-category — `08%`, `09%`).
 * `REQ_SUB`·희망시간(`JOIN_TIME`)은 `PRO_TARGET`/보조 `SCHOOL_GB`로 01/02·03/04 접두가 갈리지만, 참여횟수·기존참여는 중·고 동일 코드만 사용.
 */
const GSTUDY_JOIN_CNT_BY_FREQ: Record<"w1" | "w2", string> = {
  w1: "0801",
  w2: "0802",
};

const GSTUDY_JOIN_CNT_TO_FREQ: Record<string, "w1" | "w2"> = {
  "0801": "w1",
  "0802": "w2",
};

function serializeGstudyJoinCntForApi(freq: GstudyPartFreq): string {
  if (!freq) return "";
  const code = GSTUDY_JOIN_CNT_BY_FREQ[freq as "w1" | "w2"];
  if (code) return code;
  return freq;
}

function normalizeGstudyJoinCntFromApi(raw: unknown): GstudyPartFreq {
  const s = String(raw ?? "").trim();
  const fromCode = GSTUDY_JOIN_CNT_TO_FREQ[s];
  if (fromCode) return fromCode;
  return pickGstudyCode(raw, ["w1", "w2"] as const);
}

const PART_FREQ_OPTIONS = [
  { value: "w1" as const, label: "주1회" },
  { value: "w2" as const, label: "주2회" },
];

const PRIOR_PART_OPTIONS = [
  { value: "new" as const, label: "신규신청" },
  { value: "y2023" as const, label: "2023참여" },
  { value: "y2024" as const, label: "2024참여" },
  { value: "y2025" as const, label: "2025참여" },
];

const HOPE_TIME_OPTIONS = [
  { value: "weekday_pm" as const, label: "평일 오후(16~18시)" },
  { value: "weekday_ev" as const, label: "평일 저녁(18~22시)" },
  { value: "weekend_am" as const, label: "주말 오전(09~13시)" },
  { value: "weekend_pm" as const, label: "주말 오후(14~18시)" },
  { value: "weekend_ev" as const, label: "주말 저녁(18~22시)" },
];

const PART_REASON_OPTIONS_FULL = [
  { value: "help_class" as const, label: "학교 수업에 도움이 되고자" },
  {
    value: "afterschool" as const,
    label: "방과후 여가 시간을 활용하기 위하여",
  },
  {
    value: "univ_teacher" as const,
    label: "대학생 선생님에게 수업을 받고 싶어서",
  },
  { value: "other" as const, label: "기타" },
];

const EXPECT_EFFECT_OPTIONS_FULL = [
  {
    value: "custom_learn" as const,
    label: "자녀 맞춤형 학습 지도를 통한 학업능력 향상",
  },
  {
    value: "self_habit" as const,
    label: "자기주도 학습지도를 통한 공부습관 형성",
  },
  {
    value: "mentor_consult" as const,
    label: "멘토와의 진로·공부법 고민상담을 통한 멘탈케어",
  },
  { value: "other" as const, label: "기타" },
];

const PARENT_EVAL_OPTIONS = [
  { value: "v_pos" as const, label: "매우 긍정적" },
  { value: "pos" as const, label: "긍정적" },
  { value: "normal" as const, label: "보통" },
  { value: "neg" as const, label: "부정적" },
  { value: "v_neg" as const, label: "매우 부정적" },
];

const AGREE_OPTIONS = [
  { value: "Y" as const, label: "동의" },
  { value: "N" as const, label: "미동의" },
];

type GstudyApplySubject = "" | (typeof GSTUDY_APPLY_SUBJECT_VALUES)[number];
type GstudyPartFreq = "" | (typeof PART_FREQ_OPTIONS)[number]["value"];
type GstudyPriorPartCode = (typeof PRIOR_PART_OPTIONS)[number]["value"];
type GstudyHopeTimeCode = (typeof HOPE_TIME_OPTIONS)[number]["value"];
type GstudyPartReasonCode = (typeof PART_REASON_OPTIONS_FULL)[number]["value"];
type GstudyExpectEffectCode = (typeof EXPECT_EFFECT_OPTIONS_FULL)[number]["value"];
type GstudyParentEval = "" | (typeof PARENT_EVAL_OPTIONS)[number]["value"];
type GstudyAgreeYn = "" | "Y" | "N";

/** 학부모 평가 S_APPR: 옵션 순 0701~0705 — 참여이유·기대효과와 같이 중·고 동일 코드(PRO_TARGET 분기 없음) */
const GSTUDY_S_APPR_BY_EVAL: Record<Exclude<GstudyParentEval, "">, string> = {
  v_pos: "0701",
  pos: "0702",
  normal: "0703",
  neg: "0704",
  v_neg: "0705",
};

const GSTUDY_S_APPR_TO_EVAL: Record<string, Exclude<GstudyParentEval, "">> = {
  "0701": "v_pos",
  "0702": "pos",
  "0703": "normal",
  "0704": "neg",
  "0705": "v_neg",
};

function serializeGstudyParentEvalForApi(value: GstudyParentEval): string {
  if (!value) return "";
  const code = GSTUDY_S_APPR_BY_EVAL[value as Exclude<GstudyParentEval, "">];
  return code ?? value;
}

function normalizeGstudyParentEvalFromApi(raw: unknown): GstudyParentEval {
  const s = String(raw ?? "").trim();
  const fromCode = GSTUDY_S_APPR_TO_EVAL[s];
  if (fromCode) return fromCode;
  return pickGstudyCode(raw, [
    "v_pos",
    "pos",
    "normal",
    "neg",
    "v_neg",
  ] as const);
}

const PRIOR_PART_CODE_ORDER = PRIOR_PART_OPTIONS.map((o) => o.value);

/** `BEF_JOIN`(기존참여): 중·고 공통 `09%` — 신규 0901, 2025 0902, 2024 0903, 2023 0904 */
const GSTUDY_BEF_JOIN_BY_PRIOR: Record<GstudyPriorPartCode, string> = {
  new: "0901",
  y2025: "0902",
  y2024: "0903",
  y2023: "0904",
};

const GSTUDY_BEF_JOIN_TO_PRIOR: Record<string, GstudyPriorPartCode> = {
  "0901": "new",
  "0902": "y2025",
  "0903": "y2024",
  "0904": "y2023",
};

function serializeGstudyBefJoinForApi(
  parts: readonly GstudyPriorPartCode[],
): string {
  const set = new Set(parts);
  return PRIOR_PART_CODE_ORDER.filter((c) => set.has(c))
    .map((c) => GSTUDY_BEF_JOIN_BY_PRIOR[c as GstudyPriorPartCode])
    .join("|");
}

function parseGstudyBefJoinFromApi(raw: unknown): GstudyPriorPartCode[] {
  const allowed = new Set<string>(PRIOR_PART_CODE_ORDER);
  const normalized = new Set<GstudyPriorPartCode>();
  for (const token of parseGstudyMultiCodesStored(raw)) {
    const mapped = GSTUDY_BEF_JOIN_TO_PRIOR[token];
    if (mapped) normalized.add(mapped);
    else if (allowed.has(token))
      normalized.add(token as GstudyPriorPartCode);
  }
  return PRIOR_PART_CODE_ORDER.filter((c): c is GstudyPriorPartCode =>
    normalized.has(c as GstudyPriorPartCode),
  );
}

const HOPE_TIME_CODE_ORDER = HOPE_TIME_OPTIONS.map((o) => o.value);

/** 희망시간 `JOIN_TIME`: 중등 매핑 0301~0305, 고등 매핑 0401~0405(슬롯 순서 동일) */
const GSTUDY_MIDDLE_JOIN_TIME_BY_HOPE: Record<GstudyHopeTimeCode, string> = {
  weekday_pm: "0301",
  weekday_ev: "0302",
  weekend_am: "0303",
  weekend_pm: "0304",
  weekend_ev: "0305",
};

const GSTUDY_HIGH_JOIN_TIME_BY_HOPE: Record<GstudyHopeTimeCode, string> = {
  weekday_pm: "0401",
  weekday_ev: "0402",
  weekend_am: "0403",
  weekend_pm: "0404",
  weekend_ev: "0405",
};

/** API·DB 토큰 → 폼 체크박스값(030x·040x 모두 동일 UI) */
const GSTUDY_JOIN_TIME_TO_HOPE: Record<string, GstudyHopeTimeCode> = {
  "0301": "weekday_pm",
  "0302": "weekday_ev",
  "0303": "weekend_am",
  "0304": "weekend_pm",
  "0305": "weekend_ev",
  "0401": "weekday_pm",
  "0402": "weekday_ev",
  "0403": "weekend_am",
  "0404": "weekend_pm",
  "0405": "weekend_ev",
};

function serializeGstudyHopeTimeForApi(
  parts: readonly GstudyHopeTimeCode[],
  proTarget: string,
  schoolGb: string,
): string {
  const byHope = isGstudyMiddleSchoolReqSubMapping(proTarget, schoolGb)
    ? GSTUDY_MIDDLE_JOIN_TIME_BY_HOPE
    : GSTUDY_HIGH_JOIN_TIME_BY_HOPE;
  const set = new Set(parts);
  return HOPE_TIME_CODE_ORDER.filter((c) => set.has(c))
    .map((c) => byHope[c as GstudyHopeTimeCode])
    .join("|");
}

function parseGstudyHopeTimeFromApi(raw: unknown): GstudyHopeTimeCode[] {
  const allowed = new Set<string>(HOPE_TIME_CODE_ORDER);
  const normalized = new Set<GstudyHopeTimeCode>();
  for (const token of parseGstudyMultiCodesStored(raw)) {
    const mapped = GSTUDY_JOIN_TIME_TO_HOPE[token];
    if (mapped) normalized.add(mapped);
    else if (allowed.has(token))
      normalized.add(token as GstudyHopeTimeCode);
  }
  return HOPE_TIME_CODE_ORDER.filter((c): c is GstudyHopeTimeCode =>
    normalized.has(c as GstudyHopeTimeCode),
  );
}

const PART_REASON_CODE_ORDER = PART_REASON_OPTIONS_FULL.map((o) => o.value);

/** 참여이유 S_REASON: 옵션 순 0501~0504 — 고등 신청도 중학과 동일(PRO_TARGET·SCHOOL_GB로 접두 변경 없음) */
const GSTUDY_S_REASON_BY_REASON: Record<GstudyPartReasonCode, string> = {
  help_class: "0501",
  afterschool: "0502",
  univ_teacher: "0503",
  other: "0504",
};

const GSTUDY_S_REASON_TO_REASON: Record<string, GstudyPartReasonCode> = {
  "0501": "help_class",
  "0502": "afterschool",
  "0503": "univ_teacher",
  "0504": "other",
};

function serializeGstudyPartReasonForApi(
  parts: readonly GstudyPartReasonCode[],
): string {
  const set = new Set(parts);
  return PART_REASON_CODE_ORDER.filter((c) => set.has(c))
    .map((c) => GSTUDY_S_REASON_BY_REASON[c as GstudyPartReasonCode])
    .join("|");
}

const EXPECT_EFFECT_CODE_ORDER = EXPECT_EFFECT_OPTIONS_FULL.map((o) => o.value);

/** 기대효과 S_EXPECT: 옵션 순 0601~0604 — 고등 신청도 중학과 동일(PRO_TARGET·SCHOOL_GB로 접두 변경 없음) */
const GSTUDY_S_EXPECT_BY_EFFECT: Record<GstudyExpectEffectCode, string> = {
  custom_learn: "0601",
  self_habit: "0602",
  mentor_consult: "0603",
  other: "0604",
};

const GSTUDY_S_EXPECT_TO_EFFECT: Record<string, GstudyExpectEffectCode> = {
  "0601": "custom_learn",
  "0602": "self_habit",
  "0603": "mentor_consult",
  "0604": "other",
};

function serializeGstudyExpectEffectForApi(
  parts: readonly GstudyExpectEffectCode[],
): string {
  const set = new Set(parts);
  return EXPECT_EFFECT_CODE_ORDER.filter((c) => set.has(c))
    .map((c) => GSTUDY_S_EXPECT_BY_EFFECT[c as GstudyExpectEffectCode])
    .join("|");
}

/** 관리자 공부의명수 폼과 동일: `|` 구분 저장, 조회 시 `,`도 허용 */
function parseGstudyMultiCodesStored(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

function parseGstudyPartReasonFromApi(raw: unknown): GstudyPartReasonCode[] {
  const allowed = new Set<string>(PART_REASON_CODE_ORDER);
  const normalized = new Set<GstudyPartReasonCode>();
  for (const token of parseGstudyMultiCodesStored(raw)) {
    const mapped = GSTUDY_S_REASON_TO_REASON[token];
    if (mapped) normalized.add(mapped);
    else if (allowed.has(token))
      normalized.add(token as GstudyPartReasonCode);
  }
  return PART_REASON_CODE_ORDER.filter((c): c is GstudyPartReasonCode =>
    normalized.has(c as GstudyPartReasonCode),
  );
} 

function parseGstudyExpectEffectFromApi(raw: unknown): GstudyExpectEffectCode[] {
  const allowed = new Set<string>(EXPECT_EFFECT_CODE_ORDER);
  const normalized = new Set<GstudyExpectEffectCode>();
  for (const token of parseGstudyMultiCodesStored(raw)) {
    const mapped = GSTUDY_S_EXPECT_TO_EFFECT[token];
    if (mapped) normalized.add(mapped);
    else if (allowed.has(token))
      normalized.add(token as GstudyExpectEffectCode);
  }
  return EXPECT_EFFECT_CODE_ORDER.filter((c): c is GstudyExpectEffectCode =>
    normalized.has(c as GstudyExpectEffectCode),
  );
}

function serializeGstudyMultiCodes(
  codes: readonly string[],
  canonicalOrder: readonly string[],
): string {
  const set = new Set(codes);   
  return canonicalOrder.filter((c) => set.has(c)).join("|");
}

function pickGstudyAgreeYn(raw: unknown): GstudyAgreeYn {
  const s = String(raw ?? "").trim().toUpperCase();
  return s === "Y" || s === "N" ? s : "";
}

/**
 * 공부의 명수 신청 화면 — bizInput 학생·보호자·학교 표시 방식과 동일
 */
const BizInputGstudySection: React.FC<BizInputGstudySectionProps> = ({
  proId,
  fromMypage,
  reqEsntlId,
  reqId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [loadError, setLoadError] = useState<string | null>(null);

  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianBirth, setGuardianBirth] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"M" | "F">("M");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentBirth, setStudentBirth] = useState("");
  const [studentZip, setStudentZip] = useState("");
  const [studentAdres, setStudentAdres] = useState("");
  const [studentDetailAdres, setStudentDetailAdres] = useState("");

  const [household, setHousehold] = useState<GstudyHouseholdCategory>("05");
  const [householdOtherText, setHouseholdOtherText] = useState("");

  const [schoolNm, setSchoolNm] = useState("");
  const [schoolLvl, setSchoolLvl] = useState("");
  const [schoolNo, setSchoolNo] = useState("");
  /** ARTAPPM.SCHOOL_GB — PRO_TARGET만으로 중·고 구분 불가할 때 REQ_SUB 매핑 보조 */
  const [schoolGb, setSchoolGb] = useState("");
  /** ARTPROM.PRO_TARGET(사업 등록 모집대상) — 신청과목 01xx/02xx 매핑 1순위 */
  const [gstudyArtpromProTarget, setGstudyArtpromProTarget] = useState("");
  /** ARTPROM.PRO_GB — 공부의 명수 온라인튜터링(08)·인생등대(09) 구분, 저장 시 insert/update에 전달 */
  const [gstudyArtpromProGb, setGstudyArtpromProGb] = useState<"08" | "09">(
    "08",
  );

  /** 신청정보 — 라디오·동의는 초기 미선택(디폴트 없음) */
  const [applySubject, setApplySubject] = useState<GstudyApplySubject>("");
  const [partFreq, setPartFreq] = useState<GstudyPartFreq>("");
  const [priorParts, setPriorParts] = useState<GstudyPriorPartCode[]>([]);
  const [hopeTimes, setHopeTimes] = useState<GstudyHopeTimeCode[]>([]);
  const [studyUnderstanding, setStudyUnderstanding] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [studyTrait, setStudyTrait] = useState("");
  const [partReasons, setPartReasons] = useState<GstudyPartReasonCode[]>([]);
  const [expectEffects, setExpectEffects] = useState<GstudyExpectEffectCode[]>(
    [],
  );
  const [parentEval, setParentEval] = useState<GstudyParentEval>("");
  const [opinion, setOpinion] = useState("");
  const [agreeUse, setAgreeUse] = useState<GstudyAgreeYn>("");
  const [agreeProvide, setAgreeProvide] = useState<GstudyAgreeYn>("");
  const [agreeNotice, setAgreeNotice] = useState<GstudyAgreeYn>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; file: File }[]
  >([]);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const focusAfterAlertRef = useRef<string | null>(null);

  const [loadedSttusCode, setLoadedSttusCode] = useState("");
  const [mypageDetailReady, setMypageDetailReady] = useState(true);
  const [existingFiles, setExistingFiles] = useState<GstudyExistingFile[]>([]);
  const [mypageMeta, setMypageMeta] = useState<GstudyMypageMeta | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const afterGstudyAlertRef = useRef<(() => void) | null>(null);
  /** 공고 신청: ARTAPPM.C_ESNTL_ID(학생·자녀). 학부모=선택 자녀, 학생 본인=로그인 ID */
  const [gstudyStudentEsntlId, setGstudyStudentEsntlId] = useState("");
  /** 학생(SNR) 신청 시 매칭 보호자 esntlId — 저장 시 pEsntlId. REQ_ESNTL_ID는 로그인(신청)자 */
  const [gstudyLinkedParentEsntlId, setGstudyLinkedParentEsntlId] =
    useState("");
  const gstudySnParentAlertShownRef = useRef(false);
  /** 학부모(PNR): 자녀 목록 — 콤보박스 옵션 (BizInputSection 학생명 select와 동일) */
  const [gstudyParentChildren, setGstudyParentChildren] = useState<
    ArmchilChildDTO[]
  >([]);

  const needsMypageDetail = Boolean(fromMypage && reqId?.trim());
  /** MY PAGE(reqId): 임시저장(01)만 수정·저장 가능. 그 외·로딩 중에는 버튼 비활성 */
  const canSaveOrApply =
    !needsMypageDetail || (mypageDetailReady && loadedSttusCode === "01");
  const formFieldsLocked =
    needsMypageDetail &&
    (!mypageDetailReady || loadedSttusCode !== "01");

  const applyGstudyStudentProfileFromArmuser = useCallback(
    (u: Record<string, unknown>) => {
      setStudentName(String(u.userNm ?? ""));
      setStudentPhone(formatPhoneWithHyphen(String(u.mbtlnum ?? "")));
      setStudentBirth(formatBrthdyForDateInput(String(u.brthdy ?? "")));
      setStudentGender((u.sexdstnCode as string) === "F" ? "F" : "M");
      setStudentZip(String(u.zip ?? ""));
      setStudentAdres(String(u.adres ?? ""));
      setStudentDetailAdres(String(u.detailAdres ?? ""));
      setSchoolNm(String(u.schoolNm ?? ""));
      setSchoolLvl(
        u.schoolLvl != null && u.schoolLvl !== ""
          ? String(u.schoolLvl)
          : "",
      );
      setSchoolNo(
        u.schoolNo != null && u.schoolNo !== "" ? String(u.schoolNo) : "",
      );
      setSchoolGb(String(u.schoolGb ?? "").trim());
      setHousehold(gstudyHouseholdFromArmuserLowIncome(u));
      setHouseholdOtherText("");
    },
    [],
  );

  /** 학부모: 자녀 선택 변경 시 상세 반영 */
  const handleGstudyParentChildChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (formFieldsLocked) return;
    const childId = e.target.value.trim();
    setGstudyStudentEsntlId(childId);
    if (!childId) {
      setStudentName("");
      setStudentPhone("");
      setStudentBirth("");
      setStudentGender("M");
      setStudentZip("");
      setStudentAdres("");
      setStudentDetailAdres("");
      setSchoolNm("");
      setSchoolLvl("");
      setSchoolNo("");
      setSchoolGb("");
      setHousehold("05");
      setHouseholdOtherText("");
      return;
    }
    UserArmuserService.getDetail(childId)
      .then((r) => {
        const u = r.detail as Record<string, unknown> | undefined;
        if (u) applyGstudyStudentProfileFromArmuser(u);
      })
      .catch(() => setLoadError("학생 정보를 불러오지 못했습니다."));
  };

  useEffect(() => {
    const pid = proId?.trim();
    if (!pid) {
      setGstudyArtpromProTarget("");
      setGstudyArtpromProGb("08");
      return;
    }
    let cancelled = false;
    apiClient
      .get<{ detail?: Record<string, unknown> | null }>(
        `${API_ENDPOINTS.USER_ARTPROM.DETAIL}/${encodeURIComponent(pid)}`,
      )
      .then((r) => {
        if (cancelled) return;
        setGstudyArtpromProTarget(
          String(r?.detail?.proTarget ?? "").trim(),
        );
        const pg = String(r?.detail?.proGb ?? "").trim();
        setGstudyArtpromProGb(pg === "09" ? "09" : "08");
      })
      .catch(() => {
        if (!cancelled) {
          setGstudyArtpromProTarget("");
          setGstudyArtpromProGb("08");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [proId]);

  const addressDisplayValue = [
    studentZip && studentAdres ? `(${studentZip}) ${studentAdres}` : "",
    studentDetailAdres,
  ]
    .filter((v) => String(v ?? "").trim() !== "")
    .join(" ");

  const schoolDisplayValue = [
    schoolNm,
    schoolLvl ? `${schoolLvl}학년` : "",
    schoolNo ? `${schoolNo}반` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: `gstudy-pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (!needsMypageDetail) {
      setMypageDetailReady(true);
      setLoadedSttusCode("");
      setExistingFiles([]);
      setMypageMeta(null);
      return;
    }
    setMypageDetailReady(false);
    if (!isAuthenticated || !AuthService.isAuthenticated()) {
      setLoadError("로그인 후 이용해 주세요.");
      setMypageDetailReady(true);
      return;
    }
    const rid = reqId!.trim();
    setLoadError(null);
    apiClient
      .get<{
        detail?: Record<string, unknown>;
        fileList?: { fileId: string | number; seq: number; orgfNm?: string }[];
      }>(API_ENDPOINTS.USER_ARTAPPM.BY_REQ_ID(rid))
      .then(async (res) => {
        const d = res.detail;
        if (!d) {
          setLoadError("신청 내역을 찾을 수 없습니다.");
          setLoadedSttusCode("");
          setExistingFiles([]);
          setMypageMeta(null);
          setMypageDetailReady(true);
          return;
        }
        setLoadError(null);
        const loadedProGb = String(d.proGb ?? "").trim();
        setGstudyArtpromProGb(loadedProGb === "09" ? "09" : "08");
        setLoadedSttusCode(String(d.sttusCode ?? ""));
        setMypageMeta({
          proSeq: String(d.proSeq ?? "0"),
          cEsntlId: String(d.cEsntlId ?? ""),
          pEsntlId: String(d.pEsntlId ?? ""),
          reqEsntlId: String(d.reqEsntlId ?? ""),
          fileId: String(d.fileId ?? ""),
        });
        setGstudyLinkedParentEsntlId(String(d.pEsntlId ?? "").trim());
        setGstudyStudentEsntlId(String(d.cEsntlId ?? "").trim());
        setStudentName(String(d.userNm ?? ""));
        setStudentPhone(formatPhoneWithHyphen(String(d.cMbtlnum ?? "")));
        setStudentBirth(formatBrthdyForDateInput(String(d.cBrthdy ?? "")));
        setStudentGender(
          String(d.cSexdstnCode ?? "").toUpperCase() === "F" ? "F" : "M",
        );
        setGuardianName(String(d.pUserNm ?? ""));
        setGuardianPhone(formatPhoneWithHyphen(String(d.mbtlnum ?? "")));
        setGuardianBirth(formatBrthdyForDateInput(String(d.brthdy ?? "")));
        setGuardianRelation(String(d.relationGbNm ?? "").trim());
        setStudentZip(String(d.zip ?? ""));
        setStudentAdres(String(d.adres ?? ""));
        setStudentDetailAdres(String(d.detailAdres ?? ""));
        setSchoolNm(String(d.schoolNm ?? ""));
        setSchoolLvl(
          d.schoolLvl != null && String(d.schoolLvl) !== ""
            ? String(d.schoolLvl)
            : "",
        );
        setSchoolNo(
          d.schoolNo != null && String(d.schoolNo) !== ""
            ? String(d.schoolNo)
            : "",
        );
        const loadedSchoolGb = String(d.schoolGb ?? "").trim();
        setSchoolGb(loadedSchoolGb);
        setHousehold(normalizeGstudyHouseholdFromApi(d.appsProGbn));
        setHouseholdOtherText(String(d.appsProGbnEtc ?? ""));
        const pid = proId?.trim() || String(d.proId ?? "").trim();
        let loadedProTarget = "";
        if (pid) {
          try {
            const pr = await apiClient.get<{
              detail?: Record<string, unknown> | null;
            }>(
              `${API_ENDPOINTS.USER_ARTPROM.DETAIL}/${encodeURIComponent(pid)}`,
            );
            loadedProTarget = String(pr?.detail?.proTarget ?? "").trim();
          } catch {
            loadedProTarget = "";
          }
        }
        setGstudyArtpromProTarget(loadedProTarget);
        setApplySubject(
          normalizeGstudyApplySubjectFromApi(
            d.appsReqSub,
            loadedProTarget,
            loadedSchoolGb,
          ),
        );
        setPartFreq(normalizeGstudyJoinCntFromApi(d.appsJoinCnt));
        setPriorParts(parseGstudyBefJoinFromApi(d.appsBefJoin));
        setHopeTimes(parseGstudyHopeTimeFromApi(d.appsJoinTime));
        setStudyUnderstanding(String(d.appsSUnder ?? ""));
        setStudyGoal(String(d.appsSTarget ?? ""));
        setStudyTrait(String(d.appsSChar ?? ""));
        setPartReasons(parseGstudyPartReasonFromApi(d.appsSReason));
        setExpectEffects(parseGstudyExpectEffectFromApi(d.appsSExpect));
        setParentEval(normalizeGstudyParentEvalFromApi(d.appsSAppr));
        setOpinion(String(d.appsSComm ?? ""));
        setAgreeUse(pickGstudyAgreeYn(d.appsAgree1Yn));
        setAgreeProvide(pickGstudyAgreeYn(d.appsAgree2Yn));
        setAgreeNotice(pickGstudyAgreeYn(d.appsAgree3Yn));
        setExistingFiles(
          Array.isArray(res.fileList)
            ? res.fileList.map((f) => ({
                fileId: String(f.fileId),
                seq: Number(f.seq),
                orgfNm: f.orgfNm,
              }))
            : [],
        );
        setPendingFiles([]);
        setMypageDetailReady(true);
      })
      .catch((e) => {
        setLoadedSttusCode("");
        setExistingFiles([]);
        setMypageMeta(null);
        if (e instanceof ApiError && e.status === 403) {
          setLoadError("이 신청 내역을 조회할 권한이 없습니다.");
        } else {
          setLoadError("신청 내역을 불러오지 못했습니다.");
        }
        setMypageDetailReady(true);
      });
  }, [needsMypageDetail, reqId, isAuthenticated, proId]);

  /** MY PAGE 학부모: 신청 건의 학생 id는 이미 로드되므로 자녀 목록만 콤보박스용으로 조회 */
  useEffect(() => {
    if (!needsMypageDetail) return;
    if (!isAuthenticated || !AuthService.isAuthenticated()) return;
    if (AuthService.getUserSe() !== "PNR") return;
    apiClient
      .get<{ data?: ArmchilChildDTO[] }>(API_ENDPOINTS.USER_ARMCHIL.CHILDREN)
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setGstudyParentChildren(arr);
      })
      .catch(() => setGstudyParentChildren([]));
  }, [needsMypageDetail, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !AuthService.isAuthenticated()) return;

    const userSe = AuthService.getUserSe();
    const selfId = AuthService.getEsntlId();
    if (!selfId) return;
    if (fromMypage && reqId?.trim()) return;

    setLoadError(null);
    setGstudyStudentEsntlId("");
    setGstudyLinkedParentEsntlId("");
    setGstudyParentChildren([]);

    const applyGuardianFromParentDto = (d: Record<string, unknown>) => {
      setGuardianName(String(d.userNm ?? ""));
      setGuardianPhone(formatPhoneWithHyphen(String(d.mbtlnum ?? "")));
      setGuardianBirth(formatBrthdyForDateInput(String(d.brthdy ?? "")));
      setGuardianRelation("");
    };

    if (userSe === "SNR") {
      UserArmuserService.getDetail(selfId)
        .then((res) => {
          const u = res.detail as Record<string, unknown> | undefined;
          if (u) {
            applyGstudyStudentProfileFromArmuser(u);
            setGstudyStudentEsntlId(selfId);
            setGuardianRelation(
              String(u.relationGbNm ?? u.relationGb ?? "").trim(),
            );
          }
        })
        .catch(() => setLoadError("회원 정보를 불러오지 못했습니다."));

      apiClient
        .get<{ data?: ArmchilChildDTO[] }>(API_ENDPOINTS.USER_ARMCHIL.PARENTS)
        .then((res) => {
          const parents = Array.isArray(res?.data) ? res.data : [];
          const p = parents[0];
          if (p) {
            setGstudyLinkedParentEsntlId(String(p.esntlId ?? "").trim());
            setGuardianName(String(p.userNm ?? ""));
            setGuardianPhone(formatPhoneWithHyphen(String(p.mbtlnum ?? "")));
            setGuardianBirth(formatBrthdyForDateInput(String(p.brthdy ?? "")));
          } else {
            setGstudyLinkedParentEsntlId("");
            if (
              !gstudySnParentAlertShownRef.current &&
              !fromMypage &&
              !reqId?.trim()
            ) {
              gstudySnParentAlertShownRef.current = true;
              showAlert(
                "자녀 연동이 필요합니다",
                "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
                "danger",
              );
            }
          }
        })
        .catch(() => {});
      return;
    }

    if (userSe === "PNR") {
      UserArmuserService.getDetail(selfId)
        .then((res) => {
          const d = res.detail as Record<string, unknown> | undefined;
          if (d) applyGuardianFromParentDto(d);
        })
        .catch(() => setLoadError("보호자 정보를 불러오지 못했습니다."));

      const pickChildThenLoad = (childId: string) => {
        if (!childId) return;
        setGstudyStudentEsntlId(childId);
        UserArmuserService.getDetail(childId)
          .then((r) => {
            const u = r.detail as Record<string, unknown> | undefined;
            if (u) applyGstudyStudentProfileFromArmuser(u);
          })
          .catch(() => setLoadError("학생 정보를 불러오지 못했습니다."));
      };

      apiClient
        .get<{ data?: ArmchilChildDTO[] }>(API_ENDPOINTS.USER_ARMCHIL.CHILDREN)
        .then((res) => {
          const arr = Array.isArray(res?.data) ? res.data : [];
          setGstudyParentChildren(arr);
          if (reqEsntlId) {
            pickChildThenLoad(String(reqEsntlId).trim());
            return;
          }
          const first = arr[0]?.esntlId;
          if (first) pickChildThenLoad(String(first));
        })
        .catch(() => {
          setGstudyParentChildren([]);
        });
    }
  }, [
    isAuthenticated,
    reqEsntlId,
    fromMypage,
    reqId,
    applyGstudyStudentProfileFromArmuser,
  ]);

  const showAlert = (
    title: string,
    message: string,
    type: AlertModalType = "success",
    focusElementId: string | null = null,
  ) => {
    focusAfterAlertRef.current = focusElementId;
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  /** MY PAGE 전용: ArtappmInsertRequest JSON (proGb 08·09 + ARTAPPS 필드) */
  const buildGstudyMypageUpdateData = (
    sttusCode: "01" | "02" | "99",
    meta: GstudyMypageMeta,
  ): Record<string, unknown> => {
    const rid = reqId!.trim();
    const pid = proId!.trim();
    const applicantId = AuthService.getEsntlId() ?? "";
    return {
      reqId: rid,
      proId: pid,
      proSeq: meta.proSeq || "0",
      proGb: gstudyArtpromProGb,
      reqEsntlId: applicantId || meta.reqEsntlId,
      cEsntlId: meta.cEsntlId,
      pEsntlId: meta.pEsntlId,
      pUserNm: guardianName,
      headNm: guardianName,
      mbtlnum: digitsOnly(guardianPhone),
      brthdy: digitsOnly(guardianBirth).slice(0, 8),
      certYn: "N",
      crtfcDnValue: "",
      schoolNm,
      schoolLvl: schoolLvl ? parseInt(schoolLvl, 10) : 0,
      schoolNo: schoolNo ? parseInt(schoolNo, 10) : 0,
      schoolId: "",
      schoolGb,
      proType: "01",
      sttusCode,
      fileId: meta.fileId,
      playPart: "1",
      reqPart: "",
      reqObj: "",
      reqPlay: "",
      reqPlan: "",
      mchilYn: "N",
      mchilNm: "",
      reqDesc: "",
      payBankCode: "",
      payBank: "",
      holderNm: "",
      pIhidnum: "",
      cIhidnum: "",
      proGbn: household,
      proGbnEtc: household === "06" ? householdOtherText : "",
      reqSub: serializeGstudyApplySubjectForApi(
        applySubject,
        gstudyArtpromProTarget,
        schoolGb,
      ),
      joinCnt: serializeGstudyJoinCntForApi(partFreq),
      befJoin: serializeGstudyBefJoinForApi(priorParts),
      joinTime: serializeGstudyHopeTimeForApi(
        hopeTimes,
        gstudyArtpromProTarget,
        schoolGb,
      ),
      joinTimeCon: "",
      sUnder: studyUnderstanding,
      sTarget: studyGoal,
      sChar: studyTrait,
      sReason: serializeGstudyPartReasonForApi(partReasons),
      sExpect: serializeGstudyExpectEffectForApi(expectEffects),
      sAppr: serializeGstudyParentEvalForApi(parentEval),
      sComm: opinion,
      agree1Yn: agreeUse,
      agree2Yn: agreeProvide,
      agree3Yn: agreeNotice,
      UNIQ_ID: AuthService.getEsntlId() ?? "",
    };
  };

  /** 공고(신규): POST multipart `insertArtappm` — proGb 08·09 시 서버에서 insertArtapps 처리 */
  const buildGstudyNewInsertData = (
    sttusCode: "01" | "02",
    childEsntlId: string,
  ): Record<string, unknown> => {
    const isSn = AuthService.getUserSe() === "SNR";
    const loginId = AuthService.getEsntlId() ?? "";
    const pEsntlId = isSn
      ? (gstudyLinkedParentEsntlId.trim() || "")
      : loginId;
    const pid = proId!.trim();
    return {
      proId: pid,
      proSeq: "0",
      proGb: gstudyArtpromProGb,
      reqEsntlId: loginId,
      cEsntlId: childEsntlId,
      pEsntlId,
      pUserNm: guardianName,
      headNm: guardianName,
      mbtlnum: digitsOnly(guardianPhone),
      brthdy: digitsOnly(guardianBirth).slice(0, 8),
      certYn: "N",
      crtfcDnValue: "",
      schoolNm,
      schoolLvl: schoolLvl ? parseInt(schoolLvl, 10) : 0,
      schoolNo: schoolNo ? parseInt(schoolNo, 10) : 0,
      schoolId: "",
      schoolGb,
      proType: "01",
      sttusCode,
      fileId: "",
      playPart: "1",
      reqPart: "",
      reqObj: "",
      reqPlay: "",
      reqPlan: "",
      mchilYn: "N",
      mchilNm: "",
      reqDesc: "",
      payBankCode: "",
      payBank: "",
      holderNm: "",
      pIhidnum: "",
      cIhidnum: "",
      proGbn: household,
      proGbnEtc: household === "06" ? householdOtherText : "",
      reqSub: serializeGstudyApplySubjectForApi(
        applySubject,
        gstudyArtpromProTarget,
        schoolGb,
      ),
      joinCnt: serializeGstudyJoinCntForApi(partFreq),
      befJoin: serializeGstudyBefJoinForApi(priorParts),
      joinTime: serializeGstudyHopeTimeForApi(
        hopeTimes,
        gstudyArtpromProTarget,
        schoolGb,
      ),
      joinTimeCon: "",
      sUnder: studyUnderstanding,
      sTarget: studyGoal,
      sChar: studyTrait,
      sReason: serializeGstudyPartReasonForApi(partReasons),
      sExpect: serializeGstudyExpectEffectForApi(expectEffects),
      sAppr: serializeGstudyParentEvalForApi(parentEval),
      sComm: opinion,
      agree1Yn: agreeUse,
      agree2Yn: agreeProvide,
      agree3Yn: agreeNotice,
      UNIQ_ID: loginId,
    };
  };

  const submitGstudyNewInsert = (sttusCode: "01" | "02") => {
    const childId = gstudyStudentEsntlId.trim();
    const pid = proId?.trim();
    if (!pid) {
      showAlert("알림", "지원사업을 선택한 뒤 이용해 주세요.", "danger");
      return;
    }
    if (!AuthService.isAuthenticated()) {
      showAlert("알림", "로그인 후 이용해 주세요.", "danger");
      return;
    }
    if (
      AuthService.getUserSe() === "SNR" &&
      !gstudyLinkedParentEsntlId.trim()
    ) {
      showAlert(
        "자녀 연동이 필요합니다",
        "학부모님이 마이페이지에서 자녀 연동을 완료한 뒤 다시 신청해 주세요.",
        "danger",
      );
      return;
    }
    if (!childId) {
      showAlert(
        "알림",
        "학생(자녀) 정보를 확인할 수 없습니다. 자녀 연결을 확인하거나 잠시 후 다시 시도해 주세요.",
        "danger",
      );
      return;
    }
    const data = buildGstudyNewInsertData(sttusCode, childId);
    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    pendingFiles.forEach(({ file }) => {
      formData.append("artappmFiles", file);
    });
    apiClient
      .post<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.INSERT,
        formData,
      )
      .then((res) => {
        const result = res?.result ?? "";
        if (result === "50") {
          showAlert(
            "알림",
            res?.message ?? "동일한 지원사업 신청 건이 이미 존재합니다.",
            "danger",
          );
          return;
        }
        if (result === "02") {
          showAlert(
            "알림",
            res?.message ?? "자격 조건을 충족하지 않습니다.",
            "danger",
          );
          return;
        }
        if (result === "00") {
          if (sttusCode === "02") {
            afterGstudyAlertRef.current = () => {
              const reqGbPosition = searchParams.get("reqGbPosition");
              const typeParam = searchParams.get("type");
              const q = new URLSearchParams();
              if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
              if (typeParam === "parent") q.set("type", "parent");
              const mainUrl =
                "/userWeb/main" + (q.toString() ? "?" + q.toString() : "");
              router.push(mainUrl);
            };
            showAlert("신청 완료", "신청이 완료되었습니다.", "success");
          } else {
            afterGstudyAlertRef.current = () => router.push("/userWeb/mypagePr");
            showAlert("임시저장", "임시저장되었습니다.", "success");
          }
          setPendingFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        showAlert(
          "알림",
          res?.message ?? "처리 중 오류가 발생했습니다.",
          "danger",
        );
      })
      .catch(() => {
        showAlert("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  /** 공고 진입: 학생·사업별 기존 건 선조회 후 INSERT (BizInputSection과 동일 정책) */
  const runGstudyAnnouncementSave = (sttusCode: "01" | "02") => {
    const childId = gstudyStudentEsntlId.trim();
    const pid = proId!.trim();
    const params = new URLSearchParams({ proId: pid, reqEsntlId: childId });
    apiClient
      .get<{ detail?: Record<string, unknown> | null }>(
        `${API_ENDPOINTS.USER_ARTAPPM.BY_STUDENT}?${params}`,
      )
      .then((res) => {
        if (res.detail) {
          showAlert(
            "알림",
            "수정은 MY PAGE에서만 가능합니다.\n이미 신청된 지원사업입니다.",
            "danger",
          );
          return;
        }
        submitGstudyNewInsert(sttusCode);
      })
      .catch(() => submitGstudyNewInsert(sttusCode));
  };

  const submitGstudyMypageUpdate = (sttusCode: "01" | "02" | "99") => {
    const rid = reqId?.trim();
    if (!rid || !proId?.trim() || !mypageMeta) {
      showAlert("알림", "저장에 필요한 정보가 없습니다.", "danger");
      return;
    }
    const data = buildGstudyMypageUpdateData(sttusCode, mypageMeta);
    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    pendingFiles.forEach(({ file }) => {
      formData.append("artappmFiles", file);
    });
    apiClient
      .put<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.UPDATE_BY_REQ_ID(rid),
        formData,
      )
      .then((res) => {
        const result = res?.result ?? "";
        if (result === "50") {
          showAlert(
            "알림",
            res?.message ?? "저장할 수 없습니다.",
            "danger",
          );
          return;
        }
        if (result === "00") {
          if (sttusCode === "99") {
            setLoadedSttusCode("99");
            setShowCancelConfirm(false);
            afterGstudyAlertRef.current = () =>
              router.push("/userWeb/mypagePr");
            showAlert("취소 완료", "신청이 취소되었습니다.", "success");
            return;
          }
          if (sttusCode === "02") {
            setLoadedSttusCode("02");
            afterGstudyAlertRef.current = () =>
              router.push("/userWeb/mypagePr");
            showAlert("신청 완료", "신청이 완료되었습니다.", "success");
          } else {
            setLoadedSttusCode("01");
            afterGstudyAlertRef.current = () =>
              router.push("/userWeb/mypagePr");
            showAlert("임시저장", "임시저장되었습니다.", "success");
          }
          setPendingFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        showAlert(
          "알림",
          res?.message ?? "처리 중 오류가 발생했습니다.",
          "danger",
        );
      })
      .catch(() => {
        showAlert("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  /** 보호자·학생·학교는 유지, 신청정보·구분·첨부만 초기화 (bizInput 초기화와 유사) */
  const resetGstudyEditableFields = () => {
    setHousehold("05");
    setHouseholdOtherText("");
    setApplySubject("");
    setPartFreq("");
    setPriorParts([]);
    setHopeTimes([]);
    setStudyUnderstanding("");
    setStudyGoal("");
    setStudyTrait("");
    setPartReasons([]);
    setExpectEffects([]);
    setParentEval("");
    setOpinion("");
    setAgreeUse("");
    setAgreeProvide("");
    setAgreeNotice("");
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    resetGstudyEditableFields();
  };

  const handleGstudyDraft = () => {
    if (!proId?.trim()) {
      showAlert("알림", "지원사업을 선택한 뒤 이용해 주세요.", "danger");
      return;
    }
    if (!canSaveOrApply) {
      showAlert(
        "알림",
        "이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    if (needsMypageDetail) {
      submitGstudyMypageUpdate("01");
      return;
    }
    if (!AuthService.isAuthenticated()) {
      showAlert("알림", "로그인 후 이용해 주세요.", "danger");
      return;
    }
    if (!gstudyStudentEsntlId.trim()) {
      showAlert(
        "알림",
        "학생(자녀) 정보를 확인할 수 없습니다. 자녀 연결을 확인하거나 잠시 후 다시 시도해 주세요.",
        "danger",
      );
      return;
    }
    runGstudyAnnouncementSave("01");
  };

  const handleGstudyApply = () => {
    if (!proId?.trim()) {
      showAlert("알림", "지원사업을 선택한 뒤 이용해 주세요.", "danger");
      return;
    }
    if (!canSaveOrApply) {
      showAlert(
        "알림",
        "이미 신청 완료된 지원사업은 수정할 수 없습니다.",
        "danger",
      );
      return;
    }
    if (applySubject === "") {
      showAlert("알림", "신청과목을 선택해 주세요.", "danger", "gstudyApplySubjectKorean");
      return;
    }
    if (partFreq === "") {
      showAlert("알림", "참여 횟수를 선택해 주세요.", "danger", "gstudyPartFreqW1");
      return;
    }
    if (priorParts.length === 0) {
      showAlert(
        "알림",
        "기존참여를 한 개 이상 선택해 주세요.",
        "danger",
        "gstudyPriorPartNew",
      );
      return;
    }
    if (hopeTimes.length === 0) {
      showAlert(
        "알림",
        "희망시간대를 한 개 이상 선택해 주세요.",
        "danger",
        "gstudyHopeTimeWeekdayPm",
      );
      return;
    }
    if (partReasons.length === 0) {
      showAlert(
        "알림",
        "참여이유를 한 개 이상 선택해 주세요.",
        "danger",
        "gstudyPartReasonHelpClass",
      );
      return;
    }
    if (expectEffects.length === 0) {
      showAlert(
        "알림",
        "기대효과를 한 개 이상 선택해 주세요.",
        "danger",
        "gstudyExpectEffectCustomLearn",
      );
      return;
    }
    if (parentEval === "") {
      showAlert("알림", "학부모평가를 선택해 주세요.", "danger", "gstudyParentEvalVpos");
      return;
    }
    if (agreeUse === "") {
      showAlert("알림", "이용동의 여부를 선택해 주세요.", "danger", "gstudyAgreeUseY");
      return;
    }
    if (agreeProvide === "") {
      showAlert("알림", "제공동의 여부를 선택해 주세요.", "danger", "gstudyAgreeProvideY");
      return;
    }
    if (agreeNotice === "") {
      showAlert("알림", "주의사항 동의 여부를 선택해 주세요.", "danger", "gstudyAgreeNoticeY");
      return;
    }
    if (agreeUse !== "Y" || agreeProvide !== "Y" || agreeNotice !== "Y") {
      const focusId =
        agreeUse !== "Y"
          ? "gstudyAgreeUseY"
          : agreeProvide !== "Y"
            ? "gstudyAgreeProvideY"
            : "gstudyAgreeNoticeY";
      showAlert(
        "알림",
        "이용동의·제공동의·주의사항에 모두 동의해 주세요.",
        "danger",
        focusId,
      );
      return;
    }
    if (needsMypageDetail) {
      submitGstudyMypageUpdate("02");
      return;
    }
    if (!AuthService.isAuthenticated()) {
      showAlert("알림", "로그인 후 이용해 주세요.", "danger");
      return;
    }
    if (!gstudyStudentEsntlId.trim()) {
      showAlert(
        "알림",
        "학생(자녀) 정보를 확인할 수 없습니다. 자녀 연결을 확인하거나 잠시 후 다시 시도해 주세요.",
        "danger",
      );
      return;
    }
    runGstudyAnnouncementSave("02");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGstudyApply();
  };

  return (
    <section className="inner">
      <div className="mainBg">
        <div className="registrationContainer bizInput">
          {proId ? (
            <p className="sr-only">지원사업 코드 {proId}</p>
          ) : null}
          {loadError ? (
            <p className="error" role="alert">
              {loadError}
            </p>
          ) : null}
          {needsMypageDetail && !mypageDetailReady ? (
            <p className="loading" role="status">
              신청 내역을 불러오는 중입니다.
            </p>
          ) : null}
          <form className="mainForm" onSubmit={handleSubmit} noValidate>
            <section className="formSection" aria-labelledby="gstudyGuardianTitle">
              <div className="sectionHeader">
                <div className="sectionTitle" id="gstudyGuardianTitle">
                  보호자 정보
                </div>
              </div>
              <div className="formGrid">
                <div className="formRow split">
                  <div className="fieldUnit">
                    <label htmlFor="gstudyGuardianName" className="formLabel">
                      보호자명
                    </label>
                    <div className="formControl">
                      <input
                        type="text"
                        id="gstudyGuardianName"
                        className="inputField bgGray"
                        readOnly
                        value={guardianName}
                        aria-label="보호자명"
                      />
                    </div>
                  </div>
                  <div className="fieldUnit">
                    <label htmlFor="gstudyGuardianPhone" className="formLabel">
                      연락처
                    </label>
                    <div className="formControl">
                      <input
                        type="tel"
                        id="gstudyGuardianPhone"
                        className="inputField bgGray"
                        readOnly
                        value={guardianPhone}
                        aria-label="연락처"
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow split">
                  <div className="fieldUnit">
                    <label htmlFor="gstudyGuardianBirth" className="formLabel">
                      생년월일
                    </label>
                    <div className="formControl">
                      <input
                        type="date"
                        id="gstudyGuardianBirth"
                        className="inputField bgGray"
                        readOnly
                        value={guardianBirth}
                        aria-label="생년월일"
                      />
                    </div>
                  </div>
                  <div className="fieldUnit">
                    <label htmlFor="gstudyGuardianRelation" className="formLabel">
                      관계
                    </label>
                    <div className="formControl">
                      <input
                        type="text"
                        id="gstudyGuardianRelation"
                        className="inputField bgGray"
                        readOnly
                        value={guardianRelation}
                        aria-label="관계"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="formSection" aria-labelledby="gstudyStudentTitle">
              <div className="sectionHeader">
                <div className="sectionTitle" id="gstudyStudentTitle">
                  학생정보
                </div>
              </div>
              <div className="formGrid">
                <div className="formRow split">
                  <div className="fieldUnit">
                    <label
                      htmlFor={
                        AuthService.getUserSe() === "PNR"
                          ? "gstudyStudentSelect"
                          : "gstudyStudentName"
                      }
                      className="formLabel"
                    >
                      {AuthService.getUserSe() === "PNR" ? (
                        <span className="requiredMark" aria-hidden="true">
                          *
                        </span>
                      ) : null}
                      학생명
                    </label>
                    <div className="formControl">
                      {AuthService.getUserSe() === "PNR" ? (
                        <select
                          id="gstudyStudentSelect"
                          className={`selectField ${fromMypage ? "bgGray" : ""}`.trim()}
                          value={gstudyStudentEsntlId}
                          onChange={handleGstudyParentChildChange}
                          disabled={fromMypage || formFieldsLocked}
                          aria-required="true"
                          aria-label="학생명 선택"
                        >
                          <option value="">이름을 선택해주세요</option>
                          {gstudyParentChildren.map((c) => (
                            <option
                              key={String(c.esntlId ?? "")}
                              value={String(c.esntlId ?? "")}
                            >
                              {String(c.userNm ?? "")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          id="gstudyStudentName"
                          className="inputField bgGray"
                          readOnly
                          value={studentName}
                          aria-label="학생명"
                        />
                      )}
                    </div>
                  </div>
                  <div className="fieldUnit">
                    <span className="formLabel" id="gstudyLblGender">
                      성별
                    </span>
                    <div
                      className="customGroup formControl"
                      role="radiogroup"
                      aria-labelledby="gstudyLblGender"
                    >
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gstudyGender"
                          className="customInput"
                          checked={studentGender === "M"}
                          readOnly
                          disabled
                          aria-readonly="true"
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">남</span>
                        </div>
                      </label>
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gstudyGender"
                          className="customInput"
                          checked={studentGender === "F"}
                          readOnly
                          disabled
                          aria-readonly="true"
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">여</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="formRow split">
                  <div className="fieldUnit">
                    <label htmlFor="gstudyStudentPhone" className="formLabel">
                      연락처
                    </label>
                    <div className="formControl">
                      <input
                        type="tel"
                        id="gstudyStudentPhone"
                        className="inputField bgGray"
                        readOnly
                        value={studentPhone}
                        aria-label="연락처"
                      />
                    </div>
                  </div>
                  <div className="fieldUnit">
                    <label htmlFor="gstudyStudentBirth" className="formLabel">
                      생년월일
                    </label>
                    <div className="formControl">
                      <input
                        type="date"
                        id="gstudyStudentBirth"
                        className="inputField bgGray"
                        readOnly
                        value={studentBirth}
                        aria-label="생년월일"
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow">
                  <span className="formLabel">주소</span>
                  <div className="formControl addressContainer">
                    <div className="inputWithBtn">
                      <input
                        type="text"
                        className="inputField bgGray"
                        readOnly
                        title="주소"
                        aria-label="주소"
                        value={addressDisplayValue}
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow">
                  <span className="formLabel" id="gstudyLblHousehold">
                    구분
                  </span>
                  <div className="formControl">
                    <div
                      className="fieldSelectGroup"
                      role="radiogroup"
                      aria-labelledby="gstudyLblHousehold"
                    >
                      <div className="householdRadioWrap">
                        {HOUSEHOLD_OPTIONS.map((opt) => (
                          <label key={opt.value} className="customItem">
                            <input
                              type="radio"
                              name="gstudyHousehold"
                              className="customInput"
                              value={opt.value}
                              checked={household === opt.value}
                              disabled={formFieldsLocked}
                              onChange={() => setHousehold(opt.value)}
                            />
                            <div className="customBox widePill">
                              <span className="customIcon" aria-hidden="true" />
                              <span className="customText">{opt.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="fieldRow">
                        <label className="customItem">
                          <input
                            type="radio"
                            name="gstudyHousehold"
                            className="customInput"
                            value="06"
                            checked={household === "06"}
                            disabled={formFieldsLocked}
                            onChange={() => setHousehold("06")}
                          />
                          <div className="customBox widePill">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">기타</span>
                          </div>
                        </label>
                        {household === "06" ? (
                          <input
                            type="text"
                            id="gstudyHouseholdOther"
                            className="inputField"
                            placeholder="내용을 입력해 주세요"
                            value={householdOtherText}
                            readOnly={formFieldsLocked}
                            onChange={(e) =>
                              setHouseholdOtherText(e.target.value)
                            }
                            aria-label="기타 구분 내용"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="formSection" aria-labelledby="gstudySchoolTitle">
              <div className="sectionHeader">
                <div className="sectionTitle" id="gstudySchoolTitle">
                  학교정보
                </div>
              </div>
              <div className="formGrid">
                <div className="formRow">
                  <span className="formLabel">학교명</span>
                  <div className="formControl inputWithBtn">
                    <input
                      type="text"
                      className="inputField bgGray"
                      readOnly
                      title="학교명 및 학년정보"
                      aria-label="학교명 및 학년정보"
                      value={schoolDisplayValue}
                      aria-readonly="true"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="formSection" aria-labelledby="gstudyApplyTitle">
              <div className="sectionHeader">
                <div className="sectionTitle" id="gstudyApplyTitle">
                  신청정보
                </div>
              </div>
              <div className="formGrid">
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblApplySubject">
                    신청과목
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyApplySubject>
                      name="gstudyApplySubject"
                      value={applySubject}
                      onChange={setApplySubject}
                      options={gstudyApplySubjectRadioOptions(
                        gstudyArtpromProTarget,
                        schoolGb,
                      )}
                      labelledBy="gstudyLblApplySubject"
                      wide={false}
                      firstInputId="gstudyApplySubjectKorean"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblPartFreq">
                    참여 횟수
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyPartFreq>
                      name="gstudyPartFreq"
                      value={partFreq}
                      onChange={setPartFreq}
                      options={PART_FREQ_OPTIONS}
                      labelledBy="gstudyLblPartFreq"
                      wide={false}
                      firstInputId="gstudyPartFreqW1"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblPriorPart">
                    기존참여
                  </span>
                  <div className="formControl">
                    <div className="fieldSelectGroup">
                      <GstudyMultiCheckboxGroup<GstudyPriorPartCode>
                        name="gstudyPriorPart"
                        selected={priorParts}
                        onToggle={(code, checked) => {
                          setPriorParts((prev) => {
                            if (checked)
                              return prev.includes(code) ? prev : [...prev, code];
                            return prev.filter((c) => c !== code);
                          });
                        }}
                        options={PRIOR_PART_OPTIONS}
                        labelledBy="gstudyLblPriorPart"
                        firstInputId="gstudyPriorPartNew"
                        disabled={formFieldsLocked}
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblHopeTime">
                    희망시간대
                  </span>
                  <div className="formControl">
                    <div className="fieldSelectGroup">
                      <GstudyMultiCheckboxGroup<GstudyHopeTimeCode>
                        name="gstudyHopeTime"
                        selected={hopeTimes}
                        onToggle={(code, checked) => {
                          setHopeTimes((prev) => {
                            if (checked)
                              return prev.includes(code) ? prev : [...prev, code];
                            return prev.filter((c) => c !== code);
                          });
                        }}
                        options={HOPE_TIME_OPTIONS}
                        labelledBy="gstudyLblHopeTime"
                        firstInputId="gstudyHopeTimeWeekdayPm"
                        disabled={formFieldsLocked}
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="gstudyUnderstanding" className="formLabel">
                    학업이해도
                  </label>
                  <div className="formControl">
                    <textarea
                      id="gstudyUnderstanding"
                      className="textAreaField"
                      placeholder="내용을 입력해 주세요"
                      value={studyUnderstanding}
                      readOnly={formFieldsLocked}
                      onChange={(e) => setStudyUnderstanding(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="gstudyGoal" className="formLabel">
                    학습목표
                  </label>
                  <div className="formControl">
                    <textarea
                      id="gstudyGoal"
                      className="textAreaField"
                      placeholder="내용을 입력해 주세요"
                      value={studyGoal}
                      readOnly={formFieldsLocked}
                      onChange={(e) => setStudyGoal(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="gstudyTrait" className="formLabel">
                    학업 특성
                  </label>
                  <div className="formControl">
                    <textarea
                      id="gstudyTrait"
                      className="textAreaField"
                      placeholder="내용을 입력해 주세요"
                      value={studyTrait}
                      readOnly={formFieldsLocked}
                      onChange={(e) => setStudyTrait(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblPartReason">
                    참여이유
                  </span>
                  <div className="formControl">
                    <div className="fieldSelectGroup">
                      <GstudyMultiCheckboxGroup<GstudyPartReasonCode>
                        name="gstudyPartReason"
                        selected={partReasons}
                        onToggle={(code, checked) => {
                          setPartReasons((prev) => {
                            if (checked)
                              return prev.includes(code) ? prev : [...prev, code];
                            return prev.filter((c) => c !== code);
                          });
                        }}
                        options={PART_REASON_OPTIONS_FULL}
                        labelledBy="gstudyLblPartReason"
                        firstInputId="gstudyPartReasonHelpClass"
                        disabled={formFieldsLocked}
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblExpectEffect">
                    기대효과
                  </span>
                  <div className="formControl">
                    <div className="fieldSelectGroup">
                      <GstudyMultiCheckboxGroup<GstudyExpectEffectCode>
                        name="gstudyExpectEffect"
                        selected={expectEffects}
                        onToggle={(code, checked) => {
                          setExpectEffects((prev) => {
                            if (checked)
                              return prev.includes(code) ? prev : [...prev, code];
                            return prev.filter((c) => c !== code);
                          });
                        }}
                        options={EXPECT_EFFECT_OPTIONS_FULL}
                        labelledBy="gstudyLblExpectEffect"
                        firstInputId="gstudyExpectEffectCustomLearn"
                        disabled={formFieldsLocked}
                      />
                    </div>
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblParentEval">
                    학부모평가
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyParentEval>
                      name="gstudyParentEval"
                      value={parentEval}
                      onChange={setParentEval}
                      options={PARENT_EVAL_OPTIONS}
                      labelledBy="gstudyLblParentEval"
                      firstInputId="gstudyParentEvalVpos"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="gstudyOpinion" className="formLabel">
                    의견
                  </label>
                  <div className="formControl">
                    <textarea
                      id="gstudyOpinion"
                      className="textAreaField"
                      placeholder="내용을 입력해 주세요"
                      value={opinion}
                      readOnly={formFieldsLocked}
                      onChange={(e) => setOpinion(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblAgreeUse">
                    이용동의
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyAgreeYn>
                      name="gstudyAgreeUse"
                      value={agreeUse}
                      onChange={setAgreeUse}
                      options={AGREE_OPTIONS}
                      labelledBy="gstudyLblAgreeUse"
                      wide={false}
                      firstInputId="gstudyAgreeUseY"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblAgreeProvide">
                    제공동의
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyAgreeYn>
                      name="gstudyAgreeProvide"
                      value={agreeProvide}
                      onChange={setAgreeProvide}
                      options={AGREE_OPTIONS}
                      labelledBy="gstudyLblAgreeProvide"
                      wide={false}
                      firstInputId="gstudyAgreeProvideY"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow gstudyApplyRow">
                  <span className="formLabel" id="gstudyLblAgreeNotice">
                    주의사항
                  </span>
                  <div className="formControl">
                    <GstudyRadioGroup<GstudyAgreeYn>
                      name="gstudyAgreeNotice"
                      value={agreeNotice}
                      onChange={setAgreeNotice}
                      options={AGREE_OPTIONS}
                      labelledBy="gstudyLblAgreeNotice"
                      wide={false}
                      firstInputId="gstudyAgreeNoticeY"
                      disabled={formFieldsLocked}
                    />
                  </div>
                </div>
                <div className="formRow gstudyAttachRow">
                  <span className="formLabel">
                    첨부파일
                    {!formFieldsLocked ? (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="gstudyFileInput"
                          className="hiddenInput"
                          multiple
                          onChange={handleFileSelect}
                        />
                        <label
                          htmlFor="gstudyFileInput"
                          className="btnFileAdd"
                          aria-label="파일 첨부하기"
                        >
                          <img
                            src={`${ICON}/ico_file_add.png`}
                            alt=""
                            aria-hidden="true"
                          />
                        </label>
                      </>
                    ) : null}
                  </span>
                  <div className="formControl fileListContainer">
                    {pendingFiles.length === 0 &&
                    existingFiles.length === 0 ? (
                      <span className="fileListEmpty">
                        첨부된 파일이 없습니다.
                      </span>
                    ) : (
                      <>
                        {existingFiles.map((f) => {
                          const label = f.orgfNm ?? `파일 ${f.fileId}`;
                          const typeClass = getFileTypeClass(label);
                          return (
                            <div
                              key={`ex-${f.fileId}-${f.seq}`}
                              className={`file ${typeClass}`.trim()}
                            >
                              <span>{label}</span>
                            </div>
                          );
                        })}
                        {pendingFiles.map(({ id, file }) => {
                          const label = file.name;
                          const typeClass = getFileTypeClass(label);
                          return (
                            <div
                              key={id}
                              className={`file ${typeClass}`.trim()}
                            >
                              <span>{label}</span>
                              {!formFieldsLocked ? (
                                <button
                                  type="button"
                                  className="btnFileDel"
                                  aria-label={`${label} 파일 삭제`}
                                  onClick={() => removePendingFile(id)}
                                >
                                  <img
                                    src={`${ICON}/ico_file_del.png`}
                                    alt=""
                                    aria-hidden="true"
                                  />
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="formActions">
              {!fromMypage ? (
                <button
                  type="button"
                  className="btnWhite"
                  onClick={handleReset}
                  aria-label="신청 입력 내용 초기화"
                >
                  초기화
                </button>
              ) : null}
              <button
                type="button"
                className="btnWhite"
                onClick={handleGstudyDraft}
                aria-label="임시저장"
                disabled={!canSaveOrApply}
              >
                임시저장
              </button>
              <button
                type="submit"
                className="btnSubmit"
                aria-label="신청"
                disabled={!canSaveOrApply}
              >
                신청
              </button>
              {fromMypage && needsMypageDetail && mypageDetailReady ? (
                <button
                  type="button"
                  className="btnSubmit"
                  onClick={() => {
                    if (loadedSttusCode === "99") {
                      showAlert("알림", "이미 취소된 건입니다.", "danger");
                      return;
                    }
                    setShowCancelConfirm(true);
                  }}
                  aria-label="신청 취소"
                >
                  취소
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          const id = focusAfterAlertRef.current;
          focusAfterAlertRef.current = null;
          if (id) {
            requestAnimationFrame(() => document.getElementById(id)?.focus());
          }
          const after = afterGstudyAlertRef.current;
          afterGstudyAlertRef.current = null;
          after?.();
        }}
      />
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="확인"
        message="신청을 취소하시겠습니까?"
        cancelText="닫기"
        confirmText="취소"
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          setShowCancelConfirm(false);
          submitGstudyMypageUpdate("99");
        }}
      />
    </section>
  );
};

export default BizInputGstudySection;
