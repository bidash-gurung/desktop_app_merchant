// renderer/src/tabs/components/banners/PaymentModal.jsx
import React from "react";
import { Modal, SecondaryButton, fmtNu } from "./ui.jsx";

function asRows(payment) {
  if (!payment) return [];

  if (payment.Amount || payment["Jrnl No"]) {
    return Object.entries(payment).map(([k, v]) => [k, String(v ?? "—")]);
  }

  const amount = payment.amount != null ? fmtNu(payment.amount) : "—";
  return [
    ["Amount", amount],
    ["Jrnl No", payment.journal_code || "—"],
    ["From Account", payment.debited_from_wallet || "—"],
    ["To Account", payment.credited_to_wallet || "—"],
    ["DR Txn", payment.debit_txn_id || "—"],
  ];
}

export default function PaymentModal({
  open,
  onClose,
  payment,
  title = "Payment receipt",
}) {
  const rows = asRows(payment);

  return (
    <Modal
      open={open}
      title={title}
      subtitle="Saved to your wallet transactions"
      onClose={onClose}
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}
    >
      <div className="bnReceipt">
        {rows.map(([k, v]) => (
          <div className="bnReceiptRow" key={k}>
            <div className="bnReceiptK">{k}</div>
            <div className="bnReceiptV">{v}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
