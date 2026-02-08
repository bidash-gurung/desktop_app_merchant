// tabs/components/home/HomeItemsGrid.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import ItemDetailsModal from "./ItemDetailsModal";
import "./css/homeItemsGrid.css";

const MART_ENDPOINT = import.meta.env.VITE_ITEM_ENDPOINT; // .../mart-menu/{business_id}
const FOOD_ENDPOINT = import.meta.env.VITE_DISPLAY_MENU_ENDPOINT; // .../food-menu/business/{business_id}

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

/* ✅ PRICING RULE YOU WANT:
   1) Start with actual_price
   2) Add tax to get "taxed actual"
   3) If discount exists, apply discount to the "taxed actual" (NOT to the base)
*/
function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function money2(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "";
  return x.toFixed(2);
}
function calcPricingTaxThenDiscount(it) {
  const base = num(it?.actual_price);
  if (base == null) return { hasBase: false };

  const taxPct = Math.max(0, num(it?.tax_rate) ?? 0);
  const discPct = Math.max(0, num(it?.discount_percentage) ?? 0);

  const hasTax = taxPct > 0;
  const hasDiscount = discPct > 0;

  const taxedActual = hasTax ? base * (1 + taxPct / 100) : base;

  // ✅ discount is applied to taxedActual
  const discounted = hasDiscount ? taxedActual * (1 - discPct / 100) : null;

  return {
    hasBase: true,
    base,
    taxPct,
    discPct,
    hasTax,
    hasDiscount,
    taxedActual,
    discounted,
  };
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
  const ownerType = String(user?.owner_type || "").toLowerCase();
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
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (alive) {
          setErr(e?.message || "Network error");
          setItems([]);
        }
      } finally {
        if (alive) setLoading(false);
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

  const onOpenItem = useCallback(
    (it) => {
      const imgUrl = it?.item_image ? joinUrl(imgPrefix, it.item_image) : "";
      setSelected({ ...it, _imgUrl: imgUrl });
      setOpen(true);
    },
    [imgPrefix],
  );

  const onClose = useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  const handleUpdated = useCallback((updatedItem) => {
    if (!updatedItem?.id) return;

    setItems((prev) =>
      prev.map((x) =>
        String(x?.id) === String(updatedItem.id) ? updatedItem : x,
      ),
    );
    setSelected((prev) => (prev ? { ...prev, ...updatedItem } : updatedItem));
  }, []);

  return (
    <div className="homeItemsWrap">
      <div className="homeItemsHeader">
        <div className="homeItemsHeadLeft">
          <div className="homeItemsTitle">
            {isMart ? "Mart Items" : "Food Menu"}
          </div>
          <div className="homeItemsSub">
            {businessId ? `Business ID: ${businessId}` : "—"}
          </div>
        </div>

        <div className="homeItemsControls">
          <div className="homeItemsSearch" role="search">
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
            const desc = it?.description || "";
            const available = Number(it?.is_available) === 1;

            const stock =
              it?.stock_limit != null && String(it.stock_limit) !== ""
                ? Number(it.stock_limit)
                : null;

            const imgUrl = it?.item_image
              ? joinUrl(imgPrefix, it.item_image)
              : "";

            const p = calcPricingTaxThenDiscount(it);

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

                    {p.hasBase ? (
                      <div className="itemPrice" aria-label="Price">
                        {p.hasDiscount ? (
                          <span className="priceStack">
                            <span className="priceWas">
                              Nu. {money2(p.taxedActual)}
                            </span>
                            <span className="priceNow">
                              Nu. {money2(p.discounted)}
                            </span>
                          </span>
                        ) : (
                          <span className="priceNow">
                            Nu. {money2(p.taxedActual)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {cat ? <div className="itemCat">{cat}</div> : null}

                  {desc ? (
                    <div className="itemDesc" title={desc}>
                      {desc}
                    </div>
                  ) : (
                    <div className="itemDesc empty">No description</div>
                  )}

                  <div className="itemMetaRow">
                    <span className="chip">
                      Stock: {stock != null ? stock : "—"}
                    </span>

                    {p.hasDiscount ? (
                      <span className="chip chipAccent">
                        Discount: {Math.round(p.discPct)}%
                      </span>
                    ) : null}

                    {p.hasTax ? (
                      <span className="chip chipTax">
                        Tax: {Math.round(p.taxPct)}%
                      </span>
                    ) : null}
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
        onDeleted={(id) => {
          setItems((prev) => prev.filter((x) => String(x?.id) !== String(id)));
          setSelected(null);
          setOpen(false);
        }}
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
