"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { DrainageEquipBasicRegisterPageView } from "@/features/adminWeb/support/drainageEquip/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function DrainageEquipRegisterContent() {
  return (
    <AdminLayout>
      <DrainageEquipBasicRegisterPageView />
    </AdminLayout>
  );
}

export default function DrainageEquipRegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DrainageEquipRegisterContent />
    </Suspense>
  );
}
