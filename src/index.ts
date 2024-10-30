import { Plugin, UserConfig, ResolvedConfig } from 'vite';
import { resolve, normalize } from 'path';
import { existsSync } from 'fs';
import pc from 'picocolors';

interface SheetVestOptions {
  entryPoints?: string | string[];
  outDir?: string;
  assetsDir?: string;
  manifest?: boolean;
  refresh?: boolean | string[];
  preload?: boolean;
  alias?: Record<string, string>;
  define?: Record<string, any>;
}

export default function sheetVest(options: SheetVestOptions = {}): Plugin {
  let config: ResolvedConfig;

  const defaultOptions: Required<SheetVestOptions> = {
    entryPoints: 'src/main.js',
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    refresh: true,
    preload: true,
    alias: {},
    define: {}
  };

  options = { ...defaultOptions, ...options };

  return {
    name: 'sheet-vest',

    config: (userConfig) => {
      const outDir = resolve(process.cwd(), options.outDir);
      const assetsDir = options.assetsDir;

      const config: UserConfig = {
        base: userConfig.base || '',
        build: {
          manifest: options.manifest,
          outDir,
          assetsDir,
          rollupOptions: {
            input: resolveEntryPoints(options.entryPoints || defaultOptions.entryPoints) // Garante que entryPoints não seja undefined
          }
        },
        server: {
          hmr: options.refresh ? {
            protocol: 'ws',
            host: 'localhost',
            port: 24678
          } : false
        },
        resolve: {
          alias: options.alias
        },
        define: options.define
      };

      if (options.preload) {
        config.build!.rollupOptions = {
          ...config.build!.rollupOptions,
          output: {
            manualChunks: createChunksConfig()
          }
        };
      }

      return config;
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(server) {
      if (options.refresh) {
        setupHMR(server);
      }

      // Middleware para assets otimizados
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/' + options.assetsDir)) {
          res.setHeader('Cache-Control', 'max-age=31536000, immutable');

          // Implementar o cache de assets usando a API Cache do navegador
          const cache = await caches.open('sheet-vest-cache');
          const cachedResponse = await cache.match(req.url);
          if (cachedResponse) {
            res.write(await cachedResponse.text());
            res.end();
            return;
          }
        }
        next();
      });

      // Exemplo de lazy loading de um módulo
      server.middlewares.use((req, res, next) => {
        if (req.url === '/load-module') {
          loadModule('./path/to/your/module.js');
          res.end('Módulo carregado!');
          return;
        }
        next();
      });
    },

    handleHotUpdate({ file, server }) {
      if (options.refresh && shouldTriggerRefresh(file, options.refresh)) {
        console.log(pc.green('✨ [sheet-vest] Atualizando página...'));
        server.ws.send({ type: 'full-reload' });
      }
    },

    generateBundle(outputOptions, bundle) {
      if (!options.manifest) return;

      const manifest: Record<string, any> = {};

      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' || chunk.type === 'asset') {
          manifest[chunk.name || fileName] = {
            file: fileName,
            src: chunk.type === 'chunk' ? chunk.facadeModuleId : null,
            isEntry: chunk.type === 'chunk' ? chunk.isEntry : false,
            imports: chunk.type === 'chunk' ? chunk.imports : [],
            css: chunk.type === 'chunk' ? chunk.viteMetadata?.importedCss || [] : [],
            assets: chunk.type === 'chunk' ? chunk.viteMetadata?.importedAssets || [] : [],
            preload: shouldPreload(fileName, chunk)
          };
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2)
      });
    }
  };
}

// Funções auxiliares
function resolveEntryPoints(entryPoints: string | string[]) {
  const files = Array.isArray(entryPoints) ? entryPoints : [entryPoints];

  return files.reduce((entries : Record<string, string>, file) => {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      entries[file] = path;
    } else {
      console.warn(pc.yellow(`[sheet-vest] Arquivo de entrada não encontrado: ${file}`));
    }
    return entries;
  }, {});
}

function setupHMR(server: any) {
  server.ws.on('connection', (socket: any) => {
    socket.on('sheet-vest:reload', () => {
      server.ws.send({ type: 'full-reload' });
    });
  });
}

function shouldTriggerRefresh(file: string, refresh: boolean | string[]) {
  if (!refresh) return false;
  if (refresh === true) return true;

  return refresh.some(pattern => {
    const normalizedPattern = normalize(pattern);
    const normalizedFile = normalize(file);
    return normalizedFile.includes(normalizedPattern);
  });
}

function createChunksConfig() {
  return (id: string) => {
    if (id.includes('node_modules')) {
      return 'vendor';
    }
  };
}

function shouldPreload(fileName: string, chunk: any) {
  if (!fileName.match(/\.(js|css)$/)) return false;
  if (chunk.type === 'chunk' && !chunk.isEntry) return false;
  return true;
}

function loadModule(modulePath: string) {
  return import(modulePath)
    .then(module => {
      // Execute a função padrão do módulo ou o que for necessário
      if (module.default) {
        module.default();
      }
    })
    .catch(err => {
      console.error('Erro ao carregar o módulo:', err);
    });
}
