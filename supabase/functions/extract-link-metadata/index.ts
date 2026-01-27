const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EUMIRATE/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph and meta tags
    const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                       html.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"/) ||
                       html.match(/<title[^>]*>([^<]*)<\/title>/);
    
    const descriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
                             html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)">/);
    
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) ||
                       html.match(/<meta[^>]*name="image"[^>]*content="([^"]*)">/);
    
    const priceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]*)"/) ||
                       html.match(/R\$\s*([\d.,]+)/) ||
                       html.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const description = descriptionMatch ? descriptionMatch[1].trim() : null;
    let image = imageMatch ? imageMatch[1].trim() : null;
    const price = priceMatch ? priceMatch[1].trim() : null;

    // Make relative URLs absolute
    if (image && !image.startsWith('http')) {
      const baseUrl = new URL(url);
      image = new URL(image, baseUrl.origin).href;
    }

    console.log('Extracted:', { title, description, image: !!image, price });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title,
          description,
          image,
          price,
          url,
        },
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
