import React, {useCallback, useMemo, useState} from "react";
import {AbsoluteFill} from "remotion";
import {Captions} from "./components/Captions";
import {wordsToSrt} from "./utils/srt";

const BACKEND_URL = "http://localhost:3001/transcribe";

export const CaptionUI: React.FC = () => {
  const [fileBlob, setFileBlob] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{text: string; words: any[]}>({text: "", words: []});

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileBlob(f);
    const url = URL.createObjectURL(f);
    setVideoSrc(url);
    setResult({text: "", words: []});
    setError(null);
  }, []);

  const onGenerate = useCallback(async () => {
    if (!fileBlob) {
      setError("Please upload a video first.");
      return;
    }
    const form = new FormData();
    form.append("video", fileBlob);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(BACKEND_URL, {method: "POST", body: form});
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Transcription failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      setResult({text: json.text || "", words: json.words || []});
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setUploading(false);
    }
  }, [fileBlob]);

  const baseProps = useMemo(() => ({words: result.words, videoSrc}), [result.words, videoSrc]);

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
      const json = JSON.stringify({videoSrc, preset: 'bottom', words: result.words || []}, null, 2);
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
  }, [videoSrc, result.words]);

  return (
    <AbsoluteFill style={{background: "#0b0b0b", color: "#fff", fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif'}}>
      <div style={{display: "flex", gap: 12, alignItems: "center", padding: 12, background: "#151515"}}>
        <label>
          <span style={{marginRight: 8, fontWeight: 700}}>Upload MP4:</span>
          <input type="file" accept="video/mp4" onChange={onFileChange} />
        </label>
        <button onClick={onGenerate} disabled={!fileBlob || uploading}>
          {uploading ? "Generating…" : "Generate captions"}
        </button>
        {error && <span style={{color: "#ff6b6b"}}>Error: {error}</span>}
      </div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 12}}>
        {(["bottom", "top", "karaoke"] as const).map((p) => (
          <div key={p} style={{position: "relative", background: "#111", borderRadius: 8, overflow: "hidden"}}>
            <div style={{position: "absolute", zIndex: 2, top: 8, left: 8, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, fontWeight: 700, textTransform: "capitalize"}}>
              {p} preview
            </div>
            <div style={{position: "absolute", inset: 0}}>
              <Captions {...baseProps} preset={p} />
            </div>
          </div>
        ))}
      </div>
      <div style={{display: 'flex', gap: 8, padding: 12, alignItems: 'center'}}>
        <button onClick={downloadSrt} disabled={!result.words?.length}>Download SRT</button>
        <button onClick={downloadPropsJson} disabled={!result.words?.length}>Download props.json</button>
        <div style={{fontSize: 12, opacity: 0.8}}>
          CLI render:
          <pre style={{whiteSpace: 'pre-wrap', margin: 0}}>{`cd frontend/remotion-caption-demo\n` +
`npx remotion render CaptionDemo out.mp4 --props=props.json`}</pre>
        </div>
      </div>
    </AbsoluteFill>
  );
};
