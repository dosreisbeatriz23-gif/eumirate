import { useLocalUser } from "@/hooks/useLocalUser";
import { User, Settings, HelpCircle, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  { label: "Configurações", icon: Settings },
  { label: "Ajuda", icon: HelpCircle },
  { label: "Sair", icon: LogOut },
];

const Perfil = () => {
  const { userId } = useLocalUser();

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-lg page-enter">
      <div className="flex flex-col items-center mb-12">
        <div className="w-24 h-24 rounded-3xl bg-muted/40 flex items-center justify-center mb-5 shadow-card">
          <User className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-1">Meu Perfil</h2>
        <p className="text-xs text-muted-foreground/60 tracking-wide">ID: {userId.slice(0, 8)}...</p>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/20 shadow-soft hover:shadow-card transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-muted/60 transition-colors duration-300">
              <item.icon className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Perfil;
