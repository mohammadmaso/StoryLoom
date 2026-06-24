import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GitBranch,
  Home,
  Network,
  Search,
  Settings,
  Sparkles,
  FolderTree,
} from "lucide-react";
import clsx from "clsx";
import { useProject } from "@/context/ProjectContext";

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

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-e border-stone-800 bg-stone-950/90 p-4">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="rounded-lg bg-amber-800 p-2">
            <BookOpen className="h-5 w-5 text-amber-100" />
          </div>
          <div>
            <div className="font-semibold text-amber-100">{t("app.name")}</div>
            <div className="text-xs text-stone-500">{t("app.tagline")}</div>
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

        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/50 p-3 text-xs">
          <div
            className={clsx(
              "mb-1 font-medium",
              apiOnline ? "text-emerald-400" : "text-red-400",
            )}
          >
            API {apiOnline ? "online" : "offline"}
          </div>
          <div className="truncate text-stone-500">
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
