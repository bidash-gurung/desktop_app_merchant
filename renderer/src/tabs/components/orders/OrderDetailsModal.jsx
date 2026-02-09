import React, { useMemo } from "react";
import "./css/orderModal.css";
import {
  moneyNu,
  resolveOrderItemImage,
  shortStatusLabel,
} from "./ordersUtils";

function Pill({ status }) {
  const s = String(status || "").toUpperCase();
  return <span className={`omPill s_${s}`}>{shortStatusLabel(s)}</span>;
}

function safeText(v) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

export default function OrderDetailsModal({ open, order, onClose }) {
  const o = order || null;
  if (!open || !o) return null;

  const user = o?._user || {};
  const items = Array.isArray(o?.items) ? o.items : [];

  const totals = o?.totals || {};
  const deliverTo = o?.deliver_to || {};

  // Order info fields (shown in Order Info card)
  const address = safeText(deliverTo?.address);
  const floorUnit = safeText(deliverTo?.delivery_floor_unit);
  const instruction = safeText(deliverTo?.delivery_instruction_note);
  const dropMode = safeText(deliverTo?.delivery_special_mode);

  const note = safeText(o?.note_for_restaurant);
  const ifUnavailable = safeText(o?.if_unavailable);

  // ✅ use new top-level items_total first (fallback to sum)
  const itemsTotal =
    o?.items_total != null
      ? o.items_total
      : items.reduce((sum, it) => {
          const n = Number(it?.subtotal ?? it?.price ?? 0);
          return sum + (Number.isFinite(n) ? n : 0);
        }, 0);

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

  const headerCustomerName = safeText(user?.name);
  const headerCustomerPhone = safeText(user?.phone);

  return (
    <div className="omOverlay" onMouseDown={onClose}>
      <div
        className="omModal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header (top bar) */}
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
          {/* Only: Order Info + Totals */}
          <div className="omGridTwo">
            {/* Order Info */}
            <div className="omCard">
              <div className="omCardTitle">Order Info</div>

              <div className="omKV">
                <span>Service</span>
                <b>{safeText(o?.service_type).toUpperCase()}</b>
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

            {/* Totals */}
            <div className="omCard">
              <div className="omCardTitle">Totals</div>

              <div className="omMoneyGrid">
                <div>Items total</div>
                <b>{moneyNu(itemsTotal)}</b>

                <div>Discount</div>
                <b>{moneyNu(totals?.discount_amount)}</b>

                <div>Delivery fee</div>
                <b>{moneyNu(totals?.delivery_fee)}</b>

                <div>Platform fee</div>
                <b>{moneyNu(totals?.platform_fee)}</b>

                <div>Merchant delivery</div>
                <b>{moneyNu(totals?.merchant_delivery_fee)}</b>

                <div className="omTotalLabel">Total amount</div>
                <b className="omTotalValue">{moneyNu(totals?.total_amount)}</b>
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
            </div>
          </div>

          {/* Items */}
          <div className="omCard">
            <div className="omCardTitle">Items</div>

            <div className="omItems">
              {rows.length === 0 ? (
                <div className="omMuted">No items</div>
              ) : (
                rows.map((r) => (
                  <div key={r.key} className="omItemRow">
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="omFooter">
          <button type="button" className="omBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
