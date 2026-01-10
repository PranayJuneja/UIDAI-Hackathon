"use client";

import HeroSection from "./components/Home/HeroSection";
import PulseVectorSection from "./components/Home/PulseVectorSection";
import MethodologySection from "./components/Home/MethodologySection";
import TechStackSection from "./components/Home/TechStackSection";
import SystemArchitectureSection from "./components/Home/SystemArchitectureSection";
import { PageLayout } from "./components/UI";

export default function Home() {
  return (
    <PageLayout showAurora={false}>
      <HeroSection />
      <SystemArchitectureSection />
      <PulseVectorSection />
      <MethodologySection />
      <TechStackSection />
    </PageLayout>
  );
}
