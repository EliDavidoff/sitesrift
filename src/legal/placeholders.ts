/**
 * Policy metadata. Counsel should still review before high-stakes use; wording avoids fake entity names.
 */
export const LEGAL = {
  /** Public operating name */
  operatorName: 'Sitesrift',
  /**
   * Short clause for Terms where a legal party name is required but formation is still in flight.
   */
  operatorCapacity:
    'the operator of the Sitesrift service (corporate entity and registered address to be listed here once finalized with counsel).',
  contactEmail: 'hello@sitesrift.com',
  governingLaw:
    'Governing law, venue, and formal dispute resolution will be published here after operating entity and jurisdiction are confirmed with counsel. Until then, contact us by email and we will route commercial or legal questions in good faith.',
  lastUpdated: 'May 3, 2026',
} as const
