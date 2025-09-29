import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const app = express();
const upload = multer({ dest: "uploads/" });

// Minimal CORS for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "20mb" }));

// Serve uploaded files so the renderer can access them via HTTP
app.use("/static", express.static("uploads"));

const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY;

async function uploadToAssembly(filePath) {
  const fileData = fs.readFileSync(filePath);

  const uploadRes = await axios.post(
    "https://api.assemblyai.com/v2/upload",
    fileData,
    {
      headers: {
        authorization: ASSEMBLY_API_KEY,
        "transfer-encoding": "chunked",
      },
    }
  );

  return uploadRes.data.upload_url;
}

async function transcribeAudio(audioUrl) {
  const res = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    {
      audio_url: audioUrl,
      language_detection: true, // auto detect Hinglish
      punctuate: true,
      format_text: true,
    },
    {
      headers: { authorization: ASSEMBLY_API_KEY },
    }
  );

  return res.data.id;
}

async function pollTranscription(id) {
  while (true) {
    const res = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      {
        headers: { authorization: ASSEMBLY_API_KEY },
      }
    );

    if (res.data.status === "completed") return res.data;
    if (res.data.status === "error") throw new Error(res.data.error);

    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Upload + Transcribe endpoint
app.post("/transcribe", upload.single("video"), async (req, res) => {
  try {
    const audioUrl = await uploadToAssembly(req.file.path);
    const transcriptId = await transcribeAudio(audioUrl);
    const transcript = await pollTranscription(transcriptId);

    res.json({
      text: transcript.text,
      words: transcript.words, // [{start, end, text}]
      videoUrl: `http://localhost:3001/static/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Render MP4 using Remotion CLI and return the file
app.post("/render", async (req, res) => {
  try {
    const { preset, words, videoUrl } = req.body || {};
    if (!Array.isArray(words) || !videoUrl || !preset)
      return res.status(400).json({ error: "preset, words[], videoUrl required" });

    // Prepare props.json in the Remotion project directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectDir = path.resolve(__dirname, "../frontend/remotion-caption-demo");
    const tmpPropsPath = path.join(projectDir, `props-${Date.now()}.json`);
    const outPath = path.join(projectDir, `out-${Date.now()}.mp4`);
    fs.writeFileSync(
      tmpPropsPath,
      JSON.stringify({ videoSrc: videoUrl, preset, words }, null, 2)
    );

    const cmd = `npx remotion render CaptionDemo ${JSON.stringify(outPath)} --props=${JSON.stringify(
      path.basename(tmpPropsPath)
    )}`;
    const child = exec(cmd, { cwd: projectDir });

    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));

    child.on("exit", (code) => {
      try {
        if (code !== 0) {
          return res.status(500).json({ error: `Render failed with code ${code}` });
        }
        res.download(outPath, "captioned.mp4", (err) => {
          try {
            fs.unlinkSync(tmpPropsPath);
          } catch {}
          try {
            fs.unlinkSync(outPath);
          } catch {}
          if (err) console.error(err);
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e?.message || e) });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () =>
  console.log("✅ Server running at http://localhost:3001")
);
