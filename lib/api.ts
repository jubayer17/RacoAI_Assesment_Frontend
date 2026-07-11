export type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
  description?: string;
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

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function formatError(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) parts.push(`${key}: ${value.join(", ")}`);
    else if (typeof value === "string") parts.push(`${key}: ${value}`);
  }
  return parts.length ? parts.join(" · ") : JSON.stringify(data);
}

export async function api<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(formatError(data));
  return data as T;
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await api<Product[] | { results: Product[] }>("/api/products/");
  return Array.isArray(data) ? data : data.results ?? [];
}

export type CreateProductInput = {
  name: string;
  sku: string;
  description?: string;
  price: string | number;
  stock: number;
  status?: "active" | "inactive";
};

export async function createProduct(
  token: string,
  input: CreateProductInput
): Promise<Product> {
  return api<Product>("/api/products/admin/products/", {
    method: "POST",
    token,
    body: {
      name: input.name,
      sku: input.sku,
      description: input.description || "",
      price: input.price,
      stock: input.stock,
      status: input.status || "active",
    },
  });
}
