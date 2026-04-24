"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { FeePayerBasicRegisterPageView } from "@/features/adminWeb/support/feePayerRegister/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function FeePayerBasicRegisterContent() {
  return (
    <AdminLayout>
      <FeePayerBasicRegisterPageView />
    </AdminLayout>
  );
}

export default function SupportListRegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FeePayerBasicRegisterContent />
    </Suspense>
  );
}
