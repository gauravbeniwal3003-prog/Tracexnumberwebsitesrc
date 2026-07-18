import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('query')

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const lookupUrl = "https://exploitsindia.site//osint-api/number.php";
    const apiUrl = `${lookupUrl}?exploits=${encodeURIComponent(query)}`;
    
    console.log(`Searching TRACEXDATA for: ${query}`);

    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://techvishalboss.com/"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) break; // Success

        // Retry on 5xx errors
        if (response.status >= 500 && response.status <= 599) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Retrying due to status ${response.status}... attempt ${attempts}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
        
        // Don't retry on 4xx (except timeout if we treat it as failure)
        break;
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Retrying due to network error/timeout... attempt ${attempts}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw err;
      }
    }

    if (!response || !response.ok) {
      return new Response(
        JSON.stringify({ error: `Engine error status: ${response?.status || 'Unknown'}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Engine returned malformed data", raw: text.slice(0, 100) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check for API-level errors
    if (data.error && !data.results) {
      return new Response(
        JSON.stringify({ error: data.error }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Critical Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: "Intelligence Engine Timeout or Connection Failure" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
