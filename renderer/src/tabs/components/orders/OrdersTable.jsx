import React, { useMemo } from "react";
import "./css/ordersTable.css";
import {
  moneyNu,
  pickFirstItem,
  itemsCount,
  resolveOrderItemImage,
  resolveScheduledItemImage,
  shortStatusLabel,
} from "./ordersUtils";

function Badge({ status }) {
  const s = String(status || "").toUpperCase();
  return <span className={`otbBadge s_${s}`}>{shortStatusLabel(s)}</span>;
}

export default function OrdersTable({ mode, loading, rows, onRowClick }) {
  const hasRows = (rows || []).length > 0;

  const prepared = useMemo(() => {
    if (mode === "SCHEDULED") {
      return (rows || []).map((job) => {
        const p = job?.order_payload || {};
        const thumb = resolveScheduledItemImage(job);
        const total = moneyNu(p?.total_amount);
        return {
          _key: job?.job_id,
          thumb,
          orderId: job?.job_id,
          status: "SCHEDULED",
          customer: job?.name || "—",
          phone: p?.phone || "—",
          service: p?.service_type || "—",
          payment: p?.payment_method || "—",
          fulfillment: p?.fulfillment_type || "—",
          address: p?.delivery_address?.address || "—",
          total,
          raw: job,
        };
      });
    }

    return (rows || []).map((o) => {
      const first = pickFirstItem(o);
      const thumb = first ? resolveOrderItemImage(o, first) : "";
      const total = moneyNu(o?.totals?.total_amount);
      return {
        _key: o?.order_id,
        thumb,
        orderId: o?.order_id,
        status: o?.status,
        statusReason: o?.status_reason || "",
        customer: o?._user?.name || "—",
        phone: o?._user?.phone || "—",
        service: o?.service_type || "—",
        payment: o?.payment_method || "—",
        fulfillment: o?.fulfillment_type || "—",
        items: itemsCount(o),
        address: o?.deliver_to?.address || "—",
        total,
        raw: o,
      };
    });
  }, [mode, rows]);

  if (loading && !hasRows) {
    return (
      <div className="otbEmpty">
        <div className="otbSkelLine" />
        <div className="otbSkelLine" />
        <div className="otbSkelLine" />
      </div>
    );
  }

  if (!hasRows) {
    return <div className="otbEmpty">No orders match your search.</div>;
  }

  return (
    <div className="otbTableWrap">
      <table className="otbTable">
        <thead>
          <tr>
            <th style={{ width: 220 }}>Order</th>
            <th style={{ width: 170 }}>Status</th>
            <th style={{ width: 220 }}>Customer</th>
            <th style={{ width: 120 }}>Service</th>
            <th style={{ width: 130 }}>Payment</th>
            <th style={{ width: 140 }}>Fulfillment</th>
            <th>Address</th>
            <th style={{ width: 140, textAlign: "right" }}>Total</th>
          </tr>
        </thead>

        <tbody>
          {prepared.map((r) => (
            <tr
              key={r._key}
              className="otbRow"
              onClick={() => onRowClick?.(r.raw)}
              title="Click to view details"
            >
             

              <td>
                <div className="otbOrderId">{r.orderId}</div>
                {mode === "NORMAL" ? (
                  <div className="otbSubText">{r.statusReason || "—"}</div>
                ) : (
                  <div className="otbSubText">Scheduled order</div>
                )}
              </td>

              <td>
                <Badge status={mode === "SCHEDULED" ? "SCHEDULED" : r.status} />
              </td>

              <td>
                <div className="otbCustomer">{r.customer}</div>
                <div className="otbSubText">{r.phone}</div>
              </td>

              <td>{String(r.service || "—").toUpperCase()}</td>
              <td>{String(r.payment || "—")}</td>
              <td>{String(r.fulfillment || "—")}</td>
              <td className="otbAddr">{r.address}</td>
              <td className="otbMoney">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
