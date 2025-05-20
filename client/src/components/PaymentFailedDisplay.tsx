import React from "react";
import Link from "next/link";

interface PaymentFailedDisplayProps {
  orderCode?: string | null;
  status?: string | null;
  message?: string | null;
}

const PaymentFailedDisplay: React.FC<PaymentFailedDisplayProps> = ({
  orderCode,
  status,
  message,
}) => {
  let title = "Giao Dịch Không Thành Công";
  let titleColor = "text-red-600";
  let userMessage = "Đã có lỗi xảy ra trong quá trình xử lý giao dịch của bạn.";
  let iconPath =
    "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"; // Error Icon

  if (status === "CANCELLED") {
    title = "Giao Dịch Đã Bị Hủy";
    titleColor = "text-yellow-600";
    // Ưu tiên hiển thị message từ PayOS nếu có, nếu không thì dùng thông báo mặc định.
    userMessage = message || "Bạn đã hủy giao dịch thanh toán.";
    iconPath = "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"; // Warning Icon
  } else if (status === "FAILED") {
    title = "Thanh Toán Thất Bại";
    userMessage =
      message ||
      "Rất tiếc, thanh toán của bạn đã không thành công. Vui lòng thử lại hoặc chọn phương thức khác.";
  } else if (message) {
    // Các trường hợp lỗi khác có message cụ thể
    userMessage = message;
  }

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
          shape-rendering="geometricPrecision"
          text-rendering="geometricPrecision"
          image-rendering="optimizeQuality"
          fill-rule="evenodd"
          clip-rule="evenodd"
          viewBox="0 0 512 512"
          height={"7rem"}
          width={"7rem"}
        >
          <path
            fill="#BF362C"
            fill-rule="nonzero"
            d="M256 0c70.686 0 134.69 28.658 181.016 74.984C483.342 121.31 512 185.314 512 256c0 70.686-28.658 134.69-74.984 181.016C390.69 483.342 326.686 512 256 512c-70.686 0-134.69-28.658-181.016-74.984C28.658 390.69 0 326.686 0 256c0-70.686 28.658-134.69 74.984-181.016C121.31 28.658 185.314 0 256 0z"
          />
          <path
            fill="#F7CA41"
            d="M256 29.464c125.114 0 226.536 101.422 226.536 226.536S381.114 482.536 256 482.536 29.464 381.114 29.464 256 130.886 29.464 256 29.464z"
          />
          <path
            fill="#BF362C"
            fill-rule="nonzero"
            d="M275.55 302.281c-.88 22.063-38.246 22.092-39.1-.007-3.778-37.804-13.443-127.553-13.135-163.074.311-10.946 9.383-17.426 20.989-19.898 3.578-.765 7.513-1.136 11.477-1.132 3.986.007 7.932.4 11.514 1.165 11.988 2.554 21.401 9.301 21.398 20.444l-.045 1.117-13.098 161.385zM256 341.492c14.453 0 26.168 11.717 26.168 26.171 0 14.453-11.715 26.167-26.168 26.167s-26.171-11.714-26.171-26.167c0-14.454 11.718-26.171 26.171-26.171z"
          />
        </svg>
        <h1
          style={{
            textAlign: "center",
          }}
          className={`text-2xl md:text-3xl font-bold ${titleColor} mb-3`}
        >
          {title}
        </h1>
        <p className="text-gray-700 mb-1">{userMessage}</p>
        {orderCode && (
          <p className="text-gray-600 text-lg">
            Mã đơn hàng liên quan:{" "}
            <span className="font-semibold">#{orderCode}</span>
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {status !== "CANCELLED" &&
          status !== "ERROR_INTERNAL" &&
          status !== "ERROR_NODATA" && (
            <Link href="/" passHref legacyBehavior>
              <a className="block w-full text-center bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out">
                Thử Thanh Toán Lại (Về Trang Chủ)
              </a>
            </Link>
          )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              rowGap: "1rem",
              //   text
            }}
          >
            <Link href="/vi/guest/orders" passHref legacyBehavior>
              <a className="block w-full text-center bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out">
                Kiểm tra đơn hàng của tôi
              </a>
            </Link>
            <Link href="/" passHref legacyBehavior>
              <a className="block w-full text-center bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out">
                Quay về Trang Chủ
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedDisplay;
