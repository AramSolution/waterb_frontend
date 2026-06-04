"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { DrainageEquipLedgerPageView } from "@/features/adminWeb/support/drainageEquip/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function SupportDrainageEquipContent() {
  return (
    <AdminLayout>
      <DrainageEquipLedgerPageView />
    </AdminLayout>
  );
}

export default function SupportDrainageEquipPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupportDrainageEquipContent />
    </Suspense>
  );
}
