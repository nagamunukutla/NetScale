"use client";

import { useEffect, useState } from "react";
import { FALLBACK_RATES, type RateTable } from "./fx/rates";

/** Loads USD-based rates from /api/fx, falling back to the placeholder table. */
export function useRates(): RateTable {
  const [rates, setRates] = useState<RateTable>(FALLBACK_RATES);
  useEffect(() => {
    let alive = true;
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : null))
      .then((t: RateTable | null) => {
        if (alive && t) setRates(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return rates;
}
