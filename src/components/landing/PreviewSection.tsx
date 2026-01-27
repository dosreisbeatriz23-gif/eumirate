import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Heart } from "lucide-react";

const mockItems = [
  {
    id: 1,
    name: "Fones de ouvido sem fio",
    description: "Para meus momentos de música e podcast",
    price: "R$ 200 - R$ 400",
    priority: "alta",
    reserved: false,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
  },
  {
    id: 2,
    name: "Livro de receitas",
    description: "Quero aprender novas receitas vegetarianas",
    price: "R$ 50 - R$ 100",
    priority: "média",
    reserved: true,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    name: "Vaso de cerâmica",
    description: "Para decorar meu home office",
    price: "R$ 80 - R$ 150",
    priority: "baixa",
    reserved: false,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop",
  },
];

const priorityColors = {
  alta: "bg-primary/10 text-primary border-primary/20",
  média: "bg-accent text-accent-foreground border-accent",
  baixa: "bg-secondary text-secondary-foreground border-secondary",
};

const PreviewSection = () => {
  return (
    <section id="como-funciona" className="py-24 bg-muted/30">
      <div className="container px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4">
            Simples e elegante
          </h2>
          <p className="text-muted-foreground text-lg">
            Veja como sua lista de desejos vai ficar. Bonita, organizada e fácil de compartilhar.
          </p>
        </div>

        {/* Preview cards */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/50">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h3 className="text-xl font-serif font-medium">Lista da Marina</h3>
                <p className="text-muted-foreground text-sm">3 desejos • 1 reservado</p>
              </div>
            </div>

            {/* Items grid */}
            <div className="grid gap-4">
              {mockItems.map((item) => (
                <Card key={item.id} className={`group hover-lift overflow-hidden ${item.reserved ? 'opacity-75' : ''}`}>
                  <div className="flex gap-4 p-4">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {item.reserved && (
                        <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                          <Heart className="w-6 h-6 text-primary-foreground fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 line-clamp-1">{item.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{item.price}</span>
                        <Badge variant="outline" className={priorityColors[item.priority as keyof typeof priorityColors]}>
                          {item.priority}
                        </Badge>
                        {item.reserved && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                            Reservado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreviewSection;
