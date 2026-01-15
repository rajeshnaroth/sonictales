// ============================================================
// DelayTimePanel - Delay timing visualization
// ============================================================

import React, { useMemo } from "react";
import { getTapColor, ROUTING_MODES } from "./constants";
import { RoutingModeSelector } from "./RoutingModeSelector";

const DelayTimeBar = ({ tap, index, isHighlighted, getTapDelayInfo, maxMs, routingMode }) => {
  const isTrigger = tap.gridPosition === 0;
  const info = getTapDelayInfo(tap, index);
  const heightPercent = maxMs > 0 ? (info.ms / maxMs) * 100 : 0;
  const color = getTapColor(index);

  // Determine if this tap is "relative" in current mode
  const isRelative = (routingMode === "series" && index > 1) || (routingMode === "fourfour" && index > 0 && index % 2 === 0);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Absolute timing (ms) */}
      <span className="text-xs text-gray-500 font-mono">{info.formatted}</span>

      {/* Visual bar showing absolute position */}
      <div className={`relative w-8 h-16 bg-gray-900 rounded border border-gray-700 ${isHighlighted ? `ring-2 ${color.ring}` : ""}`}>
        <div className={`absolute bottom-0 left-0 right-0 rounded-b transition-all ${color.fill} opacity-80`} style={{ height: `${heightPercent}%` }} />
        {[25, 50, 75].map((pct) => (
          <div key={pct} className="absolute left-0 right-0 border-t border-gray-700/50" style={{ bottom: `${pct}%` }} />
        ))}
      </div>

      {/* Tap label with relative indicator */}
      <div className="flex items-center gap-1">
        <span className={`text-xs font-medium ${color.text}`}>{isTrigger ? "Trig" : `D${index}`}</span>
        {isRelative && <span className="text-xs text-gray-600">→</span>}
      </div>

      {/* Zebra note (what gets exported) */}
      <span className="text-sm text-gray-200 font-medium">{info.zebraNote}</span>

      {/* Rate value */}
      <span className={`text-xs font-mono ${info.zebraRate === 0 ? "text-gray-500" : "text-amber-400"}`}>{isTrigger ? "—" : `R: ${info.zebraRate > 0 ? "+" : ""}${info.zebraRate}`}</span>
    </div>
  );
};

export const DelayTimePanel = ({ taps, currentCell, getTapDelayInfo, routingMode, setRoutingMode }) => {
  if (taps.length === 0) return null;

  const maxMs = useMemo(() => {
    return Math.max(...taps.map((tap, index) => getTapDelayInfo(tap, index).ms), 1);
  }, [taps, getTapDelayInfo]);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center mb-3 gap-3">
        <span className="text-gray-400 text-sm font-medium">Delay Time</span>
        <RoutingModeSelector routingMode={routingMode} setRoutingMode={setRoutingMode} />
        <span className="ml-auto text-gray-500 text-xs">{ROUTING_MODES[routingMode].description}</span>
      </div>
      <div className="flex gap-4 justify-center flex-wrap">
        {taps.map((tap, index) => (
          <DelayTimeBar key={tap.id} tap={tap} index={index} isHighlighted={currentCell === tap.gridPosition} getTapDelayInfo={getTapDelayInfo} maxMs={maxMs} routingMode={routingMode} />
        ))}
      </div>

      {/* Routing mode visualization */}
      {taps.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500">Signal flow:</span>
            {routingMode === "parallel" && <span className="text-gray-400">Trig → [D1] [D2] [D3] ... (independent)</span>}
            {routingMode === "series" && <span className="text-gray-400">Trig → D1 → D2 → D3 → ... → D{taps.length - 1} → (feedback)</span>}
            {routingMode === "fourfour" && <span className="text-gray-400">Trig → [D1→D2] [D3→D4] [D5→D6] [D7→D8]</span>}
          </div>
        </div>
      )}
    </div>
  );
};
