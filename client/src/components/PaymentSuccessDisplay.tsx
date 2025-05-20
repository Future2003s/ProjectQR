import React from "react";
import Link from "next/link";

interface PaymentSuccessDisplayProps {
  orderCode?: string | null;
  amount?: number | null;
  transactionId?: string | null;
  description?: string | null;
}

const PaymentSuccessDisplay: React.FC<PaymentSuccessDisplayProps> = ({
  orderCode,
  amount,
  transactionId,
  description,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
      }}
      className="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-lg w-full"
    >
      <div
        className="text-center"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          width="100"
          height="100"
          viewBox="0,0,256,256"
          //   style="fill:#40C057;"
        >
          <g
            fill="#40c057"
            fill-rule="nonzero"
            stroke="none"
            stroke-width="1"
            stroke-linecap="butt"
            stroke-linejoin="miter"
            stroke-miterlimit="10"
            stroke-dasharray=""
            stroke-dashoffset="0"
            font-family="none"
            font-weight="none"
            font-size="none"
            text-anchor="none"
          >
            <g transform="scale(4,4)">
              <path d="M32,6c-14.359,0 -26,11.641 -26,26c0,14.359 11.641,26 26,26c14.359,0 26,-11.641 26,-26c0,-14.359 -11.641,-26 -26,-26zM29.081,42.748l-10.409,-9.253l2.657,-2.99l7.591,6.747l15.08,-16.252l3.414,3.414z"></path>
            </g>
          </g>
        </svg>
        <h1 className="text-2xl md:text-3xl font-bold text-green-600 mb-3">
          Thanh Toán Thành Công!
        </h1>
        <p className="text-gray-700 mb-1">Cảm ơn bạn đã hoàn tất thanh toán.</p>
        {orderCode && (
          <p className="text-gray-600 text-lg">
            Mã đơn hàng: <span className="font-semibold">#{orderCode}</span>
          </p>
        )}
      </div>

      {amount && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Chi tiết giao dịch:
          </h2>
          <div className="space-y-1 text-gray-700">
            <p>
              Số tiền:{" "}
              <span className="font-semibold">
                {Number(amount).toLocaleString("vi-VN")} VND
              </span>
            </p>
            {transactionId && (
              <p>
                Mã giao dịch PayOS:{" "}
                <span className="font-semibold">{transactionId}</span>
              </p>
            )}
            {description && (
              <p>
                Nội dung: <span className="font-semibold">{description}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className="mt-8 space-y-3"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          rowGap: "1rem",
        }}
      >
        <Link href="/vi/guest/orders" passHref legacyBehavior>
          <a className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out">
            Xem lại đơn hàng của tôi
          </a>
        </Link>
        <Link href="/" passHref legacyBehavior>
          <a className="block w-full text-center bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out">
            Quay về Trang Chủ
          </a>
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccessDisplay;
