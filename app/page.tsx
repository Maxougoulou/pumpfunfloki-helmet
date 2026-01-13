"use client";

import { useEffect, useMemo, useState } from "react";

type FeedItem = { id: number; image_url: string; created_at: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [totalGenerations, setTotalGenerations] = useState<number>(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [n, setN] = useState(2);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const digits = String(totalGenerations).padStart(3, "0").slice(-3).split("");

  const neonText = { color: "var(--neon-green)" } as const;
  const neonBorder = { borderColor: "var(--neon-green)" } as const;
  const neonGlowSoft = { boxShadow: "0 0 60px rgba(26,255,0,0.12)" } as const;
  const neonGlowMed = { boxShadow: "0 0 40px rgba(26,255,0,0.22)" } as const;

  async function refreshStats() {
    const s = await fetch("/api/stats", { cache: "no-store" }).then((r) => r.json());
    setTotalGenerations(s.total ?? 0);
  }

  async function refreshFeed() {
    const f = await fetch("/api/feed?limit=24", { cache: "no-store" }).then((r) => r.json());
    setFeed(f.items ?? []);
  }

  useEffect(() => {
    refreshStats();
    refreshFeed();
  }, []);

  async function onGenerate() {
    if (!file) return;
    setBusy(true);
    setHasGenerated(true);
    setImages([]);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("n", String(n));

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || json?.detail || "Failed");

      setImages(json.images || []);
      await refreshStats();
      await refreshFeed();
    } catch (err: any) {
      alert(err?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-160px] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ background: "rgba(26,255,0,0.14)" }}
        />
        <div
          className="absolute bottom-[-220px] right-[-160px] h-[640px] w-[640px] rounded-full blur-[160px]"
          style={{ background: "rgba(26,255,0,0.09)" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="grid h-16 w-16 place-items-center rounded-3xl bg-white/5 ring-1"
            style={{ ...neonBorder, ...neonGlowMed }}
          >
            <span className="text-2xl">🐺</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            PumpfunFloki <span style={neonText}>Helmet</span>
          </h1>

          {/* Counter */}
          <div className="mt-2 flex items-center gap-2">
            {digits.map((d, i) => (
              <div
                key={i}
                className="h-16 w-16 rounded-2xl bg-black text-center text-4xl font-bold leading-[4rem]"
                style={{
                  ...neonText,
                  border: "1px solid var(--neon-green)",
                  boxShadow: "0 0 26px rgba(26,255,0,0.40)",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <p className="text-sm text-white/55">total generations</p>
        </div>

        {/* Upload box */}
        <section
          className="mt-10 rounded-[28px] border bg-white/5 p-8"
          style={{ ...neonBorder, ...neonGlowSoft }}
        >
          <div className="text-center">
            <h2 className="text-3xl font-semibold" style={neonText}>
              upload ur pfp
            </h2>
            <p className="mt-2 text-sm text-white/55">drag & drop or click below</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <label
              className="inline-flex cursor-pointer items-center justify-center rounded-full px-10 py-4 text-sm font-semibold"
              style={{
                background: "rgba(26,255,0,0.12)",
                border: "1px solid rgba(26,255,0,0.55)",
                boxShadow: "0 0 22px rgba(26,255,0,0.22)",
              }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setHasGenerated(false);
                  setImages([]);
                }}
              />
              CHOOSE FILE
            </label>

            {/* Variants */}
            <div className="flex items-center gap-2">
              {[1, 2, 4].map((v) => (
                <button
                  key={v}
                  onClick={() => setN(v)}
                  className="rounded-full px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20"
                  style={{
                    borderColor: v === n ? "var(--neon-green)" : "rgba(255,255,255,0.12)",
                    color: v === n ? "var(--neon-green)" : "rgba(255,255,255,0.85)",
                    boxShadow: v === n ? "0 0 18px rgba(26,255,0,0.25)" : undefined,
                  }}
                >
                  {v} gen
                </button>
              ))}
            </div>

            <button
              disabled={!file || busy}
              onClick={onGenerate}
              className="w-full max-w-md rounded-2xl px-4 py-4 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "rgba(26,255,0,0.10)",
                border: "1px solid rgba(26,255,0,0.55)",
                boxShadow: busy ? "0 0 34px rgba(26,255,0,0.30)" : "0 0 22px rgba(26,255,0,0.20)",
                color: "white",
              }}
            >
              {busy ? "Generating..." : "GENERATE"}
            </button>

            <p className="text-xs text-white/40">jpg, png, webp (max 5mb)</p>

            {/* Preview */}
            {file && (
              <div className="mt-4 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <img src={previewUrl} alt="preview" className="h-72 w-full object-cover" />
              </div>
            )}

            {/* Results */}
            {hasGenerated && (
              <div className="mt-6 w-full max-w-xl rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-sm font-semibold text-white/70">your results</div>

                {images.length === 0 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="h-52 rounded-2xl border border-white/10 bg-white/5" />
                    <div className="h-52 rounded-2xl border border-white/10 bg-white/5" />
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {images.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                      >
                        <img
                          src={url}
                          alt={`result-${idx}`}
                          className="h-52 w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Community */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Community generations</h2>
            <button
              className="rounded-full bg-white/5 px-4 py-2 text-xs ring-1 ring-white/10"
              style={neonGlowSoft}
              onClick={refreshFeed}
            >
              refresh
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {feed.map((item) => (
              <a
                key={item.id}
                href={item.image_url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-3xl border border-white/10 bg-black/40"
              >
                <img
                  src={item.image_url}
                  alt={`community-${item.id}`}
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                />
              </a>
            ))}
            {feed.length === 0 &&
              Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-black/40"
                >
                  <div className="aspect-square w-full bg-white/5" />
                </div>
              ))}
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-white/35">
          PumpfunFloki • Helmet Try-On • v1
        </footer>
      </div>
    </main>
  );
}
