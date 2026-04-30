import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, FileUp, KeyRound, LayoutDashboard, LogOut, Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { apexApi } from "@/lib/api";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/licenses", label: "Licenses", icon: KeyRound },
  { to: "/admin/files", label: "Files", icon: FileUp },
  { to: "/admin/api", label: "API Tester", icon: Terminal },
];

export default function AdminLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-neon shadow-neon flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">APEX</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin Console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "text-neon bg-neon/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-neon rounded-full shadow-neon"
                    />
                  )}
                  <n.icon className="h-4 w-4" />
                  <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2 rounded-md bg-surface-2 text-xs">
            <div className="text-muted-foreground">Signed in as</div>
            <div className="font-mono text-neon truncate">{session?.username}</div>
          </div>
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            API · {apexApi.isMock ? "mock" : "live"}
          </div>
          <Button variant="ghostNeon" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
