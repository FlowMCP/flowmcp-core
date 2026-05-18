# Disclaimer

FlowMCP Core is MIT-licensed. However, this software orchestrates calls to third-party APIs that have their own Terms of Services.

## Three-Layer License Model

1. **FlowMCP Code (MIT):** Schema definitions, core library, CLI. Covered by the LICENSE file in this repository.
2. **API Provider Terms of Services:** Each API has its own ToS. FlowMCP schemas may include an optional `meta.termsOfService` field with the provider's ToS URL and the date we last verified the link. **We do not classify or interpret these Terms of Services.**
3. **Data License of Responses:** Data returned by APIs may have its own license (e.g., CC-BY, Public Domain, proprietary). Always review.

## What We Do

- Document the ToS URL (where available) per schema
- Document the date we last checked the link
- Document the language of the ToS

## What We Do NOT Do

- Classify ToS into legal categories
- Provide recommendations regarding commercial use
- Reproduce ToS content in our schemas
- Make any representation about ToS compliance or fitness for any purpose

## User Responsibility

You are solely responsible for:
- Reviewing each API provider's Terms of Services before use
- Complying with rate limits, attribution requirements, and data licenses
- Determining suitability for commercial, research, or production use
- Adhering to LLM-training restrictions and re-distribution clauses

## No Warranty

FlowMCP is provided "as is" without warranty of any kind. The authors and contributors make no representation about ToS compliance, data licensing, or fitness for any purpose. Use at your own risk.

## Reporting Issues

If you find a schema with an outdated or incorrect `meta.termsOfService` URL, please open an issue in the corresponding schema repository.
