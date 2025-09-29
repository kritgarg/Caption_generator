import React, {useMemo} from 'react';
import {AbsoluteFill, Video, useCurrentFrame, useVideoConfig} from 'remotion';

// Props: { words: Array<{start:number; end:number; text:string}>, preset: 'bottom'|'top'|'karaoke', videoSrc: string|null }
export const Captions = ({words = [], preset = 'bottom', videoSrc = null}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();

  // Time in milliseconds for current frame
  const tMs = (frame / fps) * 1000;

  // Find the active word index based on tMs
  const activeIndex = useMemo(() => {
    if (!words?.length) return -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (tMs >= (w.start ?? 0) && tMs < (w.end ?? 0)) return i;
    }
    return -1;
  }, [tMs, words]);

  // Caption line to display around the active word
  const surroundingWords = useMemo(() => {
    if (!words?.length || activeIndex < 0) return [];
    const start = Math.max(0, activeIndex - 6);
    const end = Math.min(words.length, activeIndex + 7);
    return words.slice(start, end);
  }, [activeIndex, words]);

  const fontFamily = 'Noto Sans Devanagari, Noto Sans, sans-serif';

  const renderSimpleLine = (position) => {
    const text = surroundingWords.map((w) => w.text).join(' ');
    return (
      <AbsoluteFill
        style={{
          fontFamily,
          justifyContent: position === 'top' ? 'flex-start' : 'flex-end',
          alignItems: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            maxWidth: width - 120,
            color: 'white',
            fontSize: position === 'top' ? 36 : 48,
            lineHeight: 1.2,
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            background: position === 'top' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
            padding: position === 'top' ? '12px 18px' : '10px 16px',
            borderRadius: position === 'top' ? 0 : 10,
            width: position === 'top' ? '100%' : 'auto',
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  };

  const renderKaraoke = () => {
    const wordsToShow = surroundingWords;
    return (
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', padding: 40, fontFamily}}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
            padding: '12px 18px',
            borderRadius: 10,
            maxWidth: width - 120,
          }}
        >
          {wordsToShow.map((w, idx) => {
            const globalIndex = Math.max(0, activeIndex - 6) + idx;
            const isActive = globalIndex === activeIndex;
            const start = w.start ?? 0;
            const end = w.end ?? start + 1;
            const progress = isActive ? Math.min(1, Math.max(0, (tMs - start) / Math.max(1, end - start))) : tMs >= end ? 1 : 0;
            return (
              <span key={`${globalIndex}-${start}-${end}`} style={{position: 'relative', fontSize: 42, lineHeight: 1.12}}>
                <span style={{color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontWeight: 700}}>{w.text}</span>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    width: `${Math.round(progress * 100)}%`,
                    color: '#32e6ff',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    fontWeight: 800,
                  }}
                >
                  {w.text}
                </span>
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {videoSrc ? (
        <Video src={videoSrc} />
      ) : (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontFamily}}>
          Provide a video to preview.
        </AbsoluteFill>
      )}

      {preset === 'bottom' && renderSimpleLine('bottom')}
      {preset === 'top' && renderSimpleLine('top')}
      {preset === 'karaoke' && renderKaraoke()}
    </AbsoluteFill>
  );
};
