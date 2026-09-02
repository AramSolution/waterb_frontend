/**
 * 오수량 산정 — 기준단가·원인자부담금·오수량·오수부과량 **라벨** 배경.
 * RGB(181,178,255) **알파 0.3**. `bg-gray-100` 등보다 `style`로 우선 적용.
 */
export const FEE_PAYER_SEWAGE_LABEL_BACKGROUND_RGBA =
  "rgba(181, 178, 255, 0.3)" as const;

/**
 * 상단 **오수량** 입력·상세 행 **오수량(산출)** 입력 배경.
 * RGB(255,224,140) **알파 0.2**.
 * (오수부과량·기준단가·원인자부담금 **입력값** 셀은 제외)
 */
export const FEE_PAYER_SEWAGE_INPUT_BACKGROUND_RGBA =
  "rgba(255, 224, 140, 0.2)" as const;

/**
 * 오수량 산정·납부내역 2×2 금액 그리드 **외곽** border (인풋·버튼 border 제외).
 */
export const FEE_PAYER_SEWAGE_GRID_BORDER_RGBA =
  "rgba(181, 178, 255, 1)" as const;

export const feePayerSewagePriceGridOuterBorderStyle = {
  borderColor: FEE_PAYER_SEWAGE_GRID_BORDER_RGBA,
} as const;

/** 2×2 금액 그리드 라벨(등록·상세·납부내역 공통) */
export const feePayerPriceLabelStyle = {
  backgroundColor: FEE_PAYER_SEWAGE_LABEL_BACKGROUND_RGBA,
} as const;

export const feePayerPriceLabelClassName =
  "m-0 flex min-h-[40px] shrink-0 items-center px-2 py-1.5 font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:py-2";

/** 계산 버튼 border — RGB(181,178,255) */
export const FEE_PAYER_SEWAGE_CALCULATE_BUTTON_BORDER_RGB =
  "rgb(181, 178, 255)" as const;

export const feePayerCalculateButtonBorderStyle = {
  borderColor: FEE_PAYER_SEWAGE_CALCULATE_BUTTON_BORDER_RGB,
} as const;

/** 계산 버튼 열(1행·2행 스페이서) 배경 — 라벨과 동일 RGB(181,178,255) 알파 0.3 */
export const feePayerCalculateColumnBackgroundStyle = {
  backgroundColor: FEE_PAYER_SEWAGE_LABEL_BACKGROUND_RGBA,
} as const;
