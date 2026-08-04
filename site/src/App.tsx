import { useTranslation } from "react-i18next";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Edges } from "./sections/Edges";
import { Modules } from "./sections/Modules";
import { TrustEvidence } from "./sections/TrustEvidence";
import { Culture } from "./sections/Culture";
import { Access } from "./sections/Access";
import { Footer } from "./sections/Footer";

function App() {
  const { t } = useTranslation();
  return (
    <>
      <a href="#main" className="sr-only">
        {t("common.skipToContent")}
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <Edges />
        <Modules />
        <TrustEvidence />
        <Culture />
        <Access />
      </main>
      <Footer />
    </>
  );
}

export default App;
