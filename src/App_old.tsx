"use client";

import { useState, useEffect } from "react";
import { Header, Hero, Footer } from "./components/globals";
import { WorksSection, ProductsSection, AboutSection, WorkDetail, ToolsSection } from "./components/sections";
import { AdminLogin, AdminDashboard } from "./components/admin";
import { works as initialWorks, Work } from "./data/works";
import { products } from "./data/products";

const STORAGE_KEY = "sonictales_portfolio_works";
const STORAGE_VERSION_KEY = "sonictales_portfolio_version";
const CURRENT_VERSION = "5.1"; // Update this when changing default data

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "films" | "sounds" | "tools" | "about" | "film-detail" | "admin-login" | "admin">("home");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);

  // 初期化時にlocalStorageからデータを読み込み
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

  const handleFilmClick = (work: Work) => {
    setSelectedWork(work);
    setCurrentView("film-detail");
    // Scroll to top when opening film detail
    globalThis.window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigation = (view: "home" | "films" | "sounds" | "tools" | "about") => {
    setCurrentView(view);
    setSelectedWork(null);
    setCurrentTool(null);
    globalThis.window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      setCurrentView("admin");
    } else {
      setCurrentView("admin-login");
    }
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    setCurrentView("admin");
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    handleNavigation("home");
  };

  const handleWorksUpdate = (updatedWorks: Work[]) => {
    setWorks(updatedWorks);
    // localStorageに保存
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWorks));
    } catch (error) {
      globalThis.console.error("Failed to save works to localStorage:", error);
    }
  };

  const handleToolSelect = (tool: string) => {
    setCurrentTool(tool);
  };

  // Featured content for home page
  const featuredFilms = works.filter(
    (work) => ["5", "7", "10"].includes(work.id) // Status Change, Canopy, 3 Ghost Stories
  );

  const featuredProducts = products.filter(
    (product) => ["9", "1", "5"].includes(product.id) // Spike, Dune-Ripples, Bladerunner
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {currentView === "admin-login" && <AdminLogin onLogin={handleAdminLogin} />}

      {currentView === "admin" && <AdminDashboard works={works} onWorksUpdate={handleWorksUpdate} onLogout={handleAdminLogout} onBackToSite={() => handleNavigation("home")} />}

      {!["admin-login", "admin"].includes(currentView) && (
        <>
          {!(currentView === "tools" && currentTool === "modal-analyzer") && <Header onNavigation={handleNavigation} onAdminClick={handleAdminClick} currentView={currentView} />}

          {currentView === "home" && (
            <>
              <Hero />
              <ProductsSection products={featuredProducts} title="Featured Sounds" showSeeAll={true} onSeeAllClick={() => handleNavigation("sounds")} />
              <WorksSection works={featuredFilms} onWorkClick={handleFilmClick} title="Featured Films" showSeeAll={true} onSeeAllClick={() => handleNavigation("films")} />
            </>
          )}

          {currentView === "films" && <WorksSection works={works} onWorkClick={handleFilmClick} title="Films" showSeeAll={false} />}

          {currentView === "sounds" && <ProductsSection products={products} title="Sound Design" showSeeAll={false} />}

          {currentView === "tools" && <ToolsSection onBack={() => handleNavigation("home")} currentTool={currentTool} onToolSelect={handleToolSelect} />}

          {currentView === "film-detail" && selectedWork && <WorkDetail work={selectedWork} onBack={() => handleNavigation("films")} />}

          {currentView === "about" && <AboutSection onBack={() => handleNavigation("home")} />}

          {!(currentView === "tools" && currentTool === "modal-analyzer") && <Footer />}
        </>
      )}
    </div>
  );
}
