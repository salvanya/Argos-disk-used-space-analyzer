import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuroraBackground } from "./components/layout/AuroraBackground";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./i18n";
import { fetchConfig, fetchSystemInfo, setToken } from "./lib/api";
import { Home } from "./pages/Home";
import { Explorer } from "./pages/Explorer";
import { useAppStore } from "./stores/appStore";

function AppBootstrap() {
  const { setToken: storeToken, setIsAdmin, setPlatform, locale, theme } = useAppStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Hydrate theme class (belt-and-suspenders; index.html inline script handles flash)
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale, i18n]);

  useEffect(() => {
    async function bootstrap() {
      const config = await fetchConfig();
      setToken(config.token);
      storeToken(config.token);
      const info = await fetchSystemInfo();
      setIsAdmin(info.is_admin);
      setPlatform(info.platform);
    }
    bootstrap().catch(console.error);
  }, [storeToken, setIsAdmin, setPlatform]);

  return (
    <>
      <AuroraBackground />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explorer" element={<Explorer />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  );
}
