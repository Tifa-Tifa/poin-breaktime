'use client';

export default function GlobalError({ reset }) {
  return (
    <main className="app-loading">
      <strong>Dashboard tidak dapat dimuat</strong>
      <button className="button purple" type="button" onClick={reset}>Coba lagi</button>
    </main>
  );
}
