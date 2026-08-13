"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useId, useState } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-semibold hover:bg-zinc-100"
      >
        <span className="flex items-center justify-between">
          {title}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            v
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}