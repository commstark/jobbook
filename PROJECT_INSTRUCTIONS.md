# PROJECT_INSTRUCTIONS.md — Jobbook

## Overview

Jobbook is a mobile-first job management app for a two-person plumbing business. It replaces the current workflow of texts, photos, manual calendar entries, and mental bookkeeping with one unified tool. The two partners can see and manage everything from their phones.

**Core philosophy:** This is a digital logbook, not a SaaS platform. Dense, fast, utilitarian. Every feature must pass the test: "Would a plumber use this at 7am with wet hands?"

## CRITICAL BUILD QUALITY RULES

These rules apply to EVERY page, EVERY component, EVERY API route. Non-negotiable.

1. **Every database operation must have try/catch.** Log the actual error. Return proper HTTP status codes and error messages. Never swallow errors silently.
2. **Every page must have three states:** loading (skeleton/spinner), error (show the actual error message, not "This page couldn't load"), empty (plain text like "No jobs scheduled").
3. **No page should ever crash.** Use error boundaries. If a database query fails, degrade gracefully to an empty state with an error message — never show a white screen or "This page couldn't load."
4. **All saves must be optimistic.** Update the UI immediately, then persist to DB in the background. If the save fails, revert the UI and show an error toast. The user should never have to refresh the page to see their changes.
5. **No save buttons unless explicitly specified.** All edits (customer name, notes, ratings, phone numbers) auto-save on blur/change. Invoice line items are the exception — they have explicit send/save actions.
6. **All form inputs must work properly.** Placeholder text clears on focus. Number inputs don't have persistent zeros. Text inputs don't have leftover state from previous entries.
7. **Navigation must never crash.** Every router.push must have error handling. Back buttons must always work — if the referrer is unknown, fall back to a sensible default (schedule for jobs, customers for profiles, inbox for conversations).
8. **Run `next build` after completing each phase.** Do not move to the next phase if there are build errors. Fix them first.
9. **Test data flow end-to-end.** For every feature: UI action → API call → database write → UI update. If any step in the chain is broken, the feature is broken.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (Postgres + Auth + Storage + Realtime)
- **Auth:** Google Sign-In via Supabase Auth
- **Hosting:** Vercel
- **SMS/Voice:** Twilio (Programmable Messaging + Voice)
- **Speech-to-Text:** OpenAI Whisper API
- **AI Parsing:** Claude Haiku (claude-haiku-4-5-20251001)
- **Payments:** Stripe Connect
- **Maps:** Google Maps Distance Matrix API (for drive time estimates)
- **Push Notifications:** Web Push API (PWA)
- **Design System:** See DESIGN.md in project root

## Database Schema (Supabase)

### users
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  phone text,
  role text default 'partner', -- 'partner' or 'admin' (both partners are admin for now)
  avatar_url text,
  created_at timestamptz default now()
);
```

### customers
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text, -- can be null initially for unknown numbers
  address text,
  rating text default 'neutral', -- 'good', 'bad', 'neutral'
  rating_note text, -- "slow to pay", "great customer, gives referrals"
  notes text, -- general notes about the customer/property
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### customer_phones
```sql
create table customer_phones (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  phone text not null,
  label text, -- "Sandra", "Mike - husband", etc.
  is_primary boolean default true,
  created_at timestamptz default now(),
  unique(phone) -- one phone number can only belong to one customer
);
```

### conversations
```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  phone text not null, -- the customer's phone number
  status text default 'active', -- 'active', 'archived'
  is_unread boolean default true, -- set true on inbound message, false when conversation is opened
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);
```

### messages
```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  direction text not null, -- 'inbound', 'outbound'
  body text,
  media_urls text[], -- array of photo URLs from Twilio or sent by plumber
  twilio_sid text, -- Twilio message SID for reference
  created_at timestamptz default now()
);
```

### jobs
```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  assigned_to uuid references users(id) on delete set null,
  title text not null,
  description text, -- AI-generated or manually entered
  category text, -- 'Leak', 'Install', 'Repair', 'Drain', 'New Construction', etc.
  status text default 'upcoming', -- 'upcoming', 'completed', 'invoiced', 'paid'
  is_urgent boolean default false,
  quoted_amount decimal(10,2), -- denormalized for fast schedule rendering. Update whenever invoices.total_amount changes (on invoice create, edit, or resend). Also set directly from voice capture when plumber states a price.
  ai_summary text, -- AI-parsed summary from voice note or messages
  rating_note text, -- job-specific note
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### job_visits
```sql
create table job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  scheduled_at timestamptz,
  scheduled_end timestamptz,
  drive_time_minutes integer, -- estimated from Google Maps
  notes text,
  created_at timestamptz default now()
);
```

### job_photos
```sql
create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  photo_url text not null,
  source text default 'customer', -- 'customer', 'plumber'
  caption text,
  created_at timestamptz default now()
);
```

### call_logs
```sql
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  phone text not null,
  direction text, -- 'inbound', 'outbound'
  duration_seconds integer,
  twilio_sid text,
  title text, -- manually added or AI-generated
  notes text,
  created_at timestamptz default now()
);
```

### invoices
```sql
create table invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  status text default 'draft', -- 'draft', 'sent', 'viewed', 'paid'
  total_amount decimal(10,2) not null,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  public_token text unique default gen_random_uuid(), -- for the customer-facing payment link
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### invoice_line_items
```sql
create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity decimal(10,2) default 1,
  unit_price decimal(10,2) not null,
  amount decimal(10,2) not null, -- quantity * unit_price
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### voice_notes
```sql
create table voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  job_id uuid references jobs(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  audio_url text not null,
  transcript text,
  ai_parsed_data jsonb, -- structured data extracted by AI
  type text check (type in ('job_detail', 'invoice', 'contact', 'note')),
  created_at timestamptz default now()
);
```

### push_subscriptions
```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(endpoint)
);
```
These three fields (endpoint, p256dh, auth) are exactly what the Web Push API returns from `pushManager.subscribe()`. All three are required to send a push notification. **Important:** When subscribing, use an UPSERT on `endpoint` — if a user re-subscribes after clearing browser data, the insert would fail on the unique constraint otherwise. Upsert updates the p256dh and auth fields for the existing endpoint.

### settings
```sql
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
```
Seed with:
- `('primary_partner_id', '{user_uuid}')` — who gets calls forwarded by default
- `('stripe_account_id', '')` — populated after Stripe Connect onboarding
- `('business_name', 'Your Plumbing Co')` — shown on invoices and customer-facing pages

### RLS Policies
- All tables: authenticated users can read everything (both partners see all)
- All tables: authenticated users can insert/update/delete everything
- invoices table: public read access via `public_token` for customer payment pages
- No row-level isolation between partners — this is a shared workspace

## API Routes

### Twilio Webhooks

**POST /api/twilio/sms**
Incoming SMS/MMS webhook from Twilio.
1. Extract `From`, `Body`, `MediaUrl0..n`, `MessageSid`
2. Look up phone in `customer_phones`
3. If found → find or create active conversation for this customer
4. If not found → create conversation with phone only (no customer linked yet)
5. Store message in `messages` table, download and store media in Supabase Storage
6. Send push notification to both partners (or assigned partner if job exists)
7. Return TwiML `<Response></Response>` (empty — we reply from the app, not auto-reply)

**POST /api/twilio/voice**
Incoming voice call webhook. MUST respond with TwiML in under 5 seconds or Twilio hangs up.
1. Look up phone in `customer_phones` — single query with join to find customer + any 'upcoming' job + assigned_to user
2. If assigned partner found → forward to that partner's personal phone (from users.phone)
3. If no assigned partner or no customer match → forward to primary partner (from settings table, key: 'primary_partner_id', then look up users.phone)
4. If DB lookup fails or times out (>2 seconds) → fall back to PARTNER_1_PHONE env var as emergency fallback
5. Use TwiML `<Dial>` to forward, with status callback for logging
6. After call ends → create entry in `call_logs`
5. If customer found → link to customer_id
6. Send push notification: "Call from Sandra Mitchell (3 min)"

**POST /api/twilio/voice/status**
Call status callback for logging duration.

### Messaging

**POST /api/messages/send**
Send an outbound SMS from the app.
```
body: { conversation_id, body, media_urls? }
```
1. Get conversation, get customer phone
2. Send via Twilio from the business number
3. Store in messages table with direction = 'outbound'

**POST /api/messages/send-schedule-options**
Send available time slots to a customer.
```
body: { conversation_id, slots: [{ datetime, label }] }
```
1. Format slots into a readable SMS: "Hi Sandra, here are available times: \n1. Tue Apr 8, 9:00 AM\n2. Wed Apr 9, 1:30 PM\nReply with the number of your preferred time."
2. Send via Twilio
3. Store in messages

### Jobs

**POST /api/jobs/create**
Create a job from a conversation.
```
body: { conversation_id, title?, assigned_to? }
```
1. Get conversation + customer
2. Pull message history from this conversation
3. Send messages to Claude Haiku to generate: title, description, category, is_urgent
4. Create job linked to customer and conversation
5. Move conversation status to 'archived'
6. Link any photos from the conversation as job_photos (source: 'customer')
7. Return created job

**POST /api/jobs/create-from-voice**
Create or update a job from a voice note.
```
body: { audio_blob (multipart), job_id?, customer_id? }
```
1. Upload audio to Supabase Storage
2. Send to Whisper API → get transcript
3. Send transcript to Claude Haiku with prompt:
   - "Parse this plumber's voice note. Extract: job title, description, category, materials mentioned, estimated labor hours, any quoted price. If a customer name or address is mentioned, extract those too. Return as JSON."
4. If job_id provided → update existing job with AI data
5. If no job_id → create new job (link to customer if identified)
6. Store voice_note record
7. Return parsed data for plumber to review/edit

### Invoices

**POST /api/invoices/create**
Create an invoice, optionally from voice.
```
body: { job_id, line_items?, audio_blob? }
```
1. If audio_blob → transcribe with Whisper → parse with Claude Haiku
   - Prompt: "Parse this plumber's invoice dictation. Extract line items with: description, quantity, unit_price. Return as JSON array."
2. Create invoice + line items
3. Return for review/editing

**PUT /api/invoices/:id**
Edit invoice — update line items, amounts, add/remove items.

**POST /api/invoices/:id/send**
Send invoice to customer via SMS.
1. Generate public_token URL: `{app_url}/pay/{public_token}`
2. Send SMS: "Hi {customer_name}, here's your invoice for {job_title} — ${total}. View & pay here: {url}"
3. Update invoice status to 'sent', set sent_at

**POST /api/invoices/:id/resend**
Resend after edits (e.g., customer asked for discount). Mutates the existing invoice in place.
1. If a `stripe_payment_intent_id` exists on the invoice AND the amount changed → cancel the old PaymentIntent via Stripe API
2. Clear `stripe_payment_intent_id` on the invoice (new one created when customer clicks pay)
3. Regenerate the SMS with the updated total (same public_token URL — customer sees updated amount)
4. Send SMS, update sent_at
**Note:** If the customer has an active Stripe Checkout session open when the PaymentIntent is cancelled, their session will show an error. This is expected and fine — they'll use the new link from the resent SMS.

**GET /api/invoices/pay/:token** (PUBLIC — no auth)
Customer-facing invoice page. Returns invoice data for rendering the payment page.

**POST /api/invoices/pay/:token/checkout**
Create Stripe checkout session for this invoice.
1. Create Stripe PaymentIntent via Stripe Connect (payment goes to plumber's connected account)
2. Return checkout session URL

**POST /api/stripe/webhook**
Stripe webhook for payment confirmation.
1. Verify webhook signature
2. On `payment_intent.succeeded` → update invoice status to 'paid', set paid_at
3. Update job status to 'paid'
4. Send push notification to assigned partner: "Sandra paid $450 for Kitchen Sink Leak"

**GET /api/stripe/connect**
Initiate Stripe Connect Express onboarding.
1. Create a Stripe Connect Express account (if one doesn't exist in settings)
2. Generate an account link (onboarding URL)
3. Redirect to Stripe's hosted onboarding page
4. On completion, Stripe redirects to /api/stripe/connect/callback

**GET /api/stripe/connect/callback**
Handle return from Stripe Connect onboarding.
1. Verify the connected account is fully onboarded
2. Store the `stripe_account_id` in the settings table
3. Redirect to the Settings screen with a success message

### Customers

**POST /api/customers/merge**
Merge two customer records.
```
body: { keep_id, merge_id }
```
1. Move all jobs, conversations, phones, call_logs, invoices from merge_id to keep_id
2. Delete merge_id customer
3. Return updated customer

**PUT /api/customers/:id**
Update customer details, rating, notes.

### Schedule

**GET /api/schedule?date=2026-04-08&range=day|week**
Get job visits for a date range with drive time estimates.

**POST /api/schedule/drive-time**
Calculate drive time between locations.
```
body: { origin_address, destination_address, arrival_time }
```
1. Hit Google Maps Distance Matrix API with departure_time
2. Return estimated duration in traffic
3. Store in job_visit.drive_time_minutes

### Voice Notes

**POST /api/voice/transcribe**
Transcribe and parse a voice note.
```
body: { audio_blob (multipart), type: 'job_detail' | 'invoice' | 'contact' | 'note' }
```
1. Upload to Supabase Storage
2. Whisper API → transcript
3. Claude Haiku → structured data based on type
4. Return transcript + parsed data for review

### Push Notifications

**POST /api/notifications/subscribe**
Register a push subscription for a user.

**Internal: sendPushNotification(user_id, title, body, data)**
Send push notification to a specific user. Used by other endpoints.

Notification triggers:
- New inbound text → both partners (unless job is assigned, then just assignee)
- Customer responded to schedule options → assigned partner
- Upcoming job → assigned partner (time = drive_time_minutes + 5 buffer before scheduled_at)
- Invoice viewed → assigned partner
- Invoice paid → assigned partner
- Job completed but not invoiced after 24hrs → assigned partner (gentle nudge)

## Screens & Flows

### Tab: Inbox

**Design reference:** Model this after Apple iMessage. The conversation list, the chat view, the compose flow — all should feel native iOS-quality.

**Main view:** List of active conversations, sorted by last_message_at descending.

Each conversation card shows:
- Customer avatar (initials) or "?" for unknown
- Customer name or phone number if unknown
- Message preview (2 lines, truncated)
- Timestamp (relative: "2m ago", "Yesterday", "Mar 28")
- Photo count if any media attached
- Blue left-border if unread (driven by is_unread field on conversations table)
- "**+ Add Customer**" button on unknown number cards
- "**Create Job**" button appears on conversations that don't have a linked job yet

**Compose button:** Pencil/compose icon in top-right. Tapping opens a modal:
- Search field at top: search existing customers by name, phone, or address
- As you type, matching customers appear as tappable results
- OR type/paste a raw phone number and tap "New Conversation"
- Selecting a customer or entering a number immediately creates/finds a conversation and navigates into the chat view with the text input focused and keyboard open

**Tapping a conversation → Chat view (iMessage-style):**
- Header: customer name (tappable → customer profile), phone icon (tap to call), "Create Job" button
- Messages displayed as bubbles: inbound = left-aligned, light gray background. Outbound = right-aligned, black background, white text.
- Timestamps between message groups (not on every message — group by time gaps >5 minutes)
- Photos display inline as thumbnails within bubbles (tappable for full-screen view)
- Bottom bar (fixed, always visible):
  - Camera button (left) — opens camera or photo library to attach photos
  - Text input field (center) — auto-grows with text, placeholder "Message"
  - Send button (right) — black, only visible when text is entered
- The text input should feel exactly like iMessage: tap to focus, keyboard pushes the conversation up, send clears the input
- Sent messages appear immediately in the chat (optimistic UI), then update with confirmed status
- If offline, messages show with a "Queued" indicator (clock icon) per the offline spec

**"+ Add Customer" flow:**
1. Tap button → inline form: Name, Address fields
2. On save → check if address matches existing customer
3. If match → "A customer exists at this address. Merge?" → Yes merges, No creates new
4. New customer created, conversation linked, avatar updates from "?" to initials

**"Create Job" flow:**
1. Tap "Create Job" on a conversation
2. AI parses conversation messages into: suggested title, description, category, urgency
3. Show pre-filled job card for review
4. Plumber can edit any field
5. Assign to partner (dropdown: "Me" or partner name)
6. Tap "Create" → job created, conversation archived (still accessible under job)
7. Photos from conversation auto-linked to job

### Tab: Schedule

**Design reference:** Model this after Google Calendar's day view. This is the most important screen in the app — the plumber's entire day is here.

**Main view:** Day selector at top (horizontal scroll, current day highlighted with black background).

Below the day selector:
- Job count label: "TODAY · 3 JOBS" (or selected day)
- "+ Add Job" button in the header area

**Day view — full 24-hour timeline (Google Calendar style):**
- Vertical scrollable timeline showing all 24 hours with hour labels on the left (7a, 8a, 9a... 12p, 1p... 11p)
- Horizontal grid lines at each hour
- Red horizontal line with dot showing current time (moves in real time)
- Auto-scrolls to current time on load
- Jobs appear as colored blocks positioned at their scheduled time:
  - Block height = job duration (minimum 1 hour visual height even for shorter jobs)
  - Black block = upcoming
  - Red block = urgent
  - Blue block = invoiced
  - Green block = paid
  - Block shows: job title, customer name, time
- Tapping a job block → navigates to Job Detail (must not crash — use router.push with error handling)

**Quick-add by tapping empty time slot:**
- Tap any empty hour on the timeline → bottom sheet slides up with:
  - Time pre-filled to the tapped hour (editable)
  - End time defaults to +1 hour (editable)
  - Title input field (focused, keyboard open)
  - Customer picker (search existing or skip)
  - "Save" button creates the job and visit, sheet dismisses, job appears on timeline immediately without page refresh
  - "Full Details" button navigates to the full job creation form with the time pre-populated

**Full job creation form (from + Add Job button or Full Details):**
- Title (required)
- Category dropdown (Leak, Install, Repair, Drain, New Construction, Inspection, Other)
- Customer picker (search existing customers or create new inline)
- Date picker
- Start time picker
- End time picker (or duration: 1hr, 2hr, 3hr, 4hr, custom)
- Assign to partner (dropdown: "Me" or partner name)
- Urgency toggle
- Notes field
- "Create Job" black button
- On save: creates job + job_visit, navigates back to schedule, job appears immediately

**Week view toggle:** Simple switch between day and week view. Week shows a condensed vertical list grouped by day with job blocks shown as small bars.

**CRITICAL: Every save operation must update the UI immediately (optimistic update) without requiring a page refresh. If the save fails, show an error toast and revert.**

### Tab: Capture (Mic Button)

**Idle state:**
- "Voice Capture" heading
- Subtext: "Describe the job, create a contact, or dictate an invoice."
- Large black mic button, centered
- "Tap to start" label
- Example prompts below (2-3 examples in gray boxes)

**Recording state:**
- Mic button expands with pulse animation
- "Listening" heading
- Audio waveform bars
- Tap again to stop

**Processing state:**
- Clock icon
- "Processing..." with animated dots
- "Structuring your voice note"

**CRITICAL: The recording/processing state must properly clean up the MediaStream on stop and fully reset state between recordings. Multiple back-to-back recordings must work without page crashes.**

**Result state — Transcript display (shown for ALL types):**
- Section header: "TRANSCRIPT"
- Full transcript text displayed
- **"Edit" button** — tapping makes the transcript text editable inline so the user can fix transcription errors (typos, misheard words) before the AI parses it
- **"Re-record" button** — discards this recording, resets to idle state, user can record again
- Below the transcript: the AI-parsed result based on detected type

**Result state — Job Detail:**
AI returns parsed job info. All fields are editable before saving:
- Suggested title (editable text input)
- Description (editable textarea)
- Category (editable dropdown)
- Customer match (if name/address mentioned — shown as a linked customer card, or "No customer matched" with option to search/create)
- Materials mentioned (editable list)
- Estimated time (editable)
- Quoted amount (editable)
- Two buttons: "Save Job" (black) / "Re-record" (outline)
- **On save: MUST actually insert into jobs table, link to customer if matched, and navigate to the saved job detail page. Verify the job appears in the Schedule tab.**

**Result state — Invoice:**
AI returns line items. All fields are editable before saving:
- Customer match (with picker if not matched)
- Line items with description, qty, unit price — each field editable
- "Add Line Item" button
- Total (auto-calculated from line items)
- If AI returned no line items, show "No items parsed" and let user add them manually
- Two buttons: "Create Invoice" (black) / "Re-record" (outline)
- **On save: MUST create a job first (if none exists), then create invoice attached to that job with actual line items populated. The voice transcript data must flow all the way through: voice → Whisper transcript → Claude Haiku parsed JSON → invoice_line_items table rows.**

**Result state — New Contact:**
AI returns contact info. All fields are editable before saving:
- Name (editable, pre-filled from AI)
- Address (editable, pre-filled from AI)
- Phone (editable, pre-filled from AI)
- Job details if mentioned (editable)
- Two buttons: "Save Customer" (black) / "Re-record" (outline)
- **On save: MUST insert into customers table AND customer_phones table, then navigate to the saved customer profile page. The customer must appear in the Customers tab immediately.**

**Result state — Note:**
- Transcript displayed
- "Save Note" stores to voice_notes table with type='note'
- Notes should be viewable — add a notes section accessible from the user's profile or Settings

### Tab: Customers

**Main view:** Search bar at top. List of all customers below. "+ Add Customer" button in header.

Each customer card shows:
- Avatar (initials) with rating dot (green/red/neutral)
- Name (or "Unknown" with phone number)
- Address (first part)
- Job count
- Amount owing (if any, in orange)

**Search:** Filters by name, phone, or address as you type. Instant filtering, no submit button.

**Tapping a customer → Customer Profile:**

**Profile header:**
- Avatar (large) with rating dot
- Customer name — displayed as the page title. **Editable: tap pencil icon next to name → inline text input → save on blur. The page title must update immediately when the name is changed. There should NOT be a separate "Unknown Customer" label and an editable name field — they are the same element.**
- Phone number(s) with labels — editable via pencil icon. When adding/editing a phone, save must persist to customer_phones table immediately.
- Address — editable via pencil icon, saves on blur

**Stats row:** Jobs count | Balance owing | Lifetime revenue

**Action buttons:**
- Call — dials the customer's primary phone number
- Text — **MUST find or create a conversation with this customer's phone number and navigate directly into the chat view with the text input focused. If the customer has no phone number, show a prompt to add one first. This must work — it's a core flow.**

**Rating section:**
- Thumbs up / thumbs down toggle buttons (tap to set, tap again to unset → neutral)
- Rating note (editable textarea, saves on blur)

**Property notes:** Editable textarea, saves on blur. For notes about the property/house.

**Job History:** Full list of all jobs for this customer, sorted newest first.
Each job shows: date, title, amount, status badge, photo count.
**Every job is tappable** → opens Job Detail.

**CRITICAL: All edits on the customer profile auto-save on blur/change. No save button. Every field persists to the database immediately. If save fails, show an error toast.**

### Job Detail Screen

Accessed from: Inbox (Create Job), Schedule (tap job), Customer Profile (tap job history item)

Shows:
- Job title + status badge + urgency flag
- Assigned partner
- Customer card (avatar, name, phone, address — tappable → Customer Profile)
- AI Summary section
- Category + scheduled date/time + quoted amount tags
- Photos section with thumbnails + "Add Photo" button (camera/library)
- Visit history (if multi-visit job): list of scheduled visits with dates/times
- Notes field (editable)

**Actions:**
- "Send Quote" / "Create Invoice" → Invoice flow
- Call button (dials customer)
- Text button (opens conversation)
- "View Messages" → opens the linked conversation thread (archived or active). Reply-capable — plumber can text customer about the job from here.
- "Mark Complete" → moves status to 'completed'
- "Assign" → reassign to other partner

### Invoice Screen

**From Job Detail → "Create Invoice" or from Voice Capture**

**Draft view:**
- Customer name + address
- Date
- Job title
- Editable line items: description, qty, unit price, line total
- "Add Line Item" button
- Total (auto-calculated)
- "Send via Text" button
- "Edit" is always available — tap any line item to modify

**After sending:**
- Success confirmation
- Text preview shown
- Status updates: sent → viewed (when customer opens link) → paid

**Resend flow:** If plumber needs to adjust (customer asked for discount):
1. Open invoice → edit line items → tap "Resend"
2. Customer gets new text with updated link
3. Old link still works but shows updated amount

### Customer Payment Page (Public, No Auth)

**URL:** `{app_url}/pay/{public_token}`

Simple, clean page showing:
- Business name at top
- Invoice details: job title, date, line items, total
- "Pay ${amount}" button → Stripe Checkout
- After payment: "Thank you! Payment confirmed."

This page must work perfectly on mobile Safari/Chrome. No app install required.

### Settings Screen

Accessed from: gear icon in the top-right of any main tab screen. NOT a tab — it's a drill-in page.

Shows:
- **Business Name** — editable text field, used on invoices and customer-facing payment pages
- **Primary Call Partner** — dropdown to select which partner receives forwarded calls by default. Stored in settings table.
- **Stripe Connection** — status indicator (connected / not connected). If not connected: "Connect Stripe" black button → initiates Stripe Connect Express onboarding flow. If connected: shows "Connected" with a green dot and the last 4 of the bank account.
- **Notification Preferences** — toggles for each notification type (new texts, upcoming jobs, payments). Stored per-user.
- **Your Phone Number** — the personal phone number used for call forwarding. Editable. Stored in users.phone.
- **Twilio Business Number** — display only, shows the business number customers text/call.

## AI Prompts

### Parse Conversation into Job
```
System: You are a job parser for a plumbing business. Given a text conversation between a customer and a plumber, extract:
- title: Short job title (e.g., "Kitchen Sink Leak")
- description: 1-2 sentence description of the problem
- category: One of: Leak, Install, Repair, Drain, New Construction, Inspection, Other
- is_urgent: boolean
Return as JSON only, no other text.
```

### Parse Voice Note into Job Detail
```
System: You are a job detail parser for a plumbing business. A plumber just recorded a voice note describing a job they're about to do or just completed. Extract:
- title: Short job title
- description: What needs to be done or was done
- category: One of: Leak, Install, Repair, Drain, New Construction, Inspection, Other
- materials: Array of materials mentioned with estimated costs if stated
- labor_hours: Estimated or actual hours
- quoted_amount: Total if mentioned
- customer_name: If mentioned
- customer_address: If mentioned
Return as JSON only, no other text.
```

### Parse Voice Note into Invoice
```
System: You are an invoice parser for a plumbing business. A plumber just dictated what to charge for a completed job. Extract line items:
- line_items: Array of { description, quantity, unit_price }
- total: Sum of all line items
If the plumber mentions a flat total without itemization, create reasonable line items that add up to that total (e.g., "Labor", "Materials").
Return as JSON only, no other text.
```

### Parse Voice Note into Contact
```
System: You are a contact parser for a plumbing business. A plumber just described a new customer. Extract:
- name: Customer name
- address: Full address if mentioned
- phone: Phone number if mentioned
- job_title: If a job was described
- job_description: If details were given
- quoted_amount: If a price was mentioned
- notes: Any other details (e.g., "friend's discount", "urgent")
Return as JSON only, no other text.
```

### Summarize Call (Nice-to-Have)
If we implement AI call summaries, use Twilio Recording → Whisper → Claude Haiku:
```
System: Summarize this phone call between a plumber and a customer in one sentence. Focus on what the customer needs and any agreed-upon next steps.
```

## Twilio Configuration

### Phone Number Setup
- Provision one local Canadian number (+1 604 or +1 778 area code)
- Configure SMS webhook: POST `{app_url}/api/twilio/sms`
- Configure Voice webhook: POST `{app_url}/api/twilio/voice`
- Configure Voice status callback: POST `{app_url}/api/twilio/voice/status`
- Enable MMS on the number

### 10DLC Registration (Required for US/Canada A2P)
- Register brand with Twilio
- Register messaging campaign (use case: "Customer service / notifications for a plumbing business")
- This avoids carrier filtering

### Call Forwarding Logic
```
TwiML Response:
<Response>
  <Dial callerId="{twilio_number}">
    <Number>{partner_personal_phone}</Number>
  </Dial>
</Response>
```
Determine which partner to forward to:
1. If customer has an assigned job → forward to assigned partner's personal phone
2. If no assigned job → forward to primary partner (configurable in settings)

## Stripe Connect Setup

- Platform account: your Stripe account
- Connected account: plumber's Stripe account (onboarded via Stripe Connect Express)
- Payment flow: customer pays → Stripe takes fee → money goes directly to plumber's connected account
- Application fee: optional (if you want to take a cut later)

## Push Notification System

Use the Web Push API (Service Worker based) for PWA push notifications.

### Registration Flow
1. On first login, prompt for notification permission
2. If granted, register service worker, get push subscription
3. Store subscription in Supabase (`push_subscriptions` table)

### Notification Triggers (from API routes)
| Event | Who Gets Notified | Title | Body |
|-------|-------------------|-------|------|
| New inbound text | Both (or assigned partner if job exists) | "{Customer Name}" | Preview of message |
| Customer picked schedule time | Assigned partner | "Booking confirmed" | "{Customer} booked {date/time}" |
| Upcoming job | Assigned partner | "Next job in {drive_time + 5} min" | "{Job title} at {address}" |
| Invoice viewed | Assigned partner | "{Customer} viewed invoice" | "${amount} for {job title}" |
| Invoice paid | Assigned partner | "Payment received!" | "{Customer} paid ${amount}" |
| Job not invoiced 24hr | Assigned partner | "Don't forget to invoice" | "{Job title} completed yesterday" |

## File Structure

```
jobbook/
├── DESIGN.md
├── PROJECT_INSTRUCTIONS.md
├── next.config.js
├── package.json
├── tailwind.config.js (map design tokens from DESIGN.md)
├── public/
│   ├── sw.js (service worker for push notifications + offline caching)
│   └── manifest.json (PWA manifest)
├── src/
│   ├── app/
│   │   ├── layout.tsx (root layout, auth provider, font setup)
│   │   ├── page.tsx (redirect to /inbox or login)
│   │   ├── login/page.tsx
│   │   ├── (app)/ (authenticated route group with tab bar)
│   │   │   ├── layout.tsx (tab bar, notification setup)
│   │   │   ├── inbox/
│   │   │   │   ├── page.tsx (conversation list)
│   │   │   │   └── [id]/page.tsx (conversation thread / chat)
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx (calendar view)
│   │   │   ├── capture/
│   │   │   │   └── page.tsx (voice recording)
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx (customer list + search)
│   │   │   │   └── [id]/page.tsx (customer profile)
│   │   │   ├── jobs/
│   │   │   │   └── [id]/page.tsx (job detail)
│   │   │   └── settings/
│   │   │       └── page.tsx (settings: primary partner, Stripe connect, business name, notification prefs)
│   │   ├── invoice/
│   │   │   └── [id]/page.tsx (invoice edit/view for plumber, authenticated but outside tab layout)
│   │   ├── pay/
│   │   │   └── [token]/page.tsx (PUBLIC customer payment page, no auth)
│   │   └── api/ (API routes live directly under src/app/api/, NOT inside (app)/)
│   │       ├── twilio/
│   │       │   ├── sms/route.ts
│   │       │   ├── voice/route.ts
│   │       │   └── voice/status/route.ts
│   │       ├── messages/
│   │       │   ├── send/route.ts
│   │       │   └── send-schedule-options/route.ts
│   │       ├── jobs/
│   │       │   ├── create/route.ts
│   │       │   └── create-from-voice/route.ts
│   │       ├── invoices/
│   │       │   ├── create/route.ts
│   │       │   ├── [id]/route.ts (PUT for editing)
│   │       │   ├── [id]/send/route.ts
│   │       │   ├── [id]/resend/route.ts (POST — cancel old PaymentIntent if needed, resend SMS)
│   │       │   └── pay/[token]/
│   │       │       ├── route.ts (GET invoice data, PUBLIC)
│   │       │       └── checkout/route.ts (POST create Stripe session, PUBLIC)
│   │       ├── customers/
│   │       │   ├── merge/route.ts
│   │       │   └── [id]/route.ts
│   │       ├── voice/
│   │       │   └── transcribe/route.ts
│   │       ├── schedule/
│   │       │   └── drive-time/route.ts
│   │       ├── stripe/
│   │       │   ├── webhook/route.ts
│   │       │   ├── connect/route.ts (GET — initiate Stripe Connect onboarding)
│   │       │   └── connect/callback/route.ts (GET — handle return from Stripe)
│   │       └── notifications/
│   │           └── subscribe/route.ts
│   ├── components/
│   │   ├── TabBar.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── BackNav.tsx
│   │   ├── PhotoGrid.tsx
│   │   ├── SearchBar.tsx
│   │   ├── MicButton.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── JobCard.tsx
│   │   ├── CustomerCard.tsx
│   │   ├── InvoiceLineItem.tsx
│   │   └── ScheduleSlotPicker.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts (browser client)
│   │   │   ├── server.ts (server client)
│   │   │   └── admin.ts (service role client for webhooks)
│   │   ├── twilio.ts (Twilio client setup)
│   │   ├── stripe.ts (Stripe client setup)
│   │   ├── whisper.ts (OpenAI Whisper helper)
│   │   ├── ai.ts (Claude Haiku parsing helpers)
│   │   ├── maps.ts (Google Maps helper)
│   │   ├── notifications.ts (push notification helpers)
│   │   └── utils.ts
│   └── hooks/
│       ├── useAuth.ts
│       ├── useRealtime.ts (Supabase realtime subscriptions)
│       └── useRecorder.ts (MediaRecorder hook for voice capture)
```

## Build Order

Build in this sequence. Test each phase before moving on.

### Phase 1: Foundation
1. Initialize Next.js project with Tailwind
2. Set up Supabase project, run all table migrations
3. Configure Supabase Auth with Google Sign-In
4. Build login page
5. Build authenticated layout with tab bar
6. Build basic page shells for all four tabs
7. Deploy to Vercel, confirm auth works

### Phase 2: Customers & Conversations
1. Build customer list page with search
2. Build customer profile page with edit for rating/notes
3. Set up Twilio, provision number
4. Build SMS webhook endpoint
5. Build conversation list (Inbox)
6. Build conversation thread (chat view) with send capability
7. Build "Add Customer" flow for unknown numbers with address merge detection
8. Test: send a text to Twilio number, see it appear in Inbox, reply from app

### Phase 3: Jobs & Schedule
1. Build "Create Job" flow from conversation (with AI parsing)
2. Build job detail page
3. Build schedule/calendar view
4. Build photo upload on job detail
5. Build job assignment (assign to partner)
6. Build scheduling flow: pick slots → send options to customer → customer replies → confirm
7. Set up Google Maps API for drive time estimates
8. Test: full flow from inbound text → create job → schedule → see on calendar

### Phase 4: Voice Capture
1. Build voice recording UI (MediaRecorder API)
2. Set up Whisper API integration
3. Build Claude Haiku parsing for job details, invoices, contacts
4. Build the result review/edit screens for each type
5. Test: record voice note → see parsed job card → save

### Phase 5: Invoicing & Payments
1. Build invoice creation from job (manual + voice)
2. Build invoice editing (add/remove/edit line items)
3. Build invoice send via SMS
4. Set up Stripe Connect, build onboarding flow
5. Build customer-facing payment page (/pay/[token])
6. Build Stripe webhook for payment confirmation
7. Build invoice resend after editing
8. Test: create invoice → send → customer pays → notification received

### Phase 6: Notifications, Offline & Polish
1. Set up service worker for PWA push notifications
2. Implement all notification triggers
3. Add drive-time-aware notification timing for upcoming jobs
4. Build call forwarding with logging (including timeout fallback)
5. Add Supabase Realtime subscriptions for live updates
6. PWA manifest for "Add to Home Screen"
7. Build Settings screen (business name, primary partner, Stripe connect, notification prefs)
8. Implement offline support (see spec below)
9. Test everything end-to-end

### Offline / Service Worker Spec
The app must work on job sites with spotty cell service. Here's exactly what to build:

**Cache strategy (service worker):**
- Cache all static assets (JS, CSS, icons) on install
- Cache GET responses for: inbox conversations, schedule/calendar, customer list, job details, customer profiles
- Use stale-while-revalidate: serve cached data immediately, fetch fresh data in background
- Never cache: payment pages, Stripe endpoints, webhook endpoints

**Outbound message queue:**
- When navigator.onLine is false and user tries to send a message via /api/messages/send:
  - Store the message payload in IndexedDB (table: `outbound_queue`)
  - Show the message in the chat UI immediately with a "Queued" badge (small gray indicator)
  - Do NOT show an error — it should feel seamless
- When navigator.onLine fires (connection restored):
  - Flush the IndexedDB queue in chronological order
  - Send each message via the API
  - On success: remove from queue, update UI badge to sent
  - On failure: keep in queue, retry on next online event

**UI indicators:**
- When offline: subtle banner at top of screen "Offline — messages will send when connected" (gray, not alarming)
- Queued messages: show with a small clock icon instead of the sent checkmark
- When back online: banner disappears, queued messages update to sent

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
PARTNER_1_PHONE= (personal phone for call forwarding)
PARTNER_2_PHONE=

# OpenAI (Whisper)
OPENAI_API_KEY=

# Anthropic (Claude Haiku)
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Note: STRIPE_CONNECTED_ACCOUNT_ID is stored in the settings table, not as an env var.
# It gets populated when the plumber completes Stripe Connect onboarding in-app.

# Google Maps
GOOGLE_MAPS_API_KEY=

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# App
NEXT_PUBLIC_APP_URL= # Must match your Vercel deployment URL (e.g., https://jobbook.vercel.app). Used for invoice payment links and Twilio webhook URLs. In development, use your ngrok or Vercel preview URL.
```

## Critical Edge Cases

1. **Long messages from customers:** SMS segments over 160 chars cost more. Our outbound messages (schedule options, invoice links) should be kept under 160 chars where possible.
2. **Customer texts from new number:** Don't auto-create a customer. Create a conversation with just the phone number. Let the plumber decide: add as new customer or link to existing.
3. **Multiple texts in quick succession:** Twilio may deliver them out of order. Sort by Twilio timestamp, not received order.
4. **Voice note in noisy environment:** Whisper handles this well, but the plumber should be able to re-record or manually edit the parsed result.
5. **Customer opens invoice link after plumber edited it:** Always serve the latest version. The public_token stays the same.
6. **Stripe payment fails:** Show clear error on customer page. Don't mark as paid. Plumber gets notified of failure.
7. **Both partners edit the same job simultaneously:** Supabase Realtime handles this — last write wins, but both see updates in real time.
8. **Customer replies to schedule text with something unexpected:** ("Can you come Thursday instead?") This becomes a regular inbound message in the conversation. The plumber handles it manually.
9. **Phone number ported / changed:** Customer_phones table allows multiple phones per customer. Old number stays, new one gets added.
10. **Internet connectivity on job site:** The app should handle offline gracefully — show cached data, queue outbound messages for when connection returns. Use service worker caching.

## Development vs. Production Accounts

During development, use YOUR accounts for everything. This keeps the build fast and unblocked. When the app is ready to hand over, swap the environment variables to the client's accounts.

### Development Phase (Your Accounts)
- Supabase: your project (stays yours — you own the infrastructure)
- Twilio: your account, test number, test mode
- OpenAI: your API key
- Anthropic: your API key
- Stripe: your platform account in TEST MODE
- Vercel: your account (stays yours)
- Google Maps: your API key

### Handoff Checklist (15-minute session with your friend)

**Friend creates these accounts (you walk him through it):**

1. **Twilio** (twilio.com) — 5 minutes
   - Sign up with his email and credit card
   - Buy a local number (+1 604 or +1 778)
   - Copy: Account SID, Auth Token, Phone Number
   - You configure the webhooks to point at the Vercel app URL
   - Estimated cost: ~$12-15/month

2. **OpenAI** (platform.openai.com) — 3 minutes
   - Sign up, add credit card, generate API key
   - Copy: API Key
   - Estimated cost: ~$2-4/month

3. **Stripe Connect onboarding** — 5 minutes
   - This happens INSIDE the app (hosted Stripe onboarding flow)
   - He enters his business info, bank account, identity verification
   - Stripe handles all compliance
   - You never see his financial details
   - Cost: 2.9% + $0.30 per customer payment (paid by customer or baked into invoice)

**You handle (friend never touches):**
- Supabase project (stays on your account, you manage the database)
- Vercel deployment (stays on your account, you manage deploys)
- Anthropic API key (pennies/month, keep on your account or bundle into his OpenAI costs)
- Google Maps API key (stays on your account, minimal cost)
- VAPID keys for push notifications (generated once, no account needed)
- Domain name if custom (you register, bill him yearly or bundle it)

**The swap process:**
1. Open Vercel dashboard → Project Settings → Environment Variables
2. Replace TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER with his
3. Replace OPENAI_API_KEY with his
4. Add STRIPE_CONNECTED_ACCOUNT_ID from his Stripe onboarding
5. Redeploy
6. Test: send a text to his new Twilio number, confirm it shows up in Jobbook
7. Done

**What your friend pays monthly:**
| Service | Cost |
|---------|------|
| Twilio (SMS/MMS/Voice) | ~$12-15 |
| OpenAI (Whisper transcription) | ~$2-4 |
| Stripe (per transaction) | 2.9% + $0.30 |
| **Total fixed costs** | **~$15-20/month** |

**What you pay monthly (infrastructure you own):**
| Service | Cost |
|---------|------|
| Supabase (free tier → $25 if scaling) | $0-25 |
| Vercel (free tier) | $0 |
| Anthropic (Claude Haiku) | ~$2-5 |
| Google Maps API | ~$1-5 |
| **Total** | **~$3-35/month** |

Bill your friend a flat monthly fee that covers your infrastructure costs + your time for maintenance and feature requests. Or keep it informal since he's a friend and just have him cover the Twilio/OpenAI directly.

### If You Scale This to Multiple Clients

When adding a second plumber/tradesperson as a client:
1. They create their own Twilio + OpenAI + Stripe accounts
2. You spin up a new Supabase project (or add multi-tenancy to the existing one)
3. Deploy a new Vercel instance (or add tenant routing)
4. Same app, different data, different API keys
5. Charge each client $200-500/month for the system + maintenance
