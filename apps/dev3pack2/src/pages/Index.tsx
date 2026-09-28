import Header from "@/components/Header";
import { AppProvider, useApp } from "@/lib/appContext";
import Achievement from "./Achievement";
import Challenge from "./Challenge";
import Onboarding from "./Onboarding";
import Roadmap from "./Roadmap";

function ScreenRouter() {
  const { screen } = useApp();

  switch (screen) {
    case "onboarding":
      return <Onboarding />;
    case "roadmap":
      return <Roadmap />;
    case "challenge":
      return <Challenge />;
    case "achievement":
      return <Achievement />;
    default:
      return <Onboarding />;
  }
}

export default function Index() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background text-foreground font-mono">
        <Header />
        <ScreenRouter />
      </div>
    </AppProvider>
  );
}
