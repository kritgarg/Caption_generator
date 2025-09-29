import React, {useCallback, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {wordsToSrt} from './utils/srt';

// Note: Ensure you have a composition registered with id "CaptionDemo"
// in `src/Root.tsx` using Remotion's <Composition id="CaptionDemo" ... />
// and that the component accepts props: {words, preset, videoSrc}.
// Example props shape expected from backend:
//   words: Array<{start: number; end: number; text: string}>
//   text: string

const BACKEND_URL = 'http://localhost:3001/transcribe';

export default function PlayerApp() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({text: '', words: []});
  const [videoSrc, setVideoSrc] = useState(null);
  const [preset, setPreset] = useState('bottom'); // default selected in controls
  const [fileBlob, setFileBlob] = useState(null);

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the uploaded video immediately
    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setFileBlob(file);
    setResult({text: '', words: []});
    setError(null);
  }, []);

  const onGenerate = useCallback(async () => {
    if (!fileBlob) {
      setError('Please upload a video first.');
      return;
    }
    const formData = new FormData();
    formData.append('video', fileBlob);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(BACKEND_URL, {method: 'POST', body: formData});
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Transcription failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      setResult({text: json.text || '', words: json.words || []});
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  }, [fileBlob]);

  const baseInputProps = useMemo(
    () => ({ words: result.words, videoSrc }),
    [result.words, videoSrc]
  );

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
      const json = JSON.stringify({videoSrc, preset, words: result.words || []}, null, 2);
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
  }, [videoSrc, preset, result.words]);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: 16}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
        <label>
          <span style={{marginRight: 8, fontWeight: 600}}>Upload MP4:</span>
          <input type="file" accept="video/mp4" onChange={onFileChange} />
        </label>

        <button onClick={onGenerate} disabled={!fileBlob || uploading}>
          {uploading ? 'Generating…' : 'Generate captions'}
        </button>

        <label>
          <span style={{marginRight: 8, fontWeight: 600}}>Default preset:</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="bottom">bottom</option>
            <option value="top">top</option>
            <option value="karaoke">karaoke</option>
          </select>
        </label>

        {uploading && <span>Transcribing… This can take a minute.</span>}
        {error && <span style={{color: 'red'}}>Error: {error}</span>}
      </div>

      {/* 3 live previews */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16}}>
        {["bottom", "top", "karaoke"].map((p) => (
          <div key={p} style={{aspectRatio: '16/9', background: '#111', borderRadius: 8, overflow: 'hidden'}}>
            <div style={{color: '#fff', padding: 6, fontWeight: 600, textTransform: 'capitalize'}}>{p} preview</div>
            <Player
              style={{width: '100%', height: '100%'}}
              compositionWidth={1280}
              compositionHeight={720}
              fps={30}
              durationInFrames={60}
              controls
              inputProps={{...baseInputProps, preset: p}}
              // @ts-expect-error compositionId works in Studio context
              compositionId="CaptionDemo"
            />
          </div>
        ))}
      </div>

      {result.text && (
        <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8}}>
          <div style={{fontWeight: 600}}>Transcript</div>
          <div style={{whiteSpace: 'pre-wrap'}}>{result.text}</div>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button onClick={downloadSrt}>Download SRT</button>
            <button onClick={downloadPropsJson}>Download props.json</button>
          </div>
          <div style={{fontSize: 12, opacity: 0.8}}>
            CLI render example:
            <pre style={{whiteSpace: 'pre-wrap', margin: 0}}>
{`cd frontend/remotion-caption-demo
npx remotion render CaptionDemo out.mp4 --props=props.json`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
