import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'
import { collectDeclaredCandidates } from './favicon-probe.ts'

describe('collectDeclaredCandidates', () => {
  const base = 'https://example.com/blog/post'

  it('collects icon and mask-icon links with absolute resolution', () => {
    const html = `
      <head>
        <link rel="icon" href="/f.ico" />
        <link rel="mask-icon" href="https://cdn.example.com/m.svg" color="black" />
      </head>
    `
    const $ = load(html)
    const { tab, touch, hasDataUrlTabIcon } = collectDeclaredCandidates($, base)
    expect(tab).toEqual(['https://example.com/f.ico', 'https://cdn.example.com/m.svg'])
    expect(touch).toEqual([])
    expect(hasDataUrlTabIcon).toBe(false)
  })

  it('treats shortcut icon as a tab icon candidate', () => {
    const html = '<head><link rel="shortcut icon" href="./legacy.ico"/></head>'
    const $ = load(html)
    const { tab } = collectDeclaredCandidates($, base)
    expect(tab).toEqual(['https://example.com/blog/legacy.ico'])
  })

  it('separates apple-touch-icon into the touch bucket', () => {
    const html = `
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple.png" />
      </head>`
    const $ = load(html)
    const { tab, touch } = collectDeclaredCandidates($, base)
    expect(tab).toEqual([])
    expect(touch).toEqual(['https://example.com/apple.png'])
  })

  it('ignores manifest links', () => {
    const html = '<head><link rel="manifest" href="/site.webmanifest"/></head>'
    const $ = load(html)
    const { tab, touch } = collectDeclaredCandidates($, base)
    expect(tab).toEqual([])
    expect(touch).toEqual([])
  })

  it('flags data: tab icons without adding them to URL lists', () => {
    const html =
      '<head><link rel="icon" href="data:image/svg+xml,%3Csvg/%3E" type="image/svg+xml"/></head>'
    const $ = load(html)
    const { tab, hasDataUrlTabIcon } = collectDeclaredCandidates($, base)
    expect(tab).toEqual([])
    expect(hasDataUrlTabIcon).toBe(true)
  })

  it('dedupes identical hrefs', () => {
    const html =
      '<head><link rel="icon" href="/x.png"/><link rel="icon" type="image/png" href="/x.png"/></head>'
    const $ = load(html)
    const { tab } = collectDeclaredCandidates($, base)
    expect(tab).toEqual(['https://example.com/x.png'])
  })
})
