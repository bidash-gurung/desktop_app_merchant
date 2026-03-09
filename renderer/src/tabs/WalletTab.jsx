// src/tabs/WalletTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./components/wallets/css/wallet.css";

import WalletOverviewCard from "./components/wallets/WalletOverviewCard";
import TransactionHistoryCard from "./components/wallets/TransactionHistoryCard";
import SendMoneyModal from "./components/wallets/SendMoneyModal";
import ForgotTpinModal from "./components/wallets/ForgotTpinModal";
import CreateTpinCard from "./components/wallets/CreateTpinCard";
import ChangeTpinModal from "./components/wallets/ChangeTpinModal"; // ✅ NEW

import {
  extractMessage,
  safeJson,
  buildUrl,
  moneyNu,
  clampNum,
} from "./components/wallets/walletUtils";

import {
  WALLET_ENDPOINT,
  CREATE_WALLET_ENDPOINT,
  HAS_TPIN_ENDPOINT,
} from "./components/wallets/walletApi";

export default function WalletTab({ session }) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const userId = user?.user_id ?? user?.id ?? null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [wallet, setWallet] = useState(null);
  const [walletStatus, setWalletStatus] = useState("unknown"); // unknown | none | exists

  const [hasTpin, setHasTpin] = useState(null); // null unknown, true/false
  const [checkingTpin, setCheckingTpin] = useState(false);

  const [busyCreateWallet, setBusyCreateWallet] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false); // ✅ NEW

  const balanceText = useMemo(() => {
    const amt = clampNum(wallet?.amount, 0);
    return moneyNu(amt);
  }, [wallet]);

  async function loadWalletAndTpin() {
    setErr("");
    setLoading(true);
    setWallet(null);
    setWalletStatus("unknown");
    setHasTpin(null);

    try {
      if (!userId) {
        setErr("Missing user_id in merchant session.");
        setWalletStatus("none");
        return;
      }
      if (!WALLET_ENDPOINT) {
        setErr("Missing env: VITE_WALLET_ENDPOINT");
        setWalletStatus("none");
        return;
      }

      // 1) Fetch wallet by user_id
      const url = buildUrl(WALLET_ENDPOINT, userId);
      const res = await fetch(url, { method: "GET", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        if (res.status === 404) {
          setWalletStatus("none");
          setWallet(null);
          setHasTpin(null);
          return;
        }

        setWalletStatus("none");
        setWallet(null);
        setErr(extractMessage(out) || `Wallet fetch failed (${res.status})`);
        return;
      }

      const w = out?.data || out || null;
      if (!w || !w.wallet_id) {
        setWalletStatus("none");
        setWallet(null);
        setHasTpin(null);
        setErr("Wallet response missing wallet_id.");
        return;
      }

      setWallet(w);
      setWalletStatus("exists");

      // 2) Check has T-PIN
      if (!HAS_TPIN_ENDPOINT) {
        setHasTpin(null);
        setErr((prev) => prev || "Missing env: VITE_HAS_TPIN_ENDPOINT");
        return;
      }

      setCheckingTpin(true);
      const tpinUrl = buildUrl(HAS_TPIN_ENDPOINT, userId);
      const res2 = await fetch(tpinUrl, { method: "GET", headers });
      const out2 = await safeJson(res2);

      if (!res2.ok) {
        setHasTpin(null);
        setErr(extractMessage(out2) || `T-PIN check failed (${res2.status})`);
        return;
      }

      const ht =
        out2?.has_tpin ??
        out2?.data?.has_tpin ??
        out2?.data?.hasTPin ??
        out2?.hasTPin ??
        null;

      setHasTpin(Boolean(ht));
    } catch (e) {
      setWalletStatus("none");
      setWallet(null);
      setHasTpin(null);
      setErr(e?.message || "Network error loading wallet.");
    } finally {
      setCheckingTpin(false);
      setLoading(false);
    }
  }

  async function createWallet() {
    setErr("");
    setBusyCreateWallet(true);
    try {
      if (!userId) {
        setErr("Missing user_id in merchant session.");
        return;
      }
      if (!CREATE_WALLET_ENDPOINT) {
        setErr("Missing env: VITE_CREATE_WALLET_ENDPOINT");
        return;
      }

      const res = await fetch(CREATE_WALLET_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: Number(userId), status: "ACTIVE" }),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        const msg = extractMessage(out);
        if (
          res.status === 409 ||
          String(msg || "")
            .toLowerCase()
            .includes("exists")
        ) {
          await loadWalletAndTpin();
          return;
        }

        setErr(msg || `Create wallet failed (${res.status})`);
        return;
      }

      // created
      const created = out?.data || out || null;
      setWallet(created);
      setWalletStatus("exists");

      await loadWalletAndTpin();
    } catch (e) {
      setErr(e?.message || "Network error creating wallet.");
    } finally {
      setBusyCreateWallet(false);
    }
  }

  useEffect(() => {
    loadWalletAndTpin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  const walletExists = !loading && walletStatus === "exists" && wallet;

  return (
    <div className="wlPage">
      <div className="wlContainer">
        {/* Header */}
        <div className="wlHeader">
          <div>
            <h1 className="wlTitle">Wallet</h1>
            <div className="wlSub">Account, T-PIN and transaction history.</div>
          </div>

          <div className="wlHeaderRight">
            <button
              type="button"
              className="wlBtn wlBtnGhost"
              onClick={loadWalletAndTpin}
              disabled={loading}
              title="Refresh"
            >
              ⟳ Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div className="wlAlert wlAlertErr">
            <div className="wlAlertTitle">Notice</div>
            <div className="wlAlertText">{err}</div>
          </div>
        ) : null}

        {/* Loading skeleton */}
        {loading ? (
          <div className="wlSkeleton">
            <div className="wlSkRow" />
            <div className="wlSkRow" />
            <div className="wlSkRow" />
          </div>
        ) : null}

        {/* No wallet found */}
        {!loading && walletStatus === "none" ? (
          <div className="wlEmpty">
            <div className="wlEmptyCard">
              <div className="wlEmptyTitle">No wallet found</div>
              <div className="wlEmptyText">
                Create your wallet to start using transfers and transaction
                history.
              </div>

              <div className="wlRow wlRowGap">
                <button
                  type="button"
                  className="wlBtn wlBtnPrimary"
                  onClick={createWallet}
                  disabled={busyCreateWallet}
                >
                  {busyCreateWallet ? "Creating..." : "Create Wallet"}
                </button>

                <button
                  type="button"
                  className="wlBtn wlBtnSecondary"
                  onClick={loadWalletAndTpin}
                  disabled={busyCreateWallet}
                >
                  Retry Fetch
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Wallet exists but no T-PIN */}
        {walletExists && hasTpin === false ? (
          <div className="wlGridTop">
            <WalletOverviewCard
              wallet={wallet}
              balanceText={balanceText}
              onSendMoney={() => setSendOpen(true)}
              sendDisabled={true}
              sendDisabledHint="Set your T-PIN first to enable transfers."
              onOpenForgot={() => setForgotOpen(true)}
              onOpenChange={() => setChangeOpen(true)} // ✅ NEW (safe even if card ignores)
            />

            <CreateTpinCard
              walletId={wallet?.wallet_id}
              token={token}
              onSuccess={() => loadWalletAndTpin()}
            />
          </div>
        ) : null}

        {/* Normal wallet view */}
        {walletExists && hasTpin === true ? (
          <>
            <div className="wlGridTop">
              <WalletOverviewCard
                wallet={wallet}
                balanceText={balanceText}
                onSendMoney={() => setSendOpen(true)}
                sendDisabled={false}
                onOpenForgot={() => setForgotOpen(true)}
                onOpenChange={() => setChangeOpen(true)} // ✅ NEW (safe even if card ignores)
              />
            </div>

            <div className="wlGrid">
              <TransactionHistoryCard
                walletId={wallet?.wallet_id}
                token={token}
              />
            </div>
          </>
        ) : null}

        {/* If hasTpin could not be checked, still allow view but show hint */}
        {walletExists && hasTpin == null ? (
          <>
            <div className="wlGridTop">
              <WalletOverviewCard
                wallet={wallet}
                balanceText={balanceText}
                onSendMoney={() => setSendOpen(true)}
                sendDisabled={true}
                sendDisabledHint="Unable to verify T-PIN status. Please refresh."
                onOpenForgot={() => setForgotOpen(true)}
                onOpenChange={() => setChangeOpen(true)} // ✅ NEW (safe even if card ignores)
              />
            </div>

            <div className="wlGrid">
              <TransactionHistoryCard
                walletId={wallet?.wallet_id}
                token={token}
              />
            </div>
          </>
        ) : null}

        {/* Modals (mounted whenever wallet exists) */}
        {walletExists ? (
          <>
            <SendMoneyModal
              open={sendOpen}
              onClose={() => setSendOpen(false)}
              wallet={wallet}
              token={token}
              onOpenForgot={() => setForgotOpen(true)}
              onOpenChange={() => setChangeOpen(true)} // ✅ NEW (needed for "Change T-PIN" link)
              onSuccess={() => {
                setSendOpen(false);
                loadWalletAndTpin();
              }}
            />

            <ForgotTpinModal
              open={forgotOpen}
              onClose={() => setForgotOpen(false)}
              wallet={wallet}
              token={token}
            />

            <ChangeTpinModal
              open={changeOpen}
              onClose={() => setChangeOpen(false)}
              wallet={wallet}
              token={token}
              onSuccess={() => {
                setChangeOpen(false);
                loadWalletAndTpin();
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
