// ============================================================
// AudioUploader — Drop zone + file info
// Follows Modal Analyzer DropZone pattern.
// Analysis controls are in WaveformSelector.
// ============================================================

import React, { useState, useCallback, useRef } from 'react';

const AudioUploader = ({
  fileName,
  audioDuration,
  onLoadFile,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (file && file.type.startsWith('audio/')) {
        onLoadFile(file);
      }
    },
    [onLoadFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const hasFile = !!fileName;

  return (
    <div className="mb-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-amber-400 bg-amber-400/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {!hasFile && <div className="text-3xl mb-1">🎤</div>}
        <p className="text-gray-200">
          {hasFile
            ? `${fileName}  ·  ${audioDuration.toFixed(1)}s`
            : 'Drop audio file here or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {hasFile ? 'Click to change file' : 'WAV, MP3, OGG supported — all processing is local'}
        </p>
      </div>
    </div>
  );
};

export default AudioUploader;
