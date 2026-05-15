"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DashboardService,
  type PaymentMoMData,
} from "@/entities/adminWeb/dashboard/api";
import { ApiError } from "@/shared/lib/apiClient";
import { getCurrentBaseMonth } from "../lib/dashboardFormat";

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toPercent(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentMoMData | null>(null);

  const fetchPaymentMoM = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await DashboardService.getPaymentMonthOverMonth({
        baseMonth: getCurrentBaseMonth(),
      });
      if (response.result !== "00") {
        setError(response.message || "대시보드 조회에 실패했습니다.");
        setData(null);
        return;
      }
      setData(response.data ?? null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("대시보드 조회 중 오류가 발생했습니다.");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPaymentMoM();
  }, [fetchPaymentMoM]);

  const baseMonth = data?.baseMonth ?? getCurrentBaseMonth();
  const compareMonth = data?.compareMonth ?? "";

  return {
    loading,
    error,
    baseMonth,
    compareMonth,
    payCount: {
      current: toNumber(data?.currPayCount),
      previous: toNumber(data?.prevPayCount),
      changePercent: toPercent(data?.payCountChangePercent),
    },
    payAmount: {
      current: toNumber(data?.currPayAmount),
      previous: toNumber(data?.prevPayAmount),
      changePercent: toPercent(data?.payAmountChangePercent),
    },
    unpaidCount: {
      current: toNumber(data?.currUnpaidCount),
      previous: toNumber(data?.prevUnpaidCount),
      changePercent: toPercent(data?.unpaidCountChangePercent),
    },
    unpaidAmount: {
      current: toNumber(data?.currUnpaidAmount),
      previous: toNumber(data?.prevUnpaidAmount),
      changePercent: toPercent(data?.unpaidAmountChangePercent),
    },
    refetch: fetchPaymentMoM,
  };
}
