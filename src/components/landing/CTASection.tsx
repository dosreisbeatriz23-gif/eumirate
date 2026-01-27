import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Crie sua lista em menos de um minuto. É gratuito e sempre será.
          </p>
          <Button asChild size="lg" className="px-8 py-6 text-base rounded-full shadow-soft hover:shadow-medium transition-all">
            <Link to="/login">
              <Gift className="w-5 h-5 mr-2" />
              Criar minha lista agora
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
