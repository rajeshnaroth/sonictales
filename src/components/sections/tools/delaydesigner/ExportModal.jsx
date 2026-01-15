// ============================================================
// ExportModal - Zebra preset export dialog
// ============================================================

import React, { useState } from "react";
import { getTapColor, ROUTING_MODES } from "./constants";

export const ExportModal = ({ presetContent, taps, tempo, getTapDelayInfo, routingMode, presetName, setPresetName, onDownload, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(presetContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const delayTaps = taps.slice(1);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-gray-100">Export Zebra Preset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm font-medium">Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-gray-100 focus:border-amber-500 focus:outline-none"
              placeholder="MyDelay"
            />
            <span className="text-gray-500 text-sm">.h2p</span>
          </div>

          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-xs text-gray-500 mb-2">Summary</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Tempo:</span> <span className="text-gray-200">{tempo} BPM</span>
              </div>
              <div>
                <span className="text-gray-400">Taps:</span> <span className="text-gray-200">{delayTaps.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Mode:</span> <span className="text-amber-400">{ROUTING_MODES[routingMode].label}</span>
              </div>
            </div>
          </div>

          {delayTaps.length > 0 && (
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Tap Configuration (Zebra values)</div>
              <div className="grid gap-2">
                {delayTaps.map((tap, i) => {
                  const info = getTapDelayInfo(tap, i + 1);
                  const color = getTapColor(i + 1);
                  const isRelative = (routingMode === "series" && i > 0) || (routingMode === "fourfour" && i % 2 === 1);
                  return (
                    <div key={tap.id} className="flex items-center gap-3 text-sm">
                      <span className={`font-medium ${color.text}`}>D{i + 1}</span>
                      {isRelative && <span className="text-gray-600 text-xs">rel→</span>}
                      <span className="text-gray-200">{info.zebraNote}</span>
                      <span className={`font-mono ${info.zebraRate === 0 ? "text-gray-500" : "text-amber-400"}`}>
                        R:{info.zebraRate > 0 ? "+" : ""}
                        {info.zebraRate}
                      </span>
                      <span className="text-gray-500">Pan:{Math.round(tap.pan * 100)}</span>
                      <span className="text-gray-500">Gain:{Math.round(tap.gain * 100)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-gray-500 mb-2">Raw .h2p content</div>
            <pre className="bg-gray-900 p-3 rounded border border-gray-700 text-xs text-green-400 font-mono overflow-auto max-h-48">{presetContent}</pre>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button onClick={handleCopy} className={`px-4 py-2 rounded font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-200"}`}>
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button
            onClick={onDownload}
            disabled={delayTaps.length === 0}
            className={`px-4 py-2 rounded font-medium transition-colors ${delayTaps.length === 0 ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 text-white"}`}
          >
            ⬇ Download .h2p
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
