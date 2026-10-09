'use client';

import React from 'react';
import { FloatingHelp } from './FloatingHelp';
import { SecretaryAlert } from './SecretaryAlert';

export function AdminShell({ children, sidebar, footerItems }: { children: React.ReactNode, sidebar: React.ReactNode, footerItems?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {sidebar}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <SecretaryAlert />
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
      <FloatingHelp />
    </div>
  );
}

export default AdminShell;
