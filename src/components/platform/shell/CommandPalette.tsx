'use client';

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { STATIC_ROUTES, type RouteEntry } from "./platformRoutes";
import { scorePaletteMatch, SEARCH_GROUPS } from "./searchCatalog";

type PaletteEntry = RouteEntry & {
  id?: string;
  keywords?: readonly string[];
};

function RouteItem({ route, onSelect }: { route: PaletteEntry; onSelect: (href: string) => void }) {
  return (
    <Command.Item
      value={route.id ?? route.href}
      keywords={[route.label, route.href, route.hint ?? "", ...(route.keywords ?? [])]}
      onSelect={() => onSelect(route.href)}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] text-content outline-none transition data-[selected=true]:bg-app-overlay data-[selected=true]:text-brass-bright"
    >
      <span className="flex items-baseline gap-2">
        <span>{route.label}</span>
        {route.hint ? <span className="text-[11px] text-content-tertiary">{route.hint}</span> : null}
      </span>
      <span className="font-mono text-[11px] text-content-tertiary">{route.href}</span>
    </Command.Item>
  );
}

/** Cmd/Ctrl+K palette. Radix handles focus trapping and Escape while open. */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenRequest = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("syscraft:open-search", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("syscraft:open-search", onOpenRequest);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search SysCraft"
      filter={scorePaletteMatch}
      loop
      overlayClassName="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[12vh] z-[81] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-app-raised text-content shadow-lift"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
        <Command.Input
          autoFocus
          placeholder="Search lessons, labs, and tools"
          aria-label="Search lessons, labs, and tools"
          className="h-12 w-full bg-transparent text-[14px] text-content outline-none placeholder:text-content-tertiary"
        />
      </div>

      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-[13px] text-content-secondary">
          No matches. Try a different phrase.
        </Command.Empty>

        <Command.Group heading="Destinations">
          {STATIC_ROUTES.map((route) => (
            <RouteItem key={route.href} route={route} onSelect={go} />
          ))}
        </Command.Group>

        {SEARCH_GROUPS.map((group) => (
          <Command.Group key={group.type} heading={group.heading}>
            {group.entries.map((route) => (
              <RouteItem key={route.id} route={route} onSelect={go} />
            ))}
          </Command.Group>
        ))}
      </Command.List>

      <div className="border-t border-line px-4 py-2 text-[11px] text-content-tertiary">
        Up / Down to navigate · Enter to open · Esc to close
      </div>
    </Command.Dialog>
  );
}
