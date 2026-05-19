import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Reject private IP ranges, loopback, link-local and cloud metadata endpoints. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv6 loopback / unspecified / link-local / unique-local
  if (h === '::1' || h === '::' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  // IPv4 literal?
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}

function assertSafeUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('URL inválida'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Protocolo não permitido');
  }
  if (isBlockedHost(u.hostname)) {
    throw new Error('Host não permitido');
  }
  return u;
}

function truncateTitle(title: string | null, maxWords = 4): string | null {
  if (!title) return null;
  const cleaned = title
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—|:,]+|[\s\-–—|:,]+$/g, '')
    .trim();
  if (!cleaned) return null;
  const mainPart = cleaned.split(/\s*[-–—|]\s*/)[0].trim();
  const words = mainPart.split(/\s+/).slice(0, maxWords);
  return words.join(' ');
}

function scoreImageUrl(src: string): number {
  if (!src) return -1;
  const lower = src.toLowerCase();
  if (lower.includes('data:') || lower.includes('.svg') || lower.includes('pixel') ||
      lower.includes('tracking') || lower.includes('spacer') || lower.includes('logo') ||
      lower.includes('icon') || lower.includes('avatar') || lower.includes('badge') ||
      lower.includes('banner') || lower.includes('promo') || lower.includes('ad-') ||
      lower.includes('sprite') || lower.includes('placeholder') || lower.length < 20) return -1;

  let score = 0;
  if (/\.(jpg|jpeg|png|webp)/i.test(lower)) score += 10;
  if (/(\d{3,4})x(\d{3,4})/i.test(lower)) {
    const m = lower.match(/(\d{3,4})x(\d{3,4})/);
    if (m) {
      const w = parseInt(m[1]), h = parseInt(m[2]);
      if (w >= 400 && h >= 400) score += 20;
      const ratio = Math.max(w, h) / Math.min(w, h);
      if (ratio <= 1.5) score += 10;
    }
  }
  if (/product|goods|item|main|primary|hero|zoom|large|full/i.test(lower)) score += 15;
  if (/thumb|_tn|tiny|small|mini|_s\.|_t\.|50x|100x|150x/i.test(lower)) score -= 10;
  if (src.length > 80) score += 5;
  return score;
}

/** Upgrade image URL to higher resolution version */
function upgradeImageUrl(src: string): string {
  let img = src;

  // Mercado Livre/Mercado Libre: upgrade to max resolution
  if (/http2\.mlstatic\.com|mlstatic\.com/i.test(img)) {
    // Pattern: replace size suffix like -O, -I, -V, -F with -O (original/largest)
    img = img.replace(/-[A-Z]\.jpg/i, '-O.jpg');
    // Remove resize params
    img = img.replace(/\?.*$/, '');
  }

  // Amazon: get high-res version
  if (/images-na\.ssl-images-amazon|m\.media-amazon|images-amazon/i.test(img)) {
    // Remove size constraints like ._SX300_ or ._SL500_
    img = img.replace(/\._[A-Z]{2}\d+_?\./g, '.');
    img = img.replace(/\._[A-Z]+_\./g, '.');
  }

  // Shopee: get larger image
  if (/shopee/i.test(img)) {
    img = img.replace(/_tn$/, '');
    img = img.replace(/\/[a-z]_\d+_\d+\//i, '/');
  }

  // Shein: get larger image
  if (/shein/i.test(img)) {
    img = img.replace(/_thumbnail_\d+x\d+/i, '');
    img = img.replace(/\/thumbnail_\d+x\d+\//i, '/');
  }

  // AliExpress
  if (/alicdn\.com/i.test(img)) {
    img = img.replace(/_\d+x\d+\.jpg/i, '.jpg');
    img = img.replace(/\.\d+x\d+\.jpg/i, '.jpg');
  }

  return img;
}

function collectCandidateImages(html: string, url: string): string[] {
  const candidates: { src: string; score: number }[] = [];
  const seen = new Set<string>();

  const addCandidate = (raw: string | null, bonus = 0) => {
    if (!raw) return;
    let img = raw.trim();
    if (img.startsWith('//')) img = 'https:' + img;
    else if (!img.startsWith('http')) {
      try { img = new URL(img, new URL(url).origin).href; } catch { return; }
    }
    img = img.replace(/_tn\b/g, '');
    // Upgrade to high-res
    img = upgradeImageUrl(img);
    if (seen.has(img)) return;
    seen.add(img);
    const s = scoreImageUrl(img);
    if (s >= 0) candidates.push({ src: img, score: s + bonus });
  };

  const extractMeta = (property: string, name?: string): string | null => {
    const patterns = [
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
    ];
    if (name) {
      patterns.push(
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'),
      );
    }
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  addCandidate(extractMeta('og:image', 'image'), 30);
  addCandidate(extractMeta('twitter:image'), 25);
  addCandidate(extractMeta('twitter:image:src'), 25);

  // itemprop="image"
  const itempropImg = html.match(/<(?:img|meta)[^>]*itemprop=["']image["'][^>]*(?:content|src)=["']([^"']+)["']/i)
    || html.match(/<(?:img|meta)[^>]*(?:content|src)=["']([^"']+)["'][^>]*itemprop=["']image["']/i);
  addCandidate(itempropImg?.[1] ?? null, 20);

  // JSON-LD
  const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdBlocks) {
    for (const block of jsonLdBlocks) {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const ld = JSON.parse(jsonStr);
        const items = ld['@graph'] || [ld];
        for (const item of (Array.isArray(items) ? items : [items])) {
          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            for (const img of imgs) {
              if (typeof img === 'string') addCandidate(img, 18);
              else if (img?.url) addCandidate(img.url, 18);
              else if (img?.contentUrl) addCandidate(img.contentUrl, 18);
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  // Site-specific patterns
  // Mercado Livre - preload link images
  const preloadImgs = html.matchAll(/<link[^>]*rel=["']preload["'][^>]*href=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*as=["']image["']/gi);
  for (const m of preloadImgs) addCandidate(m[1], 28);
  // Mercado Livre - also check data in script __PRELOADED_STATE__ or __NEXT_DATA__
  const mlPreloadState = html.match(/"pictures?"?\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"(https?:\/\/[^"]+)"/i);
  addCandidate(mlPreloadState?.[1] ?? null, 30);
  // ML variation: secure_url in pictures array
  const mlSecureUrl = html.match(/"secure_url"\s*:\s*"(https?:\/\/http2\.mlstatic\.com[^"]+)"/i)
    || html.match(/"secure_url"\s*:\s*"(https?:\/\/[^"]*mlstatic[^"]+)"/i);
  addCandidate(mlSecureUrl?.[1] ?? null, 30);

  // Shein
  const sheinScript = html.match(/crop_image_url["']?\s*[:=]\s*["']([^"']+)["']/i);
  addCandidate(sheinScript?.[1] ?? null, 15);
  // Shein goods_img or original_img
  const sheinOrigImg = html.match(/(?:goods_img|original_img|mainImage)["']?\s*[:=]\s*["']([^"']+)["']/i);
  addCandidate(sheinOrigImg?.[1] ?? null, 20);

  // Amazon
  const amzHires = html.match(/data-old-hires=["']([^"']+)["']/i);
  addCandidate(amzHires?.[1] ?? null, 25);
  const amzLanding = html.match(/["']hiRes["']\s*:\s*["']([^"']+)["']/i)
    || html.match(/["']large["']\s*:\s*["']([^"']+)["']/i);
  addCandidate(amzLanding?.[1] ?? null, 22);
  // Amazon colorImages / imageGalleryData
  const amzColorImages = html.matchAll(/["']hiRes["']\s*:\s*["']([^"']+)["']/gi);
  for (const m of amzColorImages) addCandidate(m[1], 22);

  // Shopee
  const shopeeMatch = html.match(/"image"\s*:\s*"(https?:\/\/[^"]+(?:\.(?:jpg|jpeg|png|webp))[^"]*)"/i);
  addCandidate(shopeeMatch?.[1] ?? null, 15);

  // ML figure match
  const mlMatch = html.match(/<figure[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/i);
  addCandidate(mlMatch?.[1] ?? null, 12);

  // data-src and data-zoom-image (common in product pages)
  const dataSrcMatches = html.matchAll(/(?:data-src|data-zoom-image|data-zoom|data-image|data-full-image)=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/gi);
  for (const m of dataSrcMatches) addCandidate(m[1], 8);

  // Generic img tags
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) addCandidate(match[1], 0);

  candidates.sort((a, b) => b.score - a.score);
  return candidates.map(c => c.src);
}

/** Build a Mercado Livre image URL from the product ID in the URL */
function buildMercadoLivreImage(url: string): string | null {
  // Pattern: /p/MLB12345678 or MLB-12345678
  const mlbMatch = url.match(/ML[A-Z]-?(\d+)/i);
  if (mlbMatch) {
    const productId = 'MLB' + mlbMatch[1];
    // ML's CDN pattern for product images
    return `https://http2.mlstatic.com/D_NQ_NP_2X_${productId}-F.jpg`;
  }
  return null;
}

/** Extract product title from URL slug as last resort */
function titleFromUrlSlug(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    // e.g. /tnis-corrida-runfalcon-5-adidas/p/MLB38275322
    const slug = pathname.split('/').filter(s => s && !s.startsWith('p') && !/^ML[A-Z]/.test(s))[0];
    if (!slug || slug.length < 3) return null;
    const words = slug.replace(/-/g, ' ').split(/\s+/).slice(0, 4);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting metadata from:', url);

    const isMercadoLivre = /mercadoli[bv]re|mlstatic/i.test(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Try multiple user agents for sites that block
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ];

    let html = '';
    let fetchSuccess = false;

    for (const ua of userAgents) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        if (response.ok) {
          html = await response.text();
          fetchSuccess = true;
          break;
        }
        await response.text(); // consume body
      } catch { /* try next UA */ }
    }
    clearTimeout(timeout);

    if (!fetchSuccess || !html) {
      // For ML, try to construct image from URL even without HTML
      const mlImage = isMercadoLivre ? buildMercadoLivreImage(url) : null;
      const mlTitle = titleFromUrlSlug(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: { title: mlTitle, description: null, image: mlImage, price: null, url },
          partial: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const decodeEntities = (str: string) =>
      str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');

    const extractMeta = (property: string, name?: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
      ];
      if (name) {
        patterns.push(
          new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'),
        );
      }
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return decodeEntities(m[1].trim());
      }
      return null;
    };

    // ─── Title ───
    let title = extractMeta('og:title', 'title');
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTag?.[1]) title = decodeEntities(titleTag[1].trim());
    }
    title = truncateTitle(title);
    // Fallback: extract from URL slug
    if (!title || /^(mercado|shein|amazon|shopee)/i.test(title)) {
      const slugTitle = titleFromUrlSlug(url);
      if (slugTitle) title = slugTitle;
    }

    // ─── Description ───
    const description = extractMeta('og:description', 'description');

    // ─── Image (scored candidate system) ───
    const rankedImages = collectCandidateImages(html, url);
    let image = rankedImages.length > 0 ? rankedImages[0] : null;

    // Fallback for Mercado Livre: construct from product ID
    if (!image && isMercadoLivre) {
      image = buildMercadoLivreImage(url);
    }

    // Ensure high-res upgrade on final image
    if (image) {
      image = upgradeImageUrl(image);
    }

    // ─── Price ───
    let price = extractMeta('product:price:amount');
    if (!price) price = extractMeta('og:price:amount');
    if (!price) {
      const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdBlocks) {
        for (const block of jsonLdBlocks) {
          const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          try {
            const ld = JSON.parse(jsonStr);
            const items = ld['@graph'] || [ld];
            for (const item of (Array.isArray(items) ? items : [items])) {
              const offer = item.offers || item.Offers;
              if (offer) {
                const p = Array.isArray(offer) ? offer[0]?.price : offer.price;
                if (p) { price = String(p); break; }
              }
              if (item.price) { price = String(item.price); break; }
            }
            if (price) break;
          } catch { /* ignore */ }
        }
      }
    }
    if (!price) {
      // ML-specific price patterns
      const mlPrice = html.match(/price-tag-fraction"[^>]*>([^<]+)/i);
      if (mlPrice?.[1]) {
        const cents = html.match(/price-tag-cents"[^>]*>([^<]+)/i);
        price = mlPrice[1].trim() + (cents?.[1] ? ',' + cents[1].trim() : '');
      }
    }
    if (!price) {
      const priceMatch = html.match(/R\$\s*([\d.,]+)/);
      if (priceMatch?.[1]) price = priceMatch[1];
    }

    console.log('Extracted:', { title, description: !!description, image: !!image, price, candidates: rankedImages.length });

    return new Response(
      JSON.stringify({
        success: true,
        data: { title, description, image, price, url },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract metadata',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
