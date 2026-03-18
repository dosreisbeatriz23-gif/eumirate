const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const timeout = setTimeout(() => controller.abort(), 10000);

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }
      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeout);
      throw fetchErr;
    }

    // Helper to decode HTML entities
    const decodeEntities = (str: string) =>
      str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");

    // Extract with multiple fallback patterns (handle both content="x" and content='x' and reversed attr order)
    const extractMeta = (property: string, name?: string): string | null => {
      const patterns = [
        // property="og:xxx" content="value"
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        // content="value" property="og:xxx"
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

    // Title
    let title = extractMeta('og:title', 'title');
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTag?.[1]) title = decodeEntities(titleTag[1].trim());
    }

    // Description
    const description = extractMeta('og:description', 'description');

    // Image
    let image = extractMeta('og:image', 'image');
    if (!image) {
      // Try twitter:image
      image = extractMeta('twitter:image');
    }
    if (!image) {
      // Try first product image or large image in page
      const imgMatch = html.match(/<img[^>]*src=["']([^"']+(?:\.(?:jpg|jpeg|png|webp))[^"']*)["'][^>]*>/i);
      if (imgMatch?.[1]) image = imgMatch[1];
    }

    // Make relative URLs absolute
    if (image && !image.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        image = new URL(image, baseUrl.origin).href;
      } catch { /* ignore */ }
    }

    // Price
    let price = extractMeta('product:price:amount');
    if (!price) price = extractMeta('og:price:amount');
    if (!price) {
      // Try JSON-LD
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const block of jsonLdMatch) {
          const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          try {
            const ld = JSON.parse(jsonStr);
            const offer = ld.offers || ld.Offers;
            if (offer) {
              const p = Array.isArray(offer) ? offer[0]?.price : offer.price;
              if (p) { price = String(p); break; }
            }
            if (ld.price) { price = String(ld.price); break; }
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
