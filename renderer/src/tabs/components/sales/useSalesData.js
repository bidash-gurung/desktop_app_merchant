// src/tabs/components/sales/useSalesData.js
import React from "react";
import { buildUrl, extractMessage, safeJson } from "./utils";

const TOTAL_SALES_ENDPOINT = import.meta.env.VITE_TOTAL_SALES_ENDPOINT;

export function useSalesData({ businessId, token }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState(null);

  const refetch = React.useCallback(async () => {
    setError("");

    if (!TOTAL_SALES_ENDPOINT) {
      setError("Missing env: VITE_TOTAL_SALES_ENDPOINT");
      setData(null);
      return;
    }
    if (!businessId) {
      setError("Missing business_id in session.");
      setData(null);
      return;
    }

    const url = buildUrl(TOTAL_SALES_ENDPOINT, businessId);

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const out = await safeJson(res);

      if (!res.ok) {
        setError(extractMessage(out) || `Request failed (${res.status})`);
        setData(null);
        return;
      }

      setData(out);
    } catch (e) {
      setError(e?.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, token]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, error, data, refetch };
}
