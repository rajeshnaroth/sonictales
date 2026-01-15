// ============================================================
// PanPanel - Tap stereo pan controls
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { getTapColor } from "./constants";

const PanKnob = ({ tap, index, onPanChange, isHighlighted, playPing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startPanRef = useRef(0);
  const color = getTapColor(index);

  const handleMouseDown = (e) => {
    if (tap.gridPosition === 0) return;
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPanRef.current = tap.pan;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const deltaY = startYRef.current - e.clientY;
      onPanChange(tap.id, Math.max(-1, Math.min(1, startPanRef.current + deltaY / 50)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      playPing(tap.pan, tap.gain);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, tap.id, tap.pan, tap.gain, onPanChange, playPing]);

  const isTrigger = tap.gridPosition === 0;
  const rotation = tap.pan * 135;
  const borderColor = isTrigger ? "border-gray-500" : color.bg.replace("bg-", "border-");

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400 font-mono">
        {tap.pan < -0.1 ? "L" : tap.pan > 0.1 ? "R" : "C"}
        {Math.abs(tap.pan) > 0.1 ? Math.round(Math.abs(tap.pan) * 100) : ""}
      </span>
      <div
        onMouseDown={handleMouseDown}
        className={`relative w-10 h-10 rounded-full bg-gray-700 border-2 ${borderColor} ${isTrigger ? "cursor-not-allowed" : "cursor-grab"} ${isDragging ? "cursor-grabbing" : ""} ${
          isHighlighted ? `ring-2 ${color.ring}` : ""
        } transition-colors`}
      >
        <div className="absolute top-1 left-1/2 w-1 h-3 -ml-0.5 rounded-full bg-gray-300" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center 18px" }} />
        <div className={`absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full ${color.bg}`} />
      </div>
      <div className="flex justify-between w-10 text-xs text-gray-600">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};

export const PanPanel = ({ taps, onPanChange, currentCell, playPing }) => {
  if (taps.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center mb-2">
        <span className="text-gray-400 text-sm font-medium">Pan</span>
        <span className="ml-auto text-gray-500 text-xs">Drag up/down</span>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {taps.map((tap, index) => (
          <PanKnob key={tap.id} tap={tap} index={index} onPanChange={onPanChange} isHighlighted={currentCell === tap.gridPosition} playPing={playPing} />
        ))}
      </div>
    </div>
  );
};
