import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

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

  const roleOptions: { value: "buyer" | "supplier"; label: string }[] = [
    { value: "buyer", label: "I'm a Coffee Shop" },
    { value: "supplier", label: "I'm a Supplier" },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-stone-800">Create account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="mb-1 block text-sm font-medium text-stone-700">I am</span>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  role === opt.value
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-stone-300 text-stone-700 hover:border-amber-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-stone-700">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            required
            minLength={2}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
          <p className="mt-1 text-xs text-stone-400">At least 8 characters</p>
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-700">
            Phone <span className="text-stone-400">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-amber-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
