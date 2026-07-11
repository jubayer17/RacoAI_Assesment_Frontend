"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  fetchProducts,
  type PaymentProvider,
  type PaymentResponse,
  type Product,
  type OrderResponse,
} from "@/lib/api";
import { clearSession, getEmail, getToken } from "@/lib/auth";

export default function ShopPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const access = getToken();
    if (!access) {
      router.replace("/login");
      return;
    }
    setToken(access);
    setEmail(getEmail());

    fetchProducts()
      .then(setProducts)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
  }, [router]);

  const cart = useMemo(() => {
    return products
      .map((p) => ({ product: p, quantity: qty[p.id] || 0 }))
      .filter((item) => item.quantity > 0);
  }, [products, qty]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );
  }, [cart]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  async function checkout() {
    if (!token) return;
    setError("");
    setMessage("");
    setPaying(true);

    try {
      if (!cart.length) throw new Error("Add at least one product to the cart.");

      const order = await api<OrderResponse>("/api/orders/create/", {
        method: "POST",
        token,
        body: {
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        },
      });

      const payment = await api<PaymentResponse>("/api/payments/checkout/", {
        method: "POST",
        token,
        body: { order_id: order.id, provider },
      });

      const verified = await api<PaymentResponse>("/api/payments/verify/", {
        method: "POST",
        token,
        body: { payment_id: payment.id },
      });

      setMessage(
        `Order #${order.id} paid with ${provider}. Status: ${verified.status}`
      );
      setQty({});

      const refreshed = await fetchProducts();
      setProducts(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPaying(false);
    }
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-muted">Checking session…</p>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line/80 bg-slate-100/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] w-[min(1120px,calc(100%-2rem))] items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-semibold tracking-tight text-ink">
              Raco AI Assessment
            </div>
            <div className="text-xs text-muted">Ordering & payments</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{email}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(1120px,calc(100%-2rem))] animate-rise pb-14 pt-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Catalog
          </h1>
          <p className="mt-2 max-w-xl leading-relaxed text-muted">
            Choose quantities, then checkout with Stripe or bKash. Stock updates
            after a successful payment.
          </p>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-ok">{message}</div> : null}

        <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
          <section className="panel">
            <h2 className="mb-4 text-base font-semibold tracking-tight">
              Products
            </h2>
            {loading ? (
              <p className="py-6 text-muted">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="py-6 text-muted">No active products found.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
                {products.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-[14px] border border-line bg-gradient-to-b from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted">
                      {p.sku}
                    </p>
                    <h3 className="mt-1.5 text-[1.05rem] font-semibold tracking-tight">
                      {p.name}
                    </h3>
                    <p className="mb-3.5 mt-1.5 text-sm text-muted">
                      <span className="font-bold text-ink">
                        ${Number(p.price).toFixed(2)}
                      </span>
                      {" · "}
                      {p.stock} in stock
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted">Qty</span>
                      <input
                        type="number"
                        min={0}
                        max={p.stock}
                        className="w-20 rounded-[10px] border border-line bg-white px-2.5 py-2"
                        value={qty[p.id] || 0}
                        onChange={(e) =>
                          setQty((prev) => ({
                            ...prev,
                            [p.id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="panel">
            <h2 className="mb-4 text-base font-semibold tracking-tight">
              Checkout
            </h2>

            {cart.length === 0 ? (
              <p className="mb-4 text-sm text-muted">Your cart is empty.</p>
            ) : (
              <div className="mb-4 grid gap-3">
                {cart.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <strong className="mb-0.5 block">{product.name}</strong>
                      <span className="text-sm text-muted">
                        {quantity} × ${Number(product.price).toFixed(2)}
                      </span>
                    </div>
                    <strong>
                      ${(Number(product.price) * quantity).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between font-bold">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <div className="grid gap-3">
              <div className="field mb-0">
                <label htmlFor="provider">Payment provider</label>
                <select
                  id="provider"
                  className="field-input"
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as PaymentProvider)
                  }
                >
                  <option value="stripe">Stripe</option>
                  <option value="bkash">bKash</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={paying || cart.length === 0}
                onClick={checkout}
              >
                {paying ? "Processing…" : "Place order & pay"}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
