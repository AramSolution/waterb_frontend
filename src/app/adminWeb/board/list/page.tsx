"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BoardListPageView } from "@/features/adminWeb/board/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function BoardListContent() {
  return (
    <AdminLayout>
      <BoardListPageView />
    </AdminLayout>
  );
}

export default function BoardListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BoardListContent />
    </Suspense>
  );
}

