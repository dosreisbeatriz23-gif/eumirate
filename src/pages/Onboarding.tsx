import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Gift, Users, Share2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ONBOARDING_KEY = "eumirate_onboarding_done";

const slides = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao EUMIRATE",
    description: "Crie listas de desejos elegantes e compartilhe com quem você ama.",
    gradient: "from-primary/10 to-accent/10",
  },
  {
    icon: Gift,
    title: "Organize seus desejos",
    description: "Adicione produtos com links, fotos e faixas de preço. Tudo em um só lugar.",
    gradient: "from-accent/10 to-secondary/10",
  },
  {
    icon: Users,
    title: "Crie grupos",
    description: "Reúna amigos e família em grupos para compartilhar listas e trocar presentes.",
    gradient: "from-secondary/10 to-primary/10",
  },
  {
    icon: Share2,
    title: "Compartilhe com facilidade",
    description: "Envie o link da sua lista para qualquer pessoa. Simples, rápido e bonito.",
    gradient: "from-primary/10 to-accent/10",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      localStorage.setItem(ONBOARDING_KEY, "true");
      navigate("/home", { replace: true });
    }
  }, [user, loading, navigate]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const scrollNext = () => emblaApi?.scrollNext();

  const isLast = selectedIndex === slides.length - 1;

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Decorative blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Skip */}
      <div className="relative z-10 flex justify-end p-6">
        <button
          onClick={handleFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Carousel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((slide, i) => (
              <div key={i} className="min-w-0 shrink-0 grow-0 basis-full px-4">
                <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                  <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-10 shadow-soft`}>
                    <slide.icon className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-4">
                    {slide.title}
                  </h2>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {slide.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === selectedIndex
                  ? "w-8 h-2 bg-primary"
                  : "w-2 h-2 bg-border hover:bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom action */}
      <div className="relative z-10 p-6 pb-10">
        {isLast ? (
          <Button
            onClick={handleFinish}
            size="lg"
            className="w-full py-6 text-base rounded-full shadow-soft hover:shadow-medium transition-all"
          >
            Começar agora
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={scrollNext}
            size="lg"
            variant="outline"
            className="w-full py-6 text-base rounded-full"
          >
            Próximo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </main>
  );
};

export default Onboarding;
