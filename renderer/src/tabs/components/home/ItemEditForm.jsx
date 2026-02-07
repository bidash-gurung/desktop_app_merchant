// tabs/components/home/ItemEditForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./css/itemEditForm.css";

const MART_EDIT = import.meta.env.VITE_ITEM_EDIT;
const FOOD_EDIT = import.meta.env.VITE_FOOD_MENU_EDIT;
const CATEGORY_ENDPOINT = import.meta.env.VITE_CATEGORY_ENDPOINT;

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function msg(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

function buildUrl(base, id) {
  if (!base) return "";
  if (base.includes("{id}")) return base.replace("{id}", String(id));
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

function buildBizUrl(base, businessId) {
  if (!base) return "";
  if (base.includes("{business_id}"))
    return base.replace("{business_id}", String(businessId));
  return base.endsWith("/") ? `${base}${businessId}` : `${base}/${businessId}`;
}

function toNumberOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export default function ItemEditForm({
  item,
  isMart,
  session,
  onCancel,
  onSaved,
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [catLoading, setCatLoading] = useState(false);
  const [catErr, setCatErr] = useState("");
  const [categories, setCategories] = useState([]);

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

  const editBase = isMart ? MART_EDIT : FOOD_EDIT;

  const initial = useMemo(() => {
    const it = item || {};
    const hasVeg = it?.is_veg != null;
    const hasSpice = it?.spice_level != null;

    // spice default mapping
    const rawSpice = String(it.spice_level ?? "").trim();
    const rawLower = rawSpice.toLowerCase();

    let spiceUI = "";
    if (hasSpice) {
      if (!rawSpice || rawLower === "none") spiceUI = "None";
      else if (rawLower === "mild") spiceUI = "Low";
      else if (rawLower === "hot") spiceUI = "High";
      else if (rawLower === "low") spiceUI = "Low";
      else if (rawLower === "medium") spiceUI = "Medium";
      else if (rawLower === "high") spiceUI = "High";
      else spiceUI = "Medium";
    }

    const sortUI =
      it?.sort_order != null && String(it.sort_order).trim() !== ""
        ? String(it.sort_order)
        : "1";

    return {
      item_name: it.item_name || "",
      category_name: it.category_name || "",
      description: it.description || "",

      actual_price: it.actual_price ?? "",
      discount_percentage: it.discount_percentage ?? "",
      tax_rate: it.tax_rate ?? "",
      stock_limit: it.stock_limit ?? "",

      // ✅ dropdown now
      sort_order: sortUI, // "1" | "2" | "3"

      is_available: Number(it.is_available) === 1,

      // ✅ dropdowns
      diet: hasVeg ? (Number(it.is_veg) === 1 ? "veg" : "nonveg") : "",
      spice: spiceUI, // "None" | "Low" | "Medium" | "High" | ""

      _hasVeg: hasVeg,
      _hasSpice: hasSpice,
    };
  }, [item]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
    setErr("");
  }, [initial]);

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // ✅ fetch categories
  useEffect(() => {
    let alive = true;

    async function loadCats() {
      setCatErr("");
      setCategories([]);

      if (!CATEGORY_ENDPOINT) {
        setCatErr("Missing env: VITE_CATEGORY_ENDPOINT");
        return;
      }
      if (!businessId) {
        setCatErr("Missing business_id in session.");
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const url = buildBizUrl(CATEGORY_ENDPOINT, businessId);

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

        const payload = await safeJson(res);

        if (!res.ok) {
          if (alive) {
            setCatErr(msg(payload) || `Category fetch failed (${res.status})`);
          }
          return;
        }

        const types = Array.isArray(payload?.types) ? payload.types : [];
        const kindWanted = isMart ? "mart" : "food";

        const names = types
          .filter((t) => {
            const k = String(t?.kind || "").toLowerCase();
            return k ? k === kindWanted : true;
          })
          .flatMap((t) => (Array.isArray(t?.categories) ? t.categories : []))
          .map((c) => String(c?.category_name || "").trim());

        const uniqueNames = uniq(names);

        if (alive) {
          setCategories(uniqueNames);

          setForm((prev) => {
            if (String(prev.category_name || "").trim()) return prev;
            if (uniqueNames.length === 0) return prev;
            return { ...prev, category_name: uniqueNames[0] };
          });
        }
      } catch (e) {
        if (alive && e?.name !== "AbortError") {
          setCatErr(e?.message || "Category network error");
        }
      } finally {
        if (alive) {
          setCatLoading(false);
        }
      }
    }

    loadCats();
    return () => {
      alive = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [CATEGORY_ENDPOINT, businessId, token, isMart]);

  function dietToIsVeg(diet) {
    if (diet === "veg") return 1;
    if (diet === "nonveg") return 0;
    return null;
  }

  function spiceToBackend(spice) {
    const s = String(spice || "").trim();
    if (!s) return "";
    const norm = s.toLowerCase();
    if (norm === "none") return "None";
    if (norm === "low") return "Low";
    if (norm === "medium") return "Medium";
    if (norm === "high") return "High";
    return "Medium";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!editBase) {
      setErr(
        isMart
          ? "Missing env: VITE_ITEM_EDIT"
          : "Missing env: VITE_FOOD_MENU_EDIT",
      );
      return;
    }
    if (!item?.id) {
      setErr("Missing item id.");
      return;
    }
    if (!String(form.item_name).trim()) {
      setErr("Item name is required.");
      return;
    }

    const url = buildUrl(editBase, item.id);

    const payload = {
      item_name: String(form.item_name).trim(),
      category_name: String(form.category_name || "").trim(),
      description: String(form.description || "").trim(),

      actual_price: toNumberOrNull(form.actual_price),
      discount_percentage: toNumberOrNull(form.discount_percentage),
      tax_rate: toNumberOrNull(form.tax_rate),
      stock_limit: toNumberOrNull(form.stock_limit),

      // ✅ dropdown 1/2/3
      sort_order: toNumberOrNull(form.sort_order),

      is_available: form.is_available ? 1 : 0,
    };

    if (form._hasVeg) {
      const isVeg = dietToIsVeg(form.diet);
      payload.is_veg = isVeg == null ? 0 : isVeg;
    }
    if (form._hasSpice) {
      payload.spice_level = spiceToBackend(form.spice);
    }

    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "PUT", // change to PATCH if needed
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        setErr(msg(out) || `Update failed (${res.status})`);
        return;
      }

      const updated = out?.data?.item || out?.data || out?.item || payload;
      onSaved?.({ ...item, ...updated });
    } catch (e2) {
      setErr(e2?.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ief" onSubmit={onSubmit}>
      {err ? <div className="iefErr">{err}</div> : null}

      <div className="iefGrid">
        <Field label="Item name" required>
          <input
            className="iefInput"
            value={form.item_name}
            onChange={(e) => setField("item_name", e.target.value)}
            placeholder="Item name"
          />
        </Field>

        <Field label="Category">
          <div className="iefSelectWrap">
            <select
              className="iefSelect"
              value={form.category_name}
              onChange={(e) => setField("category_name", e.target.value)}
              disabled={catLoading || categories.length === 0}
            >
              {catLoading ? (
                <option value="">Loading categories…</option>
              ) : categories.length === 0 ? (
                <option value="">
                  {catErr ? "No categories" : "No categories found"}
                </option>
              ) : (
                categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </div>

          {catErr ? <div className="iefHint err">{catErr}</div> : null}
        </Field>

        {form._hasVeg ? (
          <Field label="Diet">
            <div className="iefSelectWrap">
              <select
                className="iefSelect"
                value={form.diet}
                onChange={(e) => setField("diet", e.target.value)}
              >
                <option value="nonveg">Non-veg</option>
                <option value="veg">Veg</option>
              </select>
            </div>
          </Field>
        ) : null}

        {form._hasSpice ? (
          <Field label="Spice level">
            <div className="iefSelectWrap">
              <select
                className="iefSelect"
                value={form.spice}
                onChange={(e) => setField("spice", e.target.value)}
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </Field>
        ) : null}

        <Field label="Price (Nu.)">
          <input
            className="iefInput"
            value={form.actual_price}
            onChange={(e) => setField("actual_price", e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>

        <Field label="Stock limit">
          <input
            className="iefInput"
            value={form.stock_limit}
            onChange={(e) => setField("stock_limit", e.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </Field>

        <Field label="Discount (%)">
          <input
            className="iefInput"
            value={form.discount_percentage}
            onChange={(e) => setField("discount_percentage", e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <Field label="Tax rate (%)">
          <input
            className="iefInput"
            value={form.tax_rate}
            onChange={(e) => setField("tax_rate", e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        {/* ✅ Sort order dropdown (1/2/3) */}
        <Field label="Sort order">
          <div className="iefSelectWrap">
            <select
              className="iefSelect"
              value={form.sort_order}
              onChange={(e) => setField("sort_order", e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </Field>

        <div className="iefToggleRow">
          <label className="iefToggle">
            <input
              type="checkbox"
              checked={!!form.is_available}
              onChange={(e) => setField("is_available", e.target.checked)}
            />
            <span>Available</span>
          </label>
        </div>

        <Field label="Description" full>
          <textarea
            className="iefTextarea"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Description"
            rows={5}
          />
        </Field>
      </div>

      <div className="iefActions">
        <button
          type="button"
          className="iefBtn ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className="iefBtn" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children, full }) {
  return (
    <div className={`iefField ${full ? "full" : ""}`}>
      <div className="iefLabel">
        {label} {required ? <span className="iefReq">*</span> : null}
      </div>
      {children}
    </div>
  );
}
