import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import User from '../models/User'
import ApiKey from '../models/ApiKey'
import { hashApiKey } from '../utils/auth'

// Local CLI to mint and revoke API keys directly against the DB — no HTTP, no
// password. Requires MONGO_URI in the environment (the same DB the target API
// uses). Run with:
//   npm run apikey -- create --email admin@example.com [--label import]
//   npm run apikey -- list
//   npm run apikey -- revoke --label import        # or --id <id> / --key <raw>
//   npm run apikey -- revoke --all

const args = process.argv.slice(2)
const command = args[0]
const opt = (name: string): string | undefined => {
  const a = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`))
  if (!a) return undefined
  if (a.includes('=')) return a.split('=').slice(1).join('=')
  return args[args.indexOf(a) + 1] // space-separated form
}
const has = (name: string) => args.includes(`--${name}`)

async function connect() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set')
  await mongoose.connect(process.env.MONGO_URI)
}

async function create() {
  const email = opt('email')
  if (!email) throw new Error('create requires --email <admin email>')
  const user = await User.findOne({ email }).select('isAdmin email')
  if (!user) throw new Error(`No user with email ${email}`)
  if (!user.isAdmin) throw new Error(`User ${email} is not an admin`)

  const raw = `mc_${randomBytes(24).toString('hex')}`
  await ApiKey.create({
    hash: hashApiKey(raw),
    label: opt('label'),
    user: user._id
  })

  console.log('\nAPI key created (shown once — copy it now):\n')
  console.log(`  ${raw}\n`)
  console.log('Use it as the x-api-key header, e.g.:')
  console.log(`  export MC_API_KEY=${raw}\n`)
}

async function list() {
  const keys = await ApiKey.find().populate<{ user: { email: string } }>(
    'user',
    'email'
  )
  if (!keys.length) return console.log('No API keys.')
  for (const k of keys) {
    console.log(
      `${String(k._id)}  label=${k.label ?? '-'}  user=${
        (k.user as unknown as { email?: string })?.email ?? k.user
      }  created=${k.createdAt.toISOString()}  lastUsed=${
        k.lastUsedAt?.toISOString() ?? 'never'
      }`
    )
  }
}

async function revoke() {
  let filter: Record<string, unknown> | null = null
  if (has('all')) filter = {}
  else if (opt('id')) filter = { _id: opt('id') }
  else if (opt('label')) filter = { label: opt('label') }
  else if (opt('key')) filter = { hash: hashApiKey(opt('key') as string) }
  if (!filter) throw new Error('revoke requires --id, --label, --key or --all')
  const { deletedCount } = await ApiKey.deleteMany(filter)
  console.log(`Revoked ${deletedCount} key(s).`)
}

async function main() {
  await connect()
  try {
    if (command === 'create') await create()
    else if (command === 'list') await list()
    else if (command === 'revoke') await revoke()
    else {
      console.log('Usage: apikey <create|list|revoke> [--options]')
      process.exitCode = 1
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
