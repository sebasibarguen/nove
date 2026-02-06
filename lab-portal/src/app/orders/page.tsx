// ABOUTME: Lab portal orders page with search and listing.
// ABOUTME: Partners can look up orders by code and upload results.

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { portalApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Order {
  id: string;
  order_code: string;
  status: string;
  panel_name: string;
  user_name: string;
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const fetchOrders = useCallback(async (code?: string) => {
    const params = code ? `?code=${code}` : "";
    const data = await portalApi<Order[]>(`/orders${params}`);
    setOrders(data);
  }, []);

  useEffect(() => {
    setPartnerName(localStorage.getItem("partner_name") || "");
    fetchOrders();
  }, [fetchOrders]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    fetchOrders(search || undefined);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ordenes</h1>
        <p className="text-muted-foreground">{partnerName}</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por codigo (ej. NOV-A3K9X2)"
        />
        <Button type="submit">Buscar</Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              fetchOrders();
            }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">No hay ordenes.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-mono text-sm">
                        {order.order_code}
                      </CardTitle>
                      <CardDescription>
                        {order.panel_name} - {order.user_name}
                      </CardDescription>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {order.status}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
