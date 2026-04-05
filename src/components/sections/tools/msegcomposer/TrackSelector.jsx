// ============================================================
// MSEG Composer - Track Selector
// 8 color-coded track tabs with mute/solo toggles.
// ============================================================

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const TrackSelector = ({
  tracks,
  activeTrack,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
}) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tracks.map((track, i) => {
        const isActive = i === activeTrack;
        const hasNotes = track.notes.length > 0;

        return (
          <div
            key={i}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer border ${
              isActive
                ? 'border-white/40 bg-white/10'
                : 'border-transparent bg-gray-800/50 hover:bg-gray-700/50'
            }`}
            onClick={() => onSelectTrack(i)}
          >
            {/* Color dot */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: track.color,
                opacity: hasNotes ? 1 : 0.3,
              }}
            />

            {/* Track number */}
            <span className={isActive ? 'text-white' : 'text-gray-400'}>
              {i + 1}
            </span>

            {/* Mute button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute(i);
              }}
              className={`p-0.5 rounded transition-colors ${
                track.muted
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={track.muted ? 'Unmute' : 'Mute'}
            >
              {track.muted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>

            {/* Solo button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSolo(i);
              }}
              className={`px-1 py-0 rounded text-[10px] font-bold transition-colors ${
                track.solo
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
              title={track.solo ? 'Unsolo' : 'Solo'}
            >
              S
            </button>
          </div>
        );
      })}
    </div>
  );
};

export { TrackSelector };
