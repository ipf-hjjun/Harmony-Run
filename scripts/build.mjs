import { promises as fs } from "node:fs";
import path from "node:path";
import { minify } from "terser";
import JavaScriptObfuscator from "javascript-obfuscator";

const root = process.cwd();
const distDir = path.join(root, "dist");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removeDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDir(srcDir, destDir) {
  await ensureDir(destDir);
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else if (entry.isFile()) await copyFile(src, dest);
  }
}

function rewriteHtml(html) {
  return html
    .replace(/<script\s+src="index\.js"><\/script>/, '<script src="index.min.js"></script>')
    .replace(
      /<script\s+src="leaderboard\.js"><\/script>/,
      '<script src="leaderboard.min.js"></script>',
    );
}

async function buildJs({ srcFile, outFile }) {
  const input = await fs.readFile(srcFile, "utf8");

  const minified = await minify(input, {
    compress: {
      passes: 2,
      unsafe: false,
    },
    mangle: true,
    format: {
      comments: false,
    },
  });

  if (!minified.code) {
    throw new Error(`Failed to minify: ${srcFile}`);
  }

  const obfuscated = JavaScriptObfuscator.obfuscate(minified.code, {
    compact: true,
    renameGlobals: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    selfDefending: false,
    stringArray: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 0.6,
    unicodeEscapeSequence: false,
  }).getObfuscatedCode();

  await ensureDir(path.dirname(outFile));
  await fs.writeFile(outFile, obfuscated, "utf8");
}

async function main() {
  await removeDir(distDir);
  await ensureDir(distDir);

  await copyDir(path.join(root, "assets"), path.join(distDir, "assets"));
  await copyFile(path.join(root, "index.css"), path.join(distDir, "index.css"));

  const html = await fs.readFile(path.join(root, "index.html"), "utf8");
  await fs.writeFile(path.join(distDir, "index.html"), rewriteHtml(html), "utf8");

  await buildJs({
    srcFile: path.join(root, "index.js"),
    outFile: path.join(distDir, "index.min.js"),
  });

  await buildJs({
    srcFile: path.join(root, "leaderboard.js"),
    outFile: path.join(distDir, "leaderboard.min.js"),
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
