// src/tabs/components/additems/AddItemsPage.jsx
import React from "react";
import "./css/additems.css";
import ItemForm from "./ItemForm";

export default function AddItemsPage({ session }) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  const businessId =
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null;

  const ownerType =
    payload?.merchant_session?.owner_type ||
    payload?.merchant_login?.owner_type ||
    user?.owner_type ||
    payload?.owner_type ||
    "";

  //   const businessName = user?.business_name || "Merchant";

  return (
    <div className="aiWrap">
      {/* <div className="aiHeaderRow">
        <div className="aiBizChip" title={businessName}>
          {businessName}
        </div>
      </div> */}

      <div className="aiCard">
        <ItemForm
          token={token}
          businessId={businessId}
          ownerTypeFromSession={ownerType}
        />
      </div>
    </div>
  );
}
