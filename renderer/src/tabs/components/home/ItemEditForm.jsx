import React from "react";
import "./css/itemModal.css";

const CATEGORY_ENDPOINT = import.meta.env.VITE_CATEGORY_ENDPOINT; // .../category/business/{business_id}
const FOOD_EDIT = import.meta.env.VITE_FOOD_MENU_EDIT; // .../food-menu/{id}
const MART_EDIT = import.meta.env.VITE_ITEM_EDIT; // .../mart-menu/{id}

function buildUrl(base, id) {
  if (!base) return "";
  if (base.includes("{id}")) return base.replace("{id}", String(id));
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

export default function ItemEditForm({
  item,
  isMart,
  session,
  onCancel,
  onSaved,
  onImagePreviewChange,
}) {
  const fileRef = React.useRef(null);

  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || {};
  const businessId = user?.business_id ?? null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  const endpointBase = isMart ? MART_EDIT : FOOD_EDIT;

  const [catLoading, setCatLoading] = React.useState(false);
  const [catErr, setCatErr] = React.useState("");
  const [categories, setCategories] = React.useState([]);

  const [itemName, setItemName] = React.useState(item?.item_name || "");
  const [description, setDescription] = React.useState(item?.description || "");
  const [categoryId, setCategoryId] = React.useState(item?.category_id || "");

  const [price, setPrice] = React.useState(item?.actual_price ?? "");
  const [discount, setDiscount] = React.useState(item?.discount_percentage ?? "");
  const [taxRate, setTaxRate] = React.useState(item?.tax_rate ?? "");
  const [stock, setStock] = React.useState(item?.stock_limit ?? "");

  const [sortOrder, setSortOrder] = React.useState(
    item?.sort_order != null ? String(item.sort_order) : "1",
  );

  const [availability, setAvailability] = React.useState(
    Number(item?.is_available) === 1 ? "1" : "0",
  );

  const [veg, setVeg] = React.useState(
    item?.is_veg == null ? "" : Number(item.is_veg) === 1 ? "1" : "0",
  );

  const spiceInit =
    item?.spice_level != null && String(item.spice_level).trim() !== ""
      ? String(item.spice_level)
      : "None";
  const [spiceLevel, setSpiceLevel] = React.useState(spiceInit);

  const [imageFile, setImageFile] = React.useState(null);

  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  // categories
  React.useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

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

      const url = CATEGORY_ENDPOINT.replace("{business_id}", String(businessId));

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

        const out = await safeJson(res);

        if (!res.ok) {
          if (!alive) return;
          setCatErr(extractMessage(out) || `Category fetch failed (${res.status})`);
          return;
        }

        const types = out?.types || out?.data?.types || [];
        const flat = [];
        (Array.isArray(types) ? types : []).forEach((t) => {
          const cats = t?.categories || [];
          (Array.isArray(cats) ? cats : []).forEach((c) => {
            if (c?.id && c?.category_name) flat.push({ id: c.id, category_name: c.category_name });
          });
        });

        const byId = new Map();
        flat.forEach((c) => byId.set(String(c.id), c));
        const list = Array.from(byId.values()).sort((a, b) =>
          String(a.category_name).localeCompare(String(b.category_name)),
        );

        if (!alive) return;
        setCategories(list);

        if (!categoryId && item?.category_name) {
          const found = list.find(
            (x) => String(x.category_name).toLowerCase() === String(item.category_name).toLowerCase(),
          );
          if (found) setCategoryId(String(found.id));
        }
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setCatErr(e?.message || "Category network error");
      } finally {
        if (alive) setCatLoading(false);
      }
    }

    loadCats();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [businessId, token, categoryId, item?.category_name]);

  // image preview => left side
  React.useEffect(() => {
    if (!imageFile) {
      onImagePreviewChange?.("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    onImagePreviewChange?.(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, onImagePreviewChange]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const id = item?.id;
    if (!id) return setErr("Missing item id.");
    if (!endpointBase)
      return setErr(isMart ? "Missing env: VITE_ITEM_EDIT" : "Missing env: VITE_FOOD_MENU_EDIT");

    const nm = String(itemName || "").trim();
    if (!nm) return setErr("Item name is required.");
    if (!categoryId) return setErr("Category is required.");

    const url = buildUrl(endpointBase, id);

    const fd = new FormData();
    fd.append("item_name", nm);
    fd.append("description", String(description || ""));
    fd.append("category_id", String(categoryId));
    fd.append("is_available", String(availability));

    if (String(price).trim() !== "") fd.append("actual_price", String(price));
    if (String(discount).trim() !== "") fd.append("discount_percentage", String(discount));
    if (String(taxRate).trim() !== "") fd.append("tax_rate", String(taxRate));
    if (String(stock).trim() !== "") fd.append("stock_limit", String(stock));
    if (String(sortOrder).trim() !== "") fd.append("sort_order", String(sortOrder));

    fd.append("spice_level", String(spiceLevel || "None"));
    if (veg !== "") fd.append("is_veg", String(veg));

    if (imageFile) fd.append("item_image", imageFile);

    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Update failed (${res.status})`);
        return;
      }

      const updated = out?.data || out?.item || out;
      onSaved?.(updated || item);
    } catch (e) {
      setErr(e?.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="imForm" onSubmit={onSubmit}>
      {err ? <div className="imFormError">{err}</div> : null}

      <div className="imGrid">
        <div className="imField imFieldFull">
          <label className="imLabelSm">Item name</label>
          <input className="imInput" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </div>

        <div className="imField imFieldFull">
          <label className="imLabelSm">Category</label>
          <select
            className="imSelect"
            value={String(categoryId || "")}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={catLoading}
          >
            <option value="">{catLoading ? "Loading categories..." : "Select category"}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.category_name}
              </option>
            ))}
          </select>
          {catErr ? <div className="imHintErr">{catErr}</div> : null}
        </div>

        <div className="imField">
          <label className="imLabelSm">Price</label>
          <input className="imInput" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>

        <div className="imField">
          <label className="imLabelSm">Tax rate (%)</label>
          <input className="imInput" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </div>

        <div className="imField">
          <label className="imLabelSm">Discount (%)</label>
          <input
            className="imInput"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        <div className="imField">
          <label className="imLabelSm">Stock</label>
          <input className="imInput" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>

        <div className="imField">
          <label className="imLabelSm">Sort order</label>
          <select className="imSelect" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        <div className="imField">
          <label className="imLabelSm">Availability</label>
          <select
            className="imSelect"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="1">Available</option>
            <option value="0">Unavailable</option>
          </select>
        </div>

        <div className="imField">
          <label className="imLabelSm">Veg / Non-veg</label>
          <select className="imSelect" value={veg} onChange={(e) => setVeg(e.target.value)}>
            <option value="">—</option>
            <option value="1">Veg</option>
            <option value="0">Non-veg</option>
          </select>
        </div>

        <div className="imField">
          <label className="imLabelSm">Spice level</label>
          <select className="imSelect" value={spiceLevel} onChange={(e) => setSpiceLevel(e.target.value)}>
            <option value="None">None</option>
            <option value="Low">Low</option>
            <option value="Mid">Mid</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="imField imFieldFull">
          <label className="imLabelSm">Description</label>
          <textarea
            className="imTextarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        {/* ✅ only button, no native file input UI */}
        <div className="imField imFieldFull">
          <label className="imLabelSm">Item image</label>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="imFileHidden"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />

          <div className="imUploadRow">
            <button
              type="button"
              className="imBtn ghost"
              onClick={() => fileRef.current?.click?.()}
            >
              Choose image
            </button>

            {imageFile ? (
              <>
                <div className="imFileName" title={imageFile.name}>
                  {imageFile.name}
                </div>
                <button
                  type="button"
                  className="imBtn ghost"
                  onClick={() => {
                    setImageFile(null);
                    onImagePreviewChange?.("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </>
            ) : (
              <div className="imFileName muted">No file chosen</div>
            )}
          </div>

          <div className="imHint">Preview will appear on the left image automatically.</div>
        </div>
      </div>

      <div className="imFormActions">
        <button type="button" className="imBtn ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="imBtn" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
