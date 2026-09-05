import Script from 'next/script';

export default function HomePage() {
  return (
    <>
      <main id="app">
        <div className="app-loading">
          <span className="loading-logo-frame">
            <picture>
              <source
                type="image/avif"
                srcSet="/assets/breaktime-logo-150.avif 150w, /assets/breaktime-logo-300.avif 300w"
                sizes="150px"
              />
              <img
                src="/assets/breaktime-logo-150.webp"
                srcSet="/assets/breaktime-logo-150.webp 150w, /assets/breaktime-logo-300.webp 300w"
                sizes="150px"
                alt="Breaktime"
                width="150"
                height="100"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </span>
          <span>Menyiapkan dashboard…</span>
        </div>
      </main>
      <div id="toast-region" aria-live="polite" aria-atomic="true" />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
