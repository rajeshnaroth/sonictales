import { Button } from "../ui/button";
import sonicTalesLogo from "@/assets/8e180fd67a0c0bd01f42002dab2e7103c2e61e1f.png";

interface HeaderProps {
  onNavigation: (view: string) => void;
  onAdminClick?: () => void;
  currentView: string;
}

export function Header({ onNavigation, onAdminClick, currentView }: HeaderProps) {
  let clickCount = 0;
  let clickTimer: NodeJS.Timeout | null = null;

  const handleLogoClick = () => {
    clickCount++;

    if (clickCount === 1) {
      clickTimer = setTimeout(() => {
        clickCount = 0;
        onNavigation("home");
      }, 800); // 時間を少し長くして3回クリックしやすく
    } else if (clickCount === 2) {
      // 2回目のクリックでは何もしない
      return;
    } else if (clickCount === 3) {
      if (clickTimer) clearTimeout(clickTimer);
      clickCount = 0;
      // 隠しコマンド：3回クリックで管理画面アクセス
      if (onAdminClick) {
        onAdminClick();
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <button onClick={handleLogoClick} className="transition-opacity hover:opacity-70 select-none flex items-center">
            <img src={sonicTalesLogo} alt="SonicTales" className="h-10 w-auto" />
          </button>

          <div className="flex items-center space-x-8">
            <Button variant="ghost" onClick={() => onNavigation("home")} className={`text-white hover:text-white/70 hover:bg-white/5 ${currentView === "home" ? "text-white" : "text-white/60"}`}>
              Home
            </Button>
            <Button variant="ghost" onClick={() => onNavigation("sounds")} className={`text-white hover:text-white/70 hover:bg-white/5 ${currentView === "sounds" ? "text-white" : "text-white/60"}`}>
              Sounds
            </Button>
            <Button
              variant="ghost"
              onClick={() => onNavigation("films")}
              className={`text-white hover:text-white/70 hover:bg-white/5 ${["films", "film-detail"].includes(currentView) ? "text-white" : "text-white/60"}`}
            >
              Films
            </Button>
            <Button variant="ghost" onClick={() => onNavigation("tools")} className={`text-white hover:text-white/70 hover:bg-white/5 ${currentView === "tools" ? "text-white" : "text-white/60"}`}>
              Tools
            </Button>
            <Button variant="ghost" onClick={() => onNavigation("about")} className={`text-white hover:text-white/70 hover:bg-white/5 ${currentView === "about" ? "text-white" : "text-white/60"}`}>
              About
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
