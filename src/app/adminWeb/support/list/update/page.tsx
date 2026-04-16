"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { SupportUpdatePageView } from "@/features/adminWeb/support/update/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function SupportUpdateContent() {
  return (
    <AdminLayout>
      <SupportUpdatePageView />
    </AdminLayout>
  );
}

export default function SupportUpdatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupportUpdateContent />
    </Suspense>
  );
}


