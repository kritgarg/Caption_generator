// Convert milliseconds to SRT timestamp HH:MM:SS,mmm
const msToSrt = (ms) => {
  const sign = ms < 0 ? '-' : '';
  const abs = Math.max(0, Math.floor(Math.abs(ms)));
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const msPart = abs % 1000;
  const pad2 = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');
  return `${sign}${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(msPart)}`;
};

// Parse SRT timestamp HH:MM:SS,mmm to milliseconds
const srtToMs = (ts) => {
  const m = ts.trim().match(/^(?<h>\d{2}):(?<m>\d{2}):(?<s>\d{2}),(?<ms>\d{3})$/);
  if (!m || !m.groups) return 0;
  const h = Number(m.groups.h) || 0;
  const mi = Number(m.groups.m) || 0;
  const s = Number(m.groups.s) || 0;
  const ms = Number(m.groups.ms) || 0;
  return h * 3600000 + mi * 60000 + s * 1000 + ms;
};

export const wordsToSrt = (words = []) => {
  const lines = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const start = typeof w.start === 'number' ? w.start : 0;
    const end = typeof w.end === 'number' ? w.end : start + 1;
    const text = (w.text ?? '').toString();
    lines.push(String(i + 1));
    lines.push(`${msToSrt(start)} --> ${msToSrt(end)}`);
    lines.push(text);
    lines.push('');
  }
  return lines.join('\n');
};

export const srtToWords = (srtText = '') => {
  const blocks = srtText.replace(/\r/g, '').split(/\n\s*\n/);
  const words = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) continue;
    let timeLineIdx = 1;
    let idxLineIsNumber = /^\d+$/.test(lines[0].trim());
    if (!idxLineIsNumber) timeLineIdx = 0;
    const timeLine = lines[timeLineIdx];
    const timeMatch = timeLine.match(/(?<start>\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(?<end>\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch || !timeMatch.groups) continue;
    const startMs = srtToMs(timeMatch.groups.start);
    const endMs = srtToMs(timeMatch.groups.end);
    if (!(endMs > startMs)) continue;
    const textLines = lines.slice(timeLineIdx + 1);
    const subtitle = textLines.join(' ').trim();
    if (!subtitle) continue;
    const tokens = subtitle.split(/\s+/).filter(Boolean);
    const dur = endMs - startMs;
    if (tokens.length === 1) {
      words.push({start: startMs, end: endMs, text: tokens[0]});
    } else {
      const per = dur / tokens.length;
      for (let i = 0; i < tokens.length; i++) {
        const s = Math.round(startMs + i * per);
        const e = Math.round(i === tokens.length - 1 ? endMs : startMs + (i + 1) * per);
        words.push({start: s, end: e, text: tokens[i]});
      }
    }
  }
  return words;
};

export default {wordsToSrt, srtToWords};
