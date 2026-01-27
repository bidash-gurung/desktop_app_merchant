import React from "react";
import "./css/auth.css";

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_USERNAME_MERCHANT_ENDPOINT;

export default function LoginScreen({ onLoginSuccess }) {
  const [tab, setTab] = React.useState("email"); // "email" | "phone"

  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("+975 ");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [banner, setBanner] = React.useState(null); // {type,title,message}

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

  async function onSubmit(e) {
    e.preventDefault();
    clearBanner();

    if (!LOGIN_ENDPOINT) {
      setBanner({
        type: "error",
        title: "Configuration error",
        message:
          "Missing env: VITE_LOGIN_USERNAME_MERCHANT_ENDPOINT. Add it to renderer/.env and restart.",
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
      body = { email: em, password: pass };
    } else {
      const ph = phone.trim();
      if (!ph || ph === "+975") {
        setBanner({
          type: "error",
          title: "Missing phone",
          message: "Please enter your phone number.",
        });
        return;
      }
      // If backend expects different key change here
      body = { phone: ph, password: pass };
    }

    setLoading(true);
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
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

      setBanner({
        type: "success",
        title: "Success",
        message: extractMessage(payload) || "Login successful.",
      });

      // ✅ Save + redirect (App will switch to MainScreen)
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
                onClick={() => {
                  setTab("email");
                  clearBanner();
                }}
              >
                Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "phone"}
                className={`tabBtn ${tab === "phone" ? "active" : ""}`}
                onClick={() => {
                  setTab("phone");
                  clearBanner();
                }}
              >
                Phone
              </button>
            </div>

            {/* ✅ Only message banner, no JSON */}
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
                      value={phone.replace("+975", "").trimStart()}
                      onChange={(e) => setPhone(`+975 ${e.target.value}`)}
                      placeholder="17XXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="hint">Default country code is +975</div>
                </div>
              )}

              {/* Password with eye icon */}
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
                <label className="check">
                  <input type="checkbox" />
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
