import { useNavigate } from "react-router-dom";
import {
  Users,
  Heart,
  Briefcase,
  HeartHandshake,
  Star,
  Plane,
  Settings2,
  Home,
} from "lucide-react";

const grupos = [
  { label: "Família", icon: Home, color: "bg-primary/15 text-primary" },
  { label: "Amigos", icon: Users, color: "bg-secondary text-secondary-foreground" },
  { label: "Trabalho", icon: Briefcase, color: "bg-accent text-accent-foreground" },
  { label: "Casal", icon: Heart, color: "bg-primary/15 text-primary" },
  { label: "Melhores Amigos", icon: Star, color: "bg-secondary text-secondary-foreground" },
  { label: "Viagem em Grupo", icon: Plane, color: "bg-accent text-accent-foreground" },
  { label: "Grupo Personalizado", icon: Settings2, color: "bg-muted text-muted-foreground" },
];

const Grupos = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-2xl">
      <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-6">
        Grupos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {grupos.map((g) => (
          <button
            key={g.label}
            onClick={() => navigate(`/criar-lista?grupo=${encodeURIComponent(g.label)}`)}
            className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${g.color} border border-border/30`}
          >
            <g.icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium leading-tight">{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Grupos;
