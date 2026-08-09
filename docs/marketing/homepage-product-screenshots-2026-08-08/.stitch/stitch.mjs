import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Prefer sharp if present, else pure pngjs-less via child python
import { spawnSync } from "node:child_process";
const dir = process.argv[2];
const out = process.argv[3];
const overlap = Number(process.argv[4] || 120);
const files = readdirSync(dir).filter(f => f.endsWith('.png')).sort();
if (!files.length) throw new Error('no tiles');
const py = `
from PIL import Image
import os, sys
dir, out, overlap = sys.argv[1], sys.argv[2], int(sys.argv[3])
files = sorted([f for f in os.listdir(dir) if f.endswith('.png')])
imgs = [Image.open(os.path.join(dir,f)).convert('RGB') for f in files]
w = imgs[0].width
# crop overlap from tiles after first
tiles = [imgs[0]]
for im in imgs[1:]:
    tiles.append(im.crop((0, overlap*2 if False else overlap, im.width, im.height)))
# deviceScaleFactor=2 so overlap in CSS px needs *2 for pixels if overlap passed as CSS
# We'll pass pixel overlap instead.
h = sum(t.height for t in tiles)
canvas = Image.new('RGB', (w, h), (255,255,255))
y=0
for t in tiles:
    canvas.paste(t, (0,y))
    y += t.height
canvas.save(out)
print(canvas.size)
`;
const r = spawnSync('python3', ['-c', py, dir, out, String(overlap)], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(r.stdout);
