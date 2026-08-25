type ImportedProduct = {
  url: string;
  name: string;
  imageUrl?: string;
  sku?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  price?: number;
  currency?: string;
  weightGrams?: number;
  options?: { name: string; values: string[] }[];
  variants?: { id: number; title: string; options: string[]; sku?: string; price?: number; weightGrams?: number; imageUrl?: string }[];
};

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function firstMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : undefined;
}

function parseWeight(value: unknown) {
  const text = asString(value);
  if (!text) return undefined;
  const match = text.toLowerCase().match(/([\d.]+)\s*(mg|g|kg|oz|lb|lbs|pounds?)/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'mg' ? 0.001 : unit === 'kg' ? 1000 : unit === 'oz' ? 28.349523125 : ['lb', 'lbs', 'pound', 'pounds'].includes(unit) ? 453.59237 : 1;
  return Number.isFinite(amount) ? amount * multiplier : undefined;
}

function collectProducts(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(collectProducts);
  const object = value as Record<string, unknown>;
  return object['@type'] === 'Product' || (Array.isArray(object['@type']) && object['@type'].includes('Product'))
    ? [object]
    : Object.values(object).flatMap(collectProducts);
}

export async function importProductFromUrl(rawUrl: string): Promise<ImportedProduct> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('a valid website URL is required');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('only HTTP and HTTPS URLs are supported');

  const response = await fetch(url, { headers: { 'User-Agent': 'IBOTS Inventory Importer/1.0' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`vendor page returned HTTP ${response.status}`);
  const html = await response.text();
  let shopify: Record<string, unknown> = {};
  try {
    const shopifyResponse = await fetch(`${url.origin}${url.pathname}.js`, { headers: { 'User-Agent': 'IBOTS Inventory Importer/1.0' }, signal: AbortSignal.timeout(15000) });
    if (shopifyResponse.ok) shopify = await shopifyResponse.json() as Record<string, unknown>;
  } catch {
    shopify = {};
  }
  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => { try { return collectProducts(JSON.parse(match[1])); } catch { return []; } });
  const product = jsonLd[0] || shopify;
  const isMcMasterCatalog = /mcmaster\.com/i.test(url.hostname) && url.pathname.toLowerCase().startsWith('/products/');
  const mcMasterPartNumber = url.hostname.includes('mcmaster.com') ? url.pathname.match(/\/([A-Z0-9]+)\/?$/i)?.[1] : undefined;
  const offers = (product.offers && typeof product.offers === 'object' ? product.offers : {}) as Record<string, unknown>;
  const brand = typeof product.brand === 'object' && product.brand ? (product.brand as Record<string, unknown>).name : product.brand;
  const name = asString(product.name) || firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || firstMatch(html, /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i) || firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!jsonLd.length && (isMcMasterCatalog || /\/collections\/[^/]+\/products\//i.test(url.pathname))) {
    throw new Error('this page contains a catalog or multiple products; open one product page to import it');
  }
  if (!name && mcMasterPartNumber) {
    return { url: url.toString(), name: `McMaster-Carr part ${mcMasterPartNumber}`, sku: mcMasterPartNumber, manufacturer: 'McMaster-Carr' };
  }
  if (!name) throw new Error('no product name was found on that page');
  const image = Array.isArray(product.image) ? asString(product.image[0]) : asString(product.image) || firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || firstMatch(html, /<img[^>]+src=["'](https:\/\/m\.media-amazon\.com\/images\/I\/[^"']+)/i);
  const price = Number(offers.price) || Number(firstMatch(html, /(?:price|buyingPrice)[^$]{0,80}\$([\d,]+(?:\.\d{2})?)/i)?.replace(',', ''));
  const amazonAsin = url.hostname.includes('amazon.') ? url.pathname.match(/(?:dp|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1] : undefined;
  const mcMasterPriceMatch = html.match(/([A-Z0-9]+)\s+\$([\d,]+(?:\.\d{2})?)\s+per/i);
  const mcMasterPrice = Number(mcMasterPriceMatch?.[2]?.replace(',', ''));
  const weightGrams = parseWeight(product.weight) || parseWeight(firstMatch(html, /(?:weight|item weight)[^\d]{0,40}([\d.]+\s*(?:mg|g|kg|oz|lb|lbs|pounds?))/i));
  const variants = Array.isArray(shopify.variants) ? shopify.variants.map((rawVariant) => {
    const variant = rawVariant as Record<string, unknown>;
    const featuredImage = variant.featured_image && typeof variant.featured_image === 'object' ? (variant.featured_image as Record<string, unknown>).src : undefined;
    return { id: Number(variant.id), title: asString(variant.title) || '', options: Array.isArray(variant.options) ? variant.options.map(String) : [], sku: asString(variant.sku), price: Number(variant.price) / 100, weightGrams: parseWeight(`${variant.weight} ${variant.weight_unit || 'g'}`), imageUrl: asString(featuredImage) };
  }).filter((variant) => Number.isInteger(variant.id) && variant.title) : [];
  const options = Array.isArray(shopify.options) ? shopify.options.map((rawOption) => {
    const option = rawOption as Record<string, unknown>;
    return { name: asString(option.name) || 'Option', values: Array.isArray(option.values) ? option.values.map(String) : [] };
  }) : [];
  const selectedVariant = variants[0];

  return {
    url: url.toString(),
    name: name.replace(/:\s*Amazon\.com:.*$/i, '').trim(),
    imageUrl: selectedVariant?.imageUrl || image,
    sku: selectedVariant?.sku || asString(product.sku) || amazonAsin || mcMasterPartNumber,
    manufacturer: asString(brand) || (url.hostname.includes('mcmaster.com') ? 'McMaster-Carr' : undefined),
    manufacturerPartNumber: asString(product.mpn),
    price: selectedVariant?.price || (Number.isFinite(price) ? price : Number.isFinite(mcMasterPrice) ? mcMasterPrice : undefined),
    currency: asString(offers.priceCurrency),
    weightGrams: selectedVariant?.weightGrams || weightGrams,
    options: options.length ? options : undefined,
    variants: variants.length ? variants : undefined,
  };
}
