// OrderDetailsModal.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./css/orderModal.css";
import {
  moneyNu,
  resolveOrderItemImage,
  shortStatusLabel,
} from "./ordersUtils";

/* ========================= ENV ========================= */
const UPDATE_STATUS_ENDPOINT = import.meta.env
  .VITE_UPDATE_ORDER_STATUS_ENDPOINT; // .../orders/{order_id}/status
const FOOD_MENU_ENDPOINT = import.meta.env.VITE_MENU_ENDPOINT; // .../food/api/food-menu/
const MART_MENU_ENDPOINT = import.meta.env.VITE_ITEM_ENDPOINT; // .../mart/api/mart-menu/business/{business_id}

// ✅ image base prefixes
const MART_IMAGE_BASE = String(
  import.meta.env.VITE_ITEM_IMAGE_ENDPOINT || "",
).replace(/\/+$/, ""); // https://grab.newedge.bt/mart
const FOOD_IMAGE_BASE = String(
  import.meta.env.VITE_MENU_IMAGE_ENDPOINT || "",
).replace(/\/+$/, ""); // https://grab.newedge.bt/food

/* ========================= UI HELPERS ========================= */
function Pill({ status }) {
  const s = String(status || "").toUpperCase();
  return <span className={`omPill s_${s}`}>{shortStatusLabel(s)}</span>;
}
function safeText(v) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}
function upperSafe(v) {
  const s = String(v ?? "").trim();
  return s ? s.toUpperCase() : "—";
}
function clampInt(n, min, max) {
  const x = Number(String(n).replace(/[^\d]/g, ""));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}
function getItemMenuId(it, fallback) {
  const v =
    it?.menu_id ?? it?.menuId ?? it?.item_id ?? it?.id ?? fallback ?? null;
  return v != null ? String(v) : null;
}

/* ========================= if_unavailable policy ========================= */
function parseIfUnavailablePolicy(v) {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (!s || s === "—") return { allowRemove: true, allowReplace: true };

  const hasRemove = /\bremove\b/.test(s);
  const hasReplace = /\breplace\b/.test(s);
  const hasBoth = /\bboth\b|\ball\b/.test(s);

  if (hasBoth) return { allowRemove: true, allowReplace: true };
  if (hasRemove && hasReplace) return { allowRemove: true, allowReplace: true };
  if (hasRemove) return { allowRemove: true, allowReplace: false };
  if (hasReplace) return { allowRemove: false, allowReplace: true };

  return { allowRemove: true, allowReplace: true };
}

/* ========================= IMAGE RESOLVER =========================
   ✅ Use prefix base for relative paths:
   - MART => VITE_ITEM_IMAGE_ENDPOINT (https://grab.newedge.bt/mart)
   - FOOD => VITE_MENU_IMAGE_ENDPOINT (https://grab.newedge.bt/food)
============================================================================ */
function isAbsUrl(u) {
  const s = String(u || "")
    .trim()
    .toLowerCase();
  return (
    s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")
  );
}
function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").trim();
  if (!b || !p) return p;
  if (p.startsWith("/")) return `${b}${p}`;
  return `${b}/${p}`;
}
function resolveImageWithServicePrefix(serviceTypeUpper, maybePath) {
  const p = String(maybePath || "").trim();
  if (!p) return "";
  if (isAbsUrl(p)) return p;

  const st = String(serviceTypeUpper || "").toUpperCase();
  const base = st === "MART" ? MART_IMAGE_BASE : FOOD_IMAGE_BASE;
  return base ? joinUrl(base, p) : p;
}

/* ========================= MENU NORMALIZATION =========================
   ✅ MART API SHAPE (your sample):
   id, business_id, item_name, item_image, actual_price, discount_percentage, tax_rate, is_available, ...
   Price rule:
   1) taxed = actual_price + (actual_price * tax_rate/100)
   2) discounted = taxed - (taxed * discount_percentage/100)
============================================================================ */
const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Number(toNum(n).toFixed(2));

function computeMartUnitPriceFromApiRow(row) {
  const actual = toNum(row?.actual_price);
  const taxRate = toNum(row?.tax_rate);
  const discPct = toNum(row?.discount_percentage);

  const taxed = actual + actual * (taxRate / 100);
  const discounted = taxed - taxed * (discPct / 100);

  return round2(discounted);
}

function normalizeMenuItem(x, serviceTypeUpper) {
  if (!x) return null;

  const st = String(serviceTypeUpper || "").toUpperCase();
  const isMart = st === "MART";

  const menu_id =
    x.menu_id ?? x.id ?? x.item_id ?? x.product_id ?? x.food_id ?? null;
  const item_name = x.item_name ?? x.name ?? x.title ?? x.product_name ?? "";
  const item_image = x.item_image ?? x.image ?? x.photo ?? x.thumbnail ?? "";
  const business_id =
    x.business_id ?? x.businessId ?? x.shop_id ?? x.shopId ?? null;
  const business_name =
    x.business_name ?? x.businessName ?? x.shop_name ?? x.shopName ?? "";
  const basePrice =
    x.price ?? x.unit_price ?? x.selling_price ?? x.amount ?? null;

  const computedPrice = isMart
    ? computeMartUnitPriceFromApiRow(x)
    : toNum(basePrice);

  const is_available =
    x.is_available != null ? Number(x.is_available) === 1 : true;

  if (menu_id == null && !item_name) return null;

  return {
    menu_id: menu_id != null ? Number(menu_id) || menu_id : null,
    item_name: String(item_name || "").trim(),
    // ✅ prefix here too for suggestion thumbnails if you ever show them
    item_image: resolveImageWithServicePrefix(st, item_image),
    business_id:
      business_id != null ? Number(business_id) || business_id : null,
    business_name: business_name ? String(business_name) : "",
    price: Number.isFinite(computedPrice) ? computedPrice : null,
    _pricing: isMart
      ? {
          actual_price: toNum(x?.actual_price),
          tax_rate: toNum(x?.tax_rate),
          discount_percentage: toNum(x?.discount_percentage),
          computed_unit_price: computedPrice,
        }
      : null,
    is_available,
    _raw: x,
  };
}

function extractMenuItems(json, serviceTypeUpper) {
  const candidates =
    json?.items ||
    json?.data?.items ||
    json?.data ||
    json?.menu ||
    json?.result ||
    json;

  let arr = [];
  if (Array.isArray(candidates)) arr = candidates;
  else if (Array.isArray(candidates?.items)) arr = candidates.items;
  else if (Array.isArray(candidates?.data)) arr = candidates.data;

  return arr
    .map((x) => normalizeMenuItem(x, serviceTypeUpper))
    .filter(Boolean)
    .filter((x) => x.is_available !== false);
}

function includesLoose(hay, needle) {
  const a = String(hay || "").toLowerCase();
  const b = String(needle || "")
    .toLowerCase()
    .trim();
  if (!b) return false;
  return a.includes(b);
}

function levenshtein(a, b) {
  const s = String(a || "").toLowerCase();
  const t = String(b || "").toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function rankMenuMatches(menuItems, query, originalName) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const orig = String(originalName || "")
    .trim()
    .toLowerCase();

  return menuItems
    .map((m) => {
      const name = String(m?.item_name || "").toLowerCase();
      const hasQ = q ? name.includes(q) : false;
      const dOrig = orig ? levenshtein(name, orig) : 9999;
      const dQ = q ? levenshtein(name, q) : 9999;
      const score =
        (hasQ ? 0 : 1000) + Math.min(dOrig, 250) * 2 + Math.min(dQ, 250);
      return { m, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)
    .map((x) => x.m);
}

/* ========================= STATUS UTIL ========================= */
function buildUpdateUrl(orderId) {
  const base = String(UPDATE_STATUS_ENDPOINT || "").trim();
  if (!base) return "";
  return base.includes("{order_id}")
    ? base.replace("{order_id}", encodeURIComponent(String(orderId)))
    : base;
}

/* ========================= TOTAL RECALC =========================
   total_amount = items_total + delivery_fee - discount_amount + platform_fee + merchant_delivery_fee
============================================================================ */
function computeNewItemsTotal({ rows, removedSet, replacedMap }) {
  let sum = 0;
  for (const r of rows) {
    const id = String(r.oldMenuId);
    if (removedSet.has(id)) continue;

    const rep = replacedMap?.[id];
    if (rep?.selected?.menu_id != null) {
      const qty = toNum(r.qty) || 1;
      const unit =
        rep?.selected?.price != null
          ? toNum(rep.selected.price)
          : toNum(r.unitNum);
      sum += unit * qty;
    } else {
      sum += toNum(r.subNum);
    }
  }
  return round2(sum);
}

function computeFinals({ rows, totals, removedSet, replacedMap }) {
  const discount = round2(totals?.discount_amount);
  const delivery = round2(totals?.delivery_fee);
  const platform = round2(totals?.platform_fee);
  const merchantDelivery = round2(totals?.merchant_delivery_fee);

  const newItemsTotal = computeNewItemsTotal({ rows, removedSet, replacedMap });
  const finalTotal = round2(
    newItemsTotal + delivery - discount + platform + merchantDelivery,
  );

  return {
    items_total: newItemsTotal,
    final_total_amount: Math.max(0, finalTotal),
    final_discount_amount: discount,
    final_delivery_fee: delivery,
    final_platform_fee: platform,
    final_merchant_delivery_fee: merchantDelivery,
  };
}

/* ========================= MAIN ========================= */
export default function OrderDetailsModal({
  open,
  order,
  onClose,
  onAccepted,
  onReady,
  merchant_session,
}) {
  const o = order || null;

  const log = useCallback(
    (...args) => console.log("[OrderDetailsModal]", ...args),
    [],
  );
  const warn = useCallback(
    (...args) => console.warn("[OrderDetailsModal]", ...args),
    [],
  );
  const err = useCallback(
    (...args) => console.error("[OrderDetailsModal]", ...args),
    [],
  );

  const serviceType = useMemo(() => upperSafe(o?.service_type), [o]);

  const businessId = useMemo(() => {
    const fromOrder =
      o?.business?.business_id ??
      o?.business_id ??
      o?.businessId ??
      o?.merchant_business_id ??
      o?.merchant?.business_id ??
      o?.merchant_business_details?.business_id ??
      null;

    if (fromOrder != null) return Number(fromOrder) || fromOrder;

    const fromProp =
      merchant_session?.business_id ??
      merchant_session?.business?.business_id ??
      null;
    if (fromProp != null) return Number(fromProp) || fromProp;

    try {
      const raw = localStorage.getItem("merchant_session");
      if (raw) {
        const s = JSON.parse(raw);
        const bid =
          s?.business_id ?? s?.business?.business_id ?? s?.businessId ?? null;
        if (bid != null) return Number(bid) || bid;
      }
    } catch {
      // Silent fail, use fallback from localStorage
    }

    return null;
  }, [o, merchant_session]);

  const user = useMemo(() => o?._user || {}, [o]);
  const items = useMemo(() => (Array.isArray(o?.items) ? o.items : []), [o]);
  const totals = useMemo(() => o?.totals || {}, [o]);
  const deliverTo = useMemo(() => o?.deliver_to || {}, [o]);

  const [etaMin, setEtaMin] = useState(25);
  const [reason, setReason] = useState("");

  const [removedSet, setRemovedSet] = useState(() => new Set());
  const [replacedMap, setReplacedMap] = useState({});

  const menuCacheRef = useRef({ key: null, items: [] });
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);

  const debounceRef = useRef({});
  const [suggestionsMap, setSuggestionsMap] = useState({});
  const [openSuggestFor, setOpenSuggestFor] = useState(null);

  const modalRef = useRef(null);

  const statusUpper = useMemo(() => upperSafe(o?.status), [o]);
  const isPending = statusUpper === "PENDING";
  const isConfirmed = statusUpper === "CONFIRMED";

  const policy = useMemo(
    () => parseIfUnavailablePolicy(o?.if_unavailable),
    [o?.if_unavailable],
  );
  const allowRemove = isPending && policy.allowRemove;
  const allowReplace = isPending && policy.allowReplace;

  const rows = useMemo(() => {
    if (!o) return [];
    return items.map((it, idx) => {
      // existing resolver, then force prefix if relative
      const rawImg =
        resolveOrderItemImage(o, it) || it?.item_image || it?.image || "";
      const img = resolveImageWithServicePrefix(serviceType, rawImg);

      const oldMenuId = getItemMenuId(it, idx);
      const qty = Number(it?.quantity) || 1;

      const unit = it?.price != null ? toNum(it.price) : 0;
      const explicitSub = it?.subtotal != null ? toNum(it.subtotal) : null;
      const computedSub = unit * qty;
      const sub = explicitSub != null ? explicitSub : computedSub;

      return {
        key: String(oldMenuId ?? idx),
        oldMenuId: String(oldMenuId ?? idx),
        img,
        name: it?.item_name || "Item",
        qty,
        unitNum: round2(unit),
        subNum: round2(sub),
        price: moneyNu(unit),
        subtotal: moneyNu(sub),
        raw: it,
      };
    });
  }, [o, items, serviceType]);

  const baseItemsTotal = useMemo(() => {
    if (!o) return 0;
    if (o?.items_total != null) return toNum(o.items_total) || 0;
    return rows.reduce((sum, r) => sum + toNum(r.subNum), 0);
  }, [o, rows]);

  useEffect(() => {
    function onDocDown(e) {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target)) setOpenSuggestFor(null);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    if (!open || !isPending) return;
    if (!policy.allowRemove) setRemovedSet(new Set());
    if (!policy.allowReplace) {
      setReplacedMap({});
      setSuggestionsMap({});
      setOpenSuggestFor(null);
    }
  }, [open, isPending, policy.allowRemove, policy.allowReplace]);

  useEffect(() => {
    if (!open) return;

    setEtaMin(25);
    setReason("");
    setRemovedSet(new Set());
    setReplacedMap({});
    setSuggestionsMap({});
    setOpenSuggestFor(null);
    setMenuError(null);

    log("OPEN", {
      order_id: o?.order_id,
      status: o?.status,
      serviceType,
      businessId,
      if_unavailable: o?.if_unavailable,
      allowRemove,
      allowReplace,
      UPDATE_STATUS_ENDPOINT,
      FOOD_MENU_ENDPOINT,
      MART_MENU_ENDPOINT,
      MART_IMAGE_BASE,
      FOOD_IMAGE_BASE,
    });
  }, [open, o, serviceType, businessId, allowRemove, allowReplace, log]);

  /* ---------- menu fetch (cached) ---------- */
  const fetchMenuOnce = useCallback(async () => {
    if (!allowReplace) return [];

    const st = String(serviceType || "").toUpperCase();
    const bid = businessId;
    const cacheKey = `${st}:${bid ?? "NA"}`;

    if (
      menuCacheRef.current.key === cacheKey &&
      Array.isArray(menuCacheRef.current.items) &&
      menuCacheRef.current.items.length
    ) {
      return menuCacheRef.current.items;
    }

    let url = "";
    if (st === "FOOD") {
      url = String(FOOD_MENU_ENDPOINT || "").trim();
    } else if (st === "MART") {
      url = String(MART_MENU_ENDPOINT || "").trim();
      if (url.includes("{business_id}")) {
        url = url.replace(
          "{business_id}",
          encodeURIComponent(String(bid ?? "")),
        );
      }
    } else {
      url = String(FOOD_MENU_ENDPOINT || "").trim();
    }

    if (!url) {
      const msg =
        "Menu endpoint missing (VITE_MENU_ENDPOINT / VITE_ITEM_ENDPOINT)";
      warn(msg, { st, bid });
      setMenuError(msg);
      return [];
    }
    if (st === "MART" && (bid == null || String(bid) === "")) {
      const msg = "business_id missing for MART menu fetch (required).";
      warn(msg, { order_business_id: businessId, order: o });
      setMenuError(msg);
      return [];
    }

    setMenuLoading(true);
    setMenuError(null);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();

      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error("Menu API did not return JSON" + e);
      }

      if (!res.ok) {
        throw new Error(json?.message || `Menu fetch failed (${res.status})`);
      }

      const menuItems = extractMenuItems(json, st);
      menuCacheRef.current = { key: cacheKey, items: menuItems };
      return menuItems;
    } catch (e) {
      err("MENU fetch error", e);
      setMenuError(String(e?.message || e));
      return [];
    } finally {
      setMenuLoading(false);
    }
  }, [serviceType, businessId, warn, err, o, allowReplace]);

  const setReplaceQuery = useCallback((oldMenuId, query) => {
    setReplacedMap((prev) => ({
      ...prev,
      [oldMenuId]: { ...(prev[oldMenuId] || {}), query, selected: null },
    }));
  }, []);

  const runSuggest = useCallback(
    async (oldMenuId, query, originalName) => {
      if (!allowReplace) return;

      const q = String(query || "").trim();
      if (!q) {
        setSuggestionsMap((prev) => ({ ...prev, [oldMenuId]: [] }));
        return;
      }

      const menuItems = await fetchMenuOnce();
      const contains = menuItems.filter((m) => includesLoose(m?.item_name, q));
      const filtered =
        contains.length > 0
          ? contains.slice(0, 12)
          : rankMenuMatches(menuItems, q, originalName);

      setSuggestionsMap((prev) => ({ ...prev, [oldMenuId]: filtered }));
    },
    [fetchMenuOnce, allowReplace],
  );

  const onReplaceInputChange = useCallback(
    (oldMenuId, val, originalName) => {
      if (!allowReplace) return;

      setReplaceQuery(oldMenuId, val);
      setOpenSuggestFor(oldMenuId);

      if (debounceRef.current[oldMenuId])
        clearTimeout(debounceRef.current[oldMenuId]);
      debounceRef.current[oldMenuId] = setTimeout(() => {
        runSuggest(oldMenuId, val, originalName);
      }, 180);
    },
    [runSuggest, setReplaceQuery, allowReplace],
  );

  const selectReplacement = useCallback(
    (oldMenuId, picked, originalQty, oldBusinessMeta) => {
      if (!allowReplace) return;

      const qty = Number(originalQty) || 1;
      const unit = picked?.price != null ? toNum(picked.price) : null;
      const subtotal = unit != null ? round2(unit * qty) : null;

      // ensure not removed
      setRemovedSet((prev) => {
        const next = new Set(prev);
        next.delete(String(oldMenuId));
        return next;
      });

      setReplacedMap((prev) => ({
        ...prev,
        [oldMenuId]: {
          query: picked?.item_name || "",
          selected: {
            business_id:
              picked?.business_id ??
              oldBusinessMeta?.business_id ??
              businessId ??
              null,
            business_name:
              picked?.business_name || oldBusinessMeta?.business_name || "",
            menu_id: picked?.menu_id,
            item_name: picked?.item_name,
            // ✅ ensure prefixed image
            item_image: resolveImageWithServicePrefix(
              serviceType,
              picked?.item_image || "",
            ),
            quantity: qty,
            price: unit,
            subtotal,
          },
        },
      }));

      setOpenSuggestFor(null);
      setSuggestionsMap((prev) => ({ ...prev, [oldMenuId]: [] }));
    },
    [businessId, allowReplace, serviceType],
  );

  const toggleRemove = useCallback(
    (oldMenuId) => {
      if (!allowRemove) return;

      setRemovedSet((prev) => {
        const next = new Set(prev);
        if (next.has(oldMenuId)) next.delete(oldMenuId);
        else next.add(oldMenuId);
        return next;
      });

      // clear replacement
      setReplacedMap((prev) => {
        if (!prev[oldMenuId]) return prev;
        const cp = { ...prev };
        delete cp[oldMenuId];
        return cp;
      });

      setSuggestionsMap((prev) => ({ ...prev, [oldMenuId]: [] }));
      setOpenSuggestFor((cur) => (cur === oldMenuId ? null : cur));
    },
    [allowRemove],
  );

  const computedFinals = useMemo(() => {
    if (!isPending) {
      return computeFinals({
        rows,
        totals,
        removedSet: new Set(),
        replacedMap: {},
      });
    }
    return computeFinals({ rows, totals, removedSet, replacedMap });
  }, [isPending, rows, totals, removedSet, replacedMap]);

  // ✅ LIVE totals (display computed when pending)
  const displayItemsTotal = isPending
    ? computedFinals.items_total
    : baseItemsTotal;
  const displayDiscount = isPending
    ? computedFinals.final_discount_amount
    : round2(totals?.discount_amount);
  const displayDelivery = isPending
    ? computedFinals.final_delivery_fee
    : round2(totals?.delivery_fee);
  const displayPlatform = isPending
    ? computedFinals.final_platform_fee
    : round2(totals?.platform_fee);
  const displayMerchantDelivery = isPending
    ? computedFinals.final_merchant_delivery_fee
    : round2(totals?.merchant_delivery_fee);
  const displayTotalAmount = isPending
    ? computedFinals.final_total_amount
    : round2(totals?.total_amount);

  /* ---------- ACCEPT ---------- */
  const handleAccept = useCallback(async () => {
    try {
      if (!o?.order_id) return;

      if (!UPDATE_STATUS_ENDPOINT) {
        alert("Missing VITE_UPDATE_ORDER_STATUS_ENDPOINT");
        return;
      }

      const removed = [];
      if (allowRemove) {
        removedSet.forEach((oldMenuId) => {
          const row = rows.find(
            (x) => String(x.oldMenuId) === String(oldMenuId),
          );
          const it = row?.raw;
          if (!it) return;
          removed.push({
            business_id: it?.business_id ?? businessId ?? null,
            menu_id: it?.menu_id ?? it?.item_id ?? null,
            item_name: it?.item_name || row?.name || "Item",
          });
        });
      }

      const replaced = [];
      if (allowReplace) {
        Object.entries(replacedMap || {}).forEach(([oldMenuId, rep]) => {
          if (!rep?.selected?.menu_id) return;

          const row = rows.find(
            (x) => String(x.oldMenuId) === String(oldMenuId),
          );
          const it = row?.raw;
          if (!it) return;

          replaced.push({
            old: {
              business_id: it?.business_id ?? businessId ?? null,
              menu_id: it?.menu_id ?? it?.item_id ?? null,
              item_name: it?.item_name || row?.name || "Item",
            },
            new: {
              business_id:
                rep.selected.business_id ??
                it?.business_id ??
                businessId ??
                null,
              business_name:
                rep.selected.business_name || it?.business_name || "",
              menu_id: rep.selected.menu_id,
              item_name: rep.selected.item_name,
              item_image: rep.selected.item_image || "",
              quantity: Number(rep.selected.quantity) || Number(row?.qty) || 1,
              price:
                rep.selected.price != null ? toNum(rep.selected.price) : null,
              subtotal:
                rep.selected.subtotal != null
                  ? toNum(rep.selected.subtotal)
                  : null,
            },
          });
        });
      }

      const unavailable_changes = {
        removed: allowRemove ? removed : [],
        replaced: allowReplace ? replaced : [],
      };

      // Validate replace payload
      if (allowReplace && unavailable_changes.replaced.length > 0) {
        const bad = unavailable_changes.replaced.find(
          (x) =>
            !x?.new?.menu_id ||
            x?.new?.price == null ||
            x?.new?.subtotal == null,
        );
        if (bad) {
          alert(
            "Replacement item missing price/subtotal/menu_id. Please select a valid item from suggestions.",
          );
          return;
        }
      }

      const hasChanges =
        unavailable_changes.removed.length > 0 ||
        unavailable_changes.replaced.length > 0;

      const payload = {
        status: "CONFIRMED",
        reason:
          reason ||
          (hasChanges
            ? unavailable_changes.removed.length > 0
              ? "Some items unavailable"
              : "Replaced unavailable item"
            : ""),
        estimated_minutes: clampInt(etaMin, 0, 999),

        // ✅ recalculated finals (LIVE)
        final_total_amount: toNum(computedFinals.final_total_amount),
        final_platform_fee: toNum(computedFinals.final_platform_fee),
        final_discount_amount: toNum(computedFinals.final_discount_amount),
        final_delivery_fee: toNum(computedFinals.final_delivery_fee),
        final_merchant_delivery_fee: toNum(
          computedFinals.final_merchant_delivery_fee,
        ),

        unavailable_changes,
      };

      const url = buildUpdateUrl(o.order_id);
      if (!url) {
        alert("Invalid update status URL");
        return;
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        alert(json?.message || `Accept failed (${res.status})`);
        return;
      }

      onAccepted?.(json);
      onClose?.();

      // ✅ reload page after accept success
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          console.error("Failed to reload page:", e);
        }
      }, 150);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }, [
    o,
    rows,
    removedSet,
    replacedMap,
    businessId,
    reason,
    etaMin,
    computedFinals,
    allowRemove,
    allowReplace,
    onAccepted,
    onClose,
  ]);

  /* ---------- READY ---------- */
  const handleMarkReady = useCallback(async () => {
    try {
      if (!o?.order_id) return;
      if (!UPDATE_STATUS_ENDPOINT) {
        alert("Missing VITE_UPDATE_ORDER_STATUS_ENDPOINT");
        return;
      }

      const payload = { status: "READY" };
      const url = buildUpdateUrl(o.order_id);

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        alert(json?.message || `Update failed (${res.status})`);
        return;
      }

      onReady?.(json);
      onClose?.();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }, [o, onReady, onClose]);

  if (!open || !o) return null;

  const address = safeText(deliverTo?.address);
  const floorUnit = safeText(deliverTo?.delivery_floor_unit);
  const instruction = safeText(deliverTo?.delivery_instruction_note);
  const dropMode = safeText(deliverTo?.delivery_special_mode);

  const note = safeText(o?.note_for_restaurant);
  const ifUnavailable = safeText(o?.if_unavailable);

  const headerCustomerName = safeText(user?.name);
  const headerCustomerPhone = safeText(user?.phone);

  return (
    <div className="omOverlay" onMouseDown={onClose}>
      <div
        className="omModal"
        ref={modalRef}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="omHeader">
          <div className="omHeaderLeft">
            <div className="omTitle">{o?.order_id || "Order"}</div>

            <div className="omHeaderMeta">
              <span className="omHeaderMetaName">{headerCustomerName}</span>
              <span className="omHeaderMetaSep">•</span>
              <span className="omHeaderMetaPhone">{headerCustomerPhone}</span>
            </div>

            <Pill status={o?.status} />
          </div>

          <button
            type="button"
            className="omX"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="omBody">
          <div className="omGridTwo">
            {/* Order Info */}
            <div className="omCard">
              <div className="omCardTitle">Order Info</div>

              <div className="omKV">
                <span>Service</span>
                <b>{upperSafe(o?.service_type)}</b>
              </div>

              <div className="omKV">
                <span>Payment</span>
                <b>{safeText(o?.payment_method)}</b>
              </div>

              <div className="omKV">
                <span>Fulfillment</span>
                <b>{safeText(o?.fulfillment_type)}</b>
              </div>

              <div className="omKV">
                <span>Priority</span>
                <b>{Number(o?.priority) || 0}</b>
              </div>

              <div className="omDivider" />

              <div className="omKVBlock">
                <b>Delivery address</b>
                <div className="omMuted">{address}</div>
              </div>

              <div className="omTwoCol">
                <div className="omKVBlock">
                  <b>Floor / Unit</b>
                  <div className="omMuted">{floorUnit}</div>
                </div>
                <div className="omKVBlock">
                  <b>Drop-off mode</b>
                  <div className="omMuted">{dropMode}</div>
                </div>
              </div>

              <div className="omKVBlock" style={{ marginTop: 10 }}>
                <b>Delivery instructions</b>
                <div className="omMuted">{instruction}</div>
              </div>

              <div className="omDivider" />

              <div className="omKVBlock">
                <b>Note</b>
                <div className="omMuted">{note}</div>
              </div>

              <div className="omKVBlock" style={{ marginTop: 10 }}>
                <b>If unavailable</b>
                <div className="omMuted">{ifUnavailable}</div>
              </div>
            </div>

            {/* Totals (✅ live while replacing/removing) */}
            <div className="omCard">
              <div className="omCardTitle">Totals</div>

              <div className="omMoneyGrid">
                <div>Items total</div>
                <b>{moneyNu(displayItemsTotal)}</b>

                <div>Discount</div>
                <b>{moneyNu(displayDiscount)}</b>

                <div>Delivery fee</div>
                <b>{moneyNu(displayDelivery)}</b>

                <div>Platform fee</div>
                <b>{moneyNu(displayPlatform)}</b>

                <div>Merchant delivery</div>
                <b>{moneyNu(displayMerchantDelivery)}</b>

                <div className="omTotalLabel">Total amount</div>
                <b className="omTotalValue">{moneyNu(displayTotalAmount)}</b>
              </div>

              <div className="omTotalsNotes">
                <div className="omTotalsNotesTitle">Notes</div>
                <ul className="omTotalsNotesList">
                  <li>
                    <b>Delivery fee:</b> This amount will be credited to your
                    account and later deducted when the delivery is completed.
                  </li>
                  <li>
                    <b>Platform fee:</b> 50% will be deducted from the customer
                    and 50% from your wallet.
                  </li>
                </ul>
              </div>

              {isPending && allowReplace && (menuError || menuLoading) && (
                <div className="omInlineHint">
                  {menuLoading ? "Loading menu..." : `Menu error: ${menuError}`}
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="omCard">
            <div className="omCardTitle">
              Items
              {isPending
                ? allowRemove && allowReplace
                  ? " (Remove / Replace)"
                  : allowRemove
                    ? " (Remove)"
                    : allowReplace
                      ? " (Replace)"
                      : ""
                : ""}
            </div>

            <div className="omItems">
              {rows.length === 0 ? (
                <div className="omMuted">No items</div>
              ) : (
                rows.map((r) => {
                  const oldId = String(r.oldMenuId);
                  const isRemoved = removedSet.has(oldId);
                  const rep = replacedMap?.[oldId];
                  const query = rep?.query || "";
                  const sug = suggestionsMap?.[oldId] || [];
                  const showSug =
                    isPending &&
                    allowReplace &&
                    openSuggestFor === oldId &&
                    query.trim().length > 0;

                  const oldBusinessMeta = {
                    business_id: r?.raw?.business_id ?? businessId ?? null,
                    business_name: r?.raw?.business_name ?? "",
                  };

                  return (
                    <div
                      key={r.key}
                      className={`omItemRow ${isPending ? "omItemRow2" : ""} ${isRemoved ? "isRemoved" : ""}`}
                    >
                      <div className="omItemThumb">
                        {r.img ? (
                          <img src={r.img} alt="" />
                        ) : (
                          <div className="omNoImg">No image</div>
                        )}
                      </div>

                      <div className="omItemMain">
                        <div className="omItemName">{r.name}</div>
                        <div className="omItemMeta">
                          Qty: <b>{r.qty}</b> • Price: <b>{r.price}</b> •
                          Subtotal: <b>{r.subtotal}</b>
                        </div>

                        {/* Replace UI */}
                        {isPending && allowReplace && !isRemoved && (
                          <div className="omReplaceBlock">
                            <div className="omReplaceLabel">Replace with</div>

                            <div className="omAutoWrap">
                              <input
                                className="omAutoInput"
                                value={query}
                                placeholder="Type item name..."
                                onChange={(e) =>
                                  onReplaceInputChange(
                                    oldId,
                                    e.target.value,
                                    r.name,
                                  )
                                }
                                onFocus={() => {
                                  setOpenSuggestFor(oldId);
                                  fetchMenuOnce();
                                }}
                              />

                              {showSug && (
                                <div className="omAutoList">
                                  {menuLoading ? (
                                    <div className="omAutoEmpty">
                                      Loading...
                                    </div>
                                  ) : sug.length === 0 ? (
                                    <div className="omAutoEmpty">
                                      No matches
                                    </div>
                                  ) : (
                                    sug.map((m) => (
                                      <button
                                        key={`${m.menu_id}-${m.item_name}`}
                                        type="button"
                                        className="omAutoItem"
                                        onClick={() =>
                                          selectReplacement(
                                            oldId,
                                            m,
                                            r.qty,
                                            oldBusinessMeta,
                                          )
                                        }
                                      >
                                        <div className="omAutoTitle">
                                          {m.item_name}
                                        </div>
                                        <div className="omAutoMeta">
                                          {m.price != null
                                            ? `Nu. ${Number(m.price).toFixed(2)}`
                                            : "—"}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>

                            {rep?.selected && (
                              <div className="omPicked">
                                Selected: <b>{rep.selected.item_name}</b>
                                {rep.selected.price != null ? (
                                  <span className="omPickedPrice">
                                    {" "}
                                    • Nu.{" "}
                                    {Number(rep.selected.price).toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      {isPending && allowRemove && (
                        <div className="omItemActions">
                          <button
                            type="button"
                            className={`omMiniBtn ${isRemoved ? "danger" : ""}`}
                            onClick={() => toggleRemove(oldId)}
                          >
                            {isRemoved ? "Undo" : "Remove"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Accept details */}
          {isPending && (
            <div className="omCard">
              <div className="omCardTitle">Accept details</div>

              <div className="omAcceptGrid">
                <div className="omField">
                  <label>Estimated time (minutes)</label>
                  <div className="omStepper">
                    <button
                      type="button"
                      onClick={() =>
                        setEtaMin((v) => Math.max(0, (Number(v) || 0) - 1))
                      }
                    >
                      −
                    </button>
                    <input
                      value={etaMin}
                      onChange={(e) =>
                        setEtaMin(e.target.value.replace(/[^\d]/g, ""))
                      }
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => setEtaMin((v) => (Number(v) || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="omField">
                  <label>Reason (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Some items unavailable / Replaced unavailable item"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="omFooter">
          {isPending && (
            <button
              type="button"
              className="omBtnPrimary"
              onClick={handleAccept}
            >
              Accept
            </button>
          )}

          {isConfirmed && (
            <button
              type="button"
              className="omBtnPrimary"
              onClick={handleMarkReady}
            >
              Mark Ready
            </button>
          )}

          <button type="button" className="omBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
