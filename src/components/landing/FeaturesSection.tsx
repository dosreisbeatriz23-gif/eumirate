import { Gift, Link, Users, Sparkles } from "lucide-react";

const features = [
  {
    icon: Gift,
    title: "Crie sua lista",
    description: "Adicione seus desejos com fotos, descrições e faixas de preço. Organize por prioridade.",
  },
  {
    icon: Link,
    title: "Compartilhe o link",
    description: "Gere um link único e envie para amigos e família. Eles acessam sem precisar de conta.",
  },
  {
    icon: Users,
    title: "Receba com carinho",
    description: "Visitantes reservam presentes de forma anônima. A surpresa é mantida até o final!",
  },
  {
    icon: Sparkles,
    title: "Conecte-se",
    description: "Mais do que uma lista: um espaço para expressar quem você é e o que valoriza.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-lg">
            Em poucos passos, você transforma o ato de presentear em algo especial.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
