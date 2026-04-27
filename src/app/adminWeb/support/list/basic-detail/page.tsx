"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { FeePayerBasicDetailPageView } from "@/features/adminWeb/support/feePayerRegister/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function FeePayerBasicDetailContent() {
  return (
    <AdminLayout>
      <FeePayerBasicDetailPageView />
    </AdminLayout>
  );
}

export default function SupportListFeePayerBasicDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FeePayerBasicDetailContent />
    </Suspense>
  );
}
