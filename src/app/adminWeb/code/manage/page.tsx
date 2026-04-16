"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { CmmCodeManagePageView } from "@/features/adminWeb/code/manage/ui";

export default function CmmCodeManagePage() {
  return (
    <AdminLayout>
      <CmmCodeManagePageView />
    </AdminLayout>
  );
}
