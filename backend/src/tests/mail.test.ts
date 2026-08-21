import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'

// Mock the mail util so the signup route's fire-and-forget call is observable
// without hitting the network.
vi.mock('../utils/mail', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined)
}))

import app from '../app'
import { sendWelcomeEmail } from '../utils/mail'

const newUser = {
  firstname: 'Jane',
  lastname: 'Roe',
  pseudo: 'janer',
  email: 'jane@test.com',
  password: 'secureRiderPass',
  userType: 'confirmed' as const
}

describe('Signup confirmation email', () => {
  beforeEach(() => {
    vi.mocked(sendWelcomeEmail).mockClear()
  })

  it('sends a confirmation email after a successful signup', async () => {
    const res = await request(app).post('/api/v1/users/account').send(newUser)

    expect(res.status).toBe(201)
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
    // The call also carries a verifyUrl with a random token, so match loosely.
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: newUser.email,
        firstname: newUser.firstname,
        verifyUrl: expect.stringContaining('/verify-email?token=')
      })
    )
  })

  it('does not send an email when validation fails', async () => {
    const res = await request(app)
      .post('/api/v1/users/account')
      .send({ ...newUser, email: undefined })

    expect(res.status).toBe(400)
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('still returns 201 when the email fails to send', async () => {
    vi.mocked(sendWelcomeEmail).mockRejectedValueOnce(new Error('SMTP down'))

    const res = await request(app)
      .post('/api/v1/users/account')
      .send({ ...newUser, email: 'other@test.com', pseudo: 'otherp' })

    // Delivery is best-effort: a mail failure must never break account creation.
    expect(res.status).toBe(201)
  })
})

describe('sendWelcomeEmail (no-op without config)', () => {
  const originalKey = process.env.RESEND_API_KEY

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey
  })

  it('resolves without throwing when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY
    // Import the real implementation, bypassing the module mock above.
    const actual = await vi.importActual<typeof import('../utils/mail')>(
      '../utils/mail'
    )

    await expect(
      actual.sendWelcomeEmail({ to: 'x@test.com', firstname: 'X' })
    ).resolves.toBeUndefined()
  })
})
