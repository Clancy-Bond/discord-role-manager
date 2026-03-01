"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  guildId: string;
}

const tabs = [
  {
    label: "Roles",
    path: "",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: "Channels",
    path: "/channels",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18" />
      </svg>
    ),
  },
  {
    label: "Command",
    path: "/command",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
      </svg>
    ),
  },
  {
    label: "Admin",
    path: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export default function BottomNav({ guildId }: BottomNavProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/${guildId}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.path}`;
          const isActive =
            tab.path === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.label}
              href={href}
              className={`tap-target flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
                isActive ? "text-accent" : "text-text-muted"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
