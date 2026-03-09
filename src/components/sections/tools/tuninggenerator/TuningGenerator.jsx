// ============================================================
// Tuning Generator - Main Component
// ============================================================

import React, { useState, useMemo, useEffect } from "react";
import { NOTE_NAMES, REFERENCE_PITCHES, TEMPERAMENTS, TEMPERAMENT_LIST, TEMPERAMENT_CONFIG, C_MAJOR_SCALE } from "./constants";
import { generateTuningTable, generateTunFile } from "./tuningUtils";
import { useAudio } from "./useAudio";

const TuningGenerator = () => {
  const [refPitch, setRefPitch] = useState("A440");
  const [temperament, setTemperament] = useState(TEMPERAMENTS.EQUAL);
  const [preset, setPreset] = useState(null);
  const [root, setRoot] = useState(0);
  const [scale, setScale] = useState(C_MAJOR_SCALE);
  const [customOffsets, setCustomOffsets] = useState(Array(12).fill(0));
  const { playScale } = useAudio();

  const config = TEMPERAMENT_CONFIG[temperament];
  const presets = config?.presets || [];
  const presetTitle = config?.title || "";

  useEffect(() => {
    if (presets.length && !preset) {
      const first = presets[0];
      setPreset(first);
      if (first.scale) setScale(first.scale);
    } else if (!presets.length) {
      setPreset(null);
      setScale(C_MAJOR_SCALE);
    }
  }, [temperament]);

  const table = useMemo(() => generateTuningTable(temperament, preset, customOffsets, refPitch), [temperament, preset, customOffsets, refPitch]);

  const handlePlay = () => {
    const freqs = [...scale].sort((a, b) => a - b).map((n) => table[60 + n].frequency);
    freqs.push(table[72 + scale[0]].frequency);
    playScale(freqs);
  };

  const handleDownload = () => {
    const content = generateTunFile(table, { temperament, preset, refPitch });
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const fileName = `${temperament}${preset ? "_" + preset.name.replace(/\s/g, "_") : ""}_${refPitch}`;
    a.download = `${fileName.charAt(0).toUpperCase() + fileName.slice(1)}.tun`;
    a.click();
  };

  const toggleNote = (n) => setScale((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort((a, b) => a - b)));

  const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
  const blackKeys = [1, 3, null, 6, 8, 10, null];

  return (
    <div className="text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 mb-1">🎵 Zebra 3 Tuning Generator</h1>
            <p className="text-gray-500 text-sm">Generate .tun microtuning files for Zebra 3</p>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .tun
          </button>
        </div>

        {/* Reference Pitch */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reference Pitch</h3>
          <div className="flex gap-2">
            {Object.entries(REFERENCE_PITCHES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setRefPitch(k)}
                className={`px-3 py-1.5 rounded text-sm transition-all ${refPitch === k ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>

        {/* Temperament */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Temperament</h3>
          <div className="flex flex-wrap gap-2">
            {TEMPERAMENT_LIST.map((t) => (
              <button
                key={t}
                onClick={() => setTemperament(t)}
                className={`px-3 py-1.5 rounded text-sm capitalize transition-all ${temperament === t ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Table */}
        {presets.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{presetTitle}</h3>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="border-b border-gray-700">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-2 py-2 text-left text-gray-400 font-medium">Name</th>
                    <th className="px-2 py-2 text-left text-gray-400 font-medium">Character</th>
                    <th className="px-2 py-2 text-left text-gray-400 font-medium hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setPreset(p);
                        if (p.scale) setScale(p.scale);
                      }}
                      className={`cursor-pointer border-b border-gray-700/50 last:border-0 ${preset?.id === p.id ? "bg-emerald-900/30" : "hover:bg-gray-700/50"}`}
                    >
                      <td className="px-2 py-2 text-center">
                        <div className={`w-3 h-3 rounded-full border-2 mx-auto ${preset?.id === p.id ? "border-emerald-500 bg-emerald-500" : "border-gray-500"}`} />
                      </td>
                      <td className="px-2 py-2 text-gray-200 font-medium">{p.name}</td>
                      <td className="px-2 py-2 text-gray-400">{p.character}</td>
                      <td className="px-2 py-2 text-gray-500 text-xs hidden md:table-cell">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Keyboard */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scale & Root</h3>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
            <div className="flex mb-1">
              {whiteKeys.map((n, i) => (
                <div key={n} className="relative" style={{ width: 36, marginRight: 2 }}>
                  <button onClick={() => setRoot(n)} className={`w-full h-5 rounded text-xs font-bold ${root === n ? "bg-amber-500 text-gray-900" : "bg-gray-700 text-gray-500 hover:bg-gray-600"}`}>
                    R
                  </button>
                  {blackKeys[i] !== null && (
                    <button
                      onClick={() => setRoot(blackKeys[i])}
                      className={`absolute -right-2.5 top-0 w-4 h-5 rounded text-xs font-bold z-10 ${
                        root === blackKeys[i] ? "bg-amber-500 text-gray-900" : "bg-gray-600 text-gray-500 hover:bg-gray-500"
                      }`}
                    >
                      R
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="relative flex">
              {whiteKeys.map((n, i) => (
                <div key={n} className="relative" style={{ width: 36, marginRight: 2 }}>
                  <button
                    onClick={() => toggleNote(n)}
                    className={`w-full h-20 rounded-b border-2 flex flex-col items-center justify-end pb-1 transition-all ${
                      root === n ? "bg-amber-100 border-amber-400" : scale.includes(n) ? "bg-emerald-100 border-emerald-400" : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {(scale.includes(n) || root === n) && <div className={`w-2.5 h-2.5 rounded-full mb-0.5 ${root === n ? "bg-amber-500" : "bg-emerald-500"}`} />}
                    <span className="text-xs font-medium text-gray-700">{NOTE_NAMES[n]}</span>
                  </button>
                  {blackKeys[i] !== null && (
                    <button
                      onClick={() => toggleNote(blackKeys[i])}
                      className={`absolute -right-2.5 top-0 w-5 h-12 rounded-b z-10 flex items-end justify-center pb-0.5 ${
                        root === blackKeys[i] ? "bg-amber-600" : scale.includes(blackKeys[i]) ? "bg-emerald-700" : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      {(scale.includes(blackKeys[i]) || root === blackKeys[i]) && <div className={`w-2 h-2 rounded-full ${root === blackKeys[i] ? "bg-amber-300" : "bg-emerald-300"}`} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button onClick={handlePlay} className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all" title="Play Scale">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Root
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Scale
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tuning Table */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tuning (Octave 4)</h3>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-2 py-1.5 text-left text-gray-400 text-xs">Note</th>
                  <th className="px-2 py-1.5 text-right text-gray-400 text-xs">Ratio</th>
                  <th className="px-2 py-1.5 text-right text-gray-400 text-xs">Cents</th>
                  <th className="px-2 py-1.5 text-right text-gray-400 text-xs">Hz</th>
                  <th className="px-2 py-1.5 text-right text-gray-400 text-xs">Offset</th>
                </tr>
              </thead>
              <tbody>
                {table.slice(60, 72).map((e) => {
                  const n = e.midi % 12;
                  return (
                    <tr key={e.midi} className={`border-b border-gray-700/50 last:border-0 ${root === n ? "bg-amber-900/20" : scale.includes(n) ? "bg-emerald-900/20" : ""}`}>
                      <td className={`px-2 py-1 font-medium ${root === n ? "text-amber-400" : scale.includes(n) ? "text-emerald-400" : "text-gray-400"}`}>
                        {e.note}
                        {root === n && " (R)"}
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-gray-300 text-xs">{Math.pow(2, e.centsInOctave / 1200).toFixed(4)}</td>
                      <td className="px-2 py-1 text-right font-mono text-gray-300 text-xs">{e.centsInOctave.toFixed(1)}</td>
                      <td className="px-2 py-1 text-right font-mono text-gray-300 text-xs">{e.frequency.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">
                        {temperament === TEMPERAMENTS.CUSTOM ? (
                          <input
                            type="number"
                            value={customOffsets[n]}
                            onChange={(ev) => {
                              const v = [...customOffsets];
                              v[n] = +ev.target.value || 0;
                              setCustomOffsets(v);
                            }}
                            className="w-14 px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-right text-xs"
                            step="1"
                          />
                        ) : (
                          <span className={`font-mono text-xs ${e.offset > 0 ? "text-emerald-400" : e.offset < 0 ? "text-red-400" : "text-gray-500"}`}>
                            {e.offset >= 0 ? "+" : ""}
                            {e.offset.toFixed(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-gray-800 text-center text-xs text-gray-600">SonicTales Productions</div>
      </div>
    </div>
  );
};

export default TuningGenerator;
