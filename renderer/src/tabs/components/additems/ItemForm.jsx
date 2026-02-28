// src/tabs/components/additems/ItemForm.jsx
import React from "react";
import ImageField from "./ImageField";
import { clampNum, safeText, toBool01, moneyNu, extractMessage } from "./utils";

const FOOD_ADD = import.meta.env.VITE_FOOD_MENU_ADD;
const MART_ADD = import.meta.env.VITE_MART_MENU_ADD;

const CATEGORY_ENDPOINT = import.meta.env.VITE_CATEGORY_ENDPOINT;
const CATEGORY_IMG_PREFIX = import.meta.env.VITE_MERCHANT_LOGO;

const SPICE_LEVELS = ["None", "Mild", "Medium", "Hot"];
const PRIORITY_LEVELS = ["1", "2", "3"];

function stripTrailingSlash(url) {
  if (!url) return "";
  const s = String(url);
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path);
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = String(prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathSlash}`;
}

function buildUrl(base, businessId) {
  if (!base) return "";
  const b = String(base);
  if (b.includes("{business_id}"))
    return b.replace("{business_id}", String(businessId));
  return b.endsWith("/") ? `${b}${businessId}` : `${b}/${businessId}`;
}

function normalizeOwnerType(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (s.includes("food")) return "food";
  if (s.includes("mart")) return "mart";
  return "food";
}

function flattenCategories(out) {
  const types = Array.isArray(out?.types) ? out.types : [];
  const flat = [];

  for (const t of types) {
    const kind = String(t?.kind || "")
      .trim()
      .toLowerCase();
    const cats = Array.isArray(t?.categories) ? t.categories : [];

    for (const c of cats) {
      const name = String(c?.category_name || "").trim();
      if (!name) continue;

      flat.push({
        id: c?.id ?? `${t?.business_type_id || "t"}-${name}`,
        name,
        image: String(c?.category_image || "").trim(),
        kind: kind || null,
      });
    }
  }

  const seen = new Set();
  const uniq = [];
  for (const c of flat) {
    const k = c.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(c);
  }
  return uniq;
}

/**
 * ✅ PRICE RULE: add tax FIRST, then only deduct discount
 * base -> +tax -> discount on (base+tax) -> final
 */
function computeFinalPriceTaxFirst(base, discountPct, taxPct) {
  const baseNum = Number(base);
  const b = Number.isFinite(baseNum) ? baseNum : 0;

  const d = clampNum(Number(discountPct), 0, 100);
  const t = clampNum(Number(taxPct), 0, 999);

  const taxAmount = (b * t) / 100;
  const afterTax = b + taxAmount;

  const discountAmount = (afterTax * d) / 100;
  const final = afterTax - discountAmount;

  return { base: b, taxAmount, discountAmount, final };
}

export default function ItemForm({ token, businessId, ownerTypeFromSession }) {
  const mode = normalizeOwnerType(ownerTypeFromSession); // "food" | "mart"
  const createEndpoint = stripTrailingSlash(
    mode === "food" ? FOOD_ADD : MART_ADD,
  );

  const [busy, setBusy] = React.useState(false);
  const [okMsg, setOkMsg] = React.useState("");
  const [errMsg, setErrMsg] = React.useState("");

  // categories
  const [catLoading, setCatLoading] = React.useState(false);
  const [catErr, setCatErr] = React.useState("");
  const [categories, setCategories] = React.useState([]);
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryImage, setCategoryImage] = React.useState("");

  // form
  const [itemName, setItemName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [actualPrice, setActualPrice] = React.useState("");
  const [discountPercentage, setDiscountPercentage] = React.useState("0");
  const [taxRate, setTaxRate] = React.useState("0");

  const [priorityLevel, setPriorityLevel] = React.useState("1");
  const [isVeg, setIsVeg] = React.useState(false);
  const [spiceLevel, setSpiceLevel] = React.useState("None");
  const [isAvailable, setIsAvailable] = React.useState(true);
  const [stockLimit, setStockLimit] = React.useState("0");

  const [imageFile, setImageFile] = React.useState(null);

  const preview = computeFinalPriceTaxFirst(
    actualPrice,
    discountPercentage,
    taxRate,
  );

  function resetMessages() {
    setOkMsg("");
    setErrMsg("");
  }

  // fetch categories
  React.useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function loadCats() {
      setCatErr("");
      setCategories([]);
      setCategoryName("");
      setCategoryImage("");

      if (!businessId) {
        setCatErr("Missing business_id in session.");
        return;
      }
      if (!CATEGORY_ENDPOINT) {
        setCatErr("Missing env: VITE_CATEGORY_ENDPOINT");
        return;
      }

      const url = buildUrl(CATEGORY_ENDPOINT, businessId);

      setCatLoading(true);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ctrl.signal,
        });

        const out = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            extractMessage(out) || `Category fetch failed (${res.status})`,
          );
        }

        const listAll = flattenCategories(out);
        const list =
          listAll.length && listAll.some((c) => c.kind)
            ? listAll.filter((c) => String(c.kind).toLowerCase() === mode)
            : listAll;

        if (!alive) return;

        setCategories(list);
        if (list.length) {
          setCategoryName(list[0].name);
          setCategoryImage(list[0].image || "");
        }
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setCatErr(e?.message || "Failed to load categories.");
      } finally {
        if (alive) setCatLoading(false);
      }
    }

    loadCats();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [businessId, token, mode]);

  function onPickCategory(name) {
    setCategoryName(name);
    const found = categories.find((c) => c.name === name);
    setCategoryImage(found?.image || "");
  }

  function validate() {
    resetMessages();

    if (!businessId) return "Missing business_id in session.";
    if (!createEndpoint)
      return `Missing env: ${mode === "food" ? "VITE_FOOD_MENU_ADD" : "VITE_MART_MENU_ADD"}`;

    if (!safeText(categoryName)) return "Category is required.";
    if (!safeText(itemName)) return "Item name is required.";

    const p = Number(actualPrice);
    if (!Number.isFinite(p) || p < 0)
      return "Actual price must be a valid non-negative number.";

    const d = Number(discountPercentage);
    if (!Number.isFinite(d) || d < 0 || d > 100)
      return "Discount must be between 0 and 100.";

    const t = Number(taxRate);
    if (!Number.isFinite(t) || t < 0)
      return "Tax rate must be a valid non-negative number.";

    const st = Number(stockLimit);
    if (!Number.isFinite(st) || st < 0)
      return "Stock limit must be 0 or a positive number.";

    if (!PRIORITY_LEVELS.includes(String(priorityLevel)))
      return "Priority level must be 1, 2, or 3.";

    if (!SPICE_LEVELS.includes(spiceLevel)) return "Spice level is invalid.";

    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();

    const v = validate();
    if (v) {
      setErrMsg(v);
      return;
    }

    setBusy(true);
    resetMessages();

    try {
      const fd = new FormData();

      fd.append("business_id", String(businessId));
      fd.append("category_name", String(categoryName).trim());
      fd.append("item_name", String(itemName).trim());
      fd.append("description", String(description || "").trim());

      fd.append("actual_price", String(Number(actualPrice)));
      fd.append(
        "discount_percentage",
        String(clampNum(Number(discountPercentage), 0, 100)),
      );
      fd.append("tax_rate", String(clampNum(Number(taxRate), 0, 999)));

      fd.append("is_available", String(toBool01(isAvailable, 1)));
      fd.append("stock_limit", String(Math.max(0, Number(stockLimit) || 0)));

      // UI field (backend may ignore if not supported)
      fd.append("priority_level", String(priorityLevel));

      fd.append("is_veg", String(toBool01(isVeg, 0)));
      fd.append("spice_level", String(spiceLevel || "None"));

      if (imageFile) fd.append("item_image", imageFile);

      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      const out = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(extractMessage(out) || `Create failed (${res.status})`);

      setOkMsg(out?.message || "Created successfully.");

      // reset (keep category)
      setItemName("");
      setDescription("");
      setActualPrice("");
      setDiscountPercentage("0");
      setTaxRate("0");
      setPriorityLevel("1");
      setIsVeg(false);
      setSpiceLevel("None");
      setIsAvailable(true);
      setStockLimit("0");
      setImageFile(null);
    } catch (e2) {
      setErrMsg(e2?.message || "Failed to create item.");
    } finally {
      setBusy(false);
    }
  }

  const catImgUrl = categoryImage
    ? joinUrl(CATEGORY_IMG_PREFIX, categoryImage)
    : "";

  return (
    <div className="aiFormPro">
      {/* Header row */}
      <div className="aiProHeader">
        <div className="aiProHeaderLeft">
          <div className="aiProPill">{mode === "food" ? "Food" : "Mart"}</div>
          <div className="aiProHeaderText">
            <div className="aiProTitle">Create Item</div>
            <div className="aiProSub">
              Add a new {mode === "food" ? "food menu" : "mart menu"} item for
              your business.
            </div>
          </div>
        </div>

        <div
          className="aiProPriceCard"
          title="Live preview (Tax first → Discount)"
        >
          <div className="aiProFinalLabel">Final</div>
          <div className="aiProFinalValue">{moneyNu(preview.final)}</div>
          <div className="aiProBreakdown">
            <span>Base {moneyNu(preview.base)}</span>
            <span className="aiDot">•</span>
            <span>Tax {moneyNu(preview.taxAmount)}</span>
            <span className="aiDot">•</span>
            <span>Disc {moneyNu(preview.discountAmount)}</span>
          </div>
        </div>
      </div>

      {okMsg ? <div className="aiOk">{okMsg}</div> : null}
      {errMsg ? <div className="aiErr">{errMsg}</div> : null}

      <form onSubmit={onSubmit} className="aiProCard">
        {/* Section: Basics */}
        <div className="aiSection">
          <div className="aiSectionTitle">Basics</div>

          <div className="aiGrid">
            <div className="aiField full">
              <div className="aiLabel">
                Category <span className="aiReq">*</span>
              </div>

              <div className="aiCatInline">
                <div className="aiSelectWrap">
                  <select
                    className="aiSelect"
                    value={categoryName}
                    onChange={(e) => onPickCategory(e.target.value)}
                    disabled={busy || catLoading || !categories.length}
                  >
                    {!categories.length ? (
                      <option value="">
                        {catLoading
                          ? "Loading categories..."
                          : "No categories found"}
                      </option>
                    ) : null}

                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="aiSelectChevron">▾</span>
                </div>

                <div className="aiCatThumb" aria-label="Category image">
                  {catImgUrl ? (
                    <img
                      className="aiCatThumbImg"
                      src={catImgUrl}
                      alt={categoryName || "Category"}
                    />
                  ) : (
                    <div className="aiCatThumbFallback">—</div>
                  )}
                </div>
              </div>

              {catErr ? <div className="aiHint aiHintErr">{catErr}</div> : null}
            </div>

            <div className="aiField full">
              <div className="aiLabel">
                Item name <span className="aiReq">*</span>
              </div>
              <input
                className="aiInput"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Chicken Burger"
                disabled={busy}
              />
            </div>

            <div className="aiField full">
              <div className="aiLabel">Description</div>
              <textarea
                className="aiTextarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)"
                disabled={busy}
              />
            </div>
          </div>
        </div>

        {/* Section: Pricing */}
        <div className="aiSection">
          <div className="aiSectionTitle">Pricing</div>

          <div className="aiGrid">
            <div className="aiField">
              <div className="aiLabel">
                Actual price (Nu.) <span className="aiReq">*</span>
              </div>
              <input
                className="aiInput"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                inputMode="decimal"
                placeholder="e.g., 120"
                disabled={busy}
              />
            </div>

            <div className="aiField">
              <div className="aiLabel">Discount (%)</div>
              <input
                className="aiInput"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                disabled={busy}
              />
            </div>

            <div className="aiField">
              <div className="aiLabel">Tax rate (%)</div>
              <input
                className="aiInput"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                disabled={busy}
              />
            </div>

            <div className="aiField">
              <div className="aiLabel">Priority level</div>
              <div className="aiSelectWrap">
                <select
                  className="aiSelect"
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value)}
                  disabled={busy}
                >
                  {PRIORITY_LEVELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="aiSelectChevron">▾</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Availability */}
        <div className="aiSection">
          <div className="aiSectionTitle">Availability</div>

          <div className="aiGrid">
            <div className="aiToggleRow">
              <label className="aiToggle">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  disabled={busy}
                />
                Available
              </label>

              <label className="aiToggle">
                <input
                  type="checkbox"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  disabled={busy}
                />
                Vegetarian
              </label>
            </div>

            <div className="aiField">
              <div className="aiLabel">Stock limit</div>
              <input
                className="aiInput"
                value={stockLimit}
                onChange={(e) => setStockLimit(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                disabled={busy}
              />
              <div className="aiHint">0 = unlimited</div>
            </div>

            <div className="aiField">
              <div className="aiLabel">Spice level</div>
              <div className="aiSelectWrap">
                <select
                  className="aiSelect"
                  value={spiceLevel}
                  onChange={(e) => setSpiceLevel(e.target.value)}
                  disabled={busy}
                >
                  {SPICE_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="aiSelectChevron">▾</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Image */}
        <div className="aiSection">
          <div className="aiSectionTitle">Item image</div>
          <ImageField
            value={imageFile}
            onChange={setImageFile}
            disabled={busy}
          />
        </div>

        {/* Actions */}
        <div className="aiActions full">
          <button className="aiBtn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Create Item"}
          </button>

          <button
            className="aiBtn ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              resetMessages();
              setItemName("");
              setDescription("");
              setActualPrice("");
              setDiscountPercentage("0");
              setTaxRate("0");
              setPriorityLevel("1");
              setIsVeg(false);
              setSpiceLevel("None");
              setIsAvailable(true);
              setStockLimit("0");
              setImageFile(null);
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
