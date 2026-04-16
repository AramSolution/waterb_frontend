"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ProgramDetailPageView } from "@/features/adminWeb/program/detail/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function ProgramDetailContent() {
  return (
    <AdminLayout>
      <ProgramDetailPageView />
    </AdminLayout>
  );
}

export default function ProgramDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProgramDetailContent />
    </Suspense>
  );
}
