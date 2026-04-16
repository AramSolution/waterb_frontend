"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MenuTreePageView } from "@/features/adminWeb/menu/tree/ui";

export default function MenuTreePage() {
  return (
    <AdminLayout>
      <MenuTreePageView />
    </AdminLayout>
  );
}
