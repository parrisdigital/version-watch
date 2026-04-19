"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const intelligenceFields = [
  { title: "What changed", body: "Normalize the source update into one clear record instead of replaying vendor release prose." },
  { title: "Why it matters", body: "Reduce the operational, migration, or product impact into a short explanation a team can act on." },
  { title: "Who should care", body: "Map the change to the people likely to touch it: frontend, backend, mobile, infra, AI, or product." },
  { title: "Affected stack", body: "Attach stack context like payments, hosting, auth, mobile, search, or developer workflow." },
];

export function HomepageExplainer() {
  const scope = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".js-intelligence-item");

      gsap.from(cards, {
        y: 32,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".js-intelligence-shell",
          start: "top 80%",
        },
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="max-w-[56ch]">
            <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Signal extraction</p>
            <h2 className="mt-5 max-w-[13ch] text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Turn messy release surfaces into one decision-ready record.
            </h2>
            <p className="mt-6 max-w-[52ch] text-pretty text-lg text-zinc-400">
              Version Watch keeps the original source attached, but it reorganizes the important parts so developers
              can scan a change quickly and understand what follow-up work it creates.
            </p>
          </div>

          <div className="js-intelligence-shell overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/75">
            <dl className="grid md:grid-cols-2">
              {intelligenceFields.map((field, index) => {
                const borderClass =
                  index === 0
                    ? "border-b border-white/10 md:border-b md:border-r"
                    : index === 1
                      ? "border-b border-white/10"
                      : index === 2
                        ? "md:border-r md:border-white/10"
                        : "";

                return (
                  <div key={field.title} className={`js-intelligence-item p-6 md:p-8 ${borderClass}`}>
                    <dt className="font-mono text-sm uppercase tracking-wide text-zinc-500">{field.title}</dt>
                    <dd className="mt-4 max-w-[28ch] text-pretty text-lg text-zinc-200">{field.body}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
