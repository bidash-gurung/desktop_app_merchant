// renderer/src/tabs/components/banners/BannerPage.jsx
import React from "react";
import BannerCard from "./BannerCard.jsx";
import BannerFormModal from "./BannerFormModal.jsx";
import PaymentModal from "./PaymentModal.jsx";
import {
  getSessionMeta,
  listBannersByBusiness,
  createBanner,
  updateBanner,
  deleteBanner,
} from "./bannerApi";
import {
  PrimaryButton,
  SecondaryButton,
  InlineAlert,
  LoaderLine,
  EmptyState,
} from "./ui.jsx";

export default function BannerPage({ session }) {
  const { userId, businessId, user } = React.useMemo(
    () => getSessionMeta(session),
    [session],
  );

  const businessName = user?.business_name || "Merchant";
  const ownerType = String(user?.owner_type || "").toLowerCase(); // "food" | "mart"

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  // ✅ NEW: success message
  const [okMsg, setOkMsg] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);

  const [payOpen, setPayOpen] = React.useState(false);
  const [payData, setPayData] = React.useState(null);

  const [busyId, setBusyId] = React.useState(null);

  const reload = React.useCallback(async () => {
    setErr("");
    // keep success visible until next action, but you can clear if you want:
    // setOkMsg("");

    if (!businessId) {
      setItems([]);
      setErr("Missing business_id in session.");
      return;
    }

    let alive = true;
    const ctrl = new AbortController();

    setLoading(true);
    try {
      const list = await listBannersByBusiness({
        session,
        businessId,
        ownerType: null,
        signal: ctrl.signal,
      });

      if (!alive) return;
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      if (!alive) return;
      setErr(e?.message || "Failed to load banners.");
      setItems([]);
    } finally {
      if (alive) setLoading(false);
    }

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [session, businessId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function onCreateSubmit(form) {
    setErr("");
    setOkMsg("");

    const out = await createBanner({ session, form });

    if (out?.payment) {
      setPayData(out.payment);
      setPayOpen(true);
      setOkMsg(
        out?.message || "Banner created successfully and payment processed.",
      );
    } else {
      setOkMsg(out?.message || "Banner created successfully.");
    }

    setCreateOpen(false);
    await reload();
    return out;
  }

  async function onEditSubmit(form) {
    if (!editItem?.id) throw new Error("Missing banner id");

    setErr("");
    setOkMsg("");

    const out = await updateBanner({
      session,
      id: editItem.id,
      form,
    });

    if (out?.payment) {
      setPayData(out.payment);
      setPayOpen(true);
      setOkMsg(out?.message || "Banner updated and payment processed.");
    } else {
      setOkMsg(out?.message || "Banner updated successfully.");
    }

    setEditOpen(false);
    setEditItem(null);
    await reload();
    return out;
  }

  async function onDelete(item) {
    // keep your confirm behavior if you want a custom one later;
    // leaving this as-is for now.
    const ok = window.confirm(
      `Delete banner #${item?.id}? This cannot be undone.`,
    );
    if (!ok) return;

    setBusyId(item?.id || "x");
    setErr("");
    setOkMsg("");

    try {
      const out = await deleteBanner({ session, id: item.id });
      setOkMsg(out?.message || "Banner deleted successfully.");
      await reload();
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bnWrap">
      <div className="bnHeader">
        <div>
          <div className="bnTitle">Banners</div>
          <div className="bnSub">
            Managing banners for <b>{businessName}</b>
          </div>
        </div>

        <div className="bnHeaderRight">
          <SecondaryButton onClick={reload} disabled={loading}>
            Refresh
          </SecondaryButton>
          <PrimaryButton onClick={() => setCreateOpen(true)} disabled={loading}>
            + New banner
          </PrimaryButton>
        </div>
      </div>

      <LoaderLine show={loading} />

      {okMsg ? (
        <div style={{ marginTop: 12 }}>
          <InlineAlert tone="success" title="Success">
            {okMsg}
          </InlineAlert>
        </div>
      ) : null}

      {err ? (
        <div style={{ marginTop: 12 }}>
          <InlineAlert tone="danger" title="Error">
            {err}
          </InlineAlert>
        </div>
      ) : null}

      <div className="bnList">
        {!loading && items.length === 0 ? (
          <EmptyState
            title="No banners yet"
            desc="Create your first banner to promote offers."
            action={
              <PrimaryButton onClick={() => setCreateOpen(true)}>
                + New banner
              </PrimaryButton>
            }
          />
        ) : null}

        {items.map((it) => (
          <BannerCard
            key={it.id}
            item={it}
            busy={busyId === it.id}
            onEdit={(x) => {
              setEditItem(x);
              setEditOpen(true);
            }}
            onDelete={onDelete}
          />
        ))}
      </div>

      <BannerFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        initial={{
          owner_type: ownerType || "food",
        }}
        session={session}
        userId={userId}
        businessId={businessId}
        onSubmit={onCreateSubmit}
      />

      <BannerFormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        mode="edit"
        initial={editItem}
        session={session}
        userId={userId}
        businessId={businessId}
        onSubmit={onEditSubmit}
      />

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        payment={payData}
      />
    </div>
  );
}
