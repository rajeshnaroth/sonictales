// ============================================================
// BeatGrid - Main rhythm grid display
// ============================================================

import React, { useMemo } from "react";
import { SUBDIVISIONS, getTapColor } from "./constants";

export const BeatGrid = ({ totalCells, beatsPerBar, barCount, subdivision, taps, currentCell, onCellClick, getTapAtGridPosition }) => {
  const tapIndexMap = useMemo(() => {
    const map = {};
    taps.forEach((tap, index) => {
      map[tap.gridPosition] = index;
    });
    return map;
  }, [taps]);

  const cells = useMemo(() => {
    return Array.from({ length: totalCells }, (_, i) => {
      const beatIndex = Math.floor(i / subdivision);
      const subIndex = i % subdivision;
      const barIndex = Math.floor(beatIndex / beatsPerBar);
      const beatInBar = beatIndex % beatsPerBar;

      return {
        gridPosition: i,
        beatIndex,
        subIndex,
        barIndex,
        beatInBar,
        isBeatStart: subIndex === 0,
        isBarStart: subIndex === 0 && beatInBar === 0,
        isHalfBeat: subdivision >= 2 && subIndex === subdivision / 2
      };
    });
  }, [totalCells, subdivision, beatsPerBar]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center bg-gray-800 border-b border-gray-700 px-3 py-2">
        <span className="text-gray-400 text-sm font-medium">Beat Grid</span>
        <span className="ml-2 text-gray-600 text-xs">({SUBDIVISIONS[subdivision].description})</span>
        <span className="ml-auto text-gray-500 text-xs">Click to add/remove taps • Gray = trigger</span>
      </div>

      <div className="flex overflow-x-auto p-2">
        {cells.map((cell) => {
          const tap = getTapAtGridPosition(cell.gridPosition);
          const tapIndex = tapIndexMap[cell.gridPosition];
          const isHighlighted = currentCell === cell.gridPosition;
          const isTrigger = cell.gridPosition === 0;
          const color = tapIndex !== undefined ? getTapColor(tapIndex) : null;

          const cellWidth = subdivision === 1 ? "w-14" : subdivision === 2 ? "w-10" : "w-8";

          const borderStyle = cell.isBarStart
            ? "border-l-2 border-l-amber-500"
            : cell.isBeatStart
            ? "border-l-2 border-l-gray-500"
            : cell.isHalfBeat
            ? "border-l border-l-gray-600"
            : "border-l border-l-gray-700/50";

          return (
            <div
              key={cell.gridPosition}
              onClick={() => onCellClick(cell.gridPosition)}
              className={`flex flex-col items-center ${cellWidth} ${borderStyle} ${isHighlighted ? "bg-white/10" : "hover:bg-gray-800"} cursor-pointer transition-colors`}
            >
              <div className="h-12 flex items-center justify-center">
                {tap ? (
                  <div
                    className={`w-5 h-5 rounded-full transition-all duration-100 ${color.bg} ${isTrigger ? "cursor-not-allowed" : "hover:scale-110"} ${
                      isHighlighted ? `scale-125 shadow-lg ring-2 ${color.ring}` : ""
                    }`}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-dashed opacity-30 hover:opacity-60 hover:border-gray-500 transition-opacity" />
                )}
              </div>
              <div className={`text-xs pb-1 ${cell.isBeatStart ? "text-gray-400 font-medium" : "text-gray-600"}`}>{cell.isBeatStart ? cell.beatInBar + 1 : "·"}</div>
            </div>
          );
        })}
      </div>

      {barCount > 1 && (
        <div className="flex bg-gray-900 border-t border-gray-700 px-2">
          {Array.from({ length: barCount }, (_, barIndex) => (
            <div key={barIndex} className="flex-1 text-center text-xs text-gray-500 py-1">
              Bar {barIndex + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
