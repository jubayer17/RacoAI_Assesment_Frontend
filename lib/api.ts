export type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
  status?: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export type OrderResponse = {
  id: number;
  total_amount?: string;
  status?: string;
};

export type PaymentResponse = {
  id: number;
  status: string;
  provider?: string;
};

export type PaymentProvider = "stripe" | "bkash";

export type ApiOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as {
    detail?: string;
  } & T;

  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : JSON.stringify(data)
    );
  }

  return data;
}
