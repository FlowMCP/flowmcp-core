/**
 * FlowMCP — MIT License
 *
 * DISCLAIMER: This code orchestrates calls to third-party APIs. Each API has
 * its own Terms of Services. FlowMCP makes no representation about TOS
 * compliance, data licensing, or fitness for any purpose. Users are solely
 * responsible for reviewing and adhering to each API provider's terms.
 *
 * For more information, see LICENSE.md and DISCLAIMER.md in the repo root.
 */

// Memo 152 / PRD-009 — v4-only root export. The v1/v2/legacy trees are gone;
// the root surface (incl. the FlowMCP facade and every v4 module) is the v4 index.
export * from './v4/index.mjs'
