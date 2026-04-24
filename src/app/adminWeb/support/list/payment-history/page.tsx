"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { PaymentHistoryPageView } from "@/features/adminWeb/support/paymentHistory/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function PaymentHistoryContent() {
  return (
    <AdminLayout>
      <PaymentHistoryPageView />
    </AdminLayout>
  );
}

export default function SupportPaymentHistoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentHistoryContent />
    </Suspense>
  );
}
