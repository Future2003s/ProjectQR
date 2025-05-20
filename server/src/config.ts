import fs from 'fs'
import path from 'path'
import z from 'zod'
import { config } from 'dotenv'

config({
  path: '.env'
})

const checkEnv = async () => {
  const chalk = (await import('chalk')).default
  if (!fs.existsSync(path.resolve('.env'))) {
    console.log(chalk.red(`Không tìm thấy file môi trường .env`))
    process.exit(1)
  }
}
checkEnv()

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  ACCESS_TOKEN_SECRET: z.string().default('_com_access'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('7d'),
  GUEST_ACCESS_TOKEN_EXPIRES_IN: z.string().default('7d'),
  GUEST_REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  INITIAL_EMAIL_OWNER: z.string().default('sang@aa.com'),
  INITIAL_PASSWORD_OWNER: z.string().default('123123'),
  DOMAIN: z.string().default('localhost'),
  PROTOCOL: z.string().default('http'),
  UPLOAD_FOLDER: z.string().default('uploads'),
  SERVER_TIMEZONE: z.string().default('Asia/Saigon'),
  GOOGLE_REDIRECT_CLIENT_URL: z.string().default('http://localhost:3000/login/oauth'),
  GOOGLE_CLIENT_ID: z.string().default('128916138255-bni80cbc32eulu5ek2515s12d75o53qa.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().default('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'),
  DOCKER: z.string().default('DOCKER'),
  GOOGLE_AUTHORIZED_REDIRECT_URI: z.string().default('http://localhost:4000/auth/login/google')
})

const configServer = configSchema.safeParse(process.env)

if (!configServer.success) {
  console.error(configServer.error.issues)
  throw new Error('Các giá trị khai báo trong file .env không hợp lệ')
}
const envConfig = configServer.data
export const API_URL = `${envConfig.PROTOCOL}://${envConfig.DOMAIN}:${envConfig.PORT}`
export default envConfig

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof configSchema> {}
  }
}
