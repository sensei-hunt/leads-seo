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
};

function addHeaders(response) {
  var resp = new Response(response.body, response);
  for (var key in SECURITY_HEADERS) {
    resp.headers.set(key, SECURITY_HEADERS[key]);
  }
  return resp;
}

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var next = context.next;
  var url = new URL(request.url);
  var pathname = url.pathname;

  if (GATED_PATHS[pathname]) {
    var ua = request.headers.get('user-agent') || '';
    var referer = request.headers.get('referer') || '';
    var host = request.headers.get('host') || '';
    var country = (request.cf && request.cf.country) || '';

    var isBot = /googlebot|bingbot|msnbot|slurp|duckduckbot|yandexbot|baiduspider|google-inspectiontool|google-site-verification|google-structured-data-testing-tool|googleother|apis-google|feedfetcher-google|mediapartners-google|adsbot-google|bingpreview|msnbot-media/i.test(ua);
    var isFromSearch = /google\.|bing\.|yahoo\.|duckduckgo\./i.test(referer);
    var isInternal = host && referer.indexOf(host) !== -1;

    var referrerGateOn = String(env.GATE_REFERRER || 'on').toLowerCase() !== 'off';

    if (!isBot) {
      if (country && country !== 'US') {
        return new Response(null, { status: 403 });
      }
      if (referrerGateOn && !isFromSearch && !isInternal) {
        return new Response(null, { status: 403 });
      }
    }
  }

  var response = await next();
  return addHeaders(response);
}
