"use client";

import React from "react";
import { SkeletonCard } from "@/shared/ui/adminWeb";
import { useDashboard } from "../model";
import { PaymentMoMCard } from "./PaymentMoMCard";
import { DashboardUnpaidListSection } from "./DashboardUnpaidListSection";

export const DashboardPageView: React.FC = () => {
  const {
    loading,
    error,
    baseMonth,
    compareMonth,
    payCount,
    payAmount,
    unpaidCount,
    unpaidAmount,
    refetch,
  } = useDashboard();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">대시보드</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>대시보드</span>
        </nav>
      </div>

      {error && !loading && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 px-3 py-1 text-sm rounded border border-red-300 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      )}

      <div className="flex flex-wrap -mx-2 mb-4">
        <div className="w-full sm:w-1/2 xl:w-1/4 px-2 mb-3">
          {loading ? (
            <SkeletonCard />
          ) : (
            <PaymentMoMCard
              title="납입 건수"
              iconName="Users"
              theme="blue"
              baseMonth={baseMonth}
              compareMonth={compareMonth}
              currentValue={payCount.current}
              previousValue={payCount.previous}
              changePercent={payCount.changePercent}
              unit="건"
              valueType="count"
            />
          )}
        </div>
        <div className="w-full sm:w-1/2 xl:w-1/4 px-2 mb-3">
          {loading ? (
            <SkeletonCard />
          ) : (
            <PaymentMoMCard
              title="납입 금액"
              iconName="CircleDollarSign"
              theme="green"
              baseMonth={baseMonth}
              compareMonth={compareMonth}
              currentValue={payAmount.current}
              previousValue={payAmount.previous}
              changePercent={payAmount.changePercent}
              unit="원"
              valueType="amount"
            />
          )}
        </div>
        <div className="w-full sm:w-1/2 xl:w-1/4 px-2 mb-3">
          {loading ? (
            <SkeletonCard />
          ) : (
            <PaymentMoMCard
              title="미납 건수"
              iconName="Bell"
              theme="orange"
              baseMonth={baseMonth}
              compareMonth={compareMonth}
              currentValue={unpaidCount.current}
              previousValue={unpaidCount.previous}
              changePercent={unpaidCount.changePercent}
              unit="건"
              valueType="count"
            />
          )}
        </div>
        <div className="w-full sm:w-1/2 xl:w-1/4 px-2 mb-3">
          {loading ? (
            <SkeletonCard />
          ) : (
            <PaymentMoMCard
              title="미납 금액"
              iconName="TriangleAlert"
              theme="red"
              baseMonth={baseMonth}
              compareMonth={compareMonth}
              currentValue={unpaidAmount.current}
              previousValue={unpaidAmount.previous}
              changePercent={unpaidAmount.changePercent}
              unit="원"
              valueType="amount"
            />
          )}
        </div>
      </div>

      <DashboardUnpaidListSection />
    </>
  );
};
