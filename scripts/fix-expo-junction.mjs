#!/usr/bin/env node
// npm workspaces hoists expo-* plugins to root node_modules but leaves `expo`
// in apps/mobile/node_modules. When expo-router/expo-font/etc. try to
// require('expo/config-plugins'), Node's require resolution can't find it.
//
// Fix: create a junction (Windows) or symlink (macOS/Linux) from
// `node_modules/expo` pointing at `apps/mobile/node_modules/expo`. Run this
// automatically as a postinstall step so every `npm install` recovers.

import { existsSync, lstatSync, symlinkSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const target = resolve(repoRoot, 'apps', 'mobile', 'node_modules', 'expo');
const linkPath = resolve(repoRoot, 'node_modules', 'expo');

if (!existsSync(target)) {
  console.log(`[fix-expo-junction] apps/mobile/node_modules/expo does not exist yet — skipping`);
  process.exit(0);
}

// If there's already a correct link, do nothing.
if (existsSync(linkPath)) {
  try {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      // If it's a real directory (not a link), the junction was overwritten.
      // We only want to replace when it's a real dir and not the correct target.
      // Quick heuristic: if the config-plugins file is missing, replace.
      if (!existsSync(resolve(linkPath, 'config-plugins.js'))) {
        rmSync(linkPath, { recursive: true, force: true });
      } else {
        console.log('[fix-expo-junction] node_modules/expo already valid — skipping');
        process.exit(0);
      }
    }
  } catch {
    rmSync(linkPath, { recursive: true, force: true });
  }
}

try {
  if (process.platform === 'win32') {
    // Use Windows mklink /J for a directory junction (no admin needed)
    execSync(`mklink /J "${linkPath}" "${target}"`, { stdio: 'inherit', shell: 'cmd.exe' });
  } else {
    symlinkSync(target, linkPath, 'dir');
  }
  console.log('[fix-expo-junction] linked node_modules/expo → apps/mobile/node_modules/expo');
} catch (err) {
  console.error('[fix-expo-junction] failed:', err.message);
  process.exit(0); // non-fatal
}
