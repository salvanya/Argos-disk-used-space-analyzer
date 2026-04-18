import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuroraBackground } from "./components/layout/AuroraBackground";
import "./i18n";
import { fetchConfig, fetchSystemInfo, setToken } from "./lib/api";
import { Home } from "./pages/Home";
import { Explorer } from "./pages/Explorer";
import { useAppStore } from "./stores/appStore";

function AppBootstrap() {
  const { setToken: storeToken, setIsAdmin } = useAppStore();

  useEffect(() => {
    async function bootstrap() {
      const config = await fetchConfig();
      setToken(config.token);
      storeToken(config.token);
      const info = await fetchSystemInfo();
      setIsAdmin(info.is_admin);
    }
    bootstrap().catch(console.error);
  }, [storeToken, setIsAdmin]);

  return (
    <>
      <AuroraBackground />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explorer" element={<Explorer />} />
      </Routes>
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
