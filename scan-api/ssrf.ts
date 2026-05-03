import dns from 'node:dns/promises'

function ipv4ToNumber(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const oct = m.slice(1, 5).map((x) => Number(x))
  if (oct.some((n) => n > 255)) return null
  return ((oct[0] << 24) | (oct[1] << 16) | (oct[2] << 8) | oct[3]) >>> 0
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const n = ipv4ToNumber(ip)
  if (n === null) return true
  // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10 (CGNAT), 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 240.0.0.0/4
  if ((n & 0xff00_0000) === 0x0a00_0000) return true // 10/8
  if ((n & 0xff00_0000) === 0x7f00_0000) return true // 127/8
  if ((n & 0xffff_0000) === 0xa9fe_0000) return true // 169.254/16 link-local
  if ((n & 0xfff0_0000) === 0xac10_0000) return true // 172.16/12
  if ((n & 0xffff_0000) === 0xc0a8_0000) return true // 192.168/16
  if ((n & 0xffc0_0000) === 0x6440_0000) return true // 100.64/10 CGNAT
  if (n === 0) return true
  return false
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1') return true
  if (lower.startsWith('fe80:')) return true // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
  if (lower.startsWith('::ffff:')) {
    const tail = lower.slice('::ffff:'.length)
    const v4 = tail.includes('%') ? tail.split('%')[0] : tail
    return isPrivateOrReservedIpv4(v4)
  }
  return false
}

export async function assertSafePublicHostname(hostname: string): Promise<void> {
  const h = hostname.trim().toLowerCase()
  if (!h || h.includes('/') || h.includes(':')) {
    throw new Error('Invalid hostname')
  }
  if (h === 'localhost' || h.endsWith('.localhost')) {
    throw new Error('That address cannot be scanned from here.')
  }
  if (h.endsWith('.local')) {
    throw new Error('Local-only hostnames cannot be scanned.')
  }

  const lookup = await dns.lookup(h, { all: true })
  if (lookup.length === 0) throw new Error('Could not resolve that hostname.')

  for (const addr of lookup) {
    if (addr.family === 4 && isPrivateOrReservedIpv4(addr.address)) {
      throw new Error('That host resolves to a private network address — blocked for safety.')
    }
    if (addr.family === 6 && isPrivateOrReservedIpv6(addr.address)) {
      throw new Error('That host resolves to a private network address — blocked for safety.')
    }
  }
}
