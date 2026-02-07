import React, { useEffect, useMemo, useRef, useState } from "react";
import ItemEditForm from "./ItemEditForm";
import "./css/itemModal.css";

const FOOD_EDIT = import.meta.env.VITE_FOOD_MENU_EDIT; // e.g. https://.../food-menu/{id}
const MART_EDIT = import.meta.env.VITE_ITEM_EDIT; // e.g. https://.../mart-menu/{id}

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

export default function ItemDetailsModal({
  open,
  onClose,
  item,
  isMart,
  session,
  onUpdated,
  onDeleted,
}) {
  const [editing, setEditing] = useState(false);

  // ✅ preview url from edit form (replaces left image while editing)
  const [editPreviewUrl, setEditPreviewUrl] = useState("");

  // ✅ delete confirm (custom)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const safeItem = item || null;

  const token =
    session?.payload?.token?.access_token ||
    session?.payload?.data?.token?.access_token ||
    session?.payload?.access_token ||
    session?.payload?.data?.access_token ||
    null;

  const endpointBase = isMart ? MART_EDIT : FOOD_EDIT;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // reset when close
  useEffect(() => {
    if (!open) {
      setEditing(false);
      setEditPreviewUrl("");
      setConfirmOpen(false);
      setDeleting(false);
      setDeleteErr("");
    }
  }, [open]);

  const title = safeItem?.item_name || "Item details";
  const availability = Number(safeItem?.is_available) === 1;

  const leftImageUrl =
    editing && editPreviewUrl ? editPreviewUrl : safeItem?._imgUrl || "";

  const metaRows = useMemo(() => {
    if (!safeItem) return [];
    return [
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
  }, [safeItem, availability]);

  if (!open) return null;

  async function doDelete() {
    setDeleteErr("");

    const id = safeItem?.id;
    if (!id) {
      setDeleteErr("Missing item id.");
      return;
    }
    if (!endpointBase) {
      setDeleteErr(isMart ? "Missing env: VITE_ITEM_EDIT" : "Missing env: VITE_FOOD_MENU_EDIT");
      return;
    }

    const url = buildUrl(endpointBase, id);

    setDeleting(true);
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const out = await safeJson(res);

      if (!res.ok) {
        setDeleteErr(extractMessage(out) || `Delete failed (${res.status})`);
        return;
      }

      setConfirmOpen(false);
      onDeleted?.(safeItem);
      onClose?.();
    } catch (e) {
      setDeleteErr(e?.message || "Network error while deleting.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
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
                <>
                  <button
                    type="button"
                    className="imBtn"
                    onClick={() => {
                      setEditing(true);
                      setEditPreviewUrl("");
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="imBtn danger"
                    onClick={() => {
                      setDeleteErr("");
                      setConfirmOpen(true);
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="imBtn ghost"
                  onClick={() => {
                    setEditing(false);
                    setEditPreviewUrl("");
                  }}
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
            <div className="imLeft">
              <div className="imImageWrap">
                {leftImageUrl ? (
                  <img className="imImage" src={leftImageUrl} alt={title} />
                ) : (
                  <div className="imImageFallback">No image</div>
                )}
              </div>
            </div>

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
                  onCancel={() => {
                    setEditing(false);
                    setEditPreviewUrl("");
                  }}
                  onImagePreviewChange={(url) => setEditPreviewUrl(url || "")}
                  onSaved={(updated) => {
                    onUpdated?.(updated);
                    setEditing(false);
                    setEditPreviewUrl("");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FIXED CONFIRM OVERLAY (always centered, never at bottom) */}
      {confirmOpen ? (
        <div
          className="imConfirmOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onMouseDown={() => !deleting && setConfirmOpen(false)}
        >
          <div className="imConfirmCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="imConfirmTitle">Delete this item?</div>
            <div className="imConfirmText">
              This action cannot be undone. Are you sure you want to delete{" "}
              <b>{title}</b>?
            </div>

            {deleteErr ? <div className="imConfirmError">{deleteErr}</div> : null}

            <div className="imConfirmActions">
              <button
                type="button"
                className="imBtn ghost"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="imBtn danger"
                disabled={deleting}
                onClick={doDelete}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
