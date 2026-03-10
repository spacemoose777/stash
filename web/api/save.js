// Vercel serverless function: fetch a URL, extract metadata + content, save to Supabase

const SUPABASE_URL = 'https://fczfjrgxytiwpokdklxm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemZqcmd4eXRpd3Bva2RrbHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA3NzcsImV4cCI6MjA4ODY0Njc3N30.Ag65xJZKYqC8FCG160f--Yx02BSl51sOPF-o6l0kAUo';
const USER_ID = '7dfa5d6e-040d-4494-89dc-d4a807568cec';

function getMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function getTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function extractContent(html) {
  // Remove everything we don't want to read
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Prefer <article> or <main> if present
  const articleMatch = body.match(/<article[\s\S]*?<\/article>/i) ||
                       body.match(/<main[\s\S]*?<\/main>/i);
  if (articleMatch) body = articleMatch[0];

  // Convert block elements to newlines before stripping tags
  body = body
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n\n');

  // Strip all remaining tags
  body = body.replace(/<[^>]+>/g, '');

  // Decode entities and clean whitespace
  body = decodeEntities(body)
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limit to ~50,000 chars (plenty for any article)
  return body.length > 50000 ? body.slice(0, 50000) + '…' : body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, title: manualTitle } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let title = manualTitle || '';
  let excerpt = null;
  let content = null;
  let image_url = null;
  let site_name = null;
  let author = null;
  let published_at = null;

  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Stash/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      title = manualTitle ||
        getMeta(html, 'og:title') ||
        getMeta(html, 'twitter:title') ||
        getTitle(html) ||
        new URL(url).hostname;

      excerpt = getMeta(html, 'og:description') ||
        getMeta(html, 'description') ||
        getMeta(html, 'twitter:description');

      image_url = getMeta(html, 'og:image') ||
        getMeta(html, 'twitter:image');

      site_name = getMeta(html, 'og:site_name') ||
        new URL(url).hostname.replace('www.', '');

      author = getMeta(html, 'article:author') ||
        getMeta(html, 'author');

      const pubTime = getMeta(html, 'article:published_time') ||
        getMeta(html, 'article:modified_time');
      if (pubTime) published_at = pubTime;

      // Extract full article content
      content = extractContent(html);

      // Decode entities in metadata fields
      if (title) title = decodeEntities(title);
      if (excerpt) excerpt = decodeEntities(excerpt);
      if (site_name) site_name = decodeEntities(site_name);
    }
  } catch (e) {
    title = title || new URL(url).hostname;
    site_name = new URL(url).hostname.replace('www.', '');
  }

  const save = {
    user_id: USER_ID,
    url,
    title,
    excerpt: excerpt || null,
    content: content || null,
    image_url: image_url || null,
    site_name: site_name || null,
    author: author || null,
    published_at: published_at || null,
    source: 'mobile-share',
  };

  const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/saves`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(save),
  });

  if (!supaRes.ok) {
    const err = await supaRes.text();
    return res.status(500).json({ error: err });
  }

  res.status(200).json({ success: true, title });
}
