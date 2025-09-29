import React, {useCallback, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {Captions} from '../components/Captions.jsx';
import {wordsToSrt} from '../utils/srt.js';

const BACKEND_URL = 'http://localhost:3001/transcribe';

export default function App() {
  const [fileBlob, setFileBlob] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [serverVideoUrl, setServerVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({text: '', words: []});
  const [stage, setStage] = useState('idle'); // idle | loading | ready
  const [selectedPreset, setSelectedPreset] = useState('bottom');
  const [rendering, setRendering] = useState(false);

  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileBlob(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setServerVideoUrl(null);
    setResult({text: '', words: []});
    setError(null);
    setStage('idle');
  }, []);

  const onGenerate = useCallback(async () => {
    if (!fileBlob) {
      setError('Please upload a video first.');
      return;
    }
    const form = new FormData();
    form.append('video', fileBlob);
    setUploading(true);
    setStage('loading');
    setError(null);
    try {
      const res = await fetch(BACKEND_URL, {method: 'POST', body: form});
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Transcription failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      setResult({text: json.text || '', words: json.words || []});
      // Prefer server-accessible URL for both preview and rendering
      if (json.videoUrl) {
        setServerVideoUrl(json.videoUrl);
      }
      setStage('ready');
    } catch (err) {
      setError(err?.message || 'Unknown error');
      setStage('idle');
    } finally {
      setUploading(false);
    }
  }, [fileBlob]);

  const previewSrc = serverVideoUrl || videoSrc;
  const baseProps = useMemo(() => ({words: result.words, videoSrc: previewSrc}), [result.words, previewSrc]);

  const downloadSrt = useCallback(() => {
    try {
      const srt = wordsToSrt(result.words || []);
      const blob = new Blob([srt], {type: 'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captions.srt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to export SRT');
    }
  }, [result.words]);

  const downloadPropsJson = useCallback(() => {
    try {
      const json = JSON.stringify({videoSrc: previewSrc, preset: selectedPreset, words: result.words || []}, null, 2);
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'props.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to export props.json');
    }
  }, [previewSrc, selectedPreset, result.words]);

  const downloadMp4 = useCallback(async () => {
    try {
      setRendering(true);
      setError(null);
      const res = await fetch('http://localhost:3001/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          words: result.words || [],
          videoUrl: previewSrc,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Render failed: ${res.status} ${t}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captioned.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Failed to render MP4');
    } finally {
      setRendering(false);
    }
  }, [selectedPreset, result.words, previewSrc]);

  return (
    <div className="app-root">
      {stage !== 'ready' && (
        <div className="hero">
          <div className="hero-card">
            <div className="brand">Caption Generator</div>
            <p className="subtitle">Upload your MP4 and automatically generate Hinglish-friendly captions.</p>
            <div className="hero-actions">
              <label className="upload large">
                <input type="file" accept="video/mp4" onChange={onFileChange} />
                <span>Select MP4</span>
              </label>
              <button className="primary large" onClick={onGenerate} disabled={!fileBlob || uploading}>
                {uploading || stage === 'loading' ? 'Processing…' : 'Auto-generate captions'}
              </button>
            </div>
            {error && <div className="error" style={{marginTop: 8}}>{error}</div>}
            {videoSrc && <div className="hint" style={{marginTop: 8, opacity: 0.8}}>Video ready. Click “Auto-generate captions”.</div>}
          </div>
        </div>
      )}

      {stage === 'ready' && (
        <div className="workspace">
          <div className="preview-card">
            <div className="toolbar">
              <div className="toolbar-left">
                <label>Caption style</label>
                <select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
                  <option value="bottom">bottom</option>
                  <option value="top">top</option>
                  <option value="karaoke">karaoke</option>
                </select>
              </div>
              <div className="toolbar-right">
                <button onClick={downloadSrt} disabled={!result.words?.length}>Download SRT</button>
                <button onClick={downloadMp4} disabled={!result.words?.length || rendering}>{rendering ? 'Rendering…' : 'Download MP4'}</button>
              </div>
            </div>
            <div className="player-wrap">
              <Player
                component={Captions}
                inputProps={{...baseProps, preset: selectedPreset}}
                compositionWidth={1280}
                compositionHeight={720}
                fps={30}
                durationInFrames={60}
                controls
              />
            </div>
            <div className="cli">
              <div className="hint">Render with Remotion CLI (uses selected preset):</div>
              <pre>{`cd frontend/remotion-caption-demo\n` +
`npx remotion render CaptionDemo out.mp4 --props=props.json`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
