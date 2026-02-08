import React, { useMemo } from "react";
import "./css/orderModal.css";
import { moneyNu, resolveOrderItemImage, shortStatusLabel } from "./ordersUtils";

function Pill({ status }) {
  const s = String(status || "").toUpperCase();
  return <span className={`omPill s_${s}`}>{shortStatusLabel(s)}</span>;
}

export default function OrderDetailsModal({ open, order, onClose }) {
  const o = order || null;
  if (!open || !o) return null;

  const user = o?._user || {};
  const items = Array.isArray(o?.items) ? o.items : [];

  const totals = o?.totals || {};
  const address = o?.deliver_to?.address || "—";

  const rows = useMemo(() => {
    return items.map((it, idx) => {
      const img = resolveOrderItemImage(o, it);
      return {
        key: `${it?.item_id || idx}`,
        img,
        name: it?.item_name || "Item",
        qty: Number(it?.quantity) || 0,
        price: moneyNu(it?.price),
        subtotal: moneyNu(it?.subtotal),
      };
    });
  }, [items, o]);

  return (
    <div className="omOverlay" onMouseDown={onClose}>
      <div className="omModal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="omHeader">
          <div className="omHeaderLeft">
            <div className="omTitle">{o?.order_id || "Order"}</div>
            <Pill status={o?.status} />
          </div>

          <button type="button" className="omX" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="omBody">
          <div className="omGridTop">
            <div className="omCard">
              <div className="omCardTitle">Customer</div>
              <div className="omStrong">{user?.name || "—"}</div>
              <div className="omMuted">{user?.phone || "—"}</div>
              <div className="omMuted">{user?.email || "—"}</div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Order Info</div>
              <div className="omKV">
                <span>Service</span>
                <b>{String(o?.service_type || "—").toUpperCase()}</b>
              </div>
              <div className="omKV">
                <span>Payment</span>
                <b>{o?.payment_method || "—"}</b>
              </div>
              <div className="omKV">
                <span>Fulfillment</span>
                <b>{o?.fulfillment_type || "—"}</b>
              </div>
              <div className="omKV">
                <span>Priority</span>
                <b>{Number(o?.priority) || 0}</b>
              </div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Delivery</div>
              <div className="omKVBlock">
                <b>Address</b>
                <div className="omMuted">{address}</div>
              </div>
            </div>
          </div>

          <div className="omGridMid">
            <div className="omCard">
              <div className="omCardTitle">Totals</div>
              <div className="omMoneyGrid">
                <div>Items total</div>
                <b>{moneyNu(totals?.total_amount)}</b>

                <div>Discount</div>
                <b>{moneyNu(totals?.discount_amount)}</b>

                <div>Delivery fee</div>
                <b>{moneyNu(totals?.delivery_fee)}</b>

                <div>Platform fee</div>
                <b>{moneyNu(totals?.platform_fee)}</b>

                <div>Merchant delivery</div>
                <b>{moneyNu(totals?.merchant_delivery_fee)}</b>
              </div>
            </div>

            <div className="omCard">
              <div className="omCardTitle">Notes</div>
              <div className="omKVBlock">
                <b>Note</b>
                <div className="omMuted">{o?.note_for_restaurant || "—"}</div>
              </div>
              <div className="omKVBlock" style={{ marginTop: 10 }}>
                <b>If unavailable</b>
                <div className="omMuted">{o?.if_unavailable || "—"}</div>
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
