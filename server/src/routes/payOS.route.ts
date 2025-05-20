// File: src/routes/payos.route.ts

import PayOS from '@payos/node'
import prisma from '@/database'
import { OrderStatus } from '@/constants/type'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Khởi tạo PayOS SDK
const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID || '956b4efa-c82c-451e-aa52-da044cdc5b51',
  process.env.PAYOS_API_KEY || 'bdb444e0-053e-4e28-aba2-9b768cd341b5',
  process.env.PAYOS_CHECKSUM_KEY || '1f878caf651e4376d654e7d8f806d4914eed38d819b4e36e8ee75b2b8f071fd4'
)

const YOUR_DOMAIN = process.env.FRONTEND_DOMAIN || `http://localhost:3000`
const MANAGER_ROOM_NAME = 'ManagerRoom'

// Interfaces
interface CreatePaymentLinkBody {
  orderCode: number
  amount: number
  description: string
  items: Array<{ name: string; quantity: number; price: number }>
}

interface VerifyRedirectPayload {
  orderCode?: string
  amount?: string
  description?: string
  status?: string
  transactionId?: string
  message?: string
  code?: string
  id?: string
  cancel?: string
  sig?: string
}

// Kiểu cho dữ liệu giao dịch chi tiết từ webhook (nằm trong webhookPayload.data.data)
interface PayOSTransactionDetailsFromWebhook {
  accountNumber: string
  amount: number
  description: string
  reference: string
  transactionDateTime: string
  virtualAccountNumber: string
  currency: string
  orderCode: number // Mã đơn hàng (Order ID của hệ thống) bạn đã gửi cho PayOS
  paymentLinkId: string
  code: string // Mã trạng thái giao dịch, '00' thường là thành công
  desc: string
}

// Kiểu cho object `data` bên ngoài chứa `data` con và `signature` (theo payload bạn cung cấp)
interface PayOSWebhookInnerData {
  accountNumber?: string
  amount?: number
  description?: string
  data: PayOSTransactionDetailsFromWebhook // Dữ liệu giao dịch chính được ký
  signature: string // Chữ ký cho object PayOSWebhookInnerData này
}

// Kiểu cho toàn bộ body của webhook PayOS (request.body)
interface PayOSWebhookPayload {
  code: string
  desc: string
  success?: boolean
  data: PayOSWebhookInnerData
}

async function payosRoutes(fastify: FastifyInstance, options: any) {
  // Route tạo link thanh toán (Không thay đổi nhiều)
  fastify.post(
    '/create-embedded-payment-link',
    async (request: FastifyRequest<{ Body: CreatePaymentLinkBody }>, reply: FastifyReply) => {
      const { orderCode, amount, description, items } = request.body
      if (!orderCode || !amount || Number(amount) <= 0 || !items || !Array.isArray(items) || items.length === 0) {
        return reply
          .code(400)
          .send({ error: true, message: 'Thông tin đơn hàng không hợp lệ (orderCode, amount, items).' })
      }
      const paymentBodyToPayOS = {
        orderCode: Number(orderCode),
        amount: Number(amount),
        description: description || `Thanh toan cho don hang #${orderCode}`,
        items: items,
        returnUrl: `${YOUR_DOMAIN}/payment-callback`,
        cancelUrl: `${YOUR_DOMAIN}/payment-callback`
      }
      try {
        fastify.log.info(`[PayOS CreateLink] Body gửi cho PayOS: ${JSON.stringify(paymentBodyToPayOS, null, 2)}`)
        const paymentLinkResponse = await payOS.createPaymentLink(paymentBodyToPayOS)
        fastify.log.info('[PayOS CreateLink] Response từ PayOS:', paymentLinkResponse)
        reply.send(paymentLinkResponse)
      } catch (error: any) {
        fastify.log.error('[PayOS CreateLink] Lỗi:', error)
        reply.code(error.status || 500).send({ error: true, message: error.message || 'Lỗi không xác định' })
      }
    }
  )

  // Route `/handle-payment-redirect` (Không thay đổi nhiều)
  fastify.post(
    '/handle-payment-redirect',
    async (request: FastifyRequest<{ Body: VerifyRedirectPayload }>, reply: FastifyReply) => {
      const redirectParams = request.body
      fastify.log.info('[PayOS Redirect] Params từ frontend:', redirectParams)
      const { orderCode, status: redirectStatus } = redirectParams
      if (!orderCode || !redirectStatus) {
        return reply.code(400).send({ error: true, message: 'Thiếu thông tin từ redirect.' })
      }
      const payOSOrderCodeFromRedirect = Number(orderCode)
      const statusFromRedirect = String(redirectStatus).toUpperCase()
      if (statusFromRedirect === 'PAID') {
        fastify.log.info(
          `[PayOS Redirect] Status PAID cho orderCode ${payOSOrderCodeFromRedirect}. Emitting ui_preliminary_payment_update.`
        )
        fastify.io
          .to(MANAGER_ROOM_NAME)
          .emit('ui_preliminary_payment_update', { orderCode: payOSOrderCodeFromRedirect, status: 'PAID' })
      }
      reply.send({
        error: false,
        verified: true,
        message: 'Thông tin redirect đã được xử lý (lạc quan).',
        data: { status: statusFromRedirect, orderCode }
      })
    }
  )

  interface IDataHook {
    guest: {
      id: number
      name: string
      tableNumber: number | null
      refreshToken: string | null
      refreshTokenExpiresAt: Date | null
      createdAt: Date
      updatedAt: Date
    } | null
    dishSnapshot: {
      id: number
      name: string
      price: number
      description: string
      image: string
      status: string
      dishId: number | null
      updatedAt: Date
      createdAt: Date
    }
  }

  interface IDataHook_1 {
    id: number
    guestId: number | null
    tableNumber: number | null
    dishSnapshotId: number
    quantity: number | any
    orderHandlerId: number | null
    status: string
    createdAt: Date
    updatedAt: Date
    totalPrice: any
    tableId: any
    dishId: any
    price: any
  }

  type Result = IDataHook & IDataHook_1

  // **ROUTE XỬ LÝ WEBHOOK TỪ PAYOS**
  // URL này bạn đã đăng ký với PayOS: https://ba91-171-225-205-34.ngrok-free.app/receive-hook
  fastify.post('/receive-hook', async (request: FastifyRequest<{ Body: PayOSWebhookPayload }>, reply: FastifyReply) => {
    const webhookPayload = request.body
    fastify.log.info('======================================================================')
    fastify.log.info('[PayOS Webhook] Received RAW data at /receive-hook:', JSON.stringify(webhookPayload, null, 2))
    fastify.log.info('======================================================================')

    console.log(request.body)

    try {
      // Bước 1: Kiểm tra cấu trúc payload cơ bản
      if (!webhookPayload || !webhookPayload.data || !webhookPayload.data.signature || !webhookPayload.data.data) {
        fastify.log.error('[PayOS Webhook] Cấu trúc dữ liệu webhook không hợp lệ. Payload:', webhookPayload)
        return reply
          .code(400)
          .send({ error: true, message: 'Dữ liệu webhook không hợp lệ hoặc thiếu các trường cần thiết.' })
      }

      // Bước 2: Xác thực dữ liệu webhook
      // Truyền object `webhookPayload.data` (chứa cả signature và object `data` con) vào hàm xác thực.
      // Hàm verifyPaymentWebhookData sẽ trả về nội dung của `webhookPayload.data.data` nếu thành công.
      const verifiedTransactionDetails = payOS.verifyPaymentWebhookData(webhookPayload.data as any)

      console.log('verifiedTransactionDetails', verifiedTransactionDetails)

      fastify.log.info(
        '[PayOS Webhook] Dữ liệu đã được xác thực thành công. Chi tiết giao dịch:',
        verifiedTransactionDetails
      )

      // Bước 3: Xử lý dữ liệu giao dịch đã được xác thực
      const systemOrderCode = Number(verifiedTransactionDetails.orderCode) // Đây là Order ID của bạn
      const isPaymentSuccessByPayOS = String(verifiedTransactionDetails.code).toUpperCase() === '00' // '00' là thành công

      if (isPaymentSuccessByPayOS) {
        fastify.log.info(
          `[PayOS Webhook] Thanh toán cho Order ID ${systemOrderCode} được XÁC NHẬN THÀNH CÔNG từ PayOS.`
        )

        if (!prisma || !prisma.order) {
          fastify.log.error('[PayOS Webhook] Lỗi cấu hình: prisma.order is undefined!')
          return reply.code(500).send({ error: true, message: 'Lỗi cấu hình server (Prisma Order).' })
        }

        // Bước 4: Cập nhật trạng thái đơn hàng thực tế (Order) trong database của bạn
        const orderToUpdate = await prisma.order.findUnique({
          where: { id: systemOrderCode }
        })

        if (!orderToUpdate) {
          fastify.log.error(`[PayOS Webhook] Không tìm thấy Order với ID ${systemOrderCode} trong DB để cập nhật.`)
          return reply.code(200).send({ success: true, message: 'Webhook received, order not found in system.' })
        }

        if (orderToUpdate.status === OrderStatus.Paid) {
          fastify.log.info(`[PayOS Webhook] Order ID ${systemOrderCode} đã ở trạng thái PAID. Bỏ qua cập nhật DB.`)
        } else {
          // Cập nhật Order thành PAID
          const updatedOrder = (await prisma.order.update({
            where: { id: systemOrderCode },
            data: {
              status: OrderStatus.Paid
            },
            include: {
              guest: true,
              dishSnapshot: true
            }
          })) as Result

          if (updatedOrder) {
            fastify.log.info(`[PayOS Webhook] Đã cập nhật thành công Order ID ${systemOrderCode} thành PAID trong DB.`)

            // Bước 5: Phát sự kiện Socket.IO đến các client
            const socketPayload = [
              {
                id: updatedOrder.id,
                status: updatedOrder.status,
                guest: updatedOrder.guest
                  ? {
                      id: updatedOrder.guest.id,
                      name: updatedOrder.guest.name,
                      tableNumber: updatedOrder.guest.tableNumber
                    }
                  : null,
                totalPrice: updatedOrder.totalPrice,
                guestId: updatedOrder.guestId,
                tableId: updatedOrder.tableId,
                dishId: updatedOrder.dishId,
                quantity: updatedOrder.quantity,
                price: updatedOrder.price,
                createdAt: updatedOrder.createdAt.toISOString(),
                updatedAt: updatedOrder.updatedAt.toISOString(),
                dishSnapshot: updatedOrder.dishSnapshot
              }
            ]

            fastify.io.to(MANAGER_ROOM_NAME).emit('payment', socketPayload)
            fastify.log.info(
              `[PayOS Webhook] Đã phát sự kiện 'payment' đến room '${MANAGER_ROOM_NAME}' cho Order ID ${systemOrderCode}.`
            )

            if (updatedOrder.guestId && prisma.socket) {
              const guestSocket = await prisma.socket.findUnique({ where: { guestId: updatedOrder.guestId } })
              if (guestSocket?.socketId) {
                fastify.io.to(guestSocket.socketId).emit('payment', socketPayload)
                fastify.log.info(
                  `[PayOS Webhook] Đã phát sự kiện 'payment' đến guest ${updatedOrder.guestId} (socket ${guestSocket.socketId})`
                )
              }
            }
          } else {
            fastify.log.warn(`[PayOS Webhook] Không thể cập nhật Order ID ${systemOrderCode}.`)
          }
        }
      } else {
        fastify.log.info(
          `[PayOS Webhook] Trạng thái thanh toán cho Order ID ${systemOrderCode} KHÔNG PHẢI 'PAID' (Mã PayOS: ${verifiedTransactionDetails.code}).`
        )
      }
      reply.code(200).send({ success: true, message: 'Webhook received and processed.' })
    } catch (error: any) {
      fastify.log.error('[PayOS Webhook] Lỗi xử lý webhook:', error)
      const statusCode = error.name === 'PayOSError' && error.message.toLowerCase().includes('signature') ? 400 : 500
      reply.code(statusCode).send({ error: true, message: error.message || 'Error processing webhook.' })
    }
  })
}

export default payosRoutes
