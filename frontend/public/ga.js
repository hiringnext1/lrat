// Google Analytics 4 bootstrap.
// Kept in a same-origin file instead of an inline <script> so it is not blocked
// by the production Content-Security-Policy (script-src 'self').
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
window.gtag = gtag;
gtag('js', new Date());
gtag('config', 'G-EF4GY3H0G9', {
  page_title: document.title,
  page_location: window.location.href,
  send_page_view: true,
});
