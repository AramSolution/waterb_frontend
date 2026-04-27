"use client";

import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  isFirstRow?: boolean;
  isFirstInRow?: boolean;
  suppressLeftBorder?: boolean; // 좌측 테두리 제거(행 내 중복 선 방지)
  /** 반칸 단독 행 등에서 `isFirstInRow`여도 라벨 왼쪽 세로선 유지 */
  forceLabelLeftBorder?: boolean;
  suppressTopBorder?: boolean; // 상단 테두리 제거(첫 행 두꺼워짐 방지)
  fullWidth?: boolean; // 전체 너비 필드 (게시판설명 등)
  /** fullWidth일 때 왼쪽 라벨 열(회색) 없이 필드만 전체 너비·흰 배경 */
  fieldOnlyFullWidth?: boolean;
  forceTopBorder?: boolean; // 상단 선 강제 표시(이전 행이 1칸만 차지할 때 등)
  suppressBottomBorder?: boolean; // 하단 선 제거 (다음 행이 fullWidth+forceTopBorder일 때 중복 선 방지)
  /** fullWidth일 때 라벨·필드 영역을 위쪽 정렬 (체크박스/라디오/textarea 등 여러 줄 콘텐츠) */
  alignFieldStart?: boolean;
  /**
   * md 이상에서 한 flex 행에 나란히 둘 칸 수. 기본 `2`(반칸).
   * `4` = 원인자부담 등 상태·구분·유형·통지일 한 줄(각 `md:w-1/4`).
   */
  mdGridSpan?: 2 | 4;
  requiredIndicatorPosition?: "before" | "after"; // 필수 표시 위치 (기본값: "after")
  children: React.ReactNode;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  isFirstRow = false,
  isFirstInRow = false,
  suppressLeftBorder = false,
  forceLabelLeftBorder = false,
  suppressTopBorder = false,
  fullWidth = false,
  fieldOnlyFullWidth = false,
  forceTopBorder = false,
  suppressBottomBorder = false,
  alignFieldStart = false,
  mdGridSpan = 2,
  requiredIndicatorPosition = "after",
  children,
  error,
}) => {
  const rowMdWidthClass = mdGridSpan === 4 ? "md:w-1/4" : "md:w-1/2";
  const labelMdWidthClass =
    mdGridSpan === 4
      ? "md:w-[34%] md:min-w-0 md:shrink-0 md:text-[11px] md:leading-snug"
      : "md:w-1/4";
  const fieldMdWidthClass =
    mdGridSpan === 4 ? "md:w-[66%] md:min-w-0" : "md:w-3/4";
  const labelBorderBottom =
    suppressBottomBorder ? "none" : undefined;
  const fieldBorderBottom =
    suppressBottomBorder ? "none" : undefined;

  // Label border 로직:
  // - 첫 번째 행의 첫 번째 필드: borderTop 없음 (상단 중복 선 방지)
  // - 첫 번째 행의 두 번째 필드: borderTop 있음, borderLeft 없음
  // - 두 번째 행 이후 첫 번째 필드: borderTop 없음, borderLeft 기본값
  // - 두 번째 행 이후 두 번째 필드: borderTop 없음, borderLeft 없음
  const labelBorderTop = suppressTopBorder
    ? "none"
    : forceTopBorder
      ? "1px solid #dee2e6"
      : isFirstRow && isFirstInRow
        ? "none"
        : isFirstRow
          ? "1px solid #dee2e6"
          : "none";
  const labelBorderLeft =
    suppressLeftBorder || (isFirstInRow && !forceLabelLeftBorder)
      ? "none"
      : undefined;

  // Field border 로직:
  // - 첫 번째 행의 첫 번째 필드: borderTop 없음 (label과 중복 방지)
  // - 첫 번째 행의 두 번째 필드: borderTop 명시적으로 설정
  // - 두 번째 행 이후: borderTop 없음
  const fieldBorderTop = suppressTopBorder
    ? "none"
    : forceTopBorder
      ? "1px solid #dee2e6"
      : isFirstRow && isFirstInRow
        ? "none"
        : isFirstRow
          ? "1px solid #dee2e6"
          : "none";

  // fullWidth는 `label`이 공백만 있어도 전체 폭 레이아웃을 써야 함(공백 trim 분기보다 먼저 판단)
  if (fullWidth) {
    /** alignFieldStart 시 필드 셀을 flex 가로로 두면 자식 w-full이 축소·깨짐(라디오/체크 등) → block으로 전체 폭 유지 */
    const fieldContainerClass = alignFieldStart
      ? "register-form-mobile-field w-full min-h-0 block"
      : `register-form-mobile-field w-full flex items-center min-h-0`;

    if (fieldOnlyFullWidth) {
      return (
        <div className="w-full register-form-mobile-row">
          <div
            className="register-form-mobile-wrapper md:flex md:items-stretch"
            style={{ minHeight: "45px" }}
          >
            <div
              className={fieldContainerClass}
              style={{
                border: "1px solid #dee2e6",
                backgroundColor: "#fff",
                ...(fieldBorderTop !== undefined && { borderTop: fieldBorderTop }),
                ...(fieldBorderBottom !== undefined && {
                  borderBottom: fieldBorderBottom,
                }),
                padding: "5px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      );
    }

    const labelAlignClass = alignFieldStart
      ? "items-start pt-1.5"
      : "items-center";

    return (
      <div className="w-full register-form-mobile-row">
        <div
          className="register-form-mobile-wrapper md:flex md:items-stretch"
          style={{ minHeight: "45px" }}
        >
          <label
            className={`w-full md:w-[12.5%] flex ${labelAlignClass} m-0 register-form-label bg-gray-100`}
            style={{
              border: "1px solid #dee2e6",
              ...(labelBorderTop !== undefined && { borderTop: labelBorderTop }),
              ...(labelBorderLeft !== undefined && {
                borderLeft: labelBorderLeft,
              }),
              ...(labelBorderBottom !== undefined && {
                borderBottom: labelBorderBottom,
              }),
              padding: "5px",
            }}
          >
            {required && requiredIndicatorPosition === "before" && (
              <span className="text-red-600 mr-1">*</span>
            )}
            {label}
            {required && requiredIndicatorPosition === "after" && (
              <span className="text-red-600 ml-1">*</span>
            )}
          </label>
          <div className="w-full md:flex-1 min-w-0 flex flex-col min-h-0">
            <div
              className={fieldContainerClass}
              style={{
                border: "1px solid #dee2e6",
                borderLeft: "none",
                ...(fieldBorderTop !== undefined && { borderTop: fieldBorderTop }),
                ...(fieldBorderBottom !== undefined && {
                  borderBottom: fieldBorderBottom,
                }),
                padding: "5px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 라벨이 비어있는 경우: 라벨 영역 없이 필드만 전체 영역 사용
  if (!label.trim()) {
    return (
      <div className={`w-full ${rowMdWidthClass} register-form-mobile-row`}>
        <div
          className="register-form-mobile-wrapper md:flex md:items-stretch"
          style={{ minHeight: "45px" }}
        >
          <div
            className="register-form-mobile-field w-full flex items-center"
            style={{
              border: "1px solid #dee2e6",
              borderLeft: "none",
              ...(fieldBorderTop !== undefined && { borderTop: fieldBorderTop }),
              ...(fieldBorderBottom !== undefined && {
                borderBottom: fieldBorderBottom,
              }),
              padding: "5px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${rowMdWidthClass} register-form-mobile-row`}>
      <div
        className="register-form-mobile-wrapper md:flex md:items-stretch"
        style={{ minHeight: "45px" }}
      >
        <label
          className={`w-full ${labelMdWidthClass} flex items-center m-0 register-form-label bg-gray-100`}
          style={{
            border: "1px solid #dee2e6",
            ...(labelBorderTop !== undefined && { borderTop: labelBorderTop }),
            ...(labelBorderLeft !== undefined && { borderLeft: labelBorderLeft }),
            ...(labelBorderBottom !== undefined && {
              borderBottom: labelBorderBottom,
            }),
            padding: "5px",
          }}
        >
          {required && requiredIndicatorPosition === "before" && (
            <span className="text-red-600 mr-1">*</span>
          )}
          {label}
          {required && requiredIndicatorPosition === "after" && (
            <span className="text-red-600 ml-1">*</span>
          )}
        </label>
        <div
          className={`register-form-mobile-field w-full ${fieldMdWidthClass} flex items-center min-w-0`}
          style={{
            border: "1px solid #dee2e6",
            borderLeft: "none",
            ...(fieldBorderTop !== undefined && { borderTop: fieldBorderTop }),
            ...(fieldBorderBottom !== undefined && {
              borderBottom: fieldBorderBottom,
            }),
            padding: "5px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
