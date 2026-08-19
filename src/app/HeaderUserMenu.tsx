"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";

export function HeaderUserMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative ml-auto">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Открыть меню пользователя"
        onClick={() => setOpen((current) => !current)}
        className="flex size-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Меню пользователя"
          className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm text-zinc-600" title={userName}>
            {userName}
          </p>
          <div className="my-1 border-t border-zinc-100" />
          <Link
            href="/users"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900"
          >
            Пользователи
          </Link>
          <Link
            href="/activity"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900"
          >
            События
          </Link>
          <div className="my-1 border-t border-zinc-100" />
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900"
            >
              Выйти
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
