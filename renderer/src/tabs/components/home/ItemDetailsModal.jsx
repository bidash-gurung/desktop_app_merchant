// tabs/components/home/ItemDetailsModal.jsx
// ✅ Description moved to right under table; left side is only image.
// ✅ Values not bold (handled by CSS: .imVal font-weight 500)

import React, { useEffect, useMemo, useState } from "react";
import ItemEditForm from "./ItemEditForm";
import "./css/itemModal.css";

export default function ItemDetailsModal({
  open,
  onClose,
  item,
  isMart,
  session,
  onUpdated,
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const safeItem = item || null;
  const title = safeItem?.item_name || "Item details";
  const availability = Number(safeItem?.is_available) === 1;

  const metaRows = useMemo(() => {
    if (!safeItem) return [];
    const rows = [
      ["Category", safeItem?.category_name || "—"],
      [
        "Price",
        safeItem?.actual_price != null && String(safeItem.actual_price) !== ""
          ? `Nu. ${safeItem.actual_price}`
          : "—",
      ],
      [
        "Discount",
        safeItem?.discount_percentage != null &&
        String(safeItem.discount_percentage) !== ""
          ? `${safeItem.discount_percentage}%`
          : "—",
      ],
      [
        "Tax",
        safeItem?.tax_rate != null && String(safeItem.tax_rate) !== ""
          ? `${safeItem.tax_rate}%`
          : "—",
      ],
      [
        "Stock",
        safeItem?.stock_limit != null && String(safeItem.stock_limit) !== ""
          ? String(safeItem.stock_limit)
          : "—",
      ],
      [
        "Sort order",
        safeItem?.sort_order != null && String(safeItem.sort_order) !== ""
          ? String(safeItem.sort_order)
          : "—",
      ],
      ["Availability", availability ? "Available" : "Unavailable"],
      [
        "Spice level",
        safeItem?.spice_level ? String(safeItem.spice_level) : "—",
      ],
      [
        "Veg",
        safeItem?.is_veg != null
          ? Number(safeItem.is_veg) === 1
            ? "Yes"
            : "No"
          : "—",
      ],
    ];
    return rows;
  }, [safeItem, availability]);

  // Reset editing state when modal closes
  if (!open) {
    if (editing) setEditing(false);
    return null;
  }

  return (
    <div className="imOverlay" onMouseDown={onClose}>
      <div
        className="imModal"
        role="dialog"
        aria-modal="true"
        aria-label="Item details"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="imHeader">
          <div className="imHeaderLeft">
            <div className="imTitle" title={title}>
              {title}
            </div>
            <div className={`imStatus ${availability ? "ok" : "bad"}`}>
              {availability ? "AVAILABLE" : "UNAVAILABLE"}
            </div>
          </div>

          <div className="imHeaderActions">
            {!editing ? (
              <button
                type="button"
                className="imBtn"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                className="imBtn ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              className="imX"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="imBody">
          {/* ✅ LEFT: only image (covers left side) */}
          <div className="imLeft">
            <div className="imImageWrap">
              {safeItem?._imgUrl ? (
                <img className="imImage" src={safeItem._imgUrl} alt={title} />
              ) : (
                <div className="imImageFallback">No image</div>
              )}
            </div>
          </div>

          {/* ✅ RIGHT: table + description under it OR edit form */}
          <div className="imRight">
            {!editing ? (
              <>
                <div className="imMeta">
                  {metaRows.map(([k, v]) => (
                    <div key={k} className="imRow">
                      <div className="imKey">{k}</div>
                      <div className="imVal">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="imDesc">
                  <div className="imLabel">Description</div>
                  <div className="imDescText">
                    {safeItem?.description ? safeItem.description : "—"}
                  </div>
                </div>
              </>
            ) : (
              <ItemEditForm
                item={safeItem}
                isMart={isMart}
                session={session}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  onUpdated?.(updated);
                  setEditing(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
