"use client";

import React from "react";
import { Icon } from "@/shared/components/Icon";
import {
  formatChangePercent,
  formatDashboardAmount,
  formatDashboardCount,
} from "../lib/dashboardFormat";

export type PaymentMoMCardTheme = "blue" | "green" | "orange" | "red";

interface PaymentMoMCardProps {
  title: string;
  iconName: string;
  theme: PaymentMoMCardTheme;
  baseMonth: string;
  compareMonth: string;
  currentValue: number;
  previousValue: number;
  changePercent: number | null | undefined;
  unit: "건" | "원";
  valueType: "count" | "amount";
}

const themeStyles: Record<
  PaymentMoMCardTheme,
  { iconBg: string; iconColor: string; currentValue: string }
> = {
  blue: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    currentValue: "text-blue-600",
  },
  green: {
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    currentValue: "text-green-600",
  },
  orange: {
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    currentValue: "text-orange-600",
  },
  red: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    currentValue: "text-red-600",
  },
};

function formatValue(
  value: number,
  valueType: "count" | "amount",
): string {
  return valueType === "count"
    ? formatDashboardCount(value)
    : formatDashboardAmount(value);
}

export const PaymentMoMCard: React.FC<PaymentMoMCardProps> = ({
  title,
  iconName,
  theme,
  baseMonth,
  compareMonth,
  currentValue,
  previousValue,
  changePercent,
  unit,
  valueType,
}) => {
  const styles = themeStyles[theme];
  const formattedPercent = formatChangePercent(changePercent ?? null);

  let changeLabel: React.ReactNode = "—";
  if (formattedPercent != null) {
    const percentNum = changePercent ?? 0;
    const isUp = percentNum > 0;
    const isDown = percentNum < 0;
    const arrow = isUp ? "▲" : isDown ? "▼" : "";
    const changeColor = isUp
      ? "text-red-600"
      : isDown
        ? "text-blue-600"
        : "text-gray-600";
    changeLabel = (
      <span className={`font-medium ${changeColor}`}>
        {arrow && `${arrow} `}
        {formattedPercent}%
      </span>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow h-full">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}
          >
            <Icon
              name={iconName}
              size={20}
              className={styles.iconColor}
            />
          </div>
          <h6 className="text-[1.2rem] font-semibold text-gray-900 mb-0">
            {title}
          </h6>
        </div>

        <div className="flex border-b border-gray-200 pb-4 mb-3">
          <div className="flex-1 border-r border-gray-200 pr-4">
            <p className="text-[0.95rem] text-gray-500 mb-1">
              당월 ({baseMonth})
            </p>
            <p
              className={`text-[1.325rem] font-bold mb-0 ${styles.currentValue}`}
            >
              {formatValue(currentValue, valueType)}{" "}
              <span className="text-[1.075rem] font-semibold">{unit}</span>
            </p>
          </div>
          <div className="flex-1 pl-4">
            <p className="text-[0.95rem] text-gray-500 mb-1">
              전월 ({compareMonth})
            </p>
            <p className="text-[1.325rem] font-bold text-gray-900 mb-0">
              {formatValue(previousValue, valueType)}{" "}
              <span className="text-[1.075rem] font-semibold">{unit}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[1.075rem]">
          <span className="text-gray-500">전월 대비</span>
          {changeLabel}
        </div>
      </div>
    </div>
  );
};
