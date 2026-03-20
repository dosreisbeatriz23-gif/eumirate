import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, List, PlusCircle, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const desktopLinks = [
  { label: "Criar Lista", path: "/criar-lista" },
  { label: "Minhas Listas", path: "/dashboard" },
  { label: "Grupos", path: "/grupos" },
  { label: "Perfil", path: "/perfil" },
];

const mobileTabs = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Listas", icon: List, path: "/meus-desejos" },
  { label: "Adicionar", icon: PlusCircle, path: "/adicionar" },
  { label: "Grupos", icon: Users, path: "/grupos" },
  { label: "Perfil", icon: User, path: "/perfil" },
];

function isActive(current: string, path: string) {
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
      <header className="hidden md:block border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-[60px] flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xl font-serif font-medium"
          >
            <span className="text-gradient">EUMIRATE</span>
          </button>
          <nav className="flex items-center gap-1">
            {desktopLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(location.pathname, link.path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Header (logo only) */}
      <header className="md:hidden border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-[52px] flex items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-lg font-serif font-medium"
          >
            <span className="text-gradient">EUMIRATE</span>
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around h-16">
          {mobileTabs.map((tab) => {
            const active = isActive(location.pathname, tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
