'use client';

import React from 'react';
import { FloatingHelp } from './FloatingHelp';
import { SecretaryAlert } from './SecretaryAlert';

export function AdminShell({ children, sidebar, footerItems }: { children: React.ReactNode, sidebar: React.ReactNode, footerItems?: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden font-body antialiased">
      {sidebar}
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        <SecretaryAlert />
        <div className="p-3 sm:p-5 lg:p-6 flex-1 w-full max-w-none pb-12">
          {children}
        </div>
      </main>
      <FloatingHelp />
    </div>
  );
}

export default AdminShell;
