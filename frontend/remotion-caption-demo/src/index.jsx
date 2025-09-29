import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Captions} from './components/Captions';

const fps = 30;

// Dynamically compute duration from provided videoSrc using browser metadata.
// Works in Remotion Studio; for renders, ensure the file is accessible.
const calculateMetadata = async ({props}) => {
  const {videoSrc} = props ?? {};
  if (!videoSrc) {
    return {
      durationInFrames: fps * 60, // fallback 60s
      props,
    };
  }

  const durationSec = await new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = videoSrc;
      video.crossOrigin = 'anonymous';
      const onLoaded = () => {
        resolve(Number.isFinite(video.duration) ? video.duration : 60);
        cleanup();
      };
      const onError = () => {
        resolve(60);
        cleanup();
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    } catch {
      resolve(60);
    }
  });

  return {
    durationInFrames: Math.max(1, Math.round(durationSec * fps)),
    props,
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="CaptionDemo"
        component={Captions}
        width={1280}
        height={720}
        fps={fps}
        durationInFrames={fps * 60}
        defaultProps={{words: [], preset: 'bottom', videoSrc: null}}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};

registerRoot(RemotionRoot);
