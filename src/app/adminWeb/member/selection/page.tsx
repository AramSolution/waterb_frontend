"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { SelectionWorkPageView } from "@/features/adminWeb/member/selection/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function SelectionContent() {
  return (
    <AdminLayout>
      <SelectionWorkPageView />
    </AdminLayout>
  );
}

export default function SelectionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SelectionContent />
    </Suspense>
  );
}
