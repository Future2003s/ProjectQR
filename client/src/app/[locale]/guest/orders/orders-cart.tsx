"use client";

import { useAppStore } from "@/components/app-provider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { OrderStatus } from "@/constants/type";
import { formatCurrency, getVietnameseOrderStatus } from "@/lib/utils";
import { useGuestGetOrderListQuery } from "@/queries/useGuest";
import { UpdateOrderResType } from "@/schemaValidations/order.schema";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface PayOSOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface PayOSData {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

interface UiPreliminaryPaymentUpdatePayload {
  orderCode: string | null;
  status: string;
}

export default function OrdersCart() {
  const [payOSData, setPayOSData] = useState<PayOSData | null>(null);
  const [isPayOSLoading, setIsPayOSLoading] = useState<boolean>(false);
  const [payOSError, setPayOSError] = useState<string | null>(null);

  const { data: guestOrderData, refetch } = useGuestGetOrderListQuery();

  const [optimisticOrders, setOptimisticOrders] = useState<[]>([]);

  const serverOrders = useMemo(
    () => guestOrderData?.payload.data ?? [],
    [guestOrderData]
  );

  useEffect(() => {
    setOptimisticOrders(serverOrders);
  }, [serverOrders]);

  const socket = useAppStore((state) => state.socket);

  const { waitingForPaying, paid } = useMemo(() => {
    console.log(
      "OrdersCart: Recalculating waitingForPaying and paid based on optimisticOrders:",
      optimisticOrders
    );
    return optimisticOrders.reduce(
      (result, order) => {
        const itemPrice = order.dishSnapshot.price * order.quantity;
        if (order.status === OrderStatus.Delivered) {
          return {
            ...result,
            waitingForPaying: {
              price: result.waitingForPaying.price + itemPrice,
              quantity: result.waitingForPaying.quantity + order.quantity,
            },
          };
        }
        if (order.status === OrderStatus.Paid) {
          return {
            ...result,
            paid: {
              price: result.paid.price + itemPrice,
              quantity: result.paid.quantity + order.quantity,
            },
          };
        }
        return result;
      },
      {
        waitingForPaying: { price: 0, quantity: 0 },
        paid: { price: 0, quantity: 0 },
      }
    );
  }, [optimisticOrders]);

  const performOptimisticUpdateToPaid = (payOSOrderCode?: string | null) => {
    console.log(
      "OrdersCart: Performing optimistic update to PAID. PayOS Order Code:",
      payOSOrderCode
    );
    setOptimisticOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.status === OrderStatus.Delivered
          ? { ...order, status: OrderStatus.Paid }
          : order
      )
    );
    refetch();
    setPayOSData(null);
  };

  useEffect(() => {
    const handlePaymentStatusUpdateFromLocalStorage = () => {
      if (typeof window !== "undefined") {
        const paymentUpdateInfoRaw = localStorage.getItem(
          "paymentStatusUpdated"
        );
        if (paymentUpdateInfoRaw) {
          try {
            const paymentUpdateInfo = JSON.parse(paymentUpdateInfoRaw) as {
              status?: string;
              orderCode?: string;
              timestamp?: number;
            };
            console.log(
              "OrdersCart: Phát hiện cập nhật từ localStorage:",
              paymentUpdateInfo
            );

            if (paymentUpdateInfo.status === OrderStatus.Paid) {
              toast({
                title: "Thanh toán được ghi nhận",
                description: `Đơn hàng #${
                  paymentUpdateInfo.orderCode || ""
                } đã thanh toán. Cập nhật giao diện...`,
                className: "bg-green-500 text-white",
              });
              performOptimisticUpdateToPaid(paymentUpdateInfo.orderCode);
            } else {
              refetch();
            }
            localStorage.removeItem("paymentStatusUpdated");
          } catch (e) {
            console.error(
              "OrdersCart: Lỗi khi parse paymentStatusUpdated từ localStorage:",
              e
            );
            localStorage.removeItem("paymentStatusUpdated");
          }
        }
      }
    };

    handlePaymentStatusUpdateFromLocalStorage();

    if (typeof window !== "undefined") {
      window.addEventListener(
        "focus",
        handlePaymentStatusUpdateFromLocalStorage
      );
    }

    if (!socket) {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "focus",
          handlePaymentStatusUpdateFromLocalStorage
        );
      }
      return;
    }

    const onConnect = () => {
      console.log("OrdersCart: Socket connected:", socket?.id);
    };
    const onDisconnect = () => {
      console.log("OrdersCart: Socket disconnected");
    };

    const onUpdateOrder = (data: UpdateOrderResType["data"]) => {
      const {
        dishSnapshot: { name },
        quantity,
        status,
      } = data;
      console.log("OrdersCart: Nhận được sự kiện 'update-order'", data);
      toast({
        description: `Món ${name} (SL: ${quantity}) vừa được cập nhật sang trạng thái "${getVietnameseOrderStatus(
          status
        )}"`,
      });
      refetch();
    };

    const onPaymentProcessedByBackend = (payload: PayGuestOrdersResPayload) => {
      console.log(
        "OrdersCart: Nhận được sự kiện 'payment' (đã xử lý bởi backend webhook)",
        payload
      );
      toast({
        title: "Thanh toán đã được XÁC NHẬN!",
        description: `Hệ thống đã cập nhật trạng thái các đơn hàng đã thanh toán.`,
        className: "bg-green-600 text-white",
        duration: 5000,
      });
      refetch();
      setPayOSData(null);
    };

    const onUiPreliminaryPaymentUpdate = (
      payload: UiPreliminaryPaymentUpdatePayload
    ) => {
      console.log(
        "OrdersCart: Nhận được sự kiện 'ui_preliminary_payment_update'",
        payload
      );
      if (payload.status === OrderStatus.Paid) {
        toast({
          title: "Thanh toán thành công!",
          description: `Đơn hàng #${
            payload.orderCode || ""
          } đã được ghi nhận thanh toán. Giao diện cập nhật...`,
          className: "bg-green-500 text-white",
          duration: 3000,
        });
        performOptimisticUpdateToPaid(payload.orderCode);
      } else if (
        payload.orderCode &&
        (payload.status === OrderStatus.Cancelled ||
          payload.status === OrderStatus.Failed)
      ) {
        toast({
          title: `Giao dịch cho đơn hàng #${payload.orderCode} ${
            payload.status === OrderStatus.Cancelled ? "đã bị hủy" : "thất bại"
          }.`,
          variant: "destructive",
          duration: 3000,
        });
        refetch();
      }
    };

    if (socket.connected) {
      onConnect();
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("update-order", onUpdateOrder);
    socket.on("payment", onPaymentProcessedByBackend);
    socket.on("ui_preliminary_payment_update", onUiPreliminaryPaymentUpdate);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "focus",
          handlePaymentStatusUpdateFromLocalStorage
        );
      }
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
      socket?.off("update-order", onUpdateOrder);
      socket?.off("payment", onPaymentProcessedByBackend);
      socket?.off(
        "ui_preliminary_payment_update",
        onUiPreliminaryPaymentUpdate
      );
    };
  }, [socket, refetch, serverOrders]);

  const handleCreatePayOSLink = async () => {
    if (waitingForPaying.price <= 0) {
      toast({
        title: "Thông báo",
        description:
          "Không có đơn hàng nào cần thanh toán hoặc tổng tiền bằng 0.",
        variant: "default",
      });
      return;
    }
    setIsPayOSLoading(true);
    setPayOSError(null);
    setPayOSData(null);
    const orderItems: PayOSOrderItem[] = optimisticOrders
      .filter((order) => order.status === OrderStatus.Delivered)
      .map((order) => ({
        name: order.dishSnapshot.name,
        quantity: order.quantity,
        price: order.dishSnapshot.price,
      }));
    if (orderItems.length === 0) {
      toast({
        description:
          "Không có món nào đã được phục vụ để thanh toán (kiểm tra optimistic state).",
        variant: "destructive",
      });
      setIsPayOSLoading(false);
      return;
    }
    const firstOrderWithGuestInfo = optimisticOrders.find(
      (order) => order.guest && order.guest.tableNumber
    );
    const simpleDescription = firstOrderWithGuestInfo?.guest?.tableNumber
      ? `Ban ${firstOrderWithGuestInfo.guest.tableNumber}`
      : `Khach TT`;
    const shortOrderCodeForDesc = String(Date.now()).slice(-6);
    const finalDescription = `${simpleDescription} ${shortOrderCodeForDesc}`;
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:4000";
      const response = await fetch(
        `${backendUrl}/create-embedded-payment-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderCode: Number(String(Date.now()).slice(-6)),
            amount: waitingForPaying.price,
            description: finalDescription,
            items: orderItems,
          }),
        }
      );
      if (!response.ok) {
        let errorDataMessage = "Không thể tạo link thanh toán";
        try {
          const errorData = await response.json();
          errorDataMessage = errorData?.message || errorDataMessage;
        } catch (parseError) {
          errorDataMessage = (await response.text()) || errorDataMessage;
        }
        throw new Error(
          `Lỗi từ server: ${response.status} - ${errorDataMessage}`
        );
      }
      const paymentLinkData: PayOSData = await response.json();
      setPayOSData(paymentLinkData);
      toast({
        title: "Đã tạo link PayOS",
        description: "Vui lòng hoàn tất thanh toán.",
      });
    } catch (error: any) {
      console.error("Lỗi khi tạo link thanh toán PayOS:", error);
      setPayOSError(
        error.message || "Lỗi không xác định khi tạo link thanh toán."
      );
      toast({
        title: "Lỗi tạo link thanh toán",
        description:
          error.message ||
          "Không thể tạo link thanh toán PayOS. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsPayOSLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4 mb-4">
        {optimisticOrders.length === 0 && !guestOrderData && (
          <p className="text-center text-gray-500">Đang tải đơn hàng...</p>
        )}
        {optimisticOrders.length === 0 && guestOrderData && (
          <p className="text-center text-gray-500">Chưa có đơn hàng nào.</p>
        )}
        {optimisticOrders.map((order, index) => (
          <div
            key={order.id}
            className="flex gap-4 p-3 border border-gray-200 rounded-lg shadow-sm bg-white"
          >
            <div className="text-sm font-semibold text-gray-500 w-6 text-center">
              {index + 1}
            </div>
            <div className="flex-shrink-0 relative">
              <Image
                src={order.dishSnapshot.image}
                alt={order.dishSnapshot.name}
                height={80}
                width={80}
                quality={100}
                className="object-cover w-[80px] h-[80px] rounded-md border border-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/80x80/cccccc/ffffff?text=Ảnh+Lỗi";
                }}
              />
            </div>
            <div className="flex-grow space-y-1">
              <h3 className="text-sm font-medium text-gray-800">
                {order.dishSnapshot.name}
              </h3>
              <div className="text-xs font-semibold text-gray-600">
                {formatCurrency(order.dishSnapshot.price)} x{" "}
                <Badge variant="secondary" className="px-1.5 py-0.5">
                  {order.quantity}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Tổng:{" "}
                {formatCurrency(order.dishSnapshot.price * order.quantity)}
              </div>
            </div>
            <div className="flex-shrink-0 ml-auto flex justify-center items-center">
              <Badge
                variant={
                  order.status === OrderStatus.Paid ? "default" : "outline"
                }
                className={`text-xs ${
                  order.status === OrderStatus.Paid
                    ? "bg-green-100 text-green-700"
                    : order.status === OrderStatus.Delivered
                    ? "bg-blue-100 text-blue-700"
                    : ""
                }`}
              >
                {getVietnameseOrderStatus(order.status)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {(paid.quantity > 0 || waitingForPaying.quantity > 0) && (
        <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 shadow-md">
          {paid.quantity > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="w-full flex justify-between items-center text-md font-semibold text-green-600">
                <span>Đã thanh toán ({paid.quantity} món)</span>
                <span>{formatCurrency(paid.price)}</span>
              </div>
            </div>
          )}
          {waitingForPaying.quantity > 0 && (
            <div>
              <div className="w-full flex justify-between items-center text-lg font-bold text-gray-700 mb-3">
                <span>
                  Cần thanh toán ({waitingForPaying.quantity} món đã phục vụ)
                </span>
                <span className="text-red-600">
                  {formatCurrency(waitingForPaying.price)}
                </span>
              </div>
              {!payOSData && waitingForPaying.price > 0 && (
                <button
                  onClick={handleCreatePayOSLink}
                  disabled={isPayOSLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out flex items-center justify-center text-md disabled:opacity-50"
                >
                  {isPayOSLoading
                    ? "Đang xử lý..."
                    : `Thanh Toán Qua PayOS (${formatCurrency(
                        waitingForPaying.price
                      )})`}
                </button>
              )}
              {payOSError && (
                <p className="text-red-500 text-sm mt-2">{payOSError}</p>
              )}
              {payOSData && (
                <div className="mt-4 p-4 bg-white rounded-lg shadow-md border border-gray-300">
                  <h3 className="text-lg font-semibold mb-3 text-center text-blue-600">
                    Thông tin thanh toán PayOS
                  </h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Vui lòng hoàn tất thanh toán bằng một trong các cách sau:
                  </p>
                  {payOSData.checkoutUrl && (
                    <a
                      href={payOSData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out mb-3"
                    >
                      {" "}
                      Mở trang thanh toán PayOS{" "}
                    </a>
                  )}
                  {payOSData.qrCode && (
                    <div className="mt-3 text-center">
                      <p className="text-sm text-gray-600 mb-1">
                        Hoặc quét mã QR (VietQR):
                      </p>
                      <img
                        src={`https://api.vietqr.io/v2/generate?accountNo=${
                          payOSData.accountNumber
                        }&accountName=${encodeURIComponent(
                          payOSData.accountName
                        )}&acqId=${payOSData.bin}&amount=${
                          payOSData.amount
                        }&addInfo=${encodeURIComponent(
                          payOSData.description
                        )}&template=compact2`}
                        alt="VietQR Code"
                        className="mx-auto rounded-md shadow-lg max-w-xs w-full h-auto border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).alt = "Lỗi tải ảnh QR";
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Mã đơn hàng PayOS: {payOSData.orderCode}
                      </p>
                      <p className="text-xs text-gray-500">
                        Số tiền: {formatCurrency(payOSData.amount)}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setPayOSData(null)}
                    className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out text-sm"
                  >
                    Đóng / Tạo link khác{" "}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
