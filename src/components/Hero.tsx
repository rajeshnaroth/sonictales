import { useState } from "react";
import { siteConfig } from "../data/site-config";
import sonicTalesLogo from "@/assets/8e180fd67a0c0bd01f42002dab2e7103c2e61e1f.png";

export function Hero() {
  const [videoError, setVideoError] = useState(false);

  return (
    <section className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Video */}
      {!videoError && (
        <video autoPlay loop muted playsInline onError={() => setVideoError(true)} className="absolute inset-0 w-full h-full object-cover">
          <source src={siteConfig.heroVideoUrl} type="video/mp4" />
        </video>
      )}

      {/* フォールバック背景（動画エラー時または動画なし時） */}
      {videoError && <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900" />}

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="text-center relative z-10 max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <img src={sonicTalesLogo} alt="SonicTales" className="h-24 md:h-32 w-auto mb-4" />
          <h1 className="text-6xl md:text-8xl tracking-tight">
            SonicTales
            <br />
            <span className="text-white/40">productions</span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-white/70 mb-8 leading-relaxed">
          Sound Design and Storytelling
          <br />
          Independent Artistry
        </p>

        <div className="flex items-center justify-center space-x-8 text-sm text-white/50">
          <div>San Jose, CA</div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/30 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
