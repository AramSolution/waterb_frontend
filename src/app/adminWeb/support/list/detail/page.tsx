"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { SupportDetailListPageView } from "@/features/adminWeb/support/detail/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function SupportDetailListContent() {
  return (
    <AdminLayout>
      <SupportDetailListPageView />
    </AdminLayout>
  );
}

export default function SupportDetailListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupportDetailListContent />
    </Suspense>
  );
}


