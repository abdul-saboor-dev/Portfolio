import imageUrlBuilder from '@sanity/image-url';
import { publishedClient } from './client.js';

const builder = publishedClient ? imageUrlBuilder(publishedClient) : null;

export function getSanityImageUrl(source, options = {}) {
  if (!builder || !source) return null;

  const { width, height, quality = 85, fit = 'max' } = options;
  let image = builder.image(source).auto('format').fit(fit).quality(quality);

  if (width) image = image.width(width);
  if (height) image = image.height(height);

  return image.url();
}

export function getSanityImageProps(source, options = {}) {
  const src = getSanityImageUrl(source, options);
  if (!src) return null;

  return {
    src,
    alt: source.alt || '',
    decoding: 'async',
    loading: options.priority ? 'eager' : 'lazy',
  };
}
