import { AnalyticsPage } from "./pages/Analytics";
import { CasesPage } from "./pages/Cases";
import { CoveragePage } from "./pages/Coverage";
import { FeedbackPage } from "./pages/Feedback";
import { NarrativesPage } from "./pages/Narratives";
import { PeoplePage } from "./pages/People";
import { PortfolioPage } from "./pages/Portfolio";
import { StudioPage } from "./pages/Studio";
import { Shell } from "./Shell";
import { useApp } from "./store";

export function App() {
  const { state } = useApp();
  return (
    <Shell>
      {state.page === "coverage" && <CoveragePage />}
      {state.page === "studio" && <StudioPage />}
      {state.page === "cases" && <CasesPage />}
      {state.page === "narratives" && <NarrativesPage />}
      {state.page === "analytics" && <AnalyticsPage />}
      {state.page === "people" && <PeoplePage />}
      {state.page === "feedback" && <FeedbackPage />}
      {state.page === "portfolio" && <PortfolioPage />}
    </Shell>
  );
}
