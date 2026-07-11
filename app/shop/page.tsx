"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  createProduct,
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
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newDescription, setNewDescription] = useState("");

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

  // After returning from Stripe Checkout / bKash
  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get("payment");
    if (!paymentState) return;

    const pendingId = sessionStorage.getItem("pending_payment_id");
    const orderId = sessionStorage.getItem("pending_order_id");

    async function finishPayment() {
      setError("");
      setMessage("");

      if (paymentState === "cancelled") {
        setError("Payment was cancelled. You can try again.");
        sessionStorage.removeItem("pending_payment_id");
        sessionStorage.removeItem("pending_order_id");
        router.replace("/shop");
        return;
      }

      if (paymentState === "success" && pendingId) {
        try {
          const verified = await api<PaymentResponse>(
            "/api/payments/verify/",
            {
              method: "POST",
              token: token!,
              body: { payment_id: Number(pendingId) },
            }
          );
          setMessage(
            `Order #${orderId || verified.order || "?"} payment status: ${verified.status}`
          );
          setQty({});
          const refreshed = await fetchProducts();
          setProducts(refreshed);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          sessionStorage.removeItem("pending_payment_id");
          sessionStorage.removeItem("pending_order_id");
          router.replace("/shop");
        }
      }
    }

    void finishPayment();
  }, [token, router]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const byId = String(p.id) === q || String(p.id).includes(q);
      const byName = p.name.toLowerCase().includes(q);
      const bySku = p.sku.toLowerCase().includes(q);
      return byId || byName || bySku;
    });
  }, [products, search]);

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

  async function refreshProducts() {
    const refreshed = await fetchProducts();
    setProducts(refreshed);
  }

  async function onAddProduct(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    setAdding(true);

    try {
      const sku =
        newSku.trim() ||
        `SKU-${Date.now().toString().slice(-8)}`;

      const created = await createProduct(token, {
        name: newName.trim(),
        sku,
        price: newPrice,
        stock: Number(newStock) || 0,
        description: newDescription.trim(),
        status: "active",
      });

      setMessage(`Product #${created.id} “${created.name}” added.`);
      setNewName("");
      setNewSku("");
      setNewPrice("");
      setNewStock("10");
      setNewDescription("");
      setShowAddForm(false);
      await refreshProducts();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      if (text.toLowerCase().includes("permission") || text.includes("403")) {
        setError(
          "Adding products requires a staff account. Sign in as admin@example.com / Admin12345!"
        );
      } else {
        setError(text);
      }
    } finally {
      setAdding(false);
    }
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

      const checkoutUrl = payment.checkout_url || "";
      const bkashUrl = payment.bkash_url || "";

      // Real Stripe Checkout / bKash hosted page
      if (checkoutUrl || bkashUrl) {
        sessionStorage.setItem("pending_payment_id", String(payment.id));
        sessionStorage.setItem("pending_order_id", String(order.id));
        window.location.href = checkoutUrl || bkashUrl;
        return;
      }

      // Mock mode (no provider keys): verify immediately
      const verified = await api<PaymentResponse>("/api/payments/verify/", {
        method: "POST",
        token,
        body: { payment_id: payment.id },
      });

      setMessage(
        `Order #${order.id} paid with ${provider} (mock). Status: ${verified.status}`
      );
      setQty({});
      await refreshProducts();
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Catalog
            </h1>
            <p className="mt-2 max-w-xl leading-relaxed text-muted">
              Search by product ID or name, add products (staff), then checkout
              with Stripe or bKash.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? "Close form" : "Add product"}
          </button>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-ok">{message}</div> : null}

        {showAddForm ? (
          <section className="panel mb-5">
            <h2 className="mb-4 text-base font-semibold tracking-tight">
              Add product
            </h2>
            <p className="mb-4 text-sm text-muted">
              Requires a staff account (seeded admin:{" "}
              <span className="font-medium text-ink">admin@example.com</span>).
            </p>
            <form
              onSubmit={onAddProduct}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="field mb-0">
                <label htmlFor="new-name">Name</label>
                <input
                  id="new-name"
                  className="field-input"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Wireless Mouse"
                />
              </div>
              <div className="field mb-0">
                <label htmlFor="new-sku">SKU (optional)</label>
                <input
                  id="new-sku"
                  className="field-input"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="field mb-0">
                <label htmlFor="new-price">Price</label>
                <input
                  id="new-price"
                  className="field-input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="29.99"
                />
              </div>
              <div className="field mb-0">
                <label htmlFor="new-stock">Stock</label>
                <input
                  id="new-stock"
                  className="field-input"
                  type="number"
                  min="0"
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
              <div className="field mb-0 sm:col-span-2">
                <label htmlFor="new-description">Description</label>
                <input
                  id="new-description"
                  className="field-input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Short product description"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adding}
                >
                  {adding ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
          <section className="panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                Products
              </h2>
              <div className="relative w-full max-w-sm">
                <label htmlFor="search" className="sr-only">
                  Search products
                </label>
                <input
                  id="search"
                  className="field-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ID or product name…"
                />
              </div>
            </div>

            {loading ? (
              <p className="py-6 text-muted">Loading products…</p>
            ) : filteredProducts.length === 0 ? (
              <p className="py-6 text-muted">
                {search
                  ? `No products match “${search}”.`
                  : "No active products found."}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
                {filteredProducts.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-[14px] border border-line bg-gradient-to-b from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted">
                      ID {p.id} · {p.sku}
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
