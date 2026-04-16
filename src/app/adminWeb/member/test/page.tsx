"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MemberTestPageView } from "@/features/adminWeb/member/test/ui";

export default function MemberTestPage() {
  return (
    <AdminLayout>
      <MemberTestPageView />
    </AdminLayout>
  );
}
