import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAudioAnalyzer } from "./useAudioAnalyzer";

/**
 * Modal Resonance Analyzer UI Component
 * Handles presentation and user interaction only
 */
const ModalAnalyzer = () => {
  // Analysis options state
  const [fftSize, setFftSize] = useState(4096);
  const [peakThreshold, setPeakThreshold] = useState(-50);
  const [maxPartials, setMaxPartials] = useState(48);

  // UI state
  const [dragOver, setDragOver] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Audio analyzer hook
  const {
    audioBuffer,
    fileName,
    analyzing,
    progress,
    partials,
    fundamental,
    spectrum,
    playing,
    error,
    duration,
    analysisDuration,
    effectiveDuration,
    sampleRate,
    channels,
    enabledCount,
    loadFile,
    analyze,
    playOriginal,
    playSynth,
    stopAudio,
    getCSV,
    getCSVFileName,
    togglePartial,
    updatePartialDecay,
    resetPartialDecay,
    toggleAllPartials,
    resetAllDecays
  } = useAudioAnalyzer();

  // Track previous audioBuffer to detect new file loads vs option changes
  const prevAudioBufferRef = useRef(null);
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  // Auto-analyze when file loads (immediate) or options change (debounced)
  useEffect(() => {
    if (!audioBuffer) return;

    const isNewFile = audioBuffer !== prevAudioBufferRef.current;
    prevAudioBufferRef.current = audioBuffer;

    if (isNewFile) {
      // New file loaded - analyze immediately
      analyzeRef.current({ fftSize, peakThreshold, maxPartials });
    } else {
      // Options changed - debounce
      const timeoutId = setTimeout(() => {
        analyzeRef.current({ fftSize, peakThreshold, maxPartials });
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [fftSize, peakThreshold, maxPartials, audioBuffer]);

  // File handling
  const handleFile = useCallback(
    async (file) => {
      await loadFile(file);
    },
    [loadFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  // Analysis (kept for manual trigger if needed)
  const handleAnalyze = useCallback(() => {
    analyze({ fftSize, peakThreshold, maxPartials });
  }, [analyze, fftSize, peakThreshold, maxPartials]);

  // CSV Export
  const handleDownloadCSV = useCallback(() => {
    const csv = getCSV();
    if (!csv) return;

    try {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getCSVFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback to modal view
      setShowCSV(true);
    }
  }, [getCSV, getCSVFileName]);

  const handleShowCSV = useCallback(() => {
    setShowCSV(true);
  }, []);

  const handleCopyCSV = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getCSV());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      const textarea = document.getElementById("csvTextarea");
      if (textarea) {
        textarea.select();
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  }, [getCSV]);

  const isLoaded = duration > 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="max-w-full">
        {/* Header */}
        <Header />

        {/* Error Display */}
        {error && <ErrorBanner message={error} />}

        {/* Drop Zone */}
        <DropZone fileName={fileName} dragOver={dragOver} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onFileInput={handleFileInput} />

        {/* Progress Bar */}
        {(progress.stage || analyzing) && <ProgressBar stage={progress.stage} percent={progress.percent} />}

        {/* Analysis Controls */}
        {isLoaded && (
          <AnalysisControls
            fftSize={fftSize}
            peakThreshold={peakThreshold}
            maxPartials={maxPartials}
            analyzing={analyzing}
            duration={duration}
            analysisDuration={analysisDuration}
            effectiveDuration={effectiveDuration}
            sampleRate={sampleRate}
            channels={channels}
            partialsCount={partials.length}
            onFftSizeChange={setFftSize}
            onThresholdChange={setPeakThreshold}
            onMaxPartialsChange={setMaxPartials}
            onAnalyze={handleAnalyze}
          />
        )}

        {/* Spectrum Visualization */}
        {spectrum && <SpectrumView spectrum={spectrum} fundamental={fundamental} peakThreshold={peakThreshold} sampleRate={sampleRate} />}

        {/* Playback & Export */}
        {partials.length > 0 && (
          <>
            <PlaybackControls
              playing={playing}
              enabledCount={enabledCount}
              onPlayOriginal={playOriginal}
              onPlaySynth={playSynth}
              onStop={stopAudio}
              onDownload={handleDownloadCSV}
              onShowCSV={handleShowCSV}
            />

            <PartialsTable
              partials={partials}
              enabledCount={enabledCount}
              onTogglePartial={togglePartial}
              onUpdatePartialDecay={updatePartialDecay}
              onResetPartialDecay={resetPartialDecay}
              onToggleAllPartials={toggleAllPartials}
              onResetAllDecays={resetAllDecays}
              onStopAudio={stopAudio}
            />
          </>
        )}

        {/* CSV Modal */}
        {showCSV && <CSVModal csvContent={getCSV()} fileName={getCSVFileName()} copySuccess={copySuccess} onCopy={handleCopyCSV} onClose={() => setShowCSV(false)} />}

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

const Header = () => (
  <>
    <h1 className="text-2xl font-bold mb-1 text-green-400">Modal Resonance Analyzer</h1>
    <p className="text-gray-400 text-sm mb-4">Extract partials from audio for Zebra 3 Modal synthesis</p>
  </>
);

const ErrorBanner = ({ message }) => <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 text-red-200">⚠️ {message}</div>;

const DropZone = ({ fileName, dragOver, onDrop, onDragOver, onDragLeave, onFileInput }) => (
  <div
    onDrop={onDrop}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onClick={() => document.getElementById("fileInput").click()}
    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-all ${dragOver ? "border-green-400 bg-green-400/10" : "border-gray-600 hover:border-gray-500"}`}
  >
    <input id="fileInput" type="file" accept="audio/*" className="hidden" onChange={onFileInput} />
    <div className="text-3xl mb-1">🎵</div>
    <p>{fileName || "Drop audio file here or click to browse"}</p>
    <p className="text-xs text-gray-500 mt-1">WAV, MP3, OGG supported • All processing is local</p>
  </div>
);

const ProgressBar = ({ stage, percent }) => (
  <div className="bg-gray-900 rounded-lg p-3 mb-4">
    <div className="flex justify-between text-sm mb-1">
      <span className="text-green-400">{stage || "Processing..."}</span>
      <span className="text-gray-400">{percent}%</span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
    </div>
  </div>
);

const AnalysisControls = ({
  fftSize,
  peakThreshold,
  maxPartials,
  analyzing,
  duration,
  analysisDuration,
  effectiveDuration,
  sampleRate,
  channels,
  partialsCount,
  onFftSizeChange,
  onThresholdChange,
  onMaxPartialsChange,
  onAnalyze
}) => (
  <div className="bg-gray-900 rounded-lg p-3 mb-4">
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">FFT Size</label>
        <select value={fftSize} onChange={(e) => onFftSizeChange(Number(e.target.value))} className="w-full bg-gray-700 rounded px-2 py-1 text-sm" disabled={analyzing}>
          <option value={1024}>1024 (fastest)</option>
          <option value={2048}>2048 (fast)</option>
          <option value={4096}>4096 (balanced)</option>
          <option value={8192}>8192 (precise)</option>
          <option value={16384}>16384 (very precise)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Threshold: {peakThreshold}dB</label>
        <input type="range" min="-80" max="-20" value={peakThreshold} onChange={(e) => onThresholdChange(Number(e.target.value))} className="w-full" disabled={analyzing} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Max Partials: {maxPartials}</label>
        <input type="range" min="8" max="64" value={maxPartials} onChange={(e) => onMaxPartialsChange(Number(e.target.value))} className="w-full" disabled={analyzing} />
      </div>
      <div className="flex items-end">
        {analyzing ? (
          <div className="w-full bg-gray-700 px-3 py-1.5 rounded text-sm text-center text-yellow-400">⏳ Analyzing...</div>
        ) : partialsCount > 0 ? (
          <div className="w-full bg-gray-700 px-3 py-1.5 rounded text-sm text-center text-green-400">✓ {partialsCount} partials</div>
        ) : (
          <div className="w-full bg-gray-700 px-3 py-1.5 rounded text-sm text-center text-gray-500">Adjust options above</div>
        )}
      </div>
    </div>
    <div className="text-xs text-gray-400">
      File: {duration.toFixed(2)}s • {sampleRate}Hz • {channels}ch
      {analysisDuration > 0 && <span className="text-yellow-400"> • Decay window: {analysisDuration.toFixed(2)}s</span>}
      {effectiveDuration > 0 && <span className="text-green-400"> • Playback: {effectiveDuration.toFixed(2)}s</span>}
    </div>
  </div>
);

const SpectrumView = ({ spectrum, fundamental, peakThreshold, sampleRate }) => {
  const barsToShow = 200;
  const step = Math.max(1, Math.floor(spectrum.length / barsToShow));
  const displayData = spectrum.filter((_, i) => i % step === 0).slice(0, barsToShow);

  return (
    <div className="bg-gray-900 rounded-lg p-3 mb-4">
      <h2 className="text-sm font-semibold mb-2 text-green-400">Spectrum • Fundamental: {fundamental.toFixed(1)} Hz</h2>
      <div className="h-28 flex items-end gap-px bg-black rounded p-1 overflow-hidden">
        {displayData.map((bin, i) => (
          <div
            key={i}
            className="flex-1 min-w-px transition-all"
            style={{
              height: `${Math.max(2, ((bin.db + 80) / 80) * 100)}%`,
              backgroundColor: bin.db > peakThreshold ? "#22c55e" : "#374151"
            }}
            title={`${bin.freq.toFixed(0)} Hz: ${bin.db.toFixed(1)} dB`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>20 Hz</span>
        <span className="text-green-400">Green = above threshold</span>
        <span>{Math.round(sampleRate / 4)} Hz</span>
      </div>
    </div>
  );
};

const PlaybackControls = ({ playing, enabledCount, onPlayOriginal, onPlaySynth, onStop, onDownload, onShowCSV }) => (
  <div className="bg-gray-900 rounded-lg p-3 mb-4">
    <div className="flex gap-2 flex-wrap">
      <button onClick={onPlayOriginal} className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${playing === "original" ? "bg-blue-500" : "bg-blue-600 hover:bg-blue-500"}`}>
        {playing === "original" ? "🔊 Original..." : "▶️ Original"}
      </button>
      <button onClick={onPlaySynth} className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${playing === "synth" ? "bg-purple-500" : "bg-purple-600 hover:bg-purple-500"}`}>
        {playing === "synth" ? "🔊 Synth..." : `▶️ Synthesized (${enabledCount})`}
      </button>
      <button onClick={onStop} className="px-4 py-2 rounded text-sm font-semibold bg-red-600 hover:bg-red-500 transition-colors">
        ⏹️ Stop
      </button>
      <div className="flex-1" />
      <button onClick={onDownload} className="px-4 py-2 rounded text-sm font-semibold bg-green-600 hover:bg-green-500 transition-colors">
        📥 Download CSV
      </button>
      <button onClick={onShowCSV} className="px-4 py-2 rounded text-sm font-semibold bg-yellow-600 hover:bg-yellow-500 transition-colors">
        📋 View/Copy
      </button>
    </div>
  </div>
);

const PartialsTable = ({ partials, enabledCount, onTogglePartial, onUpdatePartialDecay, onResetPartialDecay, onToggleAllPartials, onResetAllDecays, onStopAudio }) => (
  <div className="bg-gray-900 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-green-400">
        Extracted Partials ({enabledCount}/{partials.length} enabled)
      </h2>
      <div className="flex gap-2">
        <button onClick={() => onToggleAllPartials(true, true)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">
          All On
        </button>
        <button
          onClick={() => {
            onToggleAllPartials(false);
            onStopAudio();
          }}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          All Off
        </button>
        <button onClick={onResetAllDecays} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">
          Reset Decays
        </button>
      </div>
    </div>
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-gray-900 z-10">
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-2 w-8">On</th>
            <th className="pb-2 pr-3">#</th>
            <th className="pb-2 pr-3">Freq (Hz)</th>
            <th className="pb-2 pr-3">Ratio</th>
            <th className="pb-2 pr-3">Gain (dB)</th>
            <th className="pb-2 pr-3 w-36" title="Time constant in seconds (lower = faster decay)">
              Decay τ
            </th>
            <th className="pb-2 pr-2 w-8" title="Fit quality: green=good, yellow=fair, red=poor">
              Fit
            </th>
            <th className="pb-2">Visual</th>
          </tr>
        </thead>
        <tbody>
          {partials.map((p, i) => (
            <tr key={i} className={`border-b border-gray-700/30 hover:bg-gray-700/30 ${!p.enabled ? "opacity-40" : ""}`}>
              <td className="py-1.5 pr-2">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={() => onTogglePartial(i, true)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800 cursor-pointer"
                />
              </td>
              <td className="py-1.5 pr-3 text-gray-500">{i + 1}</td>
              <td className="py-1.5 pr-3">{p.freq.toFixed(1)}</td>
              <td className="py-1.5 pr-3 font-mono text-green-300">{p.ratio.toFixed(4)}</td>
              <td className="py-1.5 pr-3">{p.gainDb.toFixed(1)}</td>
              <td className="py-1.5 pr-3">
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0.01"
                    max="5"
                    step="0.01"
                    value={p.timeConstant}
                    onChange={(e) => onUpdatePartialDecay(i, parseFloat(e.target.value))}
                    className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="w-14 text-right font-mono">{p.timeConstant.toFixed(2)}s</span>
                  {Math.abs(p.timeConstant - p.originalTimeConstant) > 0.001 && (
                    <button onClick={() => onResetPartialDecay(i)} className="text-yellow-500 hover:text-yellow-400 ml-1" title="Reset to original">
                      ↺
                    </button>
                  )}
                </div>
              </td>
              <td className="py-1.5 pr-2 text-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${p.fitQuality >= 0.7 ? "bg-green-500" : p.fitQuality >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                  title={`Fit: ${(p.fitQuality * 100).toFixed(0)}%`}
                />
              </td>
              <td className="py-1.5">
                <div className="flex items-center gap-1">
                  <div className="h-2 bg-green-500 rounded" style={{ width: `${Math.max(4, ((p.gainDb + 60) / 60) * 50)}px` }} />
                  <div className="h-2 bg-blue-500 rounded opacity-60" style={{ width: `${Math.min(50, p.timeConstant * 20)}px` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex gap-4 mt-2 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <span className="w-3 h-2 bg-green-500 rounded" /> Gain
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-2 bg-blue-500 rounded opacity-60" /> Decay τ (seconds)
      </span>
    </div>
  </div>
);

const CSVModal = ({ csvContent, fileName, copySuccess, onCopy, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-lg p-4 max-w-2xl w-full max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-green-400">Zebra 3 Modal CSV</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
          ✕
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Copy this content and save as <code className="bg-gray-700 px-1 rounded">{fileName}</code>
      </p>
      <textarea id="csvTextarea" readOnly value={csvContent} className="flex-1 bg-gray-900 text-green-300 font-mono text-xs p-3 rounded border border-gray-700 resize-none min-h-[200px]" />
      <div className="flex gap-2 mt-3">
        <button onClick={onCopy} className={`flex-1 py-2 rounded font-semibold transition-colors ${copySuccess ? "bg-green-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
          {copySuccess ? "✓ Copied!" : "📋 Copy to Clipboard"}
        </button>
        <button onClick={onClose} className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>
);

const Footer = () => (
  <div className="mt-6 text-center text-gray-500 text-xs space-y-3">
    <p>100% client-side processing • No audio uploaded to any server</p>
    <div className="border-t border-gray-700 pt-3">
      <p className="text-gray-600 leading-relaxed">
        <strong>Disclaimer:</strong> This tool is provided "as is" without warranty of any kind, express or implied. By using this tool, you acknowledge and agree that you do so entirely at your own
        risk. SonicTales and its affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this
        tool, including but not limited to loss of data, loss of profits, or damage to equipment. You are solely responsible for verifying the accuracy and suitability of any output generated. Use of
        this tool constitutes acceptance of these terms.
      </p>
    </div>
  </div>
);

export default ModalAnalyzer;
