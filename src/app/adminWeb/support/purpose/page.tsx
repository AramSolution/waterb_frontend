"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { PurposeManagePageView } from "@/features/adminWeb/support/purpose/ui";

export default function SupportPurposePage() {
  return (
    <AdminLayout>
      <PurposeManagePageView />
    </AdminLayout>
  );
}
