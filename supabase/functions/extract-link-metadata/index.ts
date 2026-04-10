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
  // Split on separators commonly used in e-commerce titles
  const mainPart = cleaned.split(/\s*[-–—|]\s*/)[0].trim();
  const words = mainPart.split(/\s+/).slice(0, maxWords);
  return words.join(' ');
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
    // Truncate to max 4 words
    title = truncateTitle(title);

    // ─── Description ───
    const description = extractMeta('og:description', 'description');

    // ─── Image (enhanced multi-site extraction) ───
    let image: string | null = null;

    // 1. Standard OG / Twitter
    image = extractMeta('og:image', 'image');
    if (!image) image = extractMeta('twitter:image');
    if (!image) image = extractMeta('twitter:image:src');

    // 2. itemprop="image"
    if (!image) {
      const itempropImg = html.match(/<(?:img|meta)[^>]*itemprop=["']image["'][^>]*(?:content|src)=["']([^"']+)["']/i)
        || html.match(/<(?:img|meta)[^>]*(?:content|src)=["']([^"']+)["'][^>]*itemprop=["']image["']/i);
      if (itempropImg?.[1]) image = itempropImg[1];
    }

    // 3. JSON-LD
    if (!image) {
      const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdBlocks) {
        for (const block of jsonLdBlocks) {
          const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          try {
            const ld = JSON.parse(jsonStr);
            const items = ld['@graph'] || [ld];
            for (const item of (Array.isArray(items) ? items : [items])) {
              if (item.image) {
                const img = Array.isArray(item.image) ? item.image[0] : item.image;
                if (typeof img === 'string') { image = img; break; }
                if (img?.url) { image = img.url; break; }
                if (img?.contentUrl) { image = img.contentUrl; break; }
              }
            }
            if (image) break;
          } catch { /* ignore */ }
        }
      }
    }

    // 4. Shein: data-src on product/gallery images, or crop_image_url in inline scripts
    if (!image) {
      const sheinScript = html.match(/crop_image_url["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (sheinScript?.[1]) image = sheinScript[1];
    }
    if (!image) {
      const dataSrcMatch = html.match(/<img[^>]*(?:class=["'][^"']*(?:product|gallery|goods|main|zoom|hero)[^"']*["'][^>]*)?data-src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/i);
      if (dataSrcMatch?.[1]) image = dataSrcMatch[1];
    }

    // 5. Amazon: specific patterns (landingImage, imgTagWrapperId, data-old-hires)
    if (!image) {
      const amzHires = html.match(/data-old-hires=["']([^"']+)["']/i);
      if (amzHires?.[1]) image = amzHires[1];
    }
    if (!image) {
      const amzLanding = html.match(/["']hiRes["']\s*:\s*["']([^"']+)["']/i)
        || html.match(/["']large["']\s*:\s*["']([^"']+)["']/i);
      if (amzLanding?.[1]) image = amzLanding[1];
    }

    // 6. Shopee: product images in __NEXT_DATA__ or ssrProps
    if (!image) {
      const shopeeMatch = html.match(/"image"\s*:\s*"(https?:\/\/[^"]+(?:\.(?:jpg|jpeg|png|webp))[^"]*)"/i);
      if (shopeeMatch?.[1]) image = shopeeMatch[1];
    }

    // 7. Mercado Livre: figure/img patterns
    if (!image) {
      const mlMatch = html.match(/<figure[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["']/i);
      if (mlMatch?.[1]) image = mlMatch[1];
    }

    // 8. Generic fallback: first valid product-like image
    if (!image) {
      const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
      for (const match of imgMatches) {
        const src = match[1];
        if (!src) continue;
        if (src.includes('data:') || src.includes('.svg') || src.includes('pixel') || src.includes('tracking') || src.includes('spacer') || src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('badge') || src.length < 20) continue;
        if (/\.(jpg|jpeg|png|webp)/i.test(src)) {
          image = src;
          break;
        }
      }
    }

    // Normalize URL
    if (image) {
      if (image.startsWith('//')) {
        image = 'https:' + image;
      } else if (!image.startsWith('http')) {
        try {
          const baseUrl = new URL(url);
          image = new URL(image, baseUrl.origin).href;
        } catch { /* ignore */ }
      }
      // Remove Shopee/Shein thumbnail suffixes to get full-size image
      image = image.replace(/_tn\b/g, '');
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
      const priceMatch = html.match(/R\$\s*([\d.,]+)/);
      if (priceMatch?.[1]) price = priceMatch[1];
    }

    console.log('Extracted:', { title, description: !!description, image: !!image, price });

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
