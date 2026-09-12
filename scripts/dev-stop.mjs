// Stops the detached Keppler OCR dev server that `npm run dev` leaves running.
// (The HMS server is stopped with Ctrl+C in its own terminal.)

import { execFileSync } from "node:child_process";

const OCR_PORT = 3000;

let pids = [];
try {
  pids = execFileSync("lsof", ["-ti", `tcp:${OCR_PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" })
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
} catch {
  // lsof exits non-zero when nothing is listening
}

if (pids.length === 0) {
  console.log(`[keppler-ocr] nothing listening on port ${OCR_PORT}`);
} else {
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
      console.log(`[keppler-ocr] stopped pid ${pid}`);
    } catch (err) {
      console.error(`[keppler-ocr] could not stop pid ${pid}: ${err.message}`);
    }
  }
}
