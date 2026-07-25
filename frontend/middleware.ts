import { next } from '@vercel/edge';

// Link-preview cards for shared event links. Crawlers (Slack, WhatsApp, etc.)
// don't run JS, so the SPA can't set og: tags itself — this serves them a tiny
// HTML doc with the event name. Real users pass straight through to the app.
export const config = { matcher: '/event/:slug*' };

const API = 'https://splitapp-api-8jqy.onrender.com/api';
const CRAWLER =
  /bot|facebookexternalhit|slack|twitter|whatsapp|discord|telegram|linkedin|embedly|skype|pinterest|redditbot|googlebot|bingbot|preview/i;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export default async function middleware(req: Request): Promise<Response> {
  const ua = req.headers.get('user-agent') ?? '';
  const slug = new URL(req.url).pathname.split('/')[2];
  if (!slug || !CRAWLER.test(ua)) return next();

  // ponytail: Render free tier cold-starts (~30s). If the API is asleep the
  // fetch fails and the card falls back to a generic title — acceptable.
  let name = 'an event';
  try {
    const res = await fetch(`${API}/events/${slug}`);
    if (res.ok) name = (await res.json()).name || name;
  } catch {
    /* fall back to generic card */
  }

  const title = esc(`${name} · SplitEase`);
  const desc = esc(`Split expenses for "${name}" and settle up with friends.`);
  const url = esc(req.url);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
</head><body>${title}</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 's-maxage=300' },
  });
}
