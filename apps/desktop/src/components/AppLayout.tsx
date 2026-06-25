import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GitBranch,
  Home,
  Moon,
  Network,
  Search,
  Settings,
  Sparkles,
  Sun,
  FolderTree,
} from "lucide-react";
import clsx from "clsx";
import { useProject } from "@/context/ProjectContext";
import { useTheme } from "@/hooks/useTheme";

const links = [
  { to: "/", icon: Home, key: "home" },
  { to: "/explorer", icon: FolderTree, key: "explorer" },
  { to: "/graph", icon: Network, key: "graph" },
  { to: "/search", icon: Search, key: "search" },
  { to: "/ai", icon: Sparkles, key: "ai" },
  { to: "/settings", icon: Settings, key: "settings" },
  { to: "/git", icon: GitBranch, key: "git" },
] as const;

export function AppLayout() {
  const { t } = useTranslation();
  const { project, apiOnline } = useProject();
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <aside
        className="flex w-64 shrink-0 flex-col p-4"
        style={{
          borderInlineEnd: "1px solid var(--border)",
          backgroundColor: isLight ? "rgba(250,250,249,0.97)" : "rgba(12,10,9,0.9)",
        }}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: "var(--accent-bg-icon)" }}
          >
            <BookOpen
              className="h-5 w-5"
              style={{ color: isLight ? "var(--accent-text)" : "var(--accent-text)" }}
            />
          </div>
          <div>
            <div className="font-semibold" style={{ color: "var(--accent-text-dim)" }}>
              {t("app.name")}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("app.tagline")}
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx("nav-link", isActive && "nav-link-active")
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t(isLight ? "theme.light" : "theme.dark")}
          </span>
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-2 transition"
            style={{ color: "var(--text-secondary)" }}
            title={t(isLight ? "theme.switchToDark" : "theme.switchToLight")}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "var(--bg-muted)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-secondary)";
            }}
          >
            {isLight ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>

        <div
          className="mt-3 rounded-lg p-3 text-xs"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: isLight
              ? "rgba(245,245,244,0.8)"
              : "rgba(28,25,23,0.5)",
          }}
        >
          <div
            className="mb-1 font-medium"
            style={{ color: apiOnline ? "#34d399" : "#f87171" }}
          >
            API {apiOnline ? "online" : "offline"}
          </div>
          <div className="truncate" style={{ color: "var(--text-muted)" }}>
            {project?.projectRoot ?? t("home.noProject")}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
