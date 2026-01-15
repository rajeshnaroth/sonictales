import { Button } from "../../ui/button";
import { ArrowLeft, Wrench, Clock } from "lucide-react";
import ModalAnalyzer from "./modalanalyzer/ModalAnalyzer";
import TapDelayDesigner from "./delaydesigner/TapDelayDesigner";

interface ToolsSectionProps {
  onBack: () => void;
  currentTool?: string | null;
  onToolSelect: (tool: string) => void;
}

export function ToolsSection({ onBack, currentTool, onToolSelect }: ToolsSectionProps) {
  if (currentTool === "modal-analyzer") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <ModalAnalyzer />
        </div>
      </section>
    );
  }

  if (currentTool === "tap-delay-designer") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <TapDelayDesigner />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl mb-6">Tools</h2>
          <p className="text-white/60 text-lg max-w-2xl">A collection of audio production utilities for sound designers and music producers. All tools run entirely in your browser.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Modal Analyzer Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("modal-analyzer")}>
            <div className="flex items-center mb-4">
              <Wrench className="h-8 w-8 text-green-400 mr-3" />
              <h2 className="text-xl font-semibold text-green-400">Modal Analyzer</h2>
            </div>
            <p className="text-gray-300 mb-4">Extract modal partials from audio files for use with u-he Zebra 3 Modal synthesis. Analyze resonant frequencies, decay times, and amplitudes.</p>
            <div className="text-sm text-gray-400">
              • Upload audio files (WAV, MP3, OGG)
              <br />
              • FFT-based spectral analysis
              <br />
              • Export CSV for Zebra 3
              <br />• 100% client-side processing
            </div>
          </div>

          {/* Tap Delay Designer Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-amber-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("tap-delay-designer")}>
            <div className="flex items-center mb-4">
              <Clock className="h-8 w-8 text-amber-400 mr-3" />
              <h2 className="text-xl font-semibold text-amber-400">8-Tap Delay Designer</h2>
            </div>
            <p className="text-gray-300 mb-4">Visual rhythm-to-delay converter for Zebra 3. Design complex delay patterns using an intuitive beat grid interface.</p>
            <div className="text-sm text-gray-400">
              • Visual beat grid editor
              <br />
              • Tempo-synced delay times
              <br />
              • Export presets for Zebra 3
              <br />• 100% client-side processing
            </div>
          </div>

          {/* Placeholder for future tools */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 border-dashed">
            <div className="flex items-center mb-4">
              <Wrench className="h-8 w-8 text-gray-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-600">Coming Soon</h2>
            </div>
            <p className="text-gray-500 mb-4">More audio production tools are in development.</p>
            <div className="text-sm text-gray-600">
              • More analyzers
              <br />
              • Synthesis tools
              <br />• Audio utilities
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
