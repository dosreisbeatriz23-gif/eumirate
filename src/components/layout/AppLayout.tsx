import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, List, PlusCircle, Users, User } from "lucide-react";
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
  { label: "Adicionar", icon: PlusCircle, path: "/adicionar" },
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      <header className="hidden md:block bg-card/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="container mx-auto px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xl font-serif tracking-tight text-foreground hover:opacity-70 transition-opacity"
          >
            EUMIRATE
          </button>
          <nav className="flex items-center gap-0.5">
            {desktopLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-4 py-2 rounded-full text-[13px] font-medium tracking-wide transition-all duration-300",
                  isActive(location.pathname, link.path)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-card/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50">
        <div className="px-5 h-14 flex items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-lg font-serif tracking-tight text-foreground"
          >
            EUMIRATE
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
            const isAdd = tab.path === "/adicionar";
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300",
                  isAdd
                    ? "relative -mt-6"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                )}
              >
                {isAdd ? (
                  <span className="flex items-center justify-center w-[52px] h-[52px] rounded-2xl bg-primary text-primary-foreground shadow-elevated">
                    <tab.icon className="w-5 h-5" strokeWidth={2} />
                  </span>
                ) : (
                  <>
                    <tab.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                    <span className={cn("text-[10px] tracking-wide", active ? "font-medium" : "font-normal")}>
                      {tab.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
