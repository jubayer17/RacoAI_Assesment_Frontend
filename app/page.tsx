"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type PaymentProvider,
  type PaymentResponse,
  type Product,
  type LoginResponse,
  type OrderResponse,
} from "@/lib/api";

export default function HomePage() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cartItems = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([product_id, quantity]) => ({
          product_id: Number(product_id),
          quantity: Number(quantity),
        })),
    [selected]
  );

  useEffect(() => {
    api<Product[]>("/api/products/")
      .then(setProducts)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      );
  }, []);

  async function register() {
    setError("");
    setMessage("");
    try {
      await api("/api/users/register/", {
        method: "POST",
        body: { email, password },
      });
      setMessage("Registered. Now login.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function login() {
    setError("");
    setMessage("");
    try {
      const data = await api<LoginResponse>("/api/users/login/", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.access);
      setMessage("Logged in.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function checkout() {
    setError("");
    setMessage("");
    try {
      if (!token) throw new Error("Login first");
      if (!cartItems.length) throw new Error("Select at least one product");

      const order = await api<OrderResponse>("/api/orders/create/", {
        method: "POST",
        token,
        body: { items: cartItems },
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
        `Order #${order.id} paid via ${provider}. Payment status: ${verified.status}`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main>
      <h1>Raco AI Assessment</h1>
      <p className="lead">E-commerce ordering & payment demo</p>

      <section className="card">
        <strong>Auth</strong>
        <div className="row">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
          <button type="button" className="secondary" onClick={register}>
            Register
          </button>
          <button type="button" onClick={login}>
            Login
          </button>
        </div>
      </section>

      <section className="card">
        <strong>Products</strong>
        <div className="grid">
          {products.map((p) => (
            <div className="product card" key={p.id}>
              <h3>{p.name}</h3>
              <p>{p.sku}</p>
              <p>
                ${p.price} · stock {p.stock}
              </p>
              <div className="row">
                <input
                  type="number"
                  min={0}
                  value={selected[p.id] || 0}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [p.id]: Number(e.target.value),
                    }))
                  }
                  style={{ width: 80 }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <strong>Checkout</strong>
        <div className="row">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as PaymentProvider)}
          >
            <option value="stripe">Stripe</option>
            <option value="bkash">bKash</option>
          </select>
          <button type="button" onClick={checkout}>
            Create order & pay
          </button>
        </div>
        {message ? <div className="msg">{message}</div> : null}
        {error ? <div className="err">{error}</div> : null}
      </section>
    </main>
  );
}
