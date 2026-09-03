import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold text-stone-900">CoffeeShopSupplier</h1>
        <p className="mt-4 text-lg text-stone-600">
          The B2B marketplace connecting coffee shops with trusted suppliers.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            to="/login"
            className="rounded-lg bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-amber-700 px-6 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-700 hover:text-white"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
