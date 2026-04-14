import { useCallback, useEffect, useRef, useState } from 'react';

// Shared audio-file load + decode + playback hook.
// Owns a single AudioContext for the component's lifetime and tears it down
// on unmount so long-lived browser tabs don't accumulate suspended contexts.

export function useAudioFileLoader() {
  const [fileName, setFileName] = useState('');
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setPlaying(false);
  }, []);

  const playBuffer = useCallback(() => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.onended = () => {
      try { src.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
      setPlaying(false);
    };
    src.start();
    sourceNodeRef.current = src;
    setPlaying(true);
  }, [audioBuffer, stopPlayback, getAudioContext]);

  const togglePlay = useCallback(() => {
    if (playing) stopPlayback();
    else playBuffer();
  }, [playing, playBuffer, stopPlayback]);

  const loadFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith('audio/')) {
        setError('Please drop an audio file (WAV, MP3, FLAC, etc.)');
        return null;
      }
      setError(null);
      stopPlayback();
      setFileName(file.name);
      setAudioBuffer(null);
      setLoading(true);
      try {
        const arr = await file.arrayBuffer();
        const decoded = await getAudioContext().decodeAudioData(arr);
        setAudioBuffer(decoded);
        return decoded;
      } catch (e) {
        setError(`Could not decode file: ${e.message}`);
        setFileName('');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [stopPlayback, getAudioContext]
  );

  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        try { sourceNodeRef.current.disconnect(); } catch (e) {}
        sourceNodeRef.current = null;
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, []);

  return { fileName, audioBuffer, loading, playing, error, loadFile, togglePlay, stopPlayback };
}
