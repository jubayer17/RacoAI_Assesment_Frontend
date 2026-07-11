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
      <main className="auth-page">
        <p className="auth-panel__lead">Checking session…</p>
      </main>
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="shell site-header__inner">
          <div className="brand">
            <div className="brand__name">Raco AI Assessment</div>
            <div className="brand__tag">Ordering & payments</div>
          </div>
          <div className="header-actions">
            <span className="user-chip">{email}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="shell shop-page">
        <div className="shop-hero">
          <div>
            <h1>Catalog</h1>
            <p>
              Choose quantities, then checkout with Stripe or bKash. Stock
              updates after a successful payment.
            </p>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-ok">{message}</div> : null}

        <div className="layout">
          <section className="panel">
            <h2>Products</h2>
            {loading ? (
              <p className="empty-state">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="empty-state">No active products found.</p>
            ) : (
              <div className="product-grid">
                {products.map((p) => (
                  <article className="product" key={p.id}>
                    <p className="product__sku">{p.sku}</p>
                    <h3 className="product__name">{p.name}</h3>
                    <p className="product__meta">
                      <span className="product__price">
                        ${Number(p.price).toFixed(2)}
                      </span>
                      {" · "}
                      {p.stock} in stock
                    </p>
                    <div className="qty-row">
                      <span>Qty</span>
                      <input
                        type="number"
                        min={0}
                        max={p.stock}
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
            <h2>Checkout</h2>
            {cart.length === 0 ? (
              <p className="cart-empty">Your cart is empty.</p>
            ) : (
              <div className="cart-list">
                {cart.map(({ product, quantity }) => (
                  <div className="cart-item" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>
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

            <div className="cart-total">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <div className="checkout-actions">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="provider">Payment provider</label>
                <select
                  id="provider"
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
                className="btn btn-primary btn-block"
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
