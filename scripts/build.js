#!/usr/bin/env node
/*
  Build helper for EAS local builds that:
  - Creates output under ./builds/{dev|prod}/{android|ios}
  - Nests a subfolder named with timestamp and incremental number
  - Runs `eas build --local` directing output to that subfolder
  - If the CLI does not respect --output as directory, moves the artifact
*/

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function pad(n, size = 3) {
  let s = String(n);
  while (s.length < size) s = '0' + s;
  return s;
}

function timestamp() {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1, 2);
  const DD = pad(d.getDate(), 2);
  const hh = pad(d.getHours(), 2);
  const mm = pad(d.getMinutes(), 2);
  const ss = pad(d.getSeconds(), 2);
  return `${YYYY}${MM}${DD}-${hh}${mm}${ss}`;
}

function readBuildNumber(file, platform) {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    const n = Number(json[platform] || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeBuildNumber(file, platform, n) {
  let json = {};
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  json[platform] = n;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findArtifactsInDir(dir, platform) {
  if (!fs.existsSync(dir)) return [];
  const exts = platform === 'android'
    ? ['.apk', '.aab']
    : ['.ipa', '.tar.gz', '.app', '.zip'];
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('build-') || f.endsWith('.apk') || f.endsWith('.aab') || f.endsWith('.ipa') || f.endsWith('.tar.gz'))
    .map((f) => path.join(dir, f))
    .filter((p) => exts.some((e) => p.endsWith(e)) || /build-\d+\./.test(p));
  return files;
}

function moveRecentArtifactsFromCwd(destDir, platform) {
  const cwd = process.cwd();
  const files = findArtifactsInDir(cwd, platform);
  if (files.length === 0) return [];
  const moved = [];
  for (const file of files) {
    const base = path.basename(file);
    const target = path.join(destDir, base);
    try {
      fs.renameSync(file, target);
      moved.push(target);
    } catch (e) {
      // fallback to copy + unlink
      try {
        fs.copyFileSync(file, target);
        fs.unlinkSync(file);
        moved.push(target);
      } catch {}
    }
  }
  return moved;
}

function run(cmd, args, opts = {}) {
  const env = {
    ...process.env,
    // Ensure generous heap for Gradle/JVM during local builds
    JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS || '-Xmx6g -XX:MaxMetaspaceSize=1536m',
    GRADLE_OPTS: process.env.GRADLE_OPTS || '-Xmx6g -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=1536m"',
    LINT_PRINT_STACKTRACE: process.env.LINT_PRINT_STACKTRACE || 'true',
  };
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env, ...opts });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
}

function main() {
  const platform = process.argv[2];
  const profile = process.argv[3] || 'production';
  if (!['android', 'ios'].includes(platform)) {
    console.error('Usage: node scripts/build.js <android|ios> [profile]');
    process.exit(1);
  }

  // Map EAS profile to env bucket
  const envBucket = /prod/i.test(profile) ? 'prod' : 'dev';
  const baseDir = path.join(process.cwd(), 'builds', envBucket, platform);
  const counterFile = path.join(process.cwd(), 'scripts', 'build-number.json');
  const next = readBuildNumber(counterFile, platform) + 1;
  const stamp = timestamp();
  const subdirName = `${stamp}-${pad(next, 3)}`;
  const outDir = path.join(baseDir, subdirName);
  ensureDir(outDir);

  console.log(`→ Building ${platform} (${profile}) into: ${outDir}`);

  // EAS "--output" expects a file path in some versions; provide filename inside our folder
  const filename = platform === 'android'
    ? `build-${subdirName}.apk`
    : `build-${subdirName}.ipa`;
  const outFile = path.join(outDir, filename);

  const easArgs = [
    'eas',
    'build',
    '--platform', platform,
    '--profile', profile,
    '--local',
    '--output', outFile,
  ];

  // Run EAS build
  // run via npx to ensure local/global resolution
  run('npx', easArgs);

  // If no artifacts ended up in the outDir, try to move from CWD
  const artifacts = findArtifactsInDir(outDir, platform);
  if (artifacts.length === 0) {
    const moved = moveRecentArtifactsFromCwd(outDir, platform);
    if (moved.length === 0) {
      console.warn('! No artifacts found. Check EAS logs above.');
    } else {
      console.log('Moved artifacts:', moved.map((m) => path.relative(process.cwd(), m)).join(', '));
    }
  } else {
    console.log('Artifacts:', artifacts.map((m) => path.relative(process.cwd(), m)).join(', '));
    if (fs.existsSync(outFile)) {
      console.log(`Primary artifact: ${path.relative(process.cwd(), outFile)}`);
    }
  }

  writeBuildNumber(counterFile, platform, next);
  console.log(`✓ Done. Build number for ${platform}: ${next}`);
}

main();
