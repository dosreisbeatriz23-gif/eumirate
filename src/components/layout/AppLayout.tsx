import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Home, List, Users, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const desktopLinks = [
  { label: "Home", path: "/home" },
  { label: "Criar Lista", path: "/criar-lista" },
  { label: "Minhas Listas", path: "/dashboard" },
  { label: "Grupos", path: "/grupos" },
  { label: "Perfil", path: "/perfil" },
];

const mobileTabs = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Listas", icon: List, path: "/meus-desejos" },
  { label: "Grupos", icon: Users, path: "/grupos" },
  { label: "Perfil", icon: User, path: "/perfil" },
];

function isActive(current: string, path: string) {
  if (path === "/home") return current === "/home";
  if (path === "/dashboard") return current === "/dashboard" || current === "/meus-desejos";
  if (path === "/meus-desejos") return current === "/meus-desejos" || current.startsWith("/lista/");
  return current.startsWith(path);
}

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 bg-primary shadow-md">
        <div className="container mx-auto px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="font-gliker tracking-tight text-primary-foreground/90 hover:text-primary-foreground transition-colors text-4xl"
          >
            eumirate
          </button>
          <nav className="flex items-center gap-1">
            {desktopLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all duration-300",
                  isActive(location.pathname, link.path)
                    ? "text-primary-foreground bg-white/20"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-primary shadow-md">
        <div className="px-5 h-12 flex items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-lg font-gliker tracking-tight text-primary-foreground/90"
          >
            eumirate
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 pb-24 md:pb-0">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/30">
        <div className="flex items-center justify-around h-[72px] px-2 pb-1">
          {mobileTabs.map((tab) => {
            const active = isActive(location.pathname, tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300",
                  active ? "text-foreground" : "text-muted-foreground/60"
                )}
              >
                <tab.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn("text-[10px] tracking-wide", active ? "font-medium" : "font-normal")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
