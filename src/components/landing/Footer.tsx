import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="font-serif text-xl font-medium">EUMIRATE</span>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Feito com <Heart className="w-4 h-4 text-primary fill-current" /> para conexões mais significativas
          </p>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} EUMIRATE. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
