// NovaMind — AuthPage.jsx — Error System

import { useState } from "react";
import { useAuth } from "../../../core/context/AuthContext.jsx";
import { Icon } from "@iconify/react";
import authBg from "../../../assets/auth.webp";
import ErrorMessage from "../../../core/components/ui/ErrorMessage.jsx";

// ─── Validators ───────────────────────────────────────────────────────────────
function validateEmail(email) {
  if (!email.trim()) return "Please enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  return null;
}
function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

// ─── Password Strength Meter ──────────────────────────────────────────────────
function StrengthMeter({ password }) {
  let strength = 0;
  if (password.length > 0) strength = 1;
  if (password.length > 3) strength = 2;
  if (password.length > 7) strength = 3;
  if (password.length > 10 && /\d/.test(password)) strength = 4;

  const segmentColor = (idx) => {
    if (strength < idx) return "bg-[var(--border)]";
    if (strength === 1) return "bg-red-500";
    if (strength === 2) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="pt-1.5">
      <div className="flex gap-1 h-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${segmentColor(i)}`} />
        ))}
      </div>
      <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
        Must be 8+ characters
      </span>
    </div>
  );
}

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({ id, label, type = "text", placeholder, value, onChange, error, rightSlot }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider block select-none" style={{ color: "var(--accent-soft)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full h-10 px-3 ${rightSlot ? "pr-10" : ""} bg-(--bg-surface-hover) border border-(--border) rounded-lg text-sm font-semibold transition-all duration-200 focus:ring-2 focus:ring-(--accent)/20 focus:border-(--accent) outline-none text-text-primary placeholder-(--text-muted) ${
            error ? "border-(--error) focus:ring-(--error)/20 focus:border-(--error)" : ""
          }`}
        />
        {rightSlot}
      </div>
      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
    </div>
  );
}

// ─── Eye toggle ───────────────────────────────────────────────────────────────
function EyeButton({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1}
      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors bg-transparent border-none cursor-pointer flex items-center p-0 ${
        show ? "text-(--accent-soft)" : "text-text-secondary hover:text-text-primary"
      }`}>
      <Icon icon={show ? "material-symbols:visibility-off-outline" : "material-symbols:visibility-outline"} className="text-[20px]" />
    </button>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ current, total }) {
  return (
    <div className="mb-2 text-center">
      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide select-none" style={{ backgroundColor: "var(--accent-tint)", color: "var(--accent-soft)" }}>
        Step {current} of {total}
      </span>
    </div>
  );
}

// ─── Submit Button ────────────────────────────────────────────────────────────
function SubmitButton({ loading, label, loadingLabel, fullWidth = true }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`${fullWidth ? "w-full" : "flex-1"} h-10.5 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", boxShadow: "0 4px 15px rgba(124, 58, 237, 0.35)" }}
    >
      {loading ? (<><Icon icon="material-symbols:progress-activity" className="animate-spin" />{loadingLabel}</>) : label}
    </button>
  );
}

// ─── Two-column card shell ────────────────────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div
      className="h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center font-sans antialiased p-4 sm:p-8"
      style={{ background: "linear-gradient(135deg, var(--bg-sidebar) 0%, var(--bg-primary) 55%, rgba(124, 58, 237, 0.22) 100%)" }}
    >
      {/* Brand */}
      <div className="w-full max-w-4xl flex items-center justify-center gap-2 mb-6 select-none">
        <img src="/favicon.webp" alt="NovaMind" className="w-7 h-7 object-contain rounded-lg" />
        <span className="text-[24px] font-extrabold tracking-tight text-white">NovaMind</span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-4xl flex rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-(--border)"
        style={{ minHeight: "460px", maxHeight: "min(600px, 90vh)", background: "var(--bg-surface)" }}
      >
        {/* Left — image */}
        <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative shrink-0" style={{ backgroundImage: `url(${authBg})` }}>
          <div className="absolute inset-0 bg-linear-to-t from-(--bg-surface)/90 via-transparent to-transparent" />
        </div>

        {/* Right — form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-10 relative overflow-y-auto" style={{ background: "var(--bg-secondary-overlay)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTP VERIFICATION STEP
// ═══════════════════════════════════════════════════════════════════════════════
function OtpStep({ email, onSuccess, onBack, stepLabel }) {
  const { verifyEmail, resendOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Incorrect OTP. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await resendOtp(email);
      setSuccess("New OTP sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to resend verification code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-85 flex flex-col">
      {stepLabel && <StepBadge current={stepLabel.current} total={stepLabel.total} />}
      <h2 className="text-xl font-extrabold text-white mb-2 tracking-tight text-center">Check your email</h2>
      <p className="text-xs font-semibold mb-5 leading-relaxed text-center" style={{ color: "var(--text-secondary)" }}>
        We sent a 6-digit code to <span className="font-bold text-white">{email}</span>.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="otp-code" className="text-xs font-bold uppercase tracking-wider block select-none" style={{ color: "var(--accent-soft)" }}>
            Confirmation Code
          </label>
          <input
            id="otp-code"
            type="text"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
            className="w-full h-11 text-center tracking-[0.5em] text-lg bg-(--bg-surface-hover) border border-(--border) rounded-lg px-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-(--accent)/20 focus:border-(--accent) font-bold text-text-primary"
          />
        </div>

        <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />
        <ErrorMessage message={success} variant="success" fullWidth onDismiss={() => setSuccess("")} />

        <div className="flex items-center gap-3 mt-4">
          {onBack && (
            <button type="button" onClick={onBack}
              className="w-22.5 h-10.5 border font-bold rounded-lg hover:bg-(--accent-tint) transition-all text-sm cursor-pointer"
              style={{ borderColor: "var(--border-focus)", color: "var(--text-secondary)" }}>
              Back
            </button>
          )}
          <SubmitButton loading={loading} label="Verify" loadingLabel="Verifying..." fullWidth={!onBack} />
        </div>
      </form>

      <p className="text-center text-xs font-semibold mt-6 select-none" style={{ color: "var(--text-secondary)" }}>
        Didn&apos;t receive a code?{" "}
        <button type="button" onClick={handleResend} disabled={resending}
          className="font-bold bg-transparent border-none cursor-pointer p-0 hover:underline disabled:opacity-50"
          style={{ color: "var(--accent-soft)" }}>
          {resending ? "Sending..." : "Resend"}
        </button>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN FORM
// ═══════════════════════════════════════════════════════════════════════════════
function LoginForm({ onSwitchToRegister, onSwitchToForgotPassword }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const validate = () => {
    const errs = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err.requiresVerification) {
        setUnverifiedEmail(err.email || email);
      } else {
        setError(err.message || "Unable to connect. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (unverifiedEmail) {
    return <OtpStep email={unverifiedEmail} onSuccess={() => setUnverifiedEmail(null)} onBack={() => setUnverifiedEmail(null)} />;
  }

  return (
    <div className="w-full max-w-85 flex flex-col">
      <h2 className="text-xl font-extrabold text-text-primary mb-5 tracking-tight text-center">
        Sign in to your account
      </h2>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field id="login-email" label="Email Address" type="email" placeholder="you@example.com"
          value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: null })); setError(""); }} error={fieldErrors.email} />

        <div className="space-y-1">
          <Field id="login-password" label="Password" type={showPassword ? "text" : "password"} placeholder="••••••••"
            value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: null })); setError(""); }}
            error={fieldErrors.password}
            rightSlot={<EyeButton show={showPassword} onToggle={() => setShowPassword((v) => !v)} />} />
          <div className="flex justify-end pt-0.5">
            <button type="button" onClick={onSwitchToForgotPassword}
              className="text-[11px] font-semibold bg-transparent border-none cursor-pointer p-0 hover:underline"
              style={{ color: "var(--accent-soft)" }}>
              Forgot Password?
            </button>
          </div>
        </div>

        <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

        <SubmitButton loading={loading} label="Sign In" loadingLabel="Signing in..." />
      </form>

      <p className="text-center text-xs font-semibold mt-6 select-none" style={{ color: "var(--text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <button onClick={onSwitchToRegister} className="font-bold bg-transparent border-none cursor-pointer p-0 hover:underline" style={{ color: "var(--accent-soft)" }}>
          Create one
        </button>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD FORM
// ═══════════════════════════════════════════════════════════════════════════════
function ForgotPasswordForm({ onSwitchToLogin, onResetRequested }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      onResetRequested(email);
    } catch (err) {
      setError(err.message || "Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-85 flex flex-col">
      <h2 className="text-xl font-extrabold text-text-primary mb-2 tracking-tight text-center">
        Forgot Password
      </h2>
      <p className="text-xs font-semibold mb-5 leading-relaxed text-center" style={{ color: "var(--text-secondary)" }}>
        Enter your email and we&apos;ll send you a 6-digit code to reset your password.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          id="forgot-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
        />

        <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

        <SubmitButton loading={loading} label="Send Reset Code" loadingLabel="Sending..." />
      </form>

      <p className="text-center text-xs font-semibold mt-6 select-none" style={{ color: "var(--text-secondary)" }}>
        Remember your password?{" "}
        <button onClick={onSwitchToLogin} className="font-bold bg-transparent border-none cursor-pointer p-0 hover:underline" style={{ color: "var(--accent-soft)" }}>
          Sign in
        </button>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY RESET CODE FORM
// ═══════════════════════════════════════════════════════════════════════════════
function VerifyResetCodeForm({ email, onBack, onVerified }) {
  const { verifyResetCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-digit reset code.");
      return;
    }

    setLoading(true);
    try {
      await verifyResetCode(email, code.trim());
      onVerified(code.trim());
    } catch (err) {
      setError(err.message || "Failed to verify reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-85 flex flex-col">
      <h2 className="text-xl font-extrabold text-text-primary mb-2 tracking-tight text-center">
        Verify Code
      </h2>
      <p className="text-xs font-semibold mb-5 leading-relaxed text-center" style={{ color: "var(--text-secondary)" }}>
        Enter the 6-digit password reset code sent to <span className="font-bold text-text-primary">{email}</span>.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="verify-code" className="text-xs font-bold uppercase tracking-wider block select-none" style={{ color: "var(--accent-soft)" }}>
            Reset Code
          </label>
          <input
            id="verify-code"
            type="text"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
            className="w-full h-11 text-center tracking-[0.5em] text-lg bg-(--bg-surface-hover) border border-(--border) rounded-lg px-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-(--accent)/20 focus:border-(--accent) font-bold text-text-primary"
          />
        </div>

        <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

        <div className="flex items-center gap-3 mt-4">
          <button type="button" onClick={onBack}
            className="w-22.5 h-10.5 border font-bold rounded-lg hover:bg-(--accent-tint) transition-all text-sm cursor-pointer"
            style={{ borderColor: "var(--border-focus)", color: "var(--text-secondary)" }}>
            Back
          </button>
          <SubmitButton loading={loading} label="Verify Code" loadingLabel="Verifying..." fullWidth={false} />
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD FORM
// ═══════════════════════════════════════════════════════════════════════════════
function ResetPasswordForm({ email, code, onSwitchToLogin }) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const passErr = validatePassword(password);
    if (passErr) return passErr;
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, code, password);
      onSwitchToLogin();
    } catch (err) {
      setError(err.message || "Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-85 flex flex-col">
      <h2 className="text-xl font-extrabold text-text-primary mb-2 tracking-tight text-center">
        New Password
      </h2>
      <p className="text-xs font-semibold mb-5 leading-relaxed text-center" style={{ color: "var(--text-secondary)" }}>
        Please choose a strong new password for your account.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="reset-password" className="text-xs font-bold uppercase tracking-wider block select-none" style={{ color: "var(--accent-soft)" }}>
            New Password
          </label>
          <div className="relative">
            <input id="reset-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full h-10 px-3 pr-10 bg-(--bg-surface-hover) border border-(--border) rounded-lg text-sm font-semibold outline-none text-text-primary"
            />
            <EyeButton show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
          <StrengthMeter password={password} />
        </div>

        <Field id="reset-confirm" label="Confirm Password" type="password" placeholder="••••••••"
          value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }} />

        <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

        <SubmitButton loading={loading} label="Reset Password" loadingLabel="Resetting..." />
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER FORM
// ═══════════════════════════════════════════════════════════════════════════════
function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) 
      return 'Please enter your name.';
    if (!email.trim()) 
      return 'Please enter your email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please enter a valid email address.';
    if (password.length < 8)
      return 'Password must be at least 8 characters.';
    if (password !== confirmPassword)
      return 'Passwords do not match.';
    return null;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      setStep(3); // Go to OTP verification step
    } catch (err) {
      setError(err.message || "Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-85 flex flex-col">
      {/* ── Step 1: Name + Email ── */}
      {step === 1 && (
        <>
          <StepBadge current={1} total={3} />
          <h2 className="text-xl font-extrabold text-text-primary mb-5 tracking-tight text-center">Personal Details</h2>
          <form className="space-y-3.5" onSubmit={handleStep1Submit} noValidate>
            <Field id="reg-name" label="Full Name" type="text" placeholder="Your full name"
              value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
            <Field id="reg-email" label="Email Address" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />

            <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

            <button type="submit"
              className="w-full h-10.5 text-white font-bold rounded-lg flex items-center justify-center transition-all duration-300 active:scale-[0.98] mt-5 text-sm border-none cursor-pointer"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", boxShadow: "0 4px 15px var(--accent-tint)" }}>
              Continue
            </button>
          </form>
          <p className="text-center text-xs font-semibold mt-6 select-none" style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <button onClick={onSwitchToLogin} className="font-bold bg-transparent border-none cursor-pointer p-0 hover:underline" style={{ color: "var(--accent-soft)" }}>
              Sign in
            </button>
          </p>
        </>
      )}

      {/* ── Step 2: Password ── */}
      {step === 2 && (
        <>
          <StepBadge current={2} total={3} />
          <h2 className="text-xl font-extrabold text-text-primary mb-5 tracking-tight text-center">Secure your account</h2>
          <form className="space-y-3.5" onSubmit={handleStep2Submit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider block select-none" style={{ color: "var(--accent-soft)" }}>
                Password
              </label>
              <div className="relative">
                <input id="reg-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full h-10 px-3 pr-10 bg-(--bg-surface-hover) border border-(--border) rounded-lg text-sm font-semibold outline-none text-text-primary"
                />
                <EyeButton show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
              <StrengthMeter password={password} />
            </div>

            <Field id="reg-confirm" label="Confirm Password" type="password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }} />

            <ErrorMessage message={error} fullWidth onDismiss={() => setError("")} />

            <div className="flex items-center gap-3 mt-5">
              <button type="button" onClick={() => setStep(1)}
                className="w-22.5 h-10.5 border font-bold rounded-lg hover:bg-(--accent-tint) transition-all text-sm cursor-pointer"
                style={{ borderColor: "var(--border-focus)", color: "var(--text-secondary)" }}>
                Back
              </button>
              <SubmitButton loading={loading} label="Create Account" loadingLabel="Creating..." fullWidth={false} />
            </div>
          </form>
        </>
      )}

      {/* ── Step 3: OTP Verification ── */}
      {step === 3 && (
        <OtpStep
          email={email}
          stepLabel={{ current: 3, total: 3 }}
          onSuccess={() => onSwitchToLogin()}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  return (
    <AuthCard>
      {mode === "login" && (
        <LoginForm
          onSwitchToRegister={() => setMode("register")}
          onSwitchToForgotPassword={() => setMode("forgot-password")}
        />
      )}
      {mode === "register" && (
        <RegisterForm onSwitchToLogin={() => setMode("login")} />
      )}
      {mode === "forgot-password" && (
        <ForgotPasswordForm
          onSwitchToLogin={() => setMode("login")}
          onResetRequested={(email) => {
            setResetEmail(email);
            setMode("verify-reset-code");
          }}
        />
      )}
      {mode === "verify-reset-code" && (
        <VerifyResetCodeForm
          email={resetEmail}
          onBack={() => setMode("forgot-password")}
          onVerified={(code) => {
            setResetCode(code);
            setMode("reset-password");
          }}
        />
      )}
      {mode === "reset-password" && (
        <ResetPasswordForm
          email={resetEmail}
          code={resetCode}
          onSwitchToLogin={() => setMode("login")}
        />
      )}
    </AuthCard>
  );
}
