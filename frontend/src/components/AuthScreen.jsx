import { useState } from "react";
import { LogoMark, MoonIcon } from "./icons";

export default function AuthScreen({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  authLoading,
  handleAuth,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-screen">
      <div className="auth-bg-glow" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-brand">
          <LogoMark size={40} />
          <h1>
            AI made by <span className="grad-text">AI</span>
          </h1>
          <p>Your intelligent assistant for anything</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          {["login", "register"].map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={authMode === mode}
              className={`auth-tab ${authMode === mode ? "active" : ""}`}
              onClick={() => setAuthMode(mode)}
            >
              {mode === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleAuth}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {authError && (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={authLoading}>
            {authLoading
              ? "Please wait…"
              : authMode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <p className="auth-footnote">
          <MoonIcon size={12} /> Works in light &amp; dark — follow your system or pick a
          theme after signing in.
        </p>
      </div>
    </div>
  );
}
