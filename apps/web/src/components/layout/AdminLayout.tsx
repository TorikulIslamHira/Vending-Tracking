"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background font-sans overflow-x-hidden">
      {/* Fixed Sidebar (Desktop only) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
