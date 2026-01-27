import { Button } from "@/components/ui/button";
import { Gift, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 text-secondary-foreground text-sm mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>Uma nova forma de presentear</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-foreground mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Seus desejos,{" "}
            <span className="text-gradient">suas conexões</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Crie sua lista de desejos e compartilhe com quem você ama. 
            Transforme o ato de presentear em algo mais significativo e pessoal.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="px-8 py-6 text-base rounded-full shadow-soft hover:shadow-medium transition-all">
              <Link to="/login">
                <Gift className="w-5 h-5 mr-2" />
                Criar minha lista
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="px-8 py-6 text-base rounded-full">
              <a href="#como-funciona">
                Saiba mais
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 mt-16 text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              <span>100% gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span>Fácil de usar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
