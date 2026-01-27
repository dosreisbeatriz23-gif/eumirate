import HeroSection from "@/components/landing/HeroSection";
import PreviewSection from "@/components/landing/PreviewSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <PreviewSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
