"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scales its children to fill the available area, content-aware.
 *
 * Why this exists: the OOP slides scale proportionally with the card via
 * container-query units, so they're *device*-responsive — but a fixed `cqw`
 * size is blind to how much content a given slide has. A 3-line SQL block and a
 * 16-line match list get the same size, so sparse slides float tiny in a big
 * card. FitBox measures the content's natural (unscaled) size against the
 * available box and applies a single uniform `transform: scale()` so short
 * content grows large and dense content settles at just-fits.
 *
 * Model: children are authored against a fixed virtual canvas `designWidth` (in
 * px), NOT in cqw. Wrapping text wraps at `designWidth`; no-wrap atomic content
 * (a `<pre>` code block, an image row) reports its own width via scrollWidth.
 * The single scale transform owns all final sizing — if children used cqw their
 * measured natural size would itself depend on card size and double-count.
 */
export function FitBox({
  children,
  designWidth = 960,
  maxScale = 3,
  align = "top",
  refitKey,
  className = "",
}: {
  children: ReactNode;
  /** Virtual canvas width (px) the children are authored against. Wrapping text
   *  wraps at this width before scaling. */
  designWidth?: number;
  /** Cap upscaling so a one-word answer doesn't balloon absurdly. */
  maxScale?: number;
  /** "top" pins content to the top of the area (heading-anchored); "center"
   *  centers it vertically. Horizontal is always centered. */
  align?: "top" | "center";
  /** Change this (e.g. to the slide number) to force a re-fit when the content
   *  swaps but the DOM node is reused. */
  refitKey?: string | number;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0); // 0 = not yet measured (kept hidden)

  useLayoutEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;

    let current = scale;
    const fit = () => {
      const aW = outerEl.clientWidth;
      const aH = outerEl.clientHeight;
      // Natural size at scale 1. width is at least designWidth, but no-wrap
      // content (e.g. a wide <pre>) reports a larger scrollWidth and drives the
      // width-fit instead.
      const cW = Math.max(designWidth, innerEl.scrollWidth);
      const cH = innerEl.scrollHeight;
      if (!cW || !cH || !aW || !aH) return;
      const next = Math.min(aW / cW, aH / cH, maxScale);
      // Epsilon-guard to avoid a ResizeObserver feedback loop.
      if (Math.abs(next - current) > 0.005) {
        current = next;
        setScale(next);
      }
    };

    fit();
    // Observe both boxes: the outer catches card/window resizes; the inner
    // catches content size changes that don't move the outer — the Baloo Da 2
    // webfont swapping in, and images resolving from width:0 to their natural
    // size once loaded. Transforms are excluded from ResizeObserver geometry,
    // so observing the scaled inner node does not create a feedback loop.
    const ro = new ResizeObserver(fit);
    ro.observe(outerEl);
    ro.observe(innerEl);
    // Belt-and-suspenders for the font swap on browsers where the inner
    // observer fires before metrics settle.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(fit);
    }
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refitKey, maxScale, designWidth]);

  return (
    <div
      ref={outer}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      <div
        ref={inner}
        style={{
          position: "absolute",
          left: "50%",
          top: align === "top" ? 0 : "50%",
          width: designWidth,
          transform:
            align === "top"
              ? `translateX(-50%) scale(${scale})`
              : `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: align === "top" ? "top center" : "center center",
          opacity: scale > 0 ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
