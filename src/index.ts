import type { Plugin, ViteDevServer } from 'vite';
import { resolveConfig } from './utils.js';
import { handleHotUpdate } from './dev.js';

export interface SheetVestOptions {
  input: string[] | string;
  refresh?: boolean;
  publicDirectory?: string;
}

export default function sheetVest(options: SheetVestOptions = { input: [] }): Plugin {
  const resolvedOptions = resolveConfig(options);

  return {
    name: 'sheet-vest',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        // Implementar middleware personalizado aqui
        next();
      });
    },

    handleHotUpdate(ctx) {
      return handleHotUpdate(ctx, resolvedOptions);
    },

    config(config) {
      return {
        resolve: {
          alias: {
            '@': '/resources',
          },
        },
      };
    },
  };
}
