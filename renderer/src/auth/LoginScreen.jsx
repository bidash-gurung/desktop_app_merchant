// LoginScreen.jsx
import React from "react";
import "./css/auth.css";

const LOGIN_EMAIL_ENDPOINT = import.meta.env
  .VITE_LOGIN_USERNAME_MERCHANT_ENDPOINT;
const LOGIN_PHONE_ENDPOINT = import.meta.env.VITE_LOGIN_MERCHANT_ENDPOINT;

// ✅ remember-me storage key (scoped for merchant portal)
const REMEMBER_KEY = "merchant_portal_remember_v1";

export default function LoginScreen({ onLoginSuccess }) {
  const [tab, setTab] = React.useState("email"); // "email" | "phone"

  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState(""); // store only digits user types
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // ✅ remember me state (was not wired before)
  const [remember, setRemember] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [banner, setBanner] = React.useState(null); // {type,title,message}

  // ✅ load remembered credentials once
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (saved?.tab === "phone" || saved?.tab === "email") setTab(saved.tab);

      if (saved?.tab === "phone") {
        if (saved?.phoneDigits) setPhone(String(saved.phoneDigits));
      } else {
        if (saved?.email) setEmail(String(saved.email));
      }

      if (saved?.password) setPassword(String(saved.password));
      if (saved?.remember) setRemember(true);
    } catch {
      // ignore
    }
  }, []);

  // ✅ persist when user toggles remember or changes fields (only if remember is ON)
  React.useEffect(() => {
    try {
      if (!remember) return;
      const payload =
        tab === "phone"
          ? { remember: true, tab, phoneDigits: phone, password }
          : { remember: true, tab, email, password };
      localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [remember, tab, email, phone, password]);

  function clearBanner() {
    setBanner(null);
  }

  async function readResponseBody(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    const text = await res.text().catch(() => "");
    return text || null;
  }

  function extractMessage(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    return payload.message || payload.error || payload.msg || "";
  }

  function digitsOnly(v) {
    return String(v || "").replace(/[^\d]/g, "");
  }

  function handleTabChange(nextTab) {
    setTab(nextTab);
    clearBanner();

    // ✅ If remember is ON, also update stored tab immediately
    try {
      if (remember) {
        const payload =
          nextTab === "phone"
            ? { remember: true, tab: "phone", phoneDigits: phone, password }
            : { remember: true, tab: "email", email, password };
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    clearBanner();

    const endpoint =
      tab === "email" ? LOGIN_EMAIL_ENDPOINT : LOGIN_PHONE_ENDPOINT;

    if (!endpoint) {
      setBanner({
        type: "error",
        title: "Configuration error",
        message:
          tab === "email"
            ? "Missing env: VITE_LOGIN_USERNAME_MERCHANT_ENDPOINT. Add it to renderer/.env and restart."
            : "Missing env: VITE_LOGIN_MERCHANT_ENDPOINT. Add it to renderer/.env and restart.",
      });
      return;
    }

    const pass = password.trim();
    if (!pass) {
      setBanner({
        type: "error",
        title: "Missing password",
        message: "Please enter your password.",
      });
      return;
    }

    let body = {};

    if (tab === "email") {
      const em = email.trim();
      if (!em) {
        setBanner({
          type: "error",
          title: "Missing email",
          message: "Please enter your email.",
        });
        return;
      }
      // ✅ add desktop=true
      body = { email: em, password: pass, desktop: true };
    } else {
      const rawDigits = digitsOnly(phone);
      if (!rawDigits) {
        setBanner({
          type: "error",
          title: "Missing phone",
          message: "Please enter your phone number.",
        });
        return;
      }

      const fullPhone = `+975${rawDigits}`;
      // ✅ add desktop=true
      body = { phone: fullPhone, password: pass, desktop: true };
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await readResponseBody(res);

      if (!res.ok) {
        setBanner({
          type: "error",
          title: "Login failed",
          message:
            extractMessage(payload) || "Invalid credentials. Please try again.",
        });
        return;
      }

      try {
        if (remember) {
          const saved =
            tab === "phone"
              ? {
                  remember: true,
                  tab,
                  phoneDigits: digitsOnly(phone),
                  password: pass,
                }
              : { remember: true, tab, email: email.trim(), password: pass };
          localStorage.setItem(REMEMBER_KEY, JSON.stringify(saved));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // ignore
      }

      setBanner({
        type: "success",
        title: "Success",
        message: extractMessage(payload) || "Login successful.",
      });

      onLoginSuccess?.(payload);
    } catch (err) {
      setBanner({
        type: "error",
        title: "Network error",
        message: err?.message || "Could not reach the server.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="loginShell">
        {/* Left branding */}
        <div className="brandPanel">
          <div className="brandTop">
            <div className="brandLogoBox">
              <img className="brandLogo" src="/logo/logo.png" alt="New Edge" />
            </div>
            <div className="brandName">New Edge</div>
          </div>

          <div className="brandBody">
            <h1 className="brandTitle">Welcome back</h1>
            <p className="brandSub">
              Sign in to manage your merchant account, orders, and analytics.
            </p>

            <div className="brandMeta">
              <div className="metaItem">
                <span className="dot" />
                Secure authentication
              </div>
              <div className="metaItem">
                <span className="dot" />
                Faster desktop workflow
              </div>
              <div className="metaItem">
                <span className="dot" />
                One place for everything
              </div>
            </div>
          </div>

          <div className="brandFooter">
            <div className="mutedSmall">
              © {new Date().getFullYear()} New Edge
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="formPanel">
          <div className="formCard">
            <div className="formHeader">
              <div>
                <div className="formKicker">Merchant Portal</div>
                <h2 className="formTitle">Login</h2>
                <p className="formHint">Choose a login method to continue</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" role="tablist" aria-label="Login method">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "email"}
                className={`tabBtn ${tab === "email" ? "active" : ""}`}
                onClick={() => handleTabChange("email")}
              >
                Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "phone"}
                className={`tabBtn ${tab === "phone" ? "active" : ""}`}
                onClick={() => handleTabChange("phone")}
              >
                Phone
              </button>
            </div>

            {banner && (
              <div className={`banner ${banner.type}`}>
                <div className="bannerTop">
                  <div>
                    <div className="bannerTitle">{banner.title}</div>
                    <div className="bannerMsg">{banner.message}</div>
                  </div>
                  <button
                    type="button"
                    className="bannerX"
                    onClick={clearBanner}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <form className="formBody" onSubmit={onSubmit}>
              {tab === "email" ? (
                <div className="field">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              ) : (
                <div className="field">
                  <label className="label">Phone number</label>
                  <div className="phoneRow">
                    <div className="phonePrefix">+975</div>
                    <input
                      className="input phoneInput"
                      value={phone}
                      onChange={(e) => setPhone(digitsOnly(e.target.value))}
                      placeholder="17XXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              )}

              <div className="field">
                <label className="label">Password</label>
                <div className="passwordWrap">
                  <input
                    className="input passwordInput"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eyeBtn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="row">
                {/* ✅ wired checkbox */}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRemember(checked);
                      if (!checked) {
                        try {
                          localStorage.removeItem(REMEMBER_KEY);
                        } catch {
                          // ignore
                        }
                      }
                    }}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => alert("Forgot password")}
                >
                  Forgot password?
                </button>
              </div>

              <button className="btnPrimary" type="submit" disabled={loading}>
                {loading ? (
                  <span className="btnLoading">
                    <span className="spinner" /> Logging in…
                  </span>
                ) : (
                  "Login"
                )}
              </button>

              <p className="legal">
                By continuing, you agree to the Terms & Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- icons -------- */
function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.8-7 9.5-7 9.5 7 9.5 7-3.8 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.6 5.2A10.7 10.7 0 0 1 12 5c5.7 0 9.5 7 9.5 7a18.6 18.6 0 0 1-3.2 4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.2C3.9 8 2.5 12 2.5 12s3.8 7 9.5 7c1.3 0 2.6-.2 3.8-.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 9.5a3.2 3.2 0 0 0 4.6 4.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
