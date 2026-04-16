"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MemberListPageView } from "@/features/adminWeb/member/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function MemberListContent() {
  return (
    <AdminLayout>
      <MemberListPageView />
    </AdminLayout>
  );
}

export default function MemberListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MemberListContent />
    </Suspense>
  );
}
