import { Nav } from "@/components/nav/Nav";
import { Hero } from "@/components/hero/Hero";
import { AboutSection } from "@/components/about/AboutSection";
import { ProjectsGrid } from "@/components/work/ProjectsGrid";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { Footer } from "@/components/footer/Footer";
import { ConsoleDrawer } from "@/components/console/ConsoleDrawer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <AboutSection />
        <ProjectsGrid />
        <ExperienceSection />
        <SkillsSection />
      </main>
      <Footer />
      <ConsoleDrawer />
    </>
  );
}
