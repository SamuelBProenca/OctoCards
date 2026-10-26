# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers and repository owners who want to present repository information in a front-end of their own, without writing the GitHub data-collection layer themselves.

## Product Purpose

OctoCards gathers repository data and returns a consistent JSON card shape so people can build and control their own repository showcase.

## Positioning

The collector and the presentation are separate: the included playground is optional, and consumers can build any front-end on top of the same API. GitHub is the only implemented source today; support for other providers is a future product direction.

## Operating Context

The current product is a Node/Express and TypeScript backend with an optional browser playground. A developer enters an account and one or more repository names, inspects the resulting cards, expands README content, and copies or opens the JSON response. Direct API routes can be consumed independently.

## Capabilities and Constraints

- The current API reads public GitHub repositories only and returns repository metadata, README content, languages, star/fork counts, repository URL, and a selected image URL.
- A server-side TOKEN may authenticate GitHub requests. It must never be sent to the browser or committed.
- The current collector uses an in-memory five-minute cache; it is per process and clears when the server restarts.
- The project does not yet implement GitLab, Gitea/Forgejo, Bitbucket, or other repository providers.
- The public JSON card contract and API routes should remain usable without the included front-end.

## Brand Commitments

- Keep the product name OctoCards.
- The user has requested a near-black visual base, emerald green as the primary accent, and violet as a secondary accent.
- Supplied references include dark interfaces, pixel-art purple accents, terminal-like green data, and image-led responsive layouts. Treat them as visual references, not assets to copy.

## Evidence on Hand

- A working local playground and JSON API in backend/public and backend/src.
- Swagger/OpenAPI documentation and a guide in backend/public.
- User-provided visual reference screenshots in the redesign request.
- No testimonials, customer logos, performance claims, or adoption metrics have been supplied; do not invent them.

## Product Principles

- Give developers the data without forcing a presentation template.
- Prefer authentic repository content over generic decoration.
- Keep server credentials private and private repositories outside the public card contract.