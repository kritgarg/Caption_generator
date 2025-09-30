import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig} from 'remotion';
export const Captions = ({words = [], preset = 'bottom', videoSrc = null}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const tMs = (frame / fps) * 1000;
  const activeIndex = useMemo(() => {
    if (!words?.length) return -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (tMs >= (w.start ?? 0) && tMs < (w.end ?? 0)) return i;
    }
    return -1;
  }, [tMs, words]);
  const captionLine = useMemo(() => {
    if (!words?.length) return '';
    if (activeIndex < 0) return '';
    const start = Math.max(0, activeIndex - 5);
    const end = Math.min(words.length, activeIndex + 6);
    return words.slice(start, end).map((w) => w.text).join(' ');
  }, [activeIndex, words]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {videoSrc ? (
        <Video src={videoSrc} />
      ) : (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36}}>
          Provide a video to preview.
        </AbsoluteFill>
      )}
      {preset !== 'karaoke' ? (
        <AbsoluteFill
          style={{
            justifyContent: preset === 'top' ? 'flex-start' : 'flex-end',
            alignItems: 'center',
            padding: 40,
          }}
        >
          <div
            style={{
              maxWidth: width - 120,
              color: 'white',
              fontSize: 42,
              lineHeight: 1.2,
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              background: 'rgba(0,0,0,0.3)',
              padding: '10px 16px',
              borderRadius: 8,
            }}
          >
            {captionLine}
          </div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', padding: 40}}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              padding: '10px 16px',
              borderRadius: 8,
              maxWidth: width - 120,
            }}
          >
            {words?.slice(Math.max(0, activeIndex - 7), Math.min(words.length, activeIndex + 12)).map((w, i) => {
              const index = Math.max(0, activeIndex - 7) + i;
              const isActive = index === activeIndex;
              return (
                <span
                  key={`${index}-${w.start}-${w.end}`}
                  style={{
                    fontSize: 40,
                    lineHeight: 1.1,
                    color: isActive ? '#32e6ff' : 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    fontWeight: isActive ? 800 : 600,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

