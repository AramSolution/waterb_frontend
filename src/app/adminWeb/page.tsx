"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { DashboardPageView } from "@/features/adminWeb/dashboard/ui";

export default function HomePage() {
  return (
    <AdminLayout>
      <DashboardPageView />
    </AdminLayout>
  );
}
