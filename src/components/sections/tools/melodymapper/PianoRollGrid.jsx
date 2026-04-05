// ============================================================
// Melody Mapper - Piano Roll Grid
// ============================================================

import React, { useMemo, useRef, useCallback } from "react";
import { ROWS, CELL_WIDTH, CELL_HEIGHT, getRowNoteInfo } from "./constants";

const PianoRollGrid = ({ stepCount, rootKey, notes, currentStep, onToggleNote, onSetNote, labelsOnly, gridOnly }) => {
  const isPainting = useRef(false);
  const paintRow = useRef(-1);

  const handlePointerDown = useCallback((step, row) => {
    isPainting.current = true;
    paintRow.current = row;
    onToggleNote(step, row);
  }, [onToggleNote]);

  const handlePointerEnter = useCallback((step) => {
    if (!isPainting.current) return;
    onSetNote(step, paintRow.current);
  }, [onSetNote]);

  const handlePointerUp = useCallback(() => {
    isPainting.current = false;
    paintRow.current = -1;
  }, []);

  // Build row info from top (highest note) to bottom (lowest)
  const rows = useMemo(() => {
    const result = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      result.push({ row, ...getRowNoteInfo(row, rootKey) });
    }
    return result;
  }, [rootKey]);

  const steps = useMemo(() => Array.from({ length: stepCount }, (_, i) => i), [stepCount]);

  // Labels-only mode: just the piano key labels (for sticky left column)
  if (labelsOnly) {
    return (
      <div>
        {/* Header spacer */}
        <div className="h-5" />
        {/* Note labels */}
        {rows.map(({ row, label, isNatural }) => (
          <div
            key={row}
            className={`flex items-center justify-end pr-1.5 text-[10px] font-mono border-r border-gray-600 ${
              row === 12 ? "border-b-2 border-b-cyan-500/60 font-semibold text-cyan-400" : isNatural ? "text-gray-400" : "text-gray-600"
            }`}
            style={{ height: CELL_HEIGHT }}
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  // Grid-only mode: just the cells (for scrollable area, no labels wrapper)
  if (gridOnly) {
    return (
      <div>
        {/* Step number header */}
        <div className="flex h-5">
          {steps.map((step) => (
            <div
              key={step}
              className={`text-[9px] font-mono text-center ${
                step % 4 === 0 ? "text-gray-400" : "text-transparent"
              }`}
              style={{ width: CELL_WIDTH }}
            >
              {step + 1}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          {rows.map(({ row, isNatural }) => (
            <div key={row} className="flex" style={{ height: CELL_HEIGHT }}>
              {steps.map((step) => {
                const isActive = notes.get(step) === row;
                const isBeat = step % 4 === 0;
                const isLastStep = step === stepCount - 1;
                const isPlayhead = step === currentStep;
                const isCenterLine = row === 12;

                return (
                  <div
                    key={step}
                    className={`
                      relative box-border cursor-crosshair select-none
                      ${isNatural ? "bg-gray-800/60" : "bg-gray-900/80"}
                      ${isBeat ? "border-l-2 border-l-gray-600" : "border-l border-l-gray-700/50"}
                      ${isLastStep ? "border-r-2 border-r-gray-600" : ""}
                      ${isCenterLine ? "border-b-2 border-b-cyan-500/60" : "border-b border-b-gray-800/40"}
                      ${isPlayhead ? "bg-white/10" : ""}
                      ${!isActive ? "hover:bg-cyan-500/15" : ""}
                    `}
                    style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                    onPointerDown={() => handlePointerDown(step, row)}
                    onPointerEnter={() => handlePointerEnter(step)}
                  >
                    {isActive && (
                      <div className="absolute inset-0.5 rounded-sm bg-cyan-500 shadow-sm shadow-cyan-500/30" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: full component with labels + grid (backward compat, unused now)
  return null;
};

export { PianoRollGrid };
