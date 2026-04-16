"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MenuMakePageView } from "@/features/adminWeb/menu/make/ui";

export default function MenuMakePage() {
  return (
    <AdminLayout>
      <MenuMakePageView />
    </AdminLayout>
  );
}