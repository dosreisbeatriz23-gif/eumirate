const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

/** Score an image URL: higher = more likely a good product image */
function scoreImageUrl(src: string): number {
  if (!src) return -1;
  const lower = src.toLowerCase();
  // Disqualifiers
  if (lower.includes('data:') || lower.includes('.svg') || lower.includes('pixel') ||
      lower.includes('tracking') || lower.includes('spacer') || lower.includes('logo') ||
      lower.includes('icon') || lower.includes('avatar') || lower.includes('badge') ||
      lower.includes('banner') || lower.includes('promo') || lower.includes('ad-') ||
      lower.includes('sprite') || lower.includes('placeholder') || lower.length < 20) return -1;

  let score = 0;
  // Prefer common image extensions
  if (/\.(jpg|jpeg|png|webp)/i.test(lower)) score += 10;
  // Prefer larger image hints in URL
  if (/(\d{3,4})x(\d{3,4})/i.test(lower)) {
    const m = lower.match(/(\d{3,4})x(\d{3,4})/);
    if (m) {
      const w = parseInt(m[1]), h = parseInt(m[2]);
      if (w >= 400 && h >= 400) score += 20;
      // Prefer squarish aspect ratios
      const ratio = Math.max(w, h) / Math.min(w, h);
      if (ratio <= 1.5) score += 10;
    }
  }
  // Prefer URLs with product-related keywords
  if (/product|goods|item|main|primary|hero|zoom|large|full/i.test(lower)) score += 15;
  // Penalize thumbnail indicators
  if (/thumb|_tn|tiny|small|mini|_s\.|_t\.|50x|100x|150x/i.test(lower)) score -= 10;
  // Prefer longer URLs (more specific)
  if (src.length > 80) score += 5;
  return score;
}

/** Collect all candidate images from HTML and pick the best ones */
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
    if (seen.has(img)) return;
    seen.add(img);
    const s = scoreImageUrl(img);
    if (s >= 0) candidates.push({ src: img, score: s + bonus });
  };

  // OG / Twitter
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
  const sheinScript = html.match(/crop_image_url["']?\s*[:=]\s*["']([^"']+)["']/i);
  addCandidate(sheinScript?.[1] ?? null, 15);

  const amzHires = html.match(/data-old-hires=["']([^"']+)["']/i);
  addCandidate(amzHires?.[1] ?? null, 25);
  const amzLanding = html.match(/["']hiRes["']\s*:\s*["']([^"']+)["']/i)
    || html.match(/["']large["']\s*:\s*["']([^"']+)["']/i);
  addCandidate(amzLanding?.[1] ?? null, 22);

  const shopeeMatch = html.match(/"image"\s*:\s*"(https?:\/\/[^"]+(?:\.(?:jpg|jpeg|png|webp))[^"]*)"/i);
  addCandidate(shopeeMatch?.[1] ?? null, 15);

  const mlMatch = html.match(/<figure[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/i);
  addCandidate(mlMatch?.[1] ?? null, 12);

  // data-src images (product galleries)
  const dataSrcMatches = html.matchAll(/data-src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/gi);
  for (const m of dataSrcMatches) addCandidate(m[1], 8);

  // Generic img tags
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) addCandidate(match[1], 0);

  // Sort by score descending, return top candidates
  candidates.sort((a, b) => b.score - a.score);
  return candidates.map(c => c.src);
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`Site returned ${response.status}, returning partial data`);
        await response.text();
        return new Response(
          JSON.stringify({
            success: true,
            data: { title: null, description: null, image: null, price: null, url },
            partial: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.warn('Fetch failed, returning partial data:', fetchErr);
      return new Response(
        JSON.stringify({
          success: true,
          data: { title: null, description: null, image: null, price: null, url },
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

    // ─── Description ───
    const description = extractMeta('og:description', 'description');

    // ─── Image (scored candidate system) ───
    const rankedImages = collectCandidateImages(html, url);
    const image = rankedImages.length > 0 ? rankedImages[0] : null;

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
