import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OrdersToolbar from "./OrdersToolbar";
import OrdersTable from "./OrdersTable";
import OrderDetailsModal from "./OrderDetailsModal";
import ScheduledOrderDetailsModal from "./ScheduledOrderDetailsModal";

import "./css/ordersPage.css";

import {
  ORDER_ENDPOINT,
  SCHEDULED_ORDER_ENDPOINT,
  safeJson,
  msgFrom,
  flattenGroupedOrders,
  normalizeStatus,
  matchSearch,
  matchSearchScheduled,
} from "./ordersUtils";

export default function OrdersPage({ session }) {
  const [tab, setTab] = useState("PENDING"); // PENDING, CONFIRMED, READY, ASSIGNED, OUT_FOR_DELIVERY, SCHEDULED
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [orders, setOrders] = useState([]);
  const [scheduled, setScheduled] = useState([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [openSch, setOpenSch] = useState(false);
  const [selectedSch, setSelectedSch] = useState(null);

  const abortRef = useRef(null);

  const user = useMemo(() => {
    return session?.payload?.user || session?.payload?.data?.user || {};
  }, [session]);

  const businessId = user?.business_id ?? null;

  const token =
    session?.payload?.token?.access_token ||
    session?.payload?.data?.token?.access_token ||
    session?.payload?.access_token ||
    session?.payload?.data?.access_token ||
    null;

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    if (!businessId) {
      setLoading(false);
      setErr("Missing business_id in session.");
      setOrders([]);
      setScheduled([]);
      return;
    }
    if (!ORDER_ENDPOINT) {
      setLoading(false);
      setErr("Missing env: VITE_ORDER_ENDPOINT");
      setOrders([]);
      setScheduled([]);
      return;
    }
    if (!SCHEDULED_ORDER_ENDPOINT) {
      // scheduled is optional, but you asked for it
      // We'll still load normal orders, and show a message only if scheduled tab is clicked.
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // 1) grouped orders
      const url = ORDER_ENDPOINT.replace("{businessId}", String(businessId)).replace("{business_id}", String(businessId));
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: ctrl.signal,
      });

      const payload = await safeJson(res);
      if (!res.ok) {
        setErr(msgFrom(payload) || `Orders request failed (${res.status})`);
        setOrders([]);
      } else {
        const flat = flattenGroupedOrders(payload?.data || []);
        setOrders(flat);
      }

      // 2) scheduled orders
      if (SCHEDULED_ORDER_ENDPOINT) {
        const surl = SCHEDULED_ORDER_ENDPOINT.replace("{business_Id}", String(businessId)).replace("{business_id}", String(businessId));
        const sres = await fetch(surl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ctrl.signal,
        });

        const spayload = await safeJson(sres);
        if (!sres.ok) {
          // Don't block normal UI, just store empty + show error only when tab is SCHEDULED
          setScheduled([]);
          if (tab === "SCHEDULED") {
            setErr(msgFrom(spayload) || `Scheduled request failed (${sres.status})`);
          }
        } else {
          setScheduled(Array.isArray(spayload?.data) ? spayload.data : []);
        }
      } else {
        setScheduled([]);
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Network error");
      setOrders([]);
      setScheduled([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, token, tab]);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  const buckets = useMemo(() => {
    const b = {
      PENDING: [],
      CONFIRMED: [],
      READY: [],
      ASSIGNED: [],
      OUT_FOR_DELIVERY: [],
    };

    orders.forEach((o) => {
      const s = normalizeStatus(o?.status);
      if (b[s]) b[s].push(o);
    });

    return b;
  }, [orders]);

  const counts = useMemo(() => {
    return {
      PENDING: buckets.PENDING.length,
      CONFIRMED: buckets.CONFIRMED.length,
      READY: buckets.READY.length,
      ASSIGNED: buckets.ASSIGNED.length,
      OUT_FOR_DELIVERY: buckets.OUT_FOR_DELIVERY.length,
      SCHEDULED: scheduled.length,
    };
  }, [buckets, scheduled]);

  const visibleOrders = useMemo(() => {
    if (tab === "SCHEDULED") return [];
    const list = buckets[tab] || [];
    return list.filter((o) => matchSearch(o, q));
  }, [buckets, tab, q]);

  const visibleScheduled = useMemo(() => {
    if (tab !== "SCHEDULED") return [];
    return (scheduled || []).filter((j) => matchSearchScheduled(j, q));
  }, [scheduled, tab, q]);

  const onRowClick = useCallback((row) => {
    setSelected(row);
    setOpen(true);
  }, []);

  const onRowClickScheduled = useCallback((job) => {
    setSelectedSch(job);
    setOpenSch(true);
  }, []);

  return (
    <div className="opWrap">
      <div className="opHeaderCard">
        <div className="opHeaderLeft">
          <div className="opTitle">Orders</div>
          <div className="opSub">Business ID: {businessId ? businessId : "—"}</div>
        </div>

        <div className="opHeaderRight">
          <div className="opCountPill">
            {(tab === "SCHEDULED" ? visibleScheduled.length : visibleOrders.length)}/{counts[tab] ?? 0}
          </div>
        </div>
      </div>

      <OrdersToolbar
        tab={tab}
        setTab={(t) => {
          setErr(""); // clear old scheduled-only errors etc.
          setTab(t);
        }}
        q={q}
        setQ={setQ}
        counts={counts}
        loading={loading}
        onRefresh={load}
      />

      {err ? <div className="opError">{err}</div> : null}

      <div className="opTableCard">
        {tab === "SCHEDULED" ? (
          <OrdersTable
            mode="SCHEDULED"
            loading={loading}
            rows={visibleScheduled}
            onRowClick={onRowClickScheduled}
          />
        ) : (
          <OrdersTable
            mode="NORMAL"
            loading={loading}
            rows={visibleOrders}
            onRowClick={onRowClick}
          />
        )}
      </div>

      <OrderDetailsModal
        open={open}
        order={selected}
        onClose={() => {
          setOpen(false);
          setSelected(null);
        }}
      />

      <ScheduledOrderDetailsModal
        open={openSch}
        job={selectedSch}
        onClose={() => {
          setOpenSch(false);
          setSelectedSch(null);
        }}
      />
    </div>
  );
}
