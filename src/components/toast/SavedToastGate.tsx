"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./ToastProvider";

/**
 * Shows a "Сохранено" toast after a create/update redirect (UI-004).
 * Server actions redirect here with `?saved=1`; this strips the flag
 * on mount the same way ExperimentPromptGate strips `?promptExperiment=1`
 * — so a page refresh doesn't re-show the toast, and the two gates
 * converge on the same clean URL regardless of mount order.
 */
export function SavedToastGate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const shouldShow = searchParams.get("saved") === "1";
  const fired = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke of
    // effects — without this, the toast would show twice per save.
    if (shouldShow && !fired.current) {
      fired.current = true;
      showToast("Сохранено");
      router.replace(pathname, { scroll: false });
    }
    // Only fire once, on mount for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
