"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BoardDetailPageView } from "@/features/adminWeb/board/detail/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function BoardDetailContent() {
  return (
    <AdminLayout>
      <BoardDetailPageView />
    </AdminLayout>
  );
}

export default function BoardDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BoardDetailContent />
    </Suspense>
  );
}

