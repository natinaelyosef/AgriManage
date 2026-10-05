import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { CtaBand, EthiopiaBand, StatsStrip } from "@/components/marketing/sections";

export const metadata = {
  title: "Farm management software for Ethiopian agriculture",
  description:
    "AgriManage brings farms, fields, seasons, crops, workers, inventory, harvests and finance into one system built for Ethiopian agriculture — with the Ethiopian calendar, quintal units and Amharic UI.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        <MarketingHero />
        <FeatureGrid />
        <EthiopiaBand />
        <StatsStrip />
        <CtaBand />
      </main>
      <MarketingFooter />
    </div>
  );
}
