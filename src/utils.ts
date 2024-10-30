import { SheetVestOptions } from './index';

export function resolveConfig(options: SheetVestOptions) {
  return {
    input: Array.isArray(options.input) ? options.input : [options.input],
    refresh: options.refresh ?? true,
    publicDirectory: options.publicDirectory ?? 'public',
  };
}

export function isStylesheet(file: string): boolean {
  return /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/.test(file);
}
