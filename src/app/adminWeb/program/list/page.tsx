"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ProgramListPageView } from "@/features/adminWeb/program/list/ui";

export default function ProgramListPage() {
  return (
    <AdminLayout>
      <ProgramListPageView />
    </AdminLayout>
  );
}
