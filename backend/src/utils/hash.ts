import { argon2id, hash as argon2hash, verify as argon2verify } from 'argon2'

const getPepper = (): string => {
  const pepper = process.env.PASSWORD_PEPPER

  if (!pepper) {
    throw new Error('PASSWORD_PEPPER is required')
  }

  return pepper
}

const getPositiveIntFromEnv = (key: string, defaultValue: number): number => {
  const rawValue = process.env[key]

  if (!rawValue) {
    return defaultValue
  }

  const parsedValue = Number.parseInt(rawValue, 10)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer`)
  }

  return parsedValue
}

const getArgon2Config = () => {
  return {
    memoryCost: getPositiveIntFromEnv('ARGON2_MEMORY_COST', 65536),
    timeCost: getPositiveIntFromEnv('ARGON2_TIME_COST', 3),
    parallelism: getPositiveIntFromEnv('ARGON2_PARALLELISM', 1)
  }
}

const hashPassword = async (password: string): Promise<string> => {
  const pepper = getPepper()
  const argon2Config = getArgon2Config()

  return argon2hash(`${password}${pepper}`, {
    type: argon2id,
    ...argon2Config
  })
}

const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const pepper = getPepper()

  return argon2verify(hash, `${password}${pepper}`)
}

export const argon2PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword
}
