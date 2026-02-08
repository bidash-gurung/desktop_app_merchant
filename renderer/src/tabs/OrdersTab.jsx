import React from "react";
import OrdersPage from "./components/orders/OrdersPage";

export default function OrdersTab({ session }) {
  return <OrdersPage session={session} />;
}
