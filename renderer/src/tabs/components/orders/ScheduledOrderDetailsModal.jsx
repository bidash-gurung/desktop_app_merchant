import React, { useMemo } from "react";
import "./css/orderModal.css";
import { moneyNu, resolveScheduledItemImage } from "./ordersUtils";

export default function ScheduledOrderDetailsModal({ open, job, onClose }) {
  const j = job || null;
  if (!open || !j) return null;

  const p = j?.order_payload || {};
  const items = Array.isArray(p?.items) ? p.items : [];

  const thumb = resolveScheduledItemImage(j);

  const rows = useMemo(() => {
    return items.map((it, idx) => ({
      key: `${idx}`,
      img:
        it?.item_image
          ? // scheduled prefixes are handled for first image; for per-item also keep safe:
            thumb
          : thumb,
      name: it?.item_name || "Item",
      qty: Number(it?.quantity) || 0,
      price: moneyNu(it?.price),
      subtotal: moneyNu(it?.subtotal),
    }));
  }, [items, thumb]);

  return (
    <div className="omOverlay" onMouseDown={onClose}>
      <div className="omModal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="omHeader">
          <div className="omHeaderLeft">
            <div className="omTitle">{j?.job_id || "Scheduled"}</div>
            <span className="omPill s_SCHEDULED">Scheduled</span>
          </div>

          <button type="button" className="omX" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="omBody">
          <div className="omGridTop">
            <div className="omCard">
              <div className="omCardTitle">Customer</div>
              <div className="omStrong">{j?.name || "—"}</div>
              <div className="omMuted">User ID: {j?.user_id ?? "—"}</div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Order Info</div>
              <div className="omKV">
                <span>Service</span>
                <b>{String(p?.service_type || "—").toUpperCase()}</b>
              </div>
              <div className="omKV">
                <span>Payment</span>
                <b>{p?.payment_method || "—"}</b>
              </div>
              <div className="omKV">
                <span>Fulfillment</span>
                <b>{p?.fulfillment_type || "—"}</b>
              </div>
              <div className="omKV">
                <span>Scheduled</span>
                <b>{j?.scheduled_at_local ? String(j.scheduled_at_local) : "—"}</b>
              </div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Delivery</div>
              <div className="omKVBlock">
                <b>Address</b>
                <div className="omMuted">{p?.delivery_address?.address || "—"}</div>
              </div>
            </div>
          </div>

          <div className="omGridMid">
            <div className="omCard">
              <div className="omCardTitle">Totals</div>
              <div className="omMoneyGrid">
                <div>Total</div>
                <b>{moneyNu(p?.total_amount)}</b>

                <div>Discount</div>
                <b>{moneyNu(p?.discount_amount)}</b>

                <div>Delivery fee</div>
                <b>{moneyNu(p?.delivery_fee)}</b>

                <div>Platform fee</div>
                <b>{moneyNu(p?.platform_fee)}</b>

                <div>Merchant delivery</div>
                <b>{moneyNu(p?.merchant_delivery_fee)}</b>
              </div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Notes</div>
              <div className="omKVBlock">
                <b>Note</b>
                <div className="omMuted">{p?.note_for_restaurant || "—"}</div>
              </div>
              <div className="omKVBlock" style={{ marginTop: 10 }}>
                <b>If unavailable</b>
                <div className="omMuted">{p?.if_unavailable || "—"}</div>
              </div>
            </div>
          </div>

          <div className="omCard">
            <div className="omCardTitle">Items</div>
            <div className="omItems">
              {rows.length === 0 ? (
                <div className="omMuted">No items</div>
              ) : (
                rows.map((r) => (
                  <div key={r.key} className="omItemRow">
                    <div className="omItemThumb">
                      {r.img ? <img src={r.img} alt="" /> : <div className="omNoImg">No image</div>}
                    </div>

                    <div className="omItemMain">
                      <div className="omItemName">{r.name}</div>
                      <div className="omItemMeta">
                        Qty: <b>{r.qty}</b> • Price: <b>{r.price}</b> • Subtotal: <b>{r.subtotal}</b>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="omFooter">
          <button type="button" className="omBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
