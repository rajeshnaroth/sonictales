"use client";

import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header, Hero, Footer } from "./components/globals";
import { WorksSection, ProductsSection, AboutSection, WorkDetail, ToolsSection } from "./components/sections";
import { AdminLogin, AdminDashboard } from "./components/admin";
import { works as initialWorks, Work } from "./data/works";
import { products } from "./data/products";

const STORAGE_KEY = "sonictales_portfolio_works";
const STORAGE_VERSION_KEY = "sonictales_portfolio_version";
const CURRENT_VERSION = "5.1"; // Update this when changing default data

export default function App() {
  const [works, setWorks] = useState<Work[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize localStorage data
  useEffect(() => {
    try {
      const savedVersion = globalThis.localStorage.getItem(STORAGE_VERSION_KEY);
      const savedWorks = globalThis.localStorage.getItem(STORAGE_KEY);

      // If version doesn't match or no saved works, use fresh data
      if (savedVersion !== CURRENT_VERSION || !savedWorks) {
        setWorks(initialWorks);
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialWorks));
        globalThis.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      } else {
        const parsedWorks = JSON.parse(savedWorks);
        setWorks(parsedWorks);
      }
    } catch (error) {
      globalThis.console.error("Failed to load works from localStorage:", error);
      setWorks(initialWorks);
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialWorks));
      globalThis.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    }
  }, []);

  const handleNavigation = (view: string) => {
    navigate(`/${view === "home" ? "" : view}`);
    globalThis.window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilmClick = (work: Work) => {
    navigate(`/films/${work.id}`);
    globalThis.window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      navigate("/admin");
    } else {
      navigate("/admin/login");
    }
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    navigate("/admin");
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    navigate("/");
  };

  const handleWorksUpdate = (updatedWorks: Work[]) => {
    setWorks(updatedWorks);
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWorks));
    } catch (error) {
      globalThis.console.error("Failed to save works to localStorage:", error);
    }
  };

  const handleToolSelect = (tool: string) => {
    navigate(`/tools/${tool}`);
  };

  // Get current view from location
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.startsWith("/films")) return "films";
    if (path.startsWith("/sounds")) return "sounds";
    if (path.startsWith("/tools")) return "tools";
    if (path.startsWith("/about")) return "about";
    if (path.startsWith("/admin")) return "admin";
    return "home";
  };

  const currentView = getCurrentView();

  // Featured content for home page
  const featuredFilms = works.filter(
    (work) => ["5", "7", "10"].includes(work.id) // Status Change, Canopy, 3 Ghost Stories
  );

  const featuredProducts = products.filter(
    (product) => ["9", "1", "5"].includes(product.id) // Spike, Dune-Ripples, Bladerunner
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Routes>
        <Route path="/admin/login" element={<AdminLogin onLogin={handleAdminLogin} />} />

        <Route path="/admin" element={<AdminDashboard works={works} onWorksUpdate={handleWorksUpdate} onLogout={handleAdminLogout} onBackToSite={() => navigate("/")} />} />

        <Route
          path="/*"
          element={
            <>
              <Header onNavigation={handleNavigation} onAdminClick={handleAdminClick} currentView={currentView} />

              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <Hero />
                      <ProductsSection products={featuredProducts} title="Featured Sounds" showSeeAll={true} onSeeAllClick={() => navigate("/sounds")} />
                      <WorksSection works={featuredFilms} onWorkClick={handleFilmClick} title="Featured Films" showSeeAll={true} onSeeAllClick={() => navigate("/films")} />
                    </>
                  }
                />

                <Route path="/films" element={<WorksSection works={works} onWorkClick={handleFilmClick} title="Films" showSeeAll={false} />} />

                <Route path="/films/:id" element={<FilmDetail works={works} />} />

                <Route path="/sounds" element={<ProductsSection products={products} title="Sound Design" showSeeAll={false} />} />

                <Route path="/tools" element={<ToolsSection onBack={() => navigate("/")} currentTool={null} onToolSelect={handleToolSelect} />} />

                <Route path="/tools/:tool" element={<ToolRoute onBack={() => navigate("/")} onToolSelect={handleToolSelect} />} />

                <Route path="/about" element={<AboutSection onBack={() => navigate("/")} />} />
              </Routes>

              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

// Component to handle individual film details
function FilmDetail({ works }: { works: Work[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const work = works.find((w) => w.id === id);

  if (!work) {
    navigate("/films");
    return null;
  }

  return <WorkDetail work={work} onBack={() => navigate("/films")} />;
}

// Component to handle tool routing
function ToolRoute({ onBack, onToolSelect }: { onBack: () => void; onToolSelect: (tool: string) => void }) {
  const { tool } = useParams();
  return <ToolsSection onBack={onBack} currentTool={tool || null} onToolSelect={onToolSelect} />;
}
