# Assistio — UI/UX Design Brief

> Purpose: give a designer (or an LLM acting as one) everything needed to design the interface for Assistio. A working front-end prototype with mock data exists (React + Tailwind); it is functional but visually basic. The task is to design a better, more polished, more usable product — not to redo the business logic.

---

## 1. Product in one paragraph

Assistio is a web app for a **call center that works on behalf of many e-commerce merchants** ("clients"), mostly Shopify stores. It connects each client's store, pulls customers, checkouts and orders, and sorts customers into work queues so **sales/support reps** can contact them (call, WhatsApp, email) to **finish an abandoned sale, upsell a recent buyer, or win back a lapsed buyer**. Admins manage clients, team, automations and reporting. Some outreach is automated (WhatsApp/email), but humans take over once they start working a lead.

## 2. Users and roles

| Role | Who | Main goals | Frequency |
|---|---|---|---|
| **Rep** (sales / customer rep) | Call-center agent, often on calls all day, assigned to 1–5 clients | Work the queue fast; know exactly what to say; log the outcome in seconds; never miss a callback | All day, high repetition |
| **Admin / manager** | Team lead or ops manager | Connect stores, assign reps, set per-client scripts and offers, configure automations, review call quality, prove ROI to clients | Several times a day |

Design implication: the **rep experience is speed-critical** (few clicks, keyboard-friendly, minimal scrolling during a call). The **admin experience is oversight-critical** (clear tables, filters, charts).

## 3. Core concepts (the vocabulary the UI must make obvious)

- **Client** — a merchant/brand whose store we work for. Each has its own brand colour, logo, products, currency, scripts, discount offers, rules. **Reps work inside one client at a time** so they never mix brands. The UI should visibly "wear" the client's brand colour/logo while inside a client workspace.
- **Lead** (also called "file") — one customer record in a queue, with their contact data, cart/orders and interaction history.
- **Segment** (the three queues):
  1. **Abandoned carts** — started checkout, didn't finish → goal *finish the sale*
  2. **Recent buyers** — bought within N days (configurable per client) → goal *upsell*
  3. **Past buyers** — last order older than N days → goal *reactivate*
- **Callbacks** — a fourth view: leads where the customer asked to be called back at a specific time. Overdue callbacks must be unmissable.
- **Status** — New · Contacted · Callback · Won · Lost.
- **Disposition** (call outcome, chosen at the end of every call): No answer · Left voicemail · Wrong number · Callback requested (+date/time) · Not interested (+reason) · Sale completed · Do not contact.
- **Ownership / claiming** — a lead is unclaimed or owned by one rep. A rep can claim an unclaimed lead; other reps see owned leads read-only. Prevents two reps calling the same person.
- **Priority score** — 0–100, explainable (basket value, freshness, customer history, reachability, previous attempts, due callback). Shown as Hot / Warm / Cool.
- **Consent** — tracked **per channel**: email opt-in, SMS/WhatsApp opt-in. Marketing messages are blocked without consent. A customer may have **no contact details at all**, or be on **Do Not Contact**.
- **Hold-out (control group)** — a small % of leads are deliberately never contacted so reports can show real uplift. Visible only to admins, labelled clearly.
- **Automation** — per-client rules, e.g. "abandoned cart, 1h later, send WhatsApp template, only if consented". Automations **pause** when a rep starts working the lead, and reps see what was already sent automatically.
- **Recovery link** — Shopify's checkout URL that lets the customer resume their cart; reps copy/send it.
- **Reason for abandonment** — Shopify does not provide it. It is **inferred** (e.g. stopped at shipping step, payment failed) and marked as such; reps can correct it.

## 4. Information architecture / navigation

Left sidebar (collapsible):

**Rep**: Clients · My leads
**Admin**: Clients · Reports · Call review · Stores · Team · Automations
Footer: demo user switcher (prototype only) · Sign out

Routes:
- `/` Clients home
- `/c/:clientId` Client workspace (tabs: Leads · Automations* · Settings*) *admin only
- `/c/:clientId/dialer` Dialer session (full-screen, focus mode)
- `/my-leads` (reps)
- `/dashboard` Reports (admin)
- `/call-review` (admin)
- `/clients` Stores / connections (admin)
- `/team` (admin)
- `/automations` all-clients overview (admin)

## 5. Screens to design

For each: purpose → key content → key interactions → states to design.

### 5.1 Login
Prototype only: pick a user card. In production: email + password / SSO. Simple, branded.

### 5.2 Clients home (landing)
- **Purpose:** choose which brand to work on; see where the work is.
- **Content:** one card per accessible client: logo/brand colour, name, currency, store domain; counts per segment (abandoned / recent / past); "N to contact"; "N assigned to you"; red **"N callbacks due"** chip; error badge if the Shopify sync is broken.
- **Interactions:** click card → workspace. Possibly a global "callbacks due" banner for reps.
- **States:** no clients assigned (empty), sync error, loading.

### 5.3 Client workspace — Leads tab (the rep's main screen)
- **Header:** brand badge, client name, product notes (one-line, e.g. "Premium knitwear, free returns 30 days"), primary CTA **Start dialer session**, breadcrumb "← All clients".
- **Tabs/segmented control:** Abandoned carts (n) · Recent buyers (n) · Past buyers (n) · Callbacks (n, with red "x due").
- **Filters row:** search (name/email), status (default "Open leads"), owner (All / Assigned to me / Unclaimed / Hold-out [admin]), sort (priority / value / most recent). Callbacks view sorts by callback time.
- **Table columns:** Customer (+ small icons: email consent, WhatsApp consent, automation-sent robot, badges: "no contact", "DNC", "hold-out") · Priority chip (Hot/Warm/Cool + number) · [Callback time, red if overdue] · Details (abandoned: stop step + inferred reason; others: orders · LTV) · Value (in client currency) · Last activity · Recommended action (Finish sale / Upsell / Reactivate) · Status chip · Owner (or "Unclaimed").
- **Interactions:** click row → opens Lead file (drawer). Dense but scannable; consider row hover actions (claim, call).
- **States:** empty ("No leads match"), loading, filtered-to-zero, error store.

### 5.4 Lead file (drawer from the right, ~560px; also reused in the dialer)
Sections, in order of importance to a rep mid-conversation:
1. **Header:** client badge, customer name, segment, email, phone, orders & LTV, last activity, consent chips (email / SMS-WhatsApp), flags (No contact details, Do not contact, Hold-out).
2. **Automation notice** (blue info bar): "Automated WhatsApp sent 2h ago — mention it" / "Automations paused: a rep is working this lead".
3. **Cart / last purchase box:** items, value; for abandoned: step where they stopped + reason (inferred or rep-set, editable dropdown); for callbacks: due time (overdue in red); for lost: lost reason.
4. **Priority card** (collapsible): Hot/Warm/Cool + score, with a breakdown list of factors and ± points.
5. **Script panel:** suggested action + call script with variables filled in; button **"Tailor with AI"** (shows tailored script + bullet rationale); collapsible **Objection cheat sheet** (customer objection → suggested answer).
6. **Ownership:** "Claim this lead" button or "Owner: X"; read-only state if owned by someone else.
7. **Call panel** — a small state machine (see §6 flows): Idle (Call button + number) → On call (live timer, End call, Cancel) → Wrap-up (outcome buttons, callback date/time with presets, reason, notes, "Generate summary (AI)", Save) → saved.
8. **Message panel:** WhatsApp/Email toggle, quick-reply snippet chips, "+ Recovery link", "+ Discount code", textarea, Send. Disabled with a clear reason when no consent / no contact / DNC / not owner.
9. **Orders panel (Shopify-style sidebar):** order history (id, items, date, total, status chip Paid/Fulfilled/Refunded), copy recovery link, **discount offers** (chips; some need admin approval and are disabled for reps).
10. **Admin-only controls:** reassign owner, force status.
11. **Notes input** and **Timeline** (calls with outcome chip + duration + summary, messages, automated sends, status changes, notes; manager review stars + comment shown inline).

Design challenge: this is a lot of information. Propose a layout that prioritises (e.g. sticky call controls, tabs or accordions, two columns on wide screens) so a rep mid-call finds script + call controls without scrolling.

### 5.5 Dialer session (focus mode)
- **Purpose:** power-dial through a queue with minimal friction.
- **Layout:** top bar (client badge, "Lead 3 of 25", progress bar, live session stats: calls · connected · won · talk time, **End session**); left rail "Up next" list (current highlighted, callback-due flagged, score); main area with the current lead (two columns: lead info/cart/priority/orders | script/call panel/skip/messages/timeline).
- **Flow:** Call → End call → choose outcome → Save → auto-advance to next lead. **Skip** available. Keyboard shortcuts desirable (numbers for outcomes, space to call/end).
- **End state:** "Session complete" summary with totals and back-to-workspace.
- **States:** empty queue, no phone numbers, lead became non-dialable.

### 5.6 My leads (rep)
Everything assigned to me across clients: **Callbacks due** section on top (red), then open leads grouped by client with brand badge, sorted by priority.

### 5.7 Reports (admin)
- Filters: period (7/14/30 days) and client.
- KPI tiles: Calls · Connect rate · Leads worked · Sales won · Conversion · Avg talk time · Recovered revenue (only when one client is selected, because currencies differ).
- Daily chart: calls vs sales per day (two series), legend, hover readout, "Show table" toggle.
- **Contacted vs hold-out** table per segment with uplift in percentage points (explain it clearly: "what happens without us").
- Call outcomes distribution (horizontal bars).
- Tables by rep (calls, connect rate, talk time, sales, conversion, average review score) and by client (calls, leads worked, sales, conversion, revenue in client currency).

### 5.8 Call review (admin / manager)
- **Live now:** list of reps currently on a call (rep, customer, client, duration) with **Listen in** (silent monitor; whisper/barge in production).
- **Recent calls table:** when, rep, customer, client, outcome chip, duration, review stars; filters: rep, unreviewed only.
- **Call detail drawer:** AI summary, recording player, 1–5 star rating + comment, save.

### 5.9 Stores / clients management (admin)
Cards per store: brand badge, name, domain, connection status (connected / error with "token expired — reconnect"), last sync, lead count, granted Shopify scopes, protected-customer-data approval status (approved / pending), assigned reps (checkboxes). **Connect Shopify store** modal: client name + domain → simulated authorization → sync progress bar.

### 5.10 Team (admin)
Table of users: name, role, client assignments (checkboxes/multi-select), assigned lead count. In production: invite user, change role, deactivate.

### 5.11 Automations (admin; per client tab and global overview)
- Rule cards: name, client (in overview), segment, delay, channel, "consent required", live counts ("12 eligible now · 4 paused (rep working)"), template text, **Run now (simulated)**, Enabled toggle.
- **New rule** form: name, segment, wait hours, channel (WhatsApp/Email), template with variables, require consent.
- **Execution log:** per run, sent count and skip reasons (do not contact / no contact details / no channel consent / rep is working the lead / already messaged by this rule).
- Persistent compliance notice (WhatsApp needs opt-in + approved templates; email needs consent + unsubscribe).

### 5.12 Client settings (admin; tab in workspace)
Brand (colour picker, logo text, product notes) · Segment thresholds (recent buyer = last order within N days; abandoned after N hours) · Call scripts (one per action, with variable help) · Quick-reply snippets (add/edit/delete) · Objection cheat sheet (add/edit/delete) · Discount offers (code, label, "reps allowed" toggle).

## 6. Key user flows (design these as sequences)

1. **Rep morning start:** log in → Clients home → sees "3 callbacks due" → My leads → handles callbacks → opens a client → Start dialer session.
2. **Working one lead in the dialer:** read context (cart, reason, automation notice, priority) → glance at script → Call → talk → End call → pick outcome (+callback time / reason / notes) → optionally generate AI summary → Save → next lead appears.
3. **Closing a sale:** during call apply discount offer → send recovery link via WhatsApp/email → (customer pays) → outcome "Sale completed".
4. **Callback scheduled:** outcome "Callback requested" → presets (1h, tomorrow 10:00, in 2 days) or custom → lead appears in Callbacks tab; badge turns red when due.
5. **Claim conflict:** rep opens a lead owned by someone else → read-only, controls disabled with explanation.
6. **Admin onboarding a client:** Stores → Connect → authorize → sync → assign reps → Settings (brand, scripts, offers, thresholds) → Automations.
7. **Manager review:** Call review → filter unreviewed → open call → read summary / play recording → rate + comment → rep sees feedback in timeline.
8. **Proving value to a merchant:** Reports → select client → compare contacted vs hold-out → export/share (future).

## 7. Component inventory

Sidebar nav · client brand badge · segment tabs with counts · filter bar · data table with row states · status chip · priority chip (Hot/Warm/Cool) · consent chips · info/warning banners (automation, compliance, DNC) · right-side drawer · modal · call panel (3 states + timer) · outcome selector (7 options) · date-time picker with presets · message composer with chips · snippet chip list · objection accordion · order list item · discount offer chip (allowed/needs approval/applied) · timeline item (call / message / automated / note / status / review) · star rating · KPI tile · bar chart (grouped, 2 series) · horizontal bar list · progress bar · empty states · toast/confirmation · inline editable list (settings) · toggle · checkbox group for assignments · audio player (simulated).

## 8. Data shown (so the designer uses realistic content)

Example client: *Nordic Threads* — teal (#0f766e), logo "NT", EUR, "Premium Scandinavian knitwear. Free returns 30 days."
Example lead: *Emma Dubois*, abandoned cart, 2× Wool Sweater + Scarf = €207, stopped at **shipping** — inferred reason "Shipping cost too high", email-consented only, WhatsApp automation sent 2h ago, 3 previous orders (LTV €340), priority Hot 82, unclaimed.
Other brands in mock data: *Glow Cosmetics* (pink, USD), *PeakGear Outdoors* (amber, GBP, sync error).
Order statuses: Paid, Fulfilled, Refunded. Lead statuses: New, Contacted, Callback, Won, Lost. Currencies differ per client — never add amounts across clients.

## 9. UX principles and constraints

1. **Speed over decoration for reps.** Common action ≤ 2 clicks. Support keyboard shortcuts in the dialer.
2. **Never mix brands.** Inside a client, brand colour/logo are always visible; cross-client views must label each row with its client badge.
3. **Context before action.** Before calling, the rep should see: why this lead matters, what happened before (including automation), what to say.
4. **Prevent mistakes by design.** Disabled actions always explain *why* (no consent, DNC, owned by someone else, needs approval).
5. **Compliance is visible, not buried:** consent per channel, DNC flag, suppression notice on DNC outcome, automation consent requirement.
6. **Urgency cues:** overdue callbacks and Hot leads must stand out, but use colour sparingly — don't make everything red.
7. **Honest data:** mark inferred values ("inferred") and simulated features ("simulated" during prototype); avoid fake precision.
8. **Accessibility:** WCAG AA contrast, don't rely on colour alone (icon + label on status/priority), full keyboard operation, visible focus, screen-reader labels, tabular numbers for metrics; charts need a table alternative (already planned).
9. **Responsive:** primary target is desktop (1280–1920px, often a second screen next to a softphone). Tablet usable; mobile only needs read access for admins.
10. **Dark mode** desirable (agents work long shifts); define tokens for both themes.
11. **Density options:** compact vs comfortable table density is a likely need.
12. **Internationalisation:** UI in English for now; plan for RTL and multi-currency/locale formatting; names and phone numbers in various international formats.

## 10. Visual direction (suggested; designer may propose alternatives)

- Tone: calm, professional, efficient — closer to a modern CRM/helpdesk (Linear, Close, Gorgias, Intercom) than a flashy marketing site.
- Neutral UI shell (slate/gray) so **client brand colours** can accent the workspace without clashing; one product accent (currently indigo) for primary actions.
- Semantic colours: green = won/consent/connected, amber = callback/warning, red = overdue/lost/DNC/error, blue = informational/automation, purple = hold-out/admin-only concept.
- Typography: legible at small sizes in dense tables; tabular figures for numbers.
- Chart palette: two-series (calls vs sales) must be distinguishable for colour-blind users; use direct legend + table fallback.

## 11. What the current prototype looks like (so you know the starting point)

React + Tailwind, light theme only, slate sidebar with indigo active state, white cards/tables with thin borders, small uppercase table headers, right-side drawer for the lead file, native selects/inputs. Everything is functional with mock data persisted in localStorage; styling is deliberately basic.

## 12. Out of scope for the design (but keep room for them)

Real telephony (softphone UI, mute/hold/transfer), live Shopify sync status details, WhatsApp template approval workflow, billing/plans, notifications centre, user profile/settings, audit log, data export, mobile app.

## 13. Deliverables requested from the designer / LLM

1. Design principles and design tokens (colour incl. dark mode, type scale, spacing, radius, elevation, iconography).
2. Component library specs for the inventory in §7, with states (default, hover, focus, disabled, loading, error, empty).
3. High-fidelity screens for §5.2–5.5 (rep core), then §5.6–5.12.
4. A redesigned **Lead file / dialer layout** that solves information density (this is the hardest and most important screen).
5. Interaction notes: keyboard shortcuts, auto-advance behaviour, transitions, call-state changes, toasts.
6. Responsive behaviour notes and an accessibility checklist.
7. Optional: onboarding/empty-state illustrations and a short motion guide.

When proposing designs, state assumptions, and flag any place where a business rule in this brief seems to conflict with good UX.
