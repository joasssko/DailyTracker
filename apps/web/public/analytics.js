(function () {
  // Google tag (gtag.js)
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-THJJSB8JK8';
  document.head.appendChild(ga);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', 'G-THJJSB8JK8');

  // GoSquared
  !(function (g, s, q, r, d) {
    r = g[r] = g[r] || function () { (r.q = r.q || []).push(arguments); };
    d = s.createElement(q);
    d.src = 'https://d1l6p2sc9645hc.cloudfront.net/gosquared.js';
    q = s.getElementsByTagName(q)[0];
    q.parentNode.insertBefore(d, q);
  })(window, document, 'script', '_gs');
  window._gs('GSN-574602-Y');
  window._gs('set', 'anonymizeIP', true);
})();
