import QRCode from "qrcode";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [url, output] = process.argv.slice(2);

if (!url || !output) {
  console.error("Usage: node tools/generate_qr_code.js <url> <output>");
  process.exit(1);
}

await mkdir(path.dirname(output), { recursive: true });

await QRCode.toFile(output, url, {
  errorCorrectionLevel: "M",
  width: 512,
  margin: 2,
});

console.log(`QR image written: ${output}`);
