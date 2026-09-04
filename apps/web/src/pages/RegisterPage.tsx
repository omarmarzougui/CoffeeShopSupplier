import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { Input, Label } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"buyer" | "supplier">("buyer");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await register({
        email,
        password,
        role,
        businessName,
        phone: phone || undefined,
      });
      navigate(data.user.role === "supplier" ? "/supplier" : "/buyer", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { value: "buyer" | "supplier"; label: string; hint: string }[] = [
    { value: "buyer", label: "Coffee Shop", hint: "I buy supplies" },
    { value: "supplier", label: "Supplier", hint: "I sell supplies" },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-stone-900">Create account</h2>
      <p className="mt-1 text-sm text-stone-500">Choose your workspace type.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label required>I am</Label>
          <div
            role="radiogroup"
            aria-label="Account type"
            className="grid grid-cols-2 gap-2"
          >
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={role === opt.value}
                onClick={() => setRole(opt.value)}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  role === opt.value
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                }`}
              >
                <span className="block text-sm font-medium">{opt.label}</span>
                <span
                  className={`block text-xs ${role === opt.value ? "text-stone-300" : "text-stone-500"}`}
                >
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessName" required>
            Business name
          </Label>
          <Input
            id="businessName"
            type="text"
            required
            minLength={2}
            autoComplete="organization"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Central Roasters"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-stone-500">At least 8 characters</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone <span className="font-normal text-stone-400">(optional)</span></Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+216 …"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900">
          Sign in
        </Link>
      </p>
    </div>
  );
}
