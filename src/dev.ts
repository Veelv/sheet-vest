import type { HmrContext } from 'vite';
import { isStylesheet } from './utils';

export function handleHotUpdate(
  ctx: HmrContext,
  options: ReturnType<typeof import('./utils').resolveConfig>
) {
  const { file, server } = ctx;

  if (isStylesheet(file) && options.refresh) {
    server.ws.send({
      type: 'full-reload',
    });
    return [];
  }
}
