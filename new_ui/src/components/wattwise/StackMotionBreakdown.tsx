// Codrops 3DStackMotion-style appliance breakdown — an experimental 3D card
// stack animation on scroll (adapted from codrops/3DStackMotion, MIT,
// https://github.com/codrops/3DStackMotion, effect-1): the stack starts deep
// in Z-space rotated rotate3d(1,0,0,-25deg) rotate3d(0,1,0,50deg)
// rotate3d(0,0,1,25deg); GSAP ScrollTrigger scrubs each card from
// z = -2.65*width with rotationZ -220° toward the viewer with stagger.
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useWattWise } from "./useWattWise";

gsap.registerPlugin(ScrollTrigger);

const CATEGORY_GLYPHS: Record<string, string> = {
  "Air Conditioner": "❄",
  "Ceiling Fan": "✦",
  Refrigerator: "❆",
  Television: "▶",
  "Water Heater": "♨",
  Lighting: "✧",
  Computer: "⌨",
  "Washing Machine": "◍",
  Microwave: "≋",
  Cooking: "◭",
  "Kitchen Extractor": "⌁",
  Networking: "⌾",
  "Air Purifier": "❁",
  "Water Cooler": "◍",
  Dishwasher: "◍",
};

export function StackMotionBreakdown() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sim = useWattWise((s) => s.sim);
  const selectAppliance = useWattWise((s) => s.selectAppliance);
  const setView = useWattWise((s) => s.setView);
  const total = sim?.totalUnits ?? 0;
  const top = (sim?.appliances ?? []).slice(0, 6);

  useEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return;
    const cards = Array.from(content.querySelectorAll<HTMLDivElement>("[data-stack-card]"));
    if (cards.length === 0) return;
    const winsize = { w: window.innerWidth };

    // initial Codrops stack pose
    content.style.transform = "rotate3d(1, 0, 0, -25deg) rotate3d(0, 1, 0, 50deg) rotate3d(0, 0, 1, 25deg)";
    content.style.opacity = "0";

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: {
        trigger: wrap,
        start: "top center",
        end: "+=150%",
        scrub: 1.2,
        pin: true,
        onEnter: () => gsap.to(content, { opacity: 1, duration: 0.4, ease: "power2.out" }),
        onEnterBack: () => gsap.to(content, { opacity: 1, duration: 0.4, ease: "power2.out" }),
        onLeave: () => gsap.to(content, { opacity: 0, duration: 0.4, ease: "power2.out" }),
        onLeaveBack: () => gsap.to(content, { opacity: 0, duration: 0.4, ease: "power2.out" }),
      },
    });
    tl.fromTo(
      cards,
      { z: (pos) => -2.65 * winsize.w - pos * 0.03 * winsize.w },
      { z: (pos) => 1.4 * winsize.w + (cards.length - pos - 1) * 0.03 * winsize.w },
      0
    ).fromTo(
      cards,
      { rotationZ: -220 },
      { rotationY: -30, rotationZ: 120, stagger: 0.005 },
      0
    );

    const onResize = () => {
      winsize.w = window.innerWidth;
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [top.length]);

  return (
    <section ref={wrapRef} className="relative h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-10 z-10 -translate-x-1/2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/90">Physics breakdown</p>
        <h2 className="mt-2 text-3xl font-bold text-stone-100">Where every rupee goes</h2>
        <p className="mt-1 text-sm text-stone-400">
          {total.toFixed(1)} kWh simulated across 30 days · cards fly out of the 3D stack as you scroll
        </p>
      </div>
      <div ref={contentRef} className="absolute inset-0 flex items-center justify-center [perspective:1600px]" style={{ transformStyle: "preserve-3d" }}>
        {top.map((a, i) => (
            <div
              key={a.id}
              data-stack-card
              className="absolute h-[300px] w-[430px] max-w-[86vw] cursor-pointer rounded-2xl border border-white/10 p-5 shadow-2xl"
              style={{
                background: "linear-gradient(150deg, rgba(23,23,23,0.985) 40%, rgba(120,113,64,0.25) 140%)",
                willChange: "transform, filter",
                transformStyle: "preserve-3d",
                zIndex: 50 - i,
              }}
              onClick={() => {
                selectAppliance(a.id);
                setView("home3d");
              }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">{a.roomName}</p>
                    <h3 className="mt-1 text-xl font-bold text-stone-100">{a.name}</h3>
                  </div>
                  <span className="text-3xl text-amber-300/80" aria-hidden>
                {CATEGORY_GLYPHS[a.category] ?? "⚡"}
              </span>
                </div>
                <div className="mt-4 flex items-end gap-6">
                  <div>
                    <p className="text-4xl font-black tabular-nums text-amber-300">{a.totalKwh.toFixed(1)}</p>
                    <p className="text-[11px] uppercase tracking-widest text-stone-500">kWh / 30 days</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black tabular-nums text-stone-100">₹{a.estimatedCostInr.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] uppercase tracking-widest text-stone-500">of this month's bill</p>
                  </div>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${Math.min(100, a.percentageShare)}%` }} />
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-stone-400">
                  <span>
                    {a.modelKind} · {a.beeStarRating}★ BEE
                  </span>
                  <span className="font-semibold text-amber-200/90">{a.percentageShare.toFixed(1)}% share</span>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-stone-500">{a.details}</p>
              </div>
            </div>
        ))}
      </div>
    </section>
  );
}
