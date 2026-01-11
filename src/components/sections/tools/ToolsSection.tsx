import { Button } from "../../ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import ModalAnalyzer from "./ModalAnalyzer";

interface ToolsSectionProps {
  onBack: () => void;
  currentTool?: string | null;
  onToolSelect: (tool: string) => void;
}

export function ToolsSection({ onBack, currentTool, onToolSelect }: ToolsSectionProps) {
  if (currentTool === "modal-analyzer") {
    return <ModalAnalyzer />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">Tools</h1>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
