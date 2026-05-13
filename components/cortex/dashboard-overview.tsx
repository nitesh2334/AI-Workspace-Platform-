"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Cpu,
  Gauge,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

const fadeContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const fadeItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const metrics = [
  {
    label: "p95 latency",
    value: "182ms",
    delta: "−12%",
    hint: "Inference + tool routing",
    icon: Timer,
    positive: true,
  },
  {
    label: "Success rate",
    value: "99.4%",
    delta: "+0.3%",
    hint: "Evaluated traces (24h)",
    icon: Gauge,
    positive: true,
  },
  {
    label: "GPU spend",
    value: "$4.2k",
    delta: "+4%",
    hint: "Normalized to tokens",
    icon: Cpu,
    positive: false,
  },
  {
    label: "Automations",
    value: "128",
    delta: "+9",
    hint: "Workflow runs today",
    icon: Zap,
    positive: true,
  },
];

const activity = [
  {
    title: "Deployed prompt pack · billing-agent",
    meta: "Staging · 6 min ago",
    tone: "Ship",
  },
  {
    title: "Guardrail tightened · PII scrubber",
    meta: "Policy · 26 min ago",
    tone: "Policy",
  },
  {
    title: "Dataset refresh · support-tickets-q2",
    meta: "Data plane · 1 hr ago",
    tone: "Data",
  },
];

export function DashboardOverview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.14),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_55%)]" />

      <motion.div
        variants={fadeContainer}
        initial="hidden"
        animate="show"
        className="relative mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-8 md:px-8 md:pt-10"
      >
        <motion.div variants={fadeItem} className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur-md">
            <Sparkles className="size-3.5 text-highlight" aria-hidden />
            Workspace pulse
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                Morning, ship something calm today.
              </h2>
              <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground md:text-base">
                Cortex keeps orchestration legible—routing, budgets, and guardrails
                in one premium surface purpose-built for product engineering teams.
              </p>
            </div>
            <button
              type="button"
              className="group inline-flex items-center gap-2 self-start rounded-full border border-border/80 bg-secondary/60 px-4 py-2 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:border-border hover:bg-secondary md:self-auto"
            >
              New automation
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>

        <motion.section
          variants={fadeItem}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] backdrop-blur-md transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="text-3xl font-semibold tracking-tight tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{m.hint}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted/70 ring-1 ring-border/60">
                  <m.icon className="size-[18px] text-highlight" aria-hidden />
                </span>
              </div>
              <span
                className={cn(
                  "mt-5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  m.positive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {m.delta}
              </span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-highlight/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          ))}
        </motion.section>

        <motion.section
          variants={fadeItem}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
        >
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Reliability window
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  Rolling 24h — synthetic + live probes
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Live
              </span>
            </div>
            <div className="relative mt-2 h-44 overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-muted/50 to-muted/10">
              <div className="absolute inset-x-4 bottom-4 flex h-28 items-end gap-2">
                {[40, 62, 48, 74, 58, 80, 66, 88, 72, 92].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{
                      delay: 0.08 * i,
                      duration: 0.55,
                      ease: [0.22, 1, 0.36, 1] as const,
                    }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-highlight/45 to-highlight/15"
                  />
                ))}
              </div>
              <div className="absolute inset-x-0 top-4 px-4 text-[11px] text-muted-foreground">
                Health composite · normalized
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Recent activity
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  Orchestration + policy trail
                </p>
              </div>
            </div>
            <ul className="space-y-3">
              {activity.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-xl border border-transparent bg-muted/25 px-3 py-3 transition-colors hover:border-border/80 hover:bg-muted/40"
                >
                  <span className="mt-0.5 size-2 rounded-full bg-highlight/80 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[13px] font-medium leading-snug">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground">{item.meta}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ring-1 ring-border/70">
                    {item.tone}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
