// tabs/components/home/HomeItemsGrid.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ItemDetailsModal from "./ItemDetailsModal";
import "./css/homeItemsGrid.css";

const MART_ENDPOINT = import.meta.env.VITE_ITEM_ENDPOINT; // https://grab.newedge.bt/mart/api/mart-menu/{business_id}
const FOOD_ENDPOINT = import.meta.env.VITE_DISPLAY_MENU_ENDPOINT; // https://grab.newedge.bt/food/api/food-menu/business/{business_id}

const FOOD_IMG_PREFIX = import.meta.env.VITE_MENU_IMAGE_ENDPOINT; // https://grab.newedge.bt/food
const MART_IMG_PREFIX = import.meta.env.VITE_ITEM_IMAGE_ENDPOINT; // https://grab.newedge.bt/mart

function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path);
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = (prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathSlash}`;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

export default function HomeItemsGrid({ session }) {
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const abortRef = useRef(null);

  const user = useMemo(() => {
    return session?.payload?.user || session?.payload?.data?.user || {};
  }, [session]);

  const businessId = user?.business_id ?? null;
  const ownerType = String(user?.owner_type || "").toLowerCase(); // "mart" | "food"
  const isMart = ownerType === "mart";

  const endpoint = isMart ? MART_ENDPOINT : FOOD_ENDPOINT;
  const imgPrefix = isMart ? MART_IMG_PREFIX : FOOD_IMG_PREFIX;

  const token =
    session?.payload?.token?.access_token ||
    session?.payload?.data?.token?.access_token ||
    session?.payload?.access_token ||
    session?.payload?.data?.access_token ||
    null;

  useEffect(() => {
    let alive = true;

    async function load() {
      setErr("");
      setLoading(true);

      if (!businessId) {
        setLoading(false);
        setErr("Missing business_id in session.");
        setItems([]);
        return;
      }
      if (!endpoint) {
        setLoading(false);
        setErr(
          isMart
            ? "Missing env: VITE_ITEM_ENDPOINT"
            : "Missing env: VITE_DISPLAY_MENU_ENDPOINT",
        );
        setItems([]);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const url = endpoint.replace("{business_id}", String(businessId));

      try {
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
          if (alive) {
            setErr(getMessage(payload) || `Request failed (${res.status})`);
            setItems([]);
          }
          return;
        }

        const data = payload?.data || [];
        if (alive) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (alive) {
          setErr(e?.message || "Network error");
          setItems([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [businessId, endpoint, isMart, token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return items.filter((it) => {
      const available = Number(it?.is_available) === 1;
      if (onlyAvailable && !available) return false;
      if (!needle) return true;

      const name = String(it?.item_name || "").toLowerCase();
      const cat = String(it?.category_name || "").toLowerCase();
      const desc = String(it?.description || "").toLowerCase();
      return (
        name.includes(needle) || cat.includes(needle) || desc.includes(needle)
      );
    });
  }, [items, q, onlyAvailable]);

  function onOpenItem(it) {
    setSelected(it);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setSelected(null);
  }

  function handleUpdated(updatedItem) {
    if (!updatedItem?.id) return;

    setItems((prev) =>
      prev.map((x) =>
        String(x?.id) === String(updatedItem.id) ? updatedItem : x,
      ),
    );
    setSelected(updatedItem);
  }

  return (
    <div className="homeItemsWrap">
      <div className="homeItemsHeader">
        <div>
          <div className="homeItemsTitle">
            {isMart ? "Mart Items" : "Food Menu"}
          </div>
          <div className="homeItemsSub">
            {businessId ? `Business ID: ${businessId}` : "—"}
          </div>
        </div>

        <div className="homeItemsControls">
          <div className="homeItemsSearch">
            <SearchIcon />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search items..."
              className="homeItemsSearchInput"
            />
            {q ? (
              <button
                type="button"
                className="homeItemsClear"
                onClick={() => setQ("")}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <label className="homeItemsToggle">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            <span>Available only</span>
          </label>

          <div className="homeItemsChip">
            {loading ? "Loading…" : `${filtered.length} / ${items.length}`}
          </div>
        </div>
      </div>

      {err ? <div className="homeItemsError">{err}</div> : null}

      {loading ? (
        <div className="homeItemsSkeletonGrid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div className="itemSkel" key={i}>
              <div className="itemSkelImg" />
              <div className="itemSkelLine" />
              <div className="itemSkelLine short" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="homeItemsEmpty">
          {items.length === 0
            ? "No items found for this business."
            : "No items match your search."}
        </div>
      ) : (
        <div className="homeItemsGrid">
          {filtered.map((it) => {
            const key = it?.id ?? `${it?.item_name}-${it?.created_at ?? ""}`;
            const name = it?.item_name || "Item";
            const cat = it?.category_name || "";
            const price =
              it?.actual_price != null && String(it.actual_price) !== ""
                ? String(it.actual_price)
                : "";
            const desc = it?.description || "";
            const available = Number(it?.is_available) === 1;
            const stock =
              it?.stock_limit != null && String(it.stock_limit) !== ""
                ? Number(it.stock_limit)
                : null;

            const imgUrl = it?.item_image
              ? joinUrl(imgPrefix, it.item_image)
              : "";

            return (
              <button
                key={key}
                type="button"
                className="itemCard itemCardBtn"
                onClick={() => onOpenItem({ ...it, _imgUrl: imgUrl })}
                title="View details"
              >
                <div className="itemImgWrap">
                  {imgUrl ? (
                    <img className="itemImg" src={imgUrl} alt={name} />
                  ) : (
                    <div className="itemImgFallback">No image</div>
                  )}

                  <span className={`itemBadge ${available ? "ok" : "bad"}`}>
                    {available ? "AVAILABLE" : "UNAVAILABLE"}
                  </span>
                </div>

                <div className="itemBody">
                  <div className="itemTop">
                    <div className="itemName" title={name}>
                      {name}
                    </div>
                    {price ? (
                      <div className="itemPrice">Nu. {price}</div>
                    ) : null}
                  </div>

                  {cat ? <div className="itemCat">{cat}</div> : null}

                  {desc ? (
                    <div className="itemDesc" title={desc}>
                      {desc}
                    </div>
                  ) : null}

                  <div className="itemMetaRow">
                    <span className="chip">
                      Stock: {stock != null ? stock : "—"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ItemDetailsModal
        open={open}
        onClose={onClose}
        item={selected}
        isMart={isMart}
        session={session}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
