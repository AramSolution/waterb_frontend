"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { SupportListPageView } from "@/features/adminWeb/support/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function SupportListContent() {
  return (
    <AdminLayout>
      <SupportListPageView />
    </AdminLayout>
  );
}

export default function SupportListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupportListContent />
    </Suspense>
  );
}



