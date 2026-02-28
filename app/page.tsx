"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FeedItem = { id: number; image_url: string; created_at: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [totalGenerations, setTotalGenerations] = useState<number>(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const digits = String(totalGenerations).padStart(3, "0").slice(-3).split("");

  async function refreshStats() {
    const res = await fetch("/api/stats", { cache: "no-store" });
    const text = await res.text();
    const json = JSON.parse(text);
    setTotalGenerations(Number(json.total ?? 0));
  }

  async function refreshFeed() {
    const res = await fetch("/api/feed?limit=24", { cache: "no-store" });
    const text = await res.text();
    const json = JSON.parse(text);
    setFeed(json.items ?? []);
  }

  useEffect(() => {
    refreshStats();
    refreshFeed();
  }, []);

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.src = url;
    });
  }

  async function onGenerate(selectedFile: File) {
    if (busy) return;

    setBusy(true);
    setImages([]);

    try {
      const compressed = await compressImage(selectedFile);
      const fd = new FormData();
      fd.append("image", compressed);
      fd.append("n", "1"); // ✅ toujours 1 gen

      const res = await fetch("/api/generate", { method: "POST", body: fd });

      // robuste: si jamais ça renvoie autre chose que du JSON
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(text?.slice(0, 200) || "Server error (non-JSON)");
      }

      if (!res.ok) throw new Error(json?.detail || json?.error || "Server error");

      setImages(json.images || []);
      await refreshStats();
      await refreshFeed();
    } catch (err: any) {
      alert(err?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  // ✅ upload -> génère direct
  useEffect(() => {
    if (file) onGenerate(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Paste support (Ctrl+V)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) setFile(blob);
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f && f.type.startsWith("image/")) setFile(f);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background glow vert néon */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(57,255,20,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(57,255,20,0.08),transparent_55%)]" />
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[140px] bg-[rgba(57,255,20,0.12)]" />
        <div className="absolute bottom-[-240px] right-[-180px] h-[640px] w-[640px] rounded-full blur-[160px] bg-[rgba(57,255,20,0.08)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-[0_0_40px_rgba(57,255,20,0.22)]">
  <img
    src="/assets/logo.png"
    alt="PumpfunFloki Helmet"
    className="h-full w-full object-cover"
  />
</div>


          <h1 className="text-3xl font-semibold tracking-tight">
            Pumpfun Floki <span className="text-[var(--neon-green,#39ff14)]">- The helmet stays on!</span>
          </h1>

          {/* Counter */}
          <div className="mt-2 flex items-center gap-2">
            {digits.map((d, i) => (
              <div
                key={i}
                className="h-16 w-16 rounded-2xl bg-black text-center text-4xl font-bold leading-[4rem] text-[var(--neon-green,#39ff14)]"
                style={{
                  border: "1px solid rgba(57,255,20,0.55)",
                  boxShadow: "0 0 26px rgba(57,255,20,0.40)",
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
          className="mt-10 rounded-[28px] border border-[rgba(57,255,20,0.55)] bg-white/5 p-8 shadow-[0_0_60px_rgba(57,255,20,0.12)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-[var(--neon-green,#39ff14)]">
              upload ur pfp to helmetify it.
            </h2>
            <p className="mt-2 text-sm text-white/55">drag & drop, paste (Ctrl+V), or click below</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-full px-10 py-4 text-sm font-extrabold text-white transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "rgba(57,255,20,0.12)",
                border: "1px solid rgba(57,255,20,0.55)",
                boxShadow: "0 0 30px rgba(57,255,20,0.22)",
              }}
            >
              CHOOSE FILE
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickFile}
            />

            <p className="text-xs text-white/40">jpg, png, webp — auto-compressed</p>

            {/* Loading animation */}
            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-2 w-full max-w-md"
                >
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_0_45px_rgba(57,255,20,0.12)]">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="h-6 w-6 rounded-full border-2 border-[var(--neon-green,#39ff14)] border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                      />
                      <motion.div
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="text-sm font-semibold text-[var(--neon-green,#39ff14)]"
                      >
                        Generating...
                      </motion.div>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full w-1/3 rounded-full bg-[var(--neon-green,#39ff14)]"
                        initial={{ x: "-120%" }}
                        animate={{ x: "220%" }}
                        transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview */}
            {file && (
              <div className="mt-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="preview" className="h-80 w-full object-cover" />
              </div>
            )}

            {/* Results - seulement si on a des images */}
            {images.length > 0 && (
              <div className="mt-6 w-full max-w-3xl rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div className="text-sm font-semibold text-white/70">your results</div>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("I just helmeted my PFP! ⚔️🪖\n\nJoin the $PFF Horde 👇\npumpfunfloki.com/helmet\n\n#PFF #PumpFunFloki $PFF")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold text-black transition hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      background: "#39ff14",
                      boxShadow: "0 0 20px rgba(57,255,20,0.45)",
                    }}
                  >
                    𝕏 Share on X
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {images.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`result-${idx}`}
                        className="h-60 w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Community */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Community generations</h2>
            <button
              className="rounded-full bg-white/5 px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20"
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={`community-${item.id}`}
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                  loading="lazy"
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
