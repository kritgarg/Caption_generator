declare module "../utils/srt" {
  export const wordsToSrt: (words: Array<{start: number; end: number; text: string}>) => string;
  export const srtToWords: (srtText: string) => Array<{start: number; end: number; text: string}>;
  const _default: {wordsToSrt: typeof wordsToSrt; srtToWords: typeof srtToWords};
  export default _default;
}
