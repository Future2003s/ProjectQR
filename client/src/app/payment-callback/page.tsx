"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
// import PaymentSuccessDisplay from '@/components/PaymentSuccessDisplay'; // Đã import ở trên
// import PaymentFailedDisplay from '@/components/PaymentFailedDisplay';   // Đã import ở trên
import { useAppStore } from "@/components/app-provider";
import PaymentFailedDisplay from "@/components/PaymentFailedDisplay";
import PaymentSuccessDisplay from "@/components/PaymentSuccessDisplay";

interface PaymentDetails {
  orderCode: string | null;
  amount: number | null;
  description: string | null;
  status: string | null;
  transactionId: string | null;
  message: string | null;
  codeParam?: string | null;
  idParam?: string | null;
  cancelParam?: string | null;
  sig?: string | null;
}

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const socket = useAppStore((state) => state.socket);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderCode = searchParams.get("orderCode");
    const amount = searchParams.get("amount");
    const description = searchParams.get("description");
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transactionId");
    const message = searchParams.get("message");
    const codeParam = searchParams.get("code");
    const idParam = searchParams.get("id");
    const cancelParam = searchParams.get("cancel");
    const sig = searchParams.get("sig");

    const allParamsFromUrl = {
      orderCode,
      amount,
      description,
      status,
      transactionId,
      message,
      codeParam,
      idParam,
      cancelParam,
      sig,
    };
    console.log(
      "PaymentCallback: Received params from PayOS:",
      allParamsFromUrl
    );

    let finalStatus = status ? String(status).toUpperCase() : null;

    if (cancelParam === "true" && finalStatus !== "CANCELLED") {
      console.warn(
        `PaymentCallback: Tham số 'cancel=true' được nhận, nhưng 'status' (${finalStatus}) không phải là 'CANCELLED'. Sẽ ưu tiên 'status' từ PayOS.`
      );
    }
    if (!finalStatus && cancelParam === "true") {
      finalStatus = "CANCELLED";
    }

    if (!finalStatus) {
      setError(
        "Không nhận được trạng thái thanh toán hợp lệ từ cổng thanh toán."
      );
      setIsLoading(false);
      return;
    }

    const currentPaymentDetails: PaymentDetails = {
      orderCode: orderCode ? String(orderCode) : null,
      amount: amount ? Number(amount) : null,
      description: description ? String(description) : null,
      status: finalStatus,
      transactionId: transactionId ? String(transactionId) : null,
      message: message ? String(message) : null,
      codeParam,
      idParam,
      cancelParam,
      sig,
    };
    setPaymentDetails(currentPaymentDetails);
    setIsLoading(false);

    if (
      socket &&
      socket.connected &&
      (finalStatus === "PAID" ||
        finalStatus === "CANCELLED" ||
        finalStatus === "FAILED")
    ) {
      const eventName = "client_payment_redirect_info";
      const eventPayload = {
        orderCode: currentPaymentDetails.orderCode,
        status: currentPaymentDetails.status,
      };
      console.log(
        `PaymentCallback: Emitting socket event '${eventName}' with payload:`,
        eventPayload
      );
      socket.emit(eventName, eventPayload);
    }

    if (
      finalStatus === "PAID" ||
      finalStatus === "CANCELLED" ||
      finalStatus === "FAILED"
    ) {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "paymentStatusUpdated",
          JSON.stringify({
            status: finalStatus,
            orderCode,
            timestamp: Date.now(),
          })
        );
        console.log(
          "PaymentCallback: Đã đặt cờ localStorage 'paymentStatusUpdated'",
          { status: finalStatus, orderCode }
        );
      }
    }
  }, [searchParams, socket]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-xl text-gray-700">
          Đang xử lý kết quả thanh toán...
        </p>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <PaymentFailedDisplay
          message={error || "Không thể tải thông tin thanh toán."}
          status={error ? "ERROR_INTERNAL" : "ERROR_NODATA"}
        />
      </div>
    );
  }

  if (paymentDetails.status === "PAID") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
        <PaymentSuccessDisplay {...paymentDetails} />
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 p-4">
        <PaymentFailedDisplay
          orderCode={paymentDetails.orderCode}
          status={paymentDetails.status}
          message={paymentDetails.message}
        />
      </div>
    );
  }
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-xl text-gray-700">Đang tải trang...</p>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
