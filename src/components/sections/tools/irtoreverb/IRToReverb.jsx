import React, { useState, useRef, useCallback } from 'react';
import { useIRToReverb } from './useIRToReverb';

const ALGO_LABELS = { 0: 'Classic (Plate)', 1: 'Lush' };

const PARAM_DEFS = [
  { key: 'algo',    label: 'Algo',     type: 'select', options: [{ v: 0, l: 'Classic (Plate)' }, { v: 1, l: 'Lush' }],
    help: 'Reverb engine. Classic = brighter, plate-like; Lush = warmer, denser, longer tail.' },
  { key: 'predly',  label: 'Pre-delay', min: 0, max: 200, step: 0.1, unit: 'ms',
    help: 'Time before the reverb tail begins. Larger spaces have longer pre-delays.' },
  { key: 'diffusn', label: 'Diffusion', min: 0, max: 100, step: 0.1, unit: '',
    help: 'Reflection density. Low = distinct echoes; high = smooth wash.' },
  { key: 'decay',   label: 'Decay',     min: 0, max: 100, step: 0.1, unit: '',
    help: 'Reverb tail length. Combines with Size to set effective RT60.' },
  { key: 'size',    label: 'Size',      min: 0, max: 100, step: 0.1, unit: '',
    help: 'Perceived room volume. Bigger Size = bigger feel; also extends decay.' },
  { key: 'damping', label: 'Damping',   min: 0, max: 100, step: 0.1, unit: '',
    help: 'High-frequency absorption. More damping = warmer/darker tail.' },
  { key: 'depth',   label: 'Depth',     min: 0, max: 100, step: 1, unit: '',
    help: 'Modulation depth. Adds movement/chorusing to the tail.' },
  { key: 'tone',    label: 'Tone',      min: -50, max: 50, step: 0.1, unit: '',
    help: 'Tilt EQ. Negative = darker; positive = brighter.' },
];

const METRIC_ROWS = [
  { label: 'Duration',       fmt: (m) => `${m.duration_s.toFixed(2)} s` },
  { label: 'RT60 @ 125 Hz',  fmt: (m) => fmtRT(m.rt60_bands && m.rt60_bands['125']) },
  { label: 'RT60 @ 500 Hz',  fmt: (m) => fmtRT(m.rt60_bands && m.rt60_bands['500']) },
  { label: 'RT60 @ 1 kHz',   fmt: (m) => fmtRT(m.rt60_bands && m.rt60_bands['1000']) },
  { label: 'RT60 @ 4 kHz',   fmt: (m) => fmtRT(m.rt60_bands && m.rt60_bands['4000']) },
  { label: 'EDT',            fmt: (m) => fmtRT(m.edt) },
  { label: 'ITDG',           fmt: (m) => `${m.itdg_ms.toFixed(2)} ms` },
  { label: 'Echo density @50ms',  fmt: (m) => fmtNum(m.echo_density && m.echo_density['50']) },
  { label: 'Echo density @100ms', fmt: (m) => fmtNum(m.echo_density && m.echo_density['100']) },
  { label: 'Centroid (tail)', fmt: (m) => m.centroid_hz != null ? `${m.centroid_hz} Hz` : '—' },
  { label: 'Bass ratio',     fmt: (m) => fmtNum(m.bass_ratio) },
  { label: 'Treble ratio',   fmt: (m) => fmtNum(m.treble_ratio) },
  { label: 'Clarity (C80)',  fmt: (m) => m.c80_db != null ? `${m.c80_db.toFixed(2)} dB` : '—' },
];

function fmtRT(v) { return v == null ? '—' : `${v.toFixed(2)} s`; }
function fmtNum(v) { return v == null ? '—' : v.toFixed(2); }

const IRToReverb = () => {
  const {
    fileName, audioBuffer, analyzing, metrics, category, derivedParams, params, playing, error,
    loadFile, togglePlay, updateParam, resetToDerived, exportPreset,
  } = useIRToReverb();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const onFile = useCallback((file) => { if (file) loadFile(file); }, [loadFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFile(e.dataTransfer.files[0]);
  };

  const isModified = params && derivedParams &&
    PARAM_DEFS.some((p) => params[p.key] !== derivedParams[p.key]);

  return (
    <div className="text-white">
      <h1 className="text-3xl font-semibold mb-2 text-rose-400">IR to Zebra Reverb</h1>
      <p className="text-white/60 mb-6">
        Drop an impulse response, get a Zebra 3 Reverb preset. Metrics drive a heuristic mapping —
        nudge the sliders if your ear disagrees, then download.
      </p>

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all mb-4 ${
          dragOver ? 'border-rose-400 bg-rose-400/10' : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files[0])}
        />
        {!fileName && <div className="text-3xl mb-1">🌌</div>}
        <p className="text-gray-200">
          {fileName
            ? `${fileName}${audioBuffer ? `  ·  ${audioBuffer.numberOfChannels}ch  ·  ${audioBuffer.sampleRate} Hz  ·  ${audioBuffer.duration.toFixed(2)} s` : ''}`
            : 'Drop an IR (WAV/MP3/FLAC) or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {fileName ? 'Click to change file' : 'Everything runs locally — nothing uploaded'}
        </p>
      </div>

      {/* Playback */}
      {audioBuffer && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={togglePlay}
            className="px-4 py-2 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-medium transition"
          >
            {playing ? '■ Stop' : '▶ Play IR'}
          </button>
          {analyzing && <span className="text-white/60 text-sm">Analyzing…</span>}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-200 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {metrics && params && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Metrics panel */}
          <div className="bg-gray-900/40 rounded-lg border border-gray-800 p-4">
            <h2 className="text-lg font-semibold text-white/80 mb-3">Acoustic Analysis</h2>
            <table className="w-full text-sm">
              <tbody>
                {METRIC_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-gray-800/50 last:border-b-0">
                    <td className="py-1.5 text-white/60">{row.label}</td>
                    <td className="py-1.5 text-right text-white/90 tabular-nums">{row.fmt(metrics)}</td>
                  </tr>
                ))}
                {category && (
                  <tr>
                    <td className="pt-3 text-white/60">Category guess</td>
                    <td className="pt-3 text-right text-white/90">{category}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Params panel */}
          <div className="bg-gray-900/40 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white/80">Zebra Reverb Params</h2>
              {isModified && (
                <button
                  onClick={resetToDerived}
                  className="text-xs text-white/50 hover:text-white/80 underline"
                >
                  Reset to derived
                </button>
              )}
            </div>
            <div className="space-y-3">
              {PARAM_DEFS.map((p) => (
                <ParamControl
                  key={p.key}
                  def={p}
                  value={params[p.key]}
                  derived={derivedParams[p.key]}
                  onChange={(v) => updateParam(p.key, v)}
                />
              ))}
            </div>
            <button
              onClick={exportPreset}
              className="mt-5 w-full px-4 py-3 rounded bg-rose-500 hover:bg-rose-400 text-black font-semibold transition"
            >
              Download .h2p
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function ParamControl({ def, value, derived, onChange }) {
  if (def.type === 'select') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-white/80">{def.label}</label>
          <span className="text-xs text-white/40">{ALGO_LABELS[value] ?? value}</span>
        </div>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white/90"
        >
          {def.options.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
        <p className="text-xs text-white/40 mt-1">{def.help}</p>
      </div>
    );
  }
  const isModified = value !== derived;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-white/80">{def.label}</label>
        <span className={`text-xs tabular-nums ${isModified ? 'text-amber-300' : 'text-white/40'}`}>
          {Number(value).toFixed(def.step < 1 ? 1 : 0)}{def.unit}
          {isModified && <span className="text-white/30"> (was {Number(derived).toFixed(def.step < 1 ? 1 : 0)})</span>}
        </span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-rose-500"
      />
      <p className="text-xs text-white/40 mt-1">{def.help}</p>
    </div>
  );
}

export default IRToReverb;
