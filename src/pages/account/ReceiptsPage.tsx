import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  FileText, Download, Share2, Printer, ArrowLeft,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  Building2, Hash, Calendar, CreditCard, ChevronRight,
  ExternalLink, Search, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { toast } from 'sonner';

interface OrderItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customization?: any;
  menu_items?: {
    name: string;
    description?: string;
  };
  menus?: {
    name: string;
    description?: string;
  };
}

interface FullReceiptOrder {
  id: string;
  order_number: string;
  user_id: string;
  subtotal: number;
  tax: number;
  service_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  payment_method: string;
  notes?: string;
  created_at: string;
  loyalty_discount?: number;
  cafes?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  order_items?: OrderItemDetail[];
  receipt_number?: string;
}

export default function ReceiptsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeOrderId } = useParams<{ id?: string }>();
  
  const selectedOrderId = routeOrderId || searchParams.get('orderId');
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<FullReceiptOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'pending'>('all');
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // 1. Fetch all user orders with full item details and cafe information
  const { data: userOrders, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer_receipts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Query orders with line items and cafe info
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          cafes:cafe_id (id, name, address, phone, email),
          order_items (
            id, quantity, unit_price, total_price, customization,
            menu_items:menu_item_id (name, description),
            menus:menu_item_id (name, description)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // Query receipts table to merge explicit receipt numbers if generated
      const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId);

      const receiptMap = new Map<string, string>();
      receipts?.forEach(r => {
        if (r.order_id && r.receipt_number) {
          receiptMap.set(r.order_id, r.receipt_number);
        }
      });

      return (orders || []).map((ord): FullReceiptOrder => ({
        ...ord,
        receipt_number: receiptMap.get(ord.id) || `REC-${ord.order_number || ord.id.slice(0, 8).toUpperCase()}`,
      }));
    },
    enabled: !!userId,
  });

  // 2. Fetch specific order if viewing a direct link (e.g. /orders/:id/receipt)
  const { data: directOrder, isLoading: isDirectLoading, error: directError } = useQuery({
    queryKey: ['direct_receipt_order', selectedOrderId, userId],
    queryFn: async () => {
      if (!selectedOrderId || !userId) return null;

      const { data: ord, error: ordErr } = await supabase
        .from('orders')
        .select(`
          *,
          cafes:cafe_id (id, name, address, phone, email),
          order_items (
            id, quantity, unit_price, total_price, customization,
            menu_items:menu_item_id (name, description),
            menus:menu_item_id (name, description)
          )
        `)
        .eq('id', selectedOrderId)
        .single();

      if (ordErr) throw ordErr;
      if (!ord) return null;

      // Authorization guard: check if order belongs to authenticated user
      if (ord.user_id !== userId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }

      // Check receipt record
      const { data: rRow } = await supabase
        .from('receipts')
        .select('receipt_number')
        .eq('order_id', ord.id)
        .maybeSingle();

      return {
        ...ord,
        receipt_number: rRow?.receipt_number || `REC-${ord.order_number || ord.id.slice(0, 8).toUpperCase()}`,
      } as FullReceiptOrder;
    },
    enabled: !!selectedOrderId && !!userId,
  });

  useEffect(() => {
    if (directOrder) {
      setActiveReceiptOrder(directOrder);
    }
  }, [directOrder]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = (order: FullReceiptOrder) => {
    const cafeName = order.cafes?.name || 'Coffee OS';
    const lines = [
      `================================================`,
      `                 ${cafeName.toUpperCase()}            `,
      `              OFFICIAL SALES RECEIPT           `,
      `================================================`,
      `Receipt #: ${order.receipt_number}`,
      `Order #:   ${order.order_number || order.id}`,
      `Date:      ${new Date(order.created_at).toLocaleString()}`,
      `Customer:  ${profile?.full_name || 'Guest'} (${profile?.email || 'N/A'})`,
      `Payment:   ${order.payment_method?.toUpperCase() || 'CHAPA / CASH'} [${order.payment_status.toUpperCase()}]`,
      `------------------------------------------------`,
      `ITEMS:`,
    ];

    (order.order_items || []).forEach((item, idx) => {
      const name = item.menu_items?.name || item.menus?.name || `Item ${idx + 1}`;
      lines.push(`${item.quantity}x ${name.padEnd(28)} ETB ${Number(item.total_price || (item.unit_price * item.quantity)).toFixed(2)}`);
      if (item.customization && typeof item.customization === 'object') {
        const customDetails = Object.entries(item.customization)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (customDetails) {
          lines.push(`   (${customDetails})`);
        }
      }
    });

    lines.push(`------------------------------------------------`);
    lines.push(`Subtotal:                  ETB ${Number(order.subtotal || order.total_amount).toFixed(2)}`);
    if (order.loyalty_discount && Number(order.loyalty_discount) > 0) {
      lines.push(`Loyalty Discount:         -ETB ${Number(order.loyalty_discount).toFixed(2)}`);
    }
    if (order.service_fee && Number(order.service_fee) > 0) {
      lines.push(`Service Fee:              ETB ${Number(order.service_fee).toFixed(2)}`);
    }
    if (order.tax && Number(order.tax) > 0) {
      lines.push(`Tax (VAT 15%):             ETB ${Number(order.tax).toFixed(2)}`);
    }
    lines.push(`================================================`);
    lines.push(`TOTAL PAID:                ETB ${Number(order.total_amount).toFixed(2)}`);
    lines.push(`================================================`);
    lines.push(`Thank you for your patronage!`);
    lines.push(`Verify receipt: ${window.location.origin}/orders/${order.id}/receipt`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${order.receipt_number || order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded successfully');
  };

  const handleShare = async (order: FullReceiptOrder) => {
    const url = `${window.location.origin}/orders/${order.id}/receipt`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${order.receipt_number}`,
          text: `Digital receipt for Order #${order.order_number} at ${order.cafes?.name || 'Coffee OS'}`,
          url,
        });
        toast.success('Receipt link shared');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          toast.success('Receipt link copied to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Receipt link copied to clipboard');
    }
  };

  // Filtered orders for receipt browsing
  const filteredOrders = (userOrders || []).filter(order => {
    const matchesSearch =
      (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.receipt_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.cafes?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'paid') return order.payment_status === 'paid' || order.payment_status === 'completed';
    if (filterType === 'pending') return order.payment_status !== 'paid' && order.payment_status !== 'completed';
    return true;
  });

  // Unauthorized guard for direct receipt lookup
  if (directError && (directError as Error).message === 'UNAUTHORIZED_ACCESS') {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You are not authorized to view this receipt. Receipts can only be accessed by the customer who placed the order.
        </p>
        <Button asChild variant="outline">
          <Link to="/account/receipts">View My Receipts</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific style block to ensure print cleanliness */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-heading font-semibold text-foreground">Customer Receipts</h1>
              <p className="text-sm text-muted-foreground">
                Authoritative transaction receipts with itemized order breakdowns and verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/account/orders">Back to Orders</Link>
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by receipt or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted p-1 rounded-lg">
            <Button
              variant={filterType === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'paid' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setFilterType('paid')}
            >
              Paid
            </Button>
            <Button
              variant={filterType === 'pending' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setFilterType('pending')}
            >
              Unpaid / Pending
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {(isLoading || isDirectLoading) && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="h-24 bg-muted rounded-xl" />
            <div className="h-24 bg-muted rounded-xl" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="glass p-8 rounded-xl border border-destructive/20 text-center space-y-4">
            <p className="text-destructive font-medium">Failed to retrieve digital receipts from database.</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredOrders.length === 0 && (
          <div className="glass p-12 rounded-xl border border-border text-center space-y-3">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="font-semibold text-lg text-foreground">No receipts found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Receipts are automatically generated when you place orders at our cafes.
            </p>
            <Button asChild className="mt-2" variant="outline">
              <Link to="/menu">Explore Menu & Place Order</Link>
            </Button>
          </div>
        )}

        {/* Receipt List */}
        {!isLoading && filteredOrders.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => {
              const isPaid = order.payment_status === 'paid' || order.payment_status === 'completed';
              const totalItems = (order.order_items || []).reduce((acc, curr) => acc + curr.quantity, 0);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-5 border border-border hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base md:text-lg text-foreground font-mono">
                        {order.receipt_number}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize font-medium ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {order.payment_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground border-l border-border pl-2">
                        Order #{order.order_number || order.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {order.cafes?.name || 'Coffee OS Cafe'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                      <span>
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="pt-1 text-sm font-medium text-foreground">
                      Total Paid: <span className="text-primary font-bold">{order.total_amount} ETB</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setActiveReceiptOrder(order)}
                    >
                      <FileText className="w-4 h-4" /> View Itemized Receipt
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleDownload(order)}
                    >
                      <Download className="w-4 h-4" /> Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => handleShare(order)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Detailed Itemized Receipt Modal / Dialog */}
        {activeReceiptOrder && (
          <Dialog open={!!activeReceiptOrder} onOpenChange={(open) => { if (!open) setActiveReceiptOrder(null); }}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 md:p-6">
              <DialogHeader className="no-print">
                <DialogTitle className="flex items-center justify-between text-xl font-heading">
                  <span>Digital Tax Receipt</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 h-8">
                      <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(activeReceiptOrder)} className="gap-1.5 h-8">
                      <Download className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleShare(activeReceiptOrder)} className="gap-1.5 h-8">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Authoritative Printable Receipt Card */}
              <div
                id="printable-receipt"
                ref={receiptPrintRef}
                className="mt-4 bg-card border border-border rounded-xl p-6 md:p-8 space-y-6 shadow-sm"
              >
                {/* Header */}
                <div className="border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold font-heading text-foreground">
                      {activeReceiptOrder.cafes?.name || 'Coffee OS Addis Ababa'}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeReceiptOrder.cafes?.address || 'Bole Sub-City, Addis Ababa, Ethiopia'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tel: {activeReceiptOrder.cafes?.phone || '+251 11 661 2233'} | TIN: 0092817451
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <Badge variant="secondary" className="font-mono text-xs mb-1">
                      {activeReceiptOrder.receipt_number}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Order #{activeReceiptOrder.order_number || activeReceiptOrder.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activeReceiptOrder.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Customer & Payment Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-muted/40 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block font-medium">Billed To:</span>
                    <span className="font-semibold text-foreground text-sm">
                      {profile?.full_name || 'Valued Customer'}
                    </span>
                    <span className="block text-muted-foreground">{profile?.email || 'Registered Customer'}</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-muted-foreground block font-medium">Payment Information:</span>
                    <span className="font-semibold text-foreground uppercase">
                      {activeReceiptOrder.payment_method || 'Chapa Payment Gateway'}
                    </span>
                    <span className="block text-emerald-600 dark:text-emerald-400 font-medium capitalize">
                      Status: {activeReceiptOrder.payment_status}
                    </span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Purchased Items
                  </h4>
                  <div className="w-full max-w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 font-medium">Item & Specifications</th>
                          <th className="pb-2 text-center font-medium">Qty</th>
                          <th className="pb-2 text-right font-medium">Unit Price</th>
                          <th className="pb-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(activeReceiptOrder.order_items || []).map((item, idx) => {
                          const itemName = item.menu_items?.name || item.menus?.name || `Menu Selection ${idx + 1}`;
                          const lineTotal = item.total_price || (item.unit_price * item.quantity);

                          return (
                            <tr key={item.id || idx}>
                              <td className="py-2.5">
                                <span className="font-medium text-foreground block">{itemName}</span>
                                {item.customization && typeof item.customization === 'object' && (
                                  <span className="text-[11px] text-muted-foreground block">
                                    {Object.entries(item.customization)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(' • ')}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                              <td className="py-2.5 text-right text-muted-foreground">{Number(item.unit_price).toFixed(2)} ETB</td>
                              <td className="py-2.5 text-right font-semibold text-foreground">{Number(lineTotal).toFixed(2)} ETB</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Calculation */}
                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{Number(activeReceiptOrder.subtotal || activeReceiptOrder.total_amount).toFixed(2)} ETB</span>
                  </div>

                  {activeReceiptOrder.loyalty_discount && Number(activeReceiptOrder.loyalty_discount) > 0 ? (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Loyalty / Voucher Discount</span>
                      <span>- {Number(activeReceiptOrder.loyalty_discount).toFixed(2)} ETB</span>
                    </div>
                  ) : null}

                  {activeReceiptOrder.service_fee && Number(activeReceiptOrder.service_fee) > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Service Fee (5%)</span>
                      <span>{Number(activeReceiptOrder.service_fee).toFixed(2)} ETB</span>
                    </div>
                  ) : null}

                  {activeReceiptOrder.tax && Number(activeReceiptOrder.tax) > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (VAT 15%)</span>
                      <span>{Number(activeReceiptOrder.tax).toFixed(2)} ETB</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-base md:text-lg font-bold text-foreground border-t border-border pt-3">
                    <span>Total Amount Paid</span>
                    <span className="text-primary font-mono">{Number(activeReceiptOrder.total_amount).toFixed(2)} ETB</span>
                  </div>
                </div>

                {/* Bottom Verification Section with QR Code */}
                <div className="border-t border-dashed border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Digital Proof of Payment</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      Scan QR code or keep this digital receipt for warranty, refunds, and cafe loyalty rewards.
                    </p>
                  </div>

                  <div className="shrink-0 bg-white p-2 rounded-lg border border-border shadow-sm">
                    <QRCodeDataUrl
                      text={`${window.location.origin}/orders/${activeReceiptOrder.id}/receipt`}
                      width={96}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}