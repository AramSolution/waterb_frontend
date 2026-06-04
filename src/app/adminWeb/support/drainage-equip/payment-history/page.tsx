"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { DrainageEquipPaymentHistoryPageView } from "@/features/adminWeb/support/drainageEquip/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function DrainageEquipPaymentHistoryContent() {
  return (
    <AdminLayout>
      <DrainageEquipPaymentHistoryPageView />
    </AdminLayout>
  );
}

export default function DrainageEquipPaymentHistoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DrainageEquipPaymentHistoryContent />
    </Suspense>
  );
}
