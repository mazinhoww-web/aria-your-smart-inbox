import {
  Inbox,
  Send,
  Clock,
  Archive,
  Star,
  Settings,
  Zap,
  Search,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAriaStore, CATEGORY_MAP } from "@/store/useAriaStore";

const CATEGORIES = [
  { key: "to_respond", color: "var(--cat-respond)" },
  { key: "fyi", color: "var(--cat-fyi)" },
  { key: "comment", color: "var(--cat-comment)" },
  { key: "notification", color: "var(--cat-notification)" },
  { key: "meeting_update", color: "var(--cat-meeting)" },
  { key: "awaiting_reply", color: "var(--cat-awaiting)" },
  { key: "actioned", color: "var(--cat-actioned)" },
  { key: "marketing", color: "var(--cat-marketing)" },
];

const NAV_ITEMS = [
  { icon: Inbox, label: "Inbox", path: "/inbox" },
  { icon: Send, label: "Enviados", path: "/inbox/sent" },
  { icon: Clock, label: "Snooze", path: "/inbox/snoozed" },
  { icon: Archive, label: "Arquivo", path: "/inbox/archive" },
  { icon: Star, label: "Favoritos", path: "/inbox/starred" },
];

export function AppSidebar() {
  const categoryCounts = useAriaStore((s) => s.categoryCounts);

  return (
    <aside className="w-[260px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl text-foreground tracking-tight">
            ARIA
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground bg-surface hover:bg-surface-hover transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <kbd className="ml-auto text-[10px] font-label bg-muted px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                isActive
                  ? "bg-surface text-foreground font-medium"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-5 my-3 h-px bg-sidebar-border" />

      {/* Categories */}
      <div className="px-3 flex-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-label text-muted-foreground/60 uppercase tracking-wider mb-2">
          Categorias
        </p>
        <div className="space-y-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors group"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${cat.color})` }}
              />
              <span className="flex-1 text-left">
                {CATEGORY_MAP[cat.key] ?? cat.key}
              </span>
              <span className="text-[10px] font-label text-muted-foreground/50 group-hover:text-muted-foreground">
                {categoryCounts[cat.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <NavLink
          to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </NavLink>
      </div>
    </aside>
  );
}
