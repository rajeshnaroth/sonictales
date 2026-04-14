import React, { Suspense } from "react";
import { Button } from "../../ui/button";
import { ArrowLeft, Wrench, Clock, Music, Piano, AudioWaveform, Mic, Speaker } from "lucide-react";
import ModalAnalyzer from "./modalanalyzer/ModalAnalyzer";
import TapDelayDesigner from "./delaydesigner/TapDelayDesigner";
import TuningGenerator from "./tuninggenerator/TuningGenerator";
import MelodyMapper from "./melodymapper/MelodyMapper";
import MSEGComposer from "./msegcomposer/MSEGComposer";
import IRToReverb from "./irtoreverb/IRToReverb";

// Lazy load to avoid TF.js in main bundle
const PitchToMSEG = React.lazy(() => import("./pitchtomseg/PitchToMSEG"));

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

  if (currentTool === "tuning-generator") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <TuningGenerator />
        </div>
      </section>
    );
  }

  if (currentTool === "melody-mapper") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <MelodyMapper />
        </div>
      </section>
    );
  }

  if (currentTool === "mseg-composer") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <MSEGComposer />
        </div>
      </section>
    );
  }

  if (currentTool === "ir-to-reverb") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <IRToReverb />
        </div>
      </section>
    );
  }

  if (currentTool === "pitch-to-mseg") {
    return (
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tools
          </Button>
          <Suspense fallback={<div className="text-gray-400 text-center py-12">Loading Pitch-to-MSEG...</div>}>
            <PitchToMSEG />
          </Suspense>
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

          {/* Tuning Generator Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-emerald-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("tuning-generator")}>
            <div className="flex items-center mb-4">
              <Music className="h-8 w-8 text-emerald-400 mr-3" />
              <h2 className="text-xl font-semibold text-emerald-400">Tuning Generator</h2>
            </div>
            <p className="text-gray-300 mb-4">Generate .tun microtuning files for Zebra 3. Explore Western temperaments and non-Western scales with microtonal cent offsets.</p>
            <div className="text-sm text-gray-400">
              • Equal, Just, Pythagorean temperaments
              <br />
              • Arabic, Turkish, Indian presets
              <br />
              • AnaMark TUN export
              <br />• 100% client-side processing
            </div>
          </div>
          {/* MSEG Composer Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("mseg-composer")}>
            <div className="flex items-center mb-4">
              <AudioWaveform className="h-8 w-8 text-purple-400 mr-3" />
              <h2 className="text-xl font-semibold text-purple-400">MSEG Composer</h2>
            </div>
            <p className="text-gray-300 mb-4">Free-time piano roll for Zebra 3 MSEG presets. Compose up to 8 melodic curves for polyphonic pitch modulation.</p>
            <div className="text-sm text-gray-400">
              • Continuous-time piano roll editor
              <br />
              • 8 independent curve tracks
              <br />
              • Export multi-curve MSEG presets
              <br />• 100% client-side processing
            </div>
          </div>

          {/* Pitch to MSEG Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("pitch-to-mseg")}>
            <div className="flex items-center mb-4">
              <Mic className="h-8 w-8 text-orange-400 mr-3" />
              <h2 className="text-xl font-semibold text-orange-400">Pitch to MSEG</h2>
            </div>
            <p className="text-gray-300 mb-4">Upload a monophonic recording and extract its pitch contour as a Zebra 3 MSEG preset. Capture vocal and instrument expression.</p>
            <div className="text-sm text-gray-400">
              • CREPE neural pitch detection
              <br />
              • Auto root & range detection
              <br />
              • Smooth, linear, step handle modes
              <br />• 100% client-side processing
            </div>
          </div>

          {/* IR to Reverb Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-rose-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("ir-to-reverb")}>
            <div className="flex items-center mb-4">
              <Speaker className="h-8 w-8 text-rose-400 mr-3" />
              <h2 className="text-xl font-semibold text-rose-400">IR to Reverb</h2>
            </div>
            <p className="text-gray-300 mb-4">Translate an impulse response into an algorithmic Zebra 3 Reverb preset. Acoustic analysis derives the params; sliders let you tune by ear.</p>
            <div className="text-sm text-gray-400">
              • RT60, EDT, ITDG, density, centroid
              <br />
              • Heuristic IR → 8-param mapping
              <br />
              • Editable sliders + .h2p export
              <br />• 100% client-side processing
            </div>
          </div>

          {/* Melody Mapper Tool */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-cyan-500 transition-all duration-300 cursor-pointer" onClick={() => onToolSelect("melody-mapper")}>
            <div className="flex items-center mb-4">
              <Piano className="h-8 w-8 text-cyan-400 mr-3" />
              <h2 className="text-xl font-semibold text-cyan-400">Melody Mapper</h2>
            </div>
            <p className="text-gray-300 mb-4">Piano roll melody editor for Zebra 3. Draw melodies and export as Mapper presets with pitch and velocity control.</p>
            <div className="text-sm text-gray-400">
              • 128-step piano roll editor
              <br />
              • Pitch + velocity Mapper export
              <br />
              • Audio preview with tempo control
              <br />• 100% client-side processing
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
