import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { KernelPlugin } from './types.js';

export class PluginManager {
  private plugins: KernelPlugin[] = [];

  register(plugin: KernelPlugin) {
    this.plugins.push(plugin);
  }

  list(): KernelPlugin[] {
    return [...this.plugins];
  }

  async loadFromPluginsDir() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pluginsDir = path.join(__dirname, 'plugins');

    let files: string[] = [];
    try {
      files = readdirSync(pluginsDir)
        .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
        .map((f) => path.join(pluginsDir, f));
    } catch {
      return; // no plugins dir available
    }

    for (const file of files) {
      const mod = await import(pathToFileUrl(file));
      const plugin: KernelPlugin | undefined = mod.default;
      if (plugin && typeof plugin.canHandle === 'function') {
        this.register(plugin);
      }
    }
  }
}

function pathToFileUrl(p: string) {
  const resolved = path.resolve(p);
  const url = new URL(`file://${resolved.startsWith('/') ? '' : '/'}${resolved}`);
  return url.href;
}