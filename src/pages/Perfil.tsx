import { useLocalUser } from "@/hooks/useLocalUser";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const menuItems = [
  { label: "Configurações", icon: Settings },
  { label: "Ajuda", icon: HelpCircle },
  { label: "Sair", icon: LogOut },
];

const Perfil = () => {
  const { userId } = useLocalUser();

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-lg">
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-serif font-medium text-foreground mb-1">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground">ID: {userId.slice(0, 8)}...</p>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <Card
            key={item.label}
            className="rounded-2xl border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <CardContent className="flex items-center gap-3 p-4">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Perfil;
