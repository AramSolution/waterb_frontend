"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { DrainageEquipBasicDetailPageView } from "@/features/adminWeb/support/drainageEquip/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function DrainageEquipDetailContent() {
  return (
    <AdminLayout>
      <DrainageEquipBasicDetailPageView />
    </AdminLayout>
  );
}

export default function DrainageEquipDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DrainageEquipDetailContent />
    </Suspense>
  );
}
