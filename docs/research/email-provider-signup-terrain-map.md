# Email Provider Signup Terrain Map

**Status:** in-progress (Proton leg first).
**Round:** 44.
**Started:** 2026-04-22.
**Directive:** Aaron 2026-04-22, *"sound like we should map the
terrain in playwright and absorbe a bunch of lessions for when we
start building our own AI"*; *"any all are file and encouraged"*;
*"if you fail write notes"*.

## Why this exists

Drive Playwright across free-tier email providers and catalogue
what an agent needs to sign up alone. The output is a lesson
archive for the capability-limited-AI bootstrap work (BACKLOG row
P2 *"Capability-limited-AI bootstrap guide"*). The specific
addresses acquired are less valuable than the map of *which
doors open with only text, which require one human-in-loop
step, and which are sealed by design*.

This is the first rung of the bootstrap ladder's
identity-acquisition leg. A capability-limited AI that cannot
stand up its own email address cannot correspond with the world;
no correspondence means no outbound-agent work possible; no
outbound-agent work means the bootstrap ladder cannot climb past
the rung-one sandbox.

## Scope

**In scope:**

- Free-tier signup flows for Gmail, Proton Mail, Tutanota,
  Outlook.com, Zoho Mail.
- Public-web-accessible signup pages only (no invite-only betas).
- Default Playwright Chromium fingerprint — the point is
  measuring hostility-at-defaults, not passing stealth tests.
- Observation up to the first hard-block (captcha loop,
  phone-required, payment-required) or successful account creation.

**Out of scope:**

- Paid-tier flows (Aaron 2026-04-22 *"and free i'm not paying
  for infrustra yet"*).
- Fingerprint-masking, user-agent spoofing, residential-IP
  rotation — those belong in a separate "stealth viability"
  study, not this terrain map.
- Custom-domain signup flows (all free tiers in this study
  are subdomain-of-provider).
- Fraudulent identity data — if a field requires information
  only a real person can supply (phone, government ID), stop
  and document the stop, do not fabricate.

## Dimensions being measured

Each provider gets a section filled in on these seven axes.
Dimension definitions are durable; per-provider findings live
in the sections below.

1. **Identity-requirements surface.** What fields does signup
   demand? Which are strict-required, soft-optional, skippable,
   or deferable? Specifically: phone number, recovery email,
   government ID, credit card, captcha, invite code, social
   account link, real name.

2. **Automation-hostility level.** What anti-bot machinery
   fires against a default-fingerprint Playwright session?
   Cloudflare Turnstile, hCaptcha, reCAPTCHA (v2/v3/Enterprise),
   Arkose Labs, PerimeterX, custom JS challenges, proof-of-work.
   Does the flow complete, degrade, soft-ban, or hard-block?

3. **Recovery-model asymmetry.** Who holds the keys if the
   account gets locked? Recovery email (coupled to originator),
   SMS (requires phone), printable recovery codes (stateful but
   durable), security questions (stateful + socially attackable),
   trusted-device registration (non-transferable), hardware tokens
   (capital outlay, non-free).

4. **ToS and bot-clauses.** What does the provider's Terms of
   Service say about automated access, multiple-accounts-per-
   person, non-human use? Is the signup we just performed
   technically ToS-compliant?

5. **Persistence cost.** Once signed up, what keeps the address
   alive? Does the account deactivate after N months of
   no-login? Does sending count as activity, or must inbound
   receipt fire? This dictates how the bootstrap ladder carries
   rung-one addresses forward during low-use periods.

6. **Cross-provider composability.** Can these addresses *talk*
   to each other cleanly? Does the sender's free-tier status
   affect deliverability on the other side? Which pairs
   rate-limit, DKIM-strip, or HTML-strip?

7. **Sub-address and alias capacity.** Plus-addressing support
   (`user+tag@provider.com`), separate aliases per account,
   catch-all. What does "one address" actually buy in terms of
   fan-out?

## Methodology

- One clean Playwright Chromium session per provider; no cookie
  or localStorage carryover.
- Navigate to the provider's canonical signup URL (not a
  marketing landing page).
- Capture an accessibility snapshot at every decision point.
- Screenshot + step-number file in `.playwright-mcp/<provider>/`
  (gitignored; screenshots are ephemeral unless a finding in
  this doc cites one specifically).
- For every field: record the field name, whether it is
  required, and what value (if any) we supplied.
- On hard-block: capture error text, network-request surface,
  console messages, and flag the block-class (phone / captcha /
  ID / fingerprint / IP).
- **If any step fails, write notes.** Per Aaron 2026-04-22.
  Failure is the data, not a stop condition. Keep the session
  clean, write the observation, move to the next provider.

## Findings per provider

### Proton Mail

**Signup URL:** `https://account.proton.me/signup`.
**Attempted:** 2026-04-22, Round 44.
**Status:** in-progress.

#### 1. Identity-requirements surface

(captured as we go)

#### 2. Automation-hostility level

(captured as we go)

#### 3. Recovery-model asymmetry

(captured as we go)

#### 4. ToS and bot-clauses

(captured as we go)

#### 5. Persistence cost

(captured as we go)

#### 6. Cross-provider composability

(deferred — requires at least two providers before comparable)

#### 7. Sub-address and alias capacity

(captured as we go)

#### Observations

(failures, surprises, fingerprint-triggers, timing — running log)

### Tutanota

(pending — next provider after Proton)

### Gmail

(pending)

### Outlook.com

(pending)

### Zoho Mail

(pending — `free` tier requires custom domain, may reduce
in-scope; noting the gate as itself a lesson)

## Cross-cutting lessons

(to be filled in after at least three providers have been
measured — a single-provider corpus can't support cross-cutting
claims without premature generalization)

## Composition with other factory work

- **BACKLOG P2 row "Capability-limited-AI bootstrap guide"** —
  this terrain map is the first rung's identity-acquisition
  leg. Lessons here inform what "capability-limited" *means*
  at the bootstrap-boundary.
- **BACKLOG P2 row "First-principle seed to Zeta derivation"**
  — first principles for the factory need to include how the
  factory acquires its own infrastructure.
- **`feedback_email_from_agent_address_no_preread_brevity_discipline_2026_04_22.md`**
  — the two-lane outbound-email policy assumes an agent
  address exists. This research tells us how much cost
  "exists" carries on each provider.
- **`project_factory_positioning_fully_asynchronous_agentic_ai_aaron_2026_04_21.md`**
  — factory positioning as "fully asynchronous agentic AI"
  includes acquiring identity without blocking on the human.
  The bounds of that claim are whatever this map reveals
  agents can and cannot do.
- **Soul-file portability** — if the capability-limited AI
  inherits the soul-file and cannot sign up for an email,
  the soul-file's reproducibility claim has a hole at the
  identity-acquisition layer. This map either confirms the
  claim or names the hole.

## What this doc is NOT

- **Not a how-to-evade-anti-bot guide.** We document hostility
  defensively (to know where the bounds are), not offensively
  (to teach evasion). Measuring "reCAPTCHA fires at step 3"
  is legitimate research; drafting a reCAPTCHA-bypass is not.
- **Not a commitment to sign up for an account on every
  provider.** If a flow demands fraudulent data or materially
  risks a real TOS violation, we stop and document the stop.
- **Not legal advice** on what ToS permits.
- **Not sales copy** for any provider — even where Proton or
  Tuta come out looking best by our dimensions, this is a
  capability-limited-AI-bootstrap research doc, not a
  recommendation for human users.
