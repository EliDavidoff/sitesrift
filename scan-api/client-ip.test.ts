import type { IncomingMessage } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { scanClientIp } from './client-ip.ts'

function mockReq(partial: {
  headers?: Record<string, string | string[]>
  remoteAddress?: string
}): IncomingMessage {
  return {
    headers: partial.headers ?? {},
    socket:
      partial.remoteAddress !== undefined ? { remoteAddress: partial.remoteAddress } : undefined,
  } as IncomingMessage
}

describe('scanClientIp', () => {
  afterEach(() => {
    delete process.env.SCAN_API_TRUST_PROXY
  })

  it('uses TCP peer when proxy headers are not trusted', () => {
    expect(scanClientIp(mockReq({ remoteAddress: '203.0.113.5' }))).toBe('203.0.113.5')
    expect(scanClientIp(mockReq({ remoteAddress: '::ffff:192.168.1.40' }))).toBe('192.168.1.40')
  })

  it('ignores spoofed X-Forwarded-For when trust proxy is off', () => {
    expect(
      scanClientIp(
        mockReq({
          remoteAddress: '127.0.0.1',
          headers: { 'x-forwarded-for': '9.9.9.9' },
        }),
      ),
    ).toBe('127.0.0.1')
  })

  it('prefers CF-Connecting-IP when SCAN_API_TRUST_PROXY is enabled', () => {
    process.env.SCAN_API_TRUST_PROXY = '1'
    expect(
      scanClientIp(
        mockReq({
          remoteAddress: '10.0.0.7',
          headers: {
            'cf-connecting-ip': '198.51.100.22',
            'x-forwarded-for': '203.0.113.99, 10.0.0.7',
          },
        }),
      ),
    ).toBe('198.51.100.22')
  })

  it('falls back to first XFF segment when trusted and no CDN-specific header', () => {
    process.env.SCAN_API_TRUST_PROXY = 'true'
    expect(
      scanClientIp(
        mockReq({
          remoteAddress: '10.0.0.7',
          headers: { 'x-forwarded-for': '203.0.113.88, 10.0.0.7' },
        }),
      ),
    ).toBe('203.0.113.88')
  })
})
