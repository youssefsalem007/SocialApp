import {config} from 'dotenv'
import { resolve } from 'node:path'

config({path:resolve(`./.env.${process.env.NODE_ENV}`)})

export const PORT = process.env.PORT
export const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)
export const DB_URI = process.env.DB_URI as string
export const SECRET_KEY = process.env.SECRET_KEY as string
export const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY as string
export const REDIS_URL = process.env.REDIS_URL as string
export const EMAIL = process.env.EMAIL as string
export const PASSWORD = process.env.PASSWORD as string
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string
export const IV_LENGTH = Number(process.env.IV_LENGTH)
export const CLIENT_ID = process.env.CLIENT_ID as string
export const APPLICATION_NAME = process.env.APPLICATION_NAME as string

export const SYSTEM_ACCESS_TOKEN = process.env.SYSTEM_ACCESS_TOKEN as string
export const USER_ACCESS_TOKEN = process.env.USER_ACCESS_TOKEN as string
export const SYSTEM_REFRESH_TOKEN = process.env.SYSTEM_REFRESH_TOKEN as string
export const USER_REFRESH_TOKEN = process.env.USER_REFRESH_TOKEN as string
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN as string
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN as string


export const AWS_REGION = process.env.AWS_REGION as string
export const AWS_BUCKET_NAME = process.env.AWS_BUCKER_NAME as string
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY as string
export const AWS_EXPIRES_IN = parseInt(process.env.AWS_EXPIRES_IN as string || "120")


