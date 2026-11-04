// Codrops 3DCarousel-style archetype picker — scroll-driven 3D cylinder
// carousel with drag-to-turn (inertia), velocity spread + lean and brightness
// falloff. Technique adapted from codrops/3DCarousel (MIT,
// https://github.com/codrops/3DCarousel): cells sit on a shared rotating
// wrapper via rotateY(angle) translateZ(radius) CSS vars, GSAP ScrollTrigger
// scrubs the wrapper rotation, pointer drag spins with inertia.
"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ARCHETYPE_CARDS, useWattWise } from "./useWattWise";
import type { Archetype } from "@/lib/wattwise/types";

gsap.registerPlugin(ScrollTrigger);

const RADIUS = 430;

export function ArchetypeCarousel({ onPick }: { onPick?: (a: Archetype) => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const st = useRef({ spin: 0, vel: 0, spread: 0, lean: 0, dragging: false, lastX: 0, raf: 0, speed: 0 });
  const setActiveHousehold = useWattWise((s) => s.setActiveHousehold);
  const households = useWattWise((s) => s.households);

  const pick = useCallback(
    (archetype: Archetype) => {
      const match = households.find((h) => h.archetype === archetype);
      if (match) void setActiveHousehold(match.id);
      onPick?.(archetype);
    },
    [households, setActiveHousehold, onPick]
  );

  useEffect(() => {
    const section = sectionRef.current;
    const carousel = carouselRef.current;
    if (!section || !carousel) return;

    const cells = Array.from(carousel.querySelectorAll<HTMLDivElement>("[data-cell]"));
    const cards = cells.map((c) => c.querySelector<HTMLDivElement>("[data-card]")).filter(Boolean) as HTMLDivElement[];
    const count = Math.max(cells.length, 1);
    const angleStep = 360 / count;

    // static cylinder placement — CSS vars so the rAF loop can animate them
    cells.forEach((cell, i) => {
      cell.style.transform = `rotateY(calc(${i * angleStep}deg + var(--spin, 0deg))) translateZ(calc(${RADIUS}px + var(--spread, 0px))) rotateZ(var(--lean, 0deg))`;
    });

    const apply = () => {
      carousel.style.setProperty("--spin", `${st.current.spin.toFixed(2)}deg`);
      carousel.style.setProperty("--spread", `${st.current.spread.toFixed(1)}px`);
      carousel.style.setProperty("--lean", `${st.current.lean.toFixed(2)}deg`);
    };

    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const s = st.current;
      if (!s.dragging) {
        s.vel *= Math.exp(-3.2 * dt); // frame-independent smooth inertia decay
        s.spin += s.vel * dt * 60;
        // smooth spring settle for spread & lean
        s.spread *= Math.exp(-6.0 * dt);
        s.lean *= Math.exp(-5.5 * dt);
      }
      apply();
      s.raf = requestAnimationFrame(tick);
    };
    st.current.raf = requestAnimationFrame(tick);

    // scroll-scrubbed wrapper rotation (Codrops createScrollAnimation)
    const tl = gsap.timeline({
      defaults: { ease: "sine.inOut" },
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.0,
        onUpdate: (self) => {
          const s = st.current;
          s.speed = self.getVelocity();
          if (!s.dragging) {
            s.spread = gsap.utils.clamp(-150, 150, -s.speed * 0.0045);
            s.lean = gsap.utils.clamp(-16, 16, s.speed * 0.0009);
          }
        },
      },
    });
    tl.fromTo(carousel, { rotationY: -46 }, { rotationY: 46 }, 0)
      .fromTo(carousel, { rotationZ: 2.2, rotationX: 2.2 }, { rotationZ: -2.2, rotationX: -2.2 }, 0);
    cards.forEach((card) => {
      tl.fromTo(card, { filter: "brightness(230%)" }, { filter: "brightness(96%)", ease: "power3" }, 0);
      tl.fromTo(card, { rotationZ: 6 }, { rotationZ: -6, ease: "none" }, 0);
    });

    // drag to turn (Codrops drag behaviour)
    const onDown = (e: PointerEvent) => {
      st.current.dragging = true;
      st.current.lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!st.current.dragging) return;
      const dx = e.clientX - st.current.lastX;
      st.current.lastX = e.clientX;
      st.current.spin -= dx * 0.12;
      st.current.vel = -dx * 0.85;
    };
    const onUp = () => {
      st.current.dragging = false;
    };
    carousel.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(st.current.raf);
      tl.scrollTrigger?.kill();
      tl.kill();
      carousel.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[135vh] w-full" id="archetype-picker">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden [perspective:1300px]">
        <div className="pointer-events-none absolute top-[9%] z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/90">Onboarding</p>
          <h2 className="mt-2 text-3xl font-bold text-stone-100 sm:text-4xl">Choose the home to simulate</h2>
          <p className="mt-2 max-w-md text-sm text-stone-400">
            Each archetype seeds its own appliance inventory, physics profile and 3D floor plan.
          </p>
        </div>
        <div className="relative h-[340px] w-full [transform-style:preserve-3d]">
          <div
            ref={carouselRef}
            className="absolute left-1/2 top-1/2 h-[300px] w-[248px] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
            style={{ transformStyle: "preserve-3d" }}
          >
            {ARCHETYPE_CARDS.map((card) => (
              <div key={card.key} data-cell className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
                <div
                  data-card
                  className="flex h-full w-full flex-col justify-end rounded-2xl border border-white/10 p-4 shadow-2xl"
                  style={{
                    background: `linear-gradient(160deg, rgba(28,25,23,0.97) 30%, ${card.accent}2b 135%)`,
                    willChange: "transform, filter",
                  }}
                  onClick={() => pick(card.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") pick(card.key);
                  }}
                  aria-label={`Select ${card.label}`}
                >
                  <div className="mb-auto flex items-center justify-between">
                    <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-stone-300">
                      {card.sqft} sq.ft
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: card.accent }} />
                  </div>
                  <svg viewBox="0 0 120 70" className="mb-3 h-20 w-full opacity-80">
                    <rect x="6" y="8" width="62" height="34" fill="none" stroke={card.accent} strokeWidth="1.6" rx="2" />
                    <rect x="74" y="8" width="40" height="22" fill="none" stroke={card.accent} strokeWidth="1.6" rx="2" />
                    <rect x="74" y="36" width="40" height="26" fill="none" stroke={card.accent} strokeWidth="1.2" opacity="0.5" rx="2" />
                    <rect x="6" y="48" width="40" height="14" fill="none" stroke={card.accent} strokeWidth="1.2" opacity="0.5" rx="2" />
                    <rect x="52" y="48" width="16" height="14" fill="none" stroke={card.accent} strokeWidth="1.2" opacity="0.35" rx="2" />
                  </svg>
                  <h3 className="text-lg font-bold text-stone-100">{card.label}</h3>
                  <p className="text-xs text-stone-400">{card.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-stone-500">
          scroll ⟳ spin · drag ⟲ turn · click ⟶ enter 3D home
        </p>
      </div>
    </section>
  );
}
