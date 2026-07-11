import { Nav } from "@/components/nav/Nav";
import { Hero } from "@/components/hero/Hero";
import { ProjectsGrid } from "@/components/work/ProjectsGrid";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { Footer } from "@/components/footer/Footer";
import { ConsoleDrawer } from "@/components/console/ConsoleDrawer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <ProjectsGrid />
        <SkillsSection />
      </main>
      <Footer />
      <ConsoleDrawer />
    </>
  );
}
