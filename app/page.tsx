import { Nav } from "@/components/nav/Nav";
import { ScrollProgress } from "@/components/nav/ScrollProgress";
import { PageGlow } from "@/components/background/PageGlow";
import { Hero } from "@/components/hero/Hero";
import { AboutSection } from "@/components/about/AboutSection";
import { ProjectsGrid } from "@/components/work/ProjectsGrid";
import { ExperienceSection } from "@/components/experience/ExperienceSection";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { CertificationsSection } from "@/components/certifications/CertificationsSection";
import { GithubActivitySection } from "@/components/github/GithubActivitySection";
import { Footer } from "@/components/footer/Footer";
import { ConsoleDrawer } from "@/components/console/ConsoleDrawerLazy";

export default function Home() {
  return (
    <>
      <Nav />
      <ScrollProgress />
      <main className="relative flex-1">
        <PageGlow />
        <Hero />
        <AboutSection />
        <ExperienceSection />
        <ProjectsGrid />
        <SkillsSection />
        <CertificationsSection />
        <GithubActivitySection />
      </main>
      <Footer />
      <ConsoleDrawer />
    </>
  );
}
