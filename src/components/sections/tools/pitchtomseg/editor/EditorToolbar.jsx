// ============================================================
// EditorToolbar — operation buttons + snap toggle + re-derive
// ============================================================

import React, { useState } from 'react';

const btnBase = 'px-2 py-1 text-xs rounded transition-colors';
const btnNormal = `${btnBase} bg-gray-700 hover:bg-gray-600 text-gray-200`;
const btnAccent = `${btnBase} bg-amber-700 hover:bg-amber-600 text-white`;
const btnDanger = `${btnBase} bg-red-700 hover:bg-red-600 text-white`;
const btnDisabled = `${btnBase} bg-gray-800 text-gray-500 cursor-not-allowed`;

const EditorToolbar = ({
  selectionSize,
  snapEnabled,
  onSnapChange,
  onQuantize,
  onAlignMedian,
  onScaleTowardRoot,
  onInvert,
  onDistributeX,
  onDeleteSelected,
  onSetHandleMode,
  onSelectAll,
  onClearSelection,
  onResetToDerived,
  isEdited,
}) => {
  const [scaleAmount, setScaleAmount] = useState(0.5);
  const hasSel = selectionSize > 0;
  const opBtn = (onClick, label, variant = 'normal') => (
    <button
      className={!hasSel ? btnDisabled : variant === 'danger' ? btnDanger : btnNormal}
      disabled={!hasSel}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
      <span className="text-xs text-gray-400 mr-1">
        {selectionSize > 0 ? `${selectionSize} selected` : 'Click a vertex, shift-click to add, or drag to marquee'}
      </span>

      <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
        <input type="checkbox" checked={snapEnabled} onChange={(e) => onSnapChange(e.target.checked)} />
        Snap to notes
      </label>

      <div className="h-4 w-px bg-gray-600" />

      {opBtn(onQuantize, 'Quantize Y')}
      {opBtn(onAlignMedian, 'Align median')}
      {opBtn(onInvert, 'Invert')}
      {opBtn(onDistributeX, 'Distribute X')}

      <div className="flex items-center gap-1">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scaleAmount}
          onChange={(e) => setScaleAmount(Number(e.target.value))}
          className="w-20"
          disabled={!hasSel}
        />
        <button
          className={!hasSel ? btnDisabled : btnNormal}
          disabled={!hasSel}
          onClick={() => onScaleTowardRoot(scaleAmount)}
          title={`Scale Y toward root by ${(scaleAmount * 100).toFixed(0)}%`}
        >
          Scale → root
        </button>
      </div>

      <div className="h-4 w-px bg-gray-600" />

      <span className="text-xs text-gray-400">Handles:</span>
      {opBtn(() => onSetHandleMode('smooth'), 'Smooth')}
      {opBtn(() => onSetHandleMode('linear'), 'Linear')}
      {opBtn(() => onSetHandleMode('step'), 'Step')}

      <div className="h-4 w-px bg-gray-600" />

      {opBtn(onDeleteSelected, 'Delete', 'danger')}
      <button className={btnNormal} onClick={onSelectAll}>Select all</button>
      <button className={btnNormal} onClick={onClearSelection} disabled={!hasSel}>Clear</button>

      <div className="flex-1" />

      <button
        className={isEdited ? btnAccent : btnDisabled}
        disabled={!isEdited}
        onClick={onResetToDerived}
        title="Discard edits and fall back to the derived curve"
      >
        Re-derive from audio
      </button>
    </div>
  );
};

export default EditorToolbar;
