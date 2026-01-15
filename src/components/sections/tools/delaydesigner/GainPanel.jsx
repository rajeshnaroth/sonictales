// ============================================================
// GainPanel - Tap gain adjustment controls
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import { getTapColor } from "./constants";

const GainBar = ({ tap, index, onGainChange, isHighlighted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef(null);
  const color = getTapColor(index);

  const updateGain = useCallback(
    (e) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      onGainChange(tap.id, 1 - Math.max(0, Math.min(1, y / rect.height)));
    },
    [tap.id, onGainChange]
  );

  const handleMouseDown = (e) => {
    if (tap.gridPosition === 0) return;
    setIsDragging(true);
    updateGain(e);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => updateGain(e);
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updateGain]);

  const isTrigger = tap.gridPosition === 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400 font-mono">{tap.gain.toFixed(2)}</span>
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className={`relative w-8 h-20 bg-gray-900 rounded border border-gray-700 ${!isTrigger ? "cursor-ns-resize" : "cursor-not-allowed"} ${isHighlighted ? `ring-2 ${color.ring}` : ""}`}
      >
        <div className={`absolute bottom-0 left-0 right-0 rounded-b transition-all ${color.fill}`} style={{ height: `${tap.gain * 100}%` }} />
        {[25, 50, 75].map((pct) => (
          <div key={pct} className="absolute left-0 right-0 border-t border-gray-700/50" style={{ bottom: `${pct}%` }} />
        ))}
      </div>
      <span className={`text-xs font-medium ${color.text}`}>{isTrigger ? "Trig" : `D${index}`}</span>
    </div>
  );
};

export const GainPanel = ({ taps, onGainChange, currentCell }) => {
  if (taps.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center mb-2">
        <span className="text-gray-400 text-sm font-medium">Gain</span>
        <span className="ml-auto text-gray-500 text-xs">Drag to adjust</span>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {taps.map((tap, index) => (
          <GainBar key={tap.id} tap={tap} index={index} onGainChange={onGainChange} isHighlighted={currentCell === tap.gridPosition} />
        ))}
      </div>
    </div>
  );
};
