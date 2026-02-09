# CoCRM Product Strategy: The WhatsApp-Native Sales Assistant for SMBs

## 1. The Core Philosophy

**"If it doesn't feel like WhatsApp, they won't use it."**

Indian SMBs live inside WhatsApp. They manage customers, send catalogs, negotiate prices, and close deals — all on WhatsApp. They don't need a "CRM." They need **WhatsApp with superpowers**: a tool that finds new people to message, reminds them who to follow up with, and keeps score of who's interested.

**Our Design Principle:**
> Make every screen feel like a chat app. Cards look like message previews. Actions are taps, not forms. The system remembers everything so the owner doesn't have to.

**The Three Promises:**
1. **"Open the app, know what to do."** — Morning Briefing tells you exactly who needs attention.
2. **"One tap to act."** — WhatsApp/Call buttons are ALWAYS visible. Never buried.
3. **"Never forget a lead."** — Health indicators turn red before you lose someone.

---

## 2. The User Experience: "The WhatsApp-First Feed"

### Design DNA: What We Steal from WhatsApp

| WhatsApp Pattern | CoCRM Equivalent | Why It Works |
| :--- | :--- | :--- |
| Chat list with last message preview | Lead Feed with last interaction context | Instantly familiar |
| Green/blue ticks (delivery status) | 🟢🟡🔴 Health Ring (contact freshness) | Visual urgency without reading |
| Unread message count badge | "Needs Attention" count on hot leads | Creates pull to open the app |
| Long-press for quick actions | Swipe/long-press for Snooze/Archive | Secondary actions without clutter |
| Contact photo + name + last message | Business name + rating + last action | "3-Second Rule" — scan and decide |
| "Reply" button in notifications | Inline WhatsApp/Call buttons on every card | Act without opening detail screen |

### A. The Lead Card — "Like a Chat Preview"

Each lead in the feed looks like a WhatsApp conversation preview:

```
┌──────────────────────────────────────┐
│ 🔴  Acme Architects          ⭐ 4.9  │
│     "Replied: Yes, send the          │
│      catalog please!"                │
│     2 min ago              [Reply →] │
└──────────────────────────────────────┘
```

**Anatomy of the Card:**

| Element | Source | Purpose |
| :--- | :--- | :--- |
| **Health Ring** (🟢🟡🔴) | Computed from `last_contacted_at` | Instant urgency signal |
| **Business Name** | `business_details.name` | Identity |
| **Rating** | `business_details.rating` | Quality signal |
| **Context Line** | Last interaction or AI suggestion | "What happened last?" |
| **Time Ago** | `last_interaction_at` or `created_at` | Freshness |
| **Primary Action Button** | Dynamic based on context | One-tap action |

**The Context Line is the secret weapon.** Instead of showing address (static, boring), show:
- *"Replied: Yes, send the catalog!"* → Lead responded (🔥 Hot)
- *"You called. No answer."* → Needs retry
- *"No contact in 15 days"* → Slipping away
- *"New lead · ⭐ 4.9 · 2.5 km away"* → Fresh lead, show discovery info
- *"Follow-up due today"* → Task reminder

**The Primary Action Button adapts:**
- Lead replied? → **[Reply →]** (opens WhatsApp)
- You called, no answer? → **[Call Back →]** (opens dialer)
- New lead, never contacted? → **[📱 WhatsApp]** (sends intro)
- Follow-up due? → **[📞 Follow Up]**

### D. Reply Detection — "How Do We Know They Replied?" (V1 = Manual)

**Reality check:** CoCRM does NOT have a WhatsApp Business API integration in V1. We cannot auto-detect replies.

**V1 Solution — The "🔥 They Replied!" Button:**
- Every Lead Card (status = `contacted`) shows a small **"🔥 They Replied!"** button alongside WhatsApp/Call.
- One tap → status transitions to `responded`. Card moves to the 🔥 REPLIED group.
- System logs interaction: `type: "note", content: "Lead replied (marked by owner)"`.
- This is fast, honest, and requires zero API complexity.

**V2 (Phase 2+) — WhatsApp Business API:**
- Integrate with WhatsApp Business API or a provider like Gupshup/Wati.
- Auto-detect inbound messages, update `has_unread_message = true`.
- Show actual message preview in the Context Line.
- **Cost:** ~₹0.50–₹1.50 per conversation. Must be factored into pricing.

### E. Google Places Data Utilization

We already fetch rich data from Google Places during discovery. Here's how to use it across the UI:

| Google Places Field | Where It Appears | UX Value |
| :--- | :--- | :--- |
| **Rating** (1-5 stars) | Lead Card badge, Detail Screen | Quality signal — "Is this lead worth my time?" |
| **Review Count** | Detail Screen, Smart Insight | Social proof — 128 reviews = established; 3 reviews = new/risky |
| **Opening Hours** | Lead Card badge: "🟢 Open" / "🔴 Closed" | Timing — "Call now, they're open!" |
| **Place Photos** | Lead Card thumbnail (first photo) | Visual recognition — "I know this shop!" |
| **Business Type** | Auto-tag on discovery (e.g., `#Architect`, `#Restaurant`) | Auto-categorization without manual tagging |
| **Website URL** | Detail Screen link, Smart Insight analysis | Enrichment — AI can analyze their website for pitch ideas |
| **Price Level** (₹-₹₹₹₹) | Detail Screen, filtering | Segmentation — target premium or budget businesses |

**"Open Now" Badge on Lead Card (High Impact, Low Effort):**
```
┌──────────────────────────────────────┐
│ 🟡  Kumar Studios    ⭐4.2  🟢 Open  │
│     "No contact in 15 days"          │
│     15d ago            [📱 WhatsApp] │
└──────────────────────────────────────┘
```
The green "Open" badge tells the owner: *"Call NOW, they're at the shop."* This is a high-value nudge that costs nothing to implement (we already have the data).

### B. The Feed Layout — "Grouped by Urgency, Not Status"

Don't group leads by pipeline status (New → Contacted → ...). Group by **what needs action NOW**:

```
┌──────────────────────────────┐
│  🔍 Search leads...    [+]   │
│ ──────────────────────────── │
│                              │
│  🔥 REPLIED (2)              │
│  ┌──────────────────────────┐│
│  │ Lead cards...            ││
│  └──────────────────────────┘│
│                              │
│  📞 FOLLOW UP TODAY (5)      │
│  ┌──────────────────────────┐│
│  │ Lead cards...            ││
│  └──────────────────────────┘│
│                              │
│  🔴 NEEDS ATTENTION (3)      │
│  ┌──────────────────────────┐│
│  │ Lead cards...            ││
│  └──────────────────────────┘│
│                              │
│  🆕 NEW LEADS (12)           │
│  ┌──────────────────────────┐│
│  │ Lead cards...            ││
│  └──────────────────────────┘│
│                              │
│ ──────────────────────────── │
│  📊 Leads  💬 Chat  ✅ Tasks │
└──────────────────────────────┘
```

**Grouping Logic (computed client-side):**

| Group | Condition | Sort |
| :--- | :--- | :--- |
| 🔥 **Replied** | `status == 'responded'` or `has_unread_message == true` | `last_interaction_at` DESC |
| 📞 **Follow Up Today** | `next_follow_up_at <= today` | `next_follow_up_at` ASC |
| 🔴 **Needs Attention** | `last_contacted_at` > 7 days ago AND status not `closed_*` | `last_contacted_at` ASC (oldest first) |
| 🆕 **New Leads** | `status == 'new'` AND never contacted | `created_at` DESC |
| ✅ **All Good** | Everyone else (recently contacted, healthy) | `last_interaction_at` DESC |

**Secondary View:** User can switch to a flat "All Leads" list with status filter tabs (like current implementation) via a toggle. But the default MUST be the urgency-grouped feed.

### C. One-Tap Actions — "Never Open a Screen Just to Press a Button"

**The #1 rule:** The most common action (WhatsApp) must NEVER require opening the detail screen.

Every Lead Card has inline action buttons. Tapping them:
1. Executes the action (opens WhatsApp, initiates call).
2. **Automatically logs the interaction** (see §4 Implicit Tracking).
3. Card updates its context line.

**Action hierarchy on each card:**

| Priority | Button | Behavior |
| :--- | :--- | :--- |
| Primary | **[📱 WhatsApp]** or **[Reply →]** | Opens `wa.me/{phone}` with pre-filled text |
| Secondary (visible) | **[📞 Call]** | Opens `tel:{phone}`, logs call |
| Secondary (visible, if `contacted`) | **[🔥 They Replied!]** | One-tap: status → `responded`, logs interaction |
| Tertiary (long-press/swipe) | **Snooze** | Opens quick picker (see below), sets `next_follow_up_at` |
| Tertiary (long-press/swipe) | **Archive** | Soft-deletes (`is_archived: true`) |

**Flexible Snooze Picker:**
Instead of a hardcoded 7-day snooze, show a quick bottom sheet:
- ☀️ **Tomorrow**
- 📅 **3 Days**
- 📆 **1 Week**
- 🗓️ **1 Month**
- 📌 **Pick a Date** (opens date picker)

SMBs often think in events (*"Call after Diwali"*, *"Follow up after their project ends"*), so a flexible date picker is essential.

---

## 3. The "Morning Briefing" — The Indispensable Feature

**This is what makes CoCRM an app they CAN'T work without.**

When the owner opens the app, BEFORE the lead feed, a **single hero card** appears at the top:

```
┌──────────────────────────────────────┐
│  Good Morning, Rahul! ☀️              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🔥  2 leads replied last night      │
│  🔴  3 leads slipping away (7+ days) │
│  📞  5 follow-ups due today          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│          [▶️ Start My Day]            │
└──────────────────────────────────────┘
```

**"Start My Day" enters the Smart Queue:**
- Shows the 🔥 replied leads first (hottest opportunities).
- Then shows 🔴 slipping leads (rescue before lost).
- Then shows 📞 follow-ups (scheduled tasks).
- Each card shows ONE lead with full context + action buttons.
- After acting, card auto-advances to next.
- When queue is empty: "🎉 All caught up! Great work today."

**Data source for Morning Briefing:**
- 🔥 Replied: `leads` where `has_unread_message == true` OR `status == 'responded'` AND `last_interaction_at > yesterday`.
- 🔴 Slipping: `leads` where `(now - last_contacted_at) > 7 days` AND `status` is not `won`/`lost`/`archived`.
- 📞 Follow-ups: `leads` where `next_follow_up_at <= end_of_today`.

**Greeting logic:**
- Before 12 PM: "Good Morning"
- 12 PM – 5 PM: "Good Afternoon"
- After 5 PM: "Good Evening"

---

## 4. Implicit Tracking — "Zero Data Entry, Full History"

Small business owners will **NEVER** manually "Log a Call." Every interaction must be tracked automatically by observing button clicks.

### The "Magic Button" System

| User Action | System Logs | Updates |
| :--- | :--- | :--- |
| Taps **WhatsApp** button | Creates interaction: `type: "whatsapp", direction: "outbound"` | `last_contacted_at = now`, `status → 'contacted'` (if `new`) |
| Taps **Call** button | Creates interaction: `type: "call", direction: "outbound"` | `last_contacted_at = now`, `status → 'contacted'` (if `new`) |
| Taps **Map/Navigate** button | Creates interaction: `type: "note", content: "Navigated to location"` | `last_contacted_at = now` |
| Opens in-app **conversation** | No interaction created | `has_unread_message = false` |
| Taps **Send Info** (Quick-Send) | Creates interaction: `type: "whatsapp", content: "Sent: {template_name}"` | `last_contacted_at = now` |

**Cost:** All client-created interactions set `cost: 0` and `metadata.is_draft: false` per schema rules.

### The Health Ring — "Keep the Lights Green"

Every lead has a colored indicator (ring around avatar or dot) that communicates urgency at a glance.

**Default Thresholds (used when no business type is configured):**

| Color | Meaning | Default Threshold | Visual |
| :--- | :--- | :--- | :--- |
| 🟢 **Green** | Recently contacted | `last_contacted_at` within 7 days | Calm. No action needed. |
| 🟡 **Yellow** | Needs attention soon | `last_contacted_at` between 7-30 days | Gentle nudge. |
| 🔴 **Red** | Slipping away | `last_contacted_at` > 30 days OR never contacted | Urgent. Act now. |
| ⚪ **Grey** | Closed (Won/Lost) | `status` is `won` or `lost` | Done. No action. |

> [!NOTE]
> These are **defaults**. When a business type is configured (see §6), thresholds adjust automatically.
> For example, B2B businesses get relaxed thresholds (🟢 30d / 🟡 60d / 🔴 90d) because relationship-building is slower.
> The `getHealthStatus()` function reads thresholds from `tenantConfig.health_thresholds` with the above as fallbacks.

**Computation (client-side utility):**
```typescript
interface HealthThresholds {
  green_days: number;  // contacted within this = green
  yellow_days: number; // contacted within this = yellow, beyond = red
}

const DEFAULT_THRESHOLDS: HealthThresholds = { green_days: 7, yellow_days: 30 };

function getHealthStatus(
  lead: Lead,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS
): 'green' | 'yellow' | 'red' | 'grey' {
  if (['won', 'lost'].includes(lead.status)) return 'grey';
  if (!lead.last_contacted_at) return 'red';
  const daysSince = differenceInDays(new Date(), lead.last_contacted_at.toDate());
  if (daysSince <= thresholds.green_days) return 'green';
  if (daysSince <= thresholds.yellow_days) return 'yellow';
  return 'red';
}
```

**The owner's job is simple: "Keep the lights green."** No dashboards, no reports, no analytics. Just colors.

---

## 5. The Quick-Send Tray — "Your Digital Visiting Card Rack"

Business owners always struggle: *"Where's that catalog PDF? What message did I send last time?"*

### V1: Simple & Practical (No AI Required)

**Setup (one-time, in Settings):**
- Owner uploads 3-5 "Quick Reply" items.
- Each item has: **Label** (e.g., "Product Catalog"), **Message Text** (pre-written), **Optional Image/PDF URL**.
- Stored in `tenants.config.quick_replies[]`.

**Usage (on any Lead Card or Detail Screen):**
1. Tap **"📩 Send Info"** button.
2. Bottom sheet appears with the 3-5 templates.
3. Tap one → System opens `wa.me/{phone}?text={encoded_message}`.
4. Owner hits Send in WhatsApp.
5. System logs interaction: `"Sent: Product Catalog"`.

**Example Quick Replies for a Furniture Store:**

| # | Label | Pre-filled Message |
| :--- | :--- | :--- |
| 1 | "Product Catalog" | "Hi! Here's our latest collection: {catalog_link}. Let me know if anything catches your eye! — {company_name}" |
| 2 | "Price List" | "Hi! As discussed, here's our updated price list: {price_link}. Happy to answer any questions!" |
| 3 | "Intro Message" | "Hello! I'm {owner_name} from {company_name}. We specialize in premium furniture for commercial spaces. Would love to connect!" |

**Why this works:** It's exactly how SMBs already use WhatsApp — saved messages they copy-paste. We just make it one tap instead of digging through chat history.

### V2 (Phase 2): Smart Context

- If lead is tagged `#Architect` → Tray shows "Design Catalog" first.
- If lead is tagged `#Homeowner` → Tray shows "Sale Offer" first.
- Powered by tenant-level tag → template mapping (not per-lead AI).

---

## 6. Business Type Defaults — "One Question, Smart Forever"

Instead of per-lead card adaptation (expensive, unreliable), we configure intelligent defaults at the **tenant level**.

### During Onboarding (after Company Setup):

**"What best describes your business?"** (one tap):
- 🏭 "I sell **products** to other businesses" (B2B)
- 🏠 "I sell **products** to customers" (B2C)
- 💼 "I provide **services** to other businesses" (B2B Services)
- 🎓 "I provide **services** to customers" (B2C Services — Coaching, Gym, Salon)

**Stored as:** `tenants.config.business_type` (enum: `b2b_product`, `b2c_product`, `b2b_service`, `b2c_service`)

### How Business Type Affects Behavior:

| Behavior | B2B Product (Furniture Store) | B2C Service (Coaching Center) |
| :--- | :--- | :--- |
| **Default Lead Tag** | `#Partner` | `#Prospect` |
| **Follow-up Frequency** | Every 30 days (relationship) | Every 7 days (urgency) |
| **Default Intro Message** | "Hi! We're {company}. Here's our catalog..." | "Hi! We offer {service}. Free trial available!" |
| **Health Ring Thresholds** | 🟢 30d / 🟡 60d / 🔴 90d | 🟢 7d / 🟡 14d / 🔴 30d |
| **Success Metric** | "Partners sending repeat orders" | "Leads converting to paid members" |

**This replaces the "Chameleon Card" concept.** Same effect (context-aware behavior), 10x simpler implementation, zero per-lead API calls.

---

## 7. The Lead Lifecycle — "Dead Simple, No Jargon"

**One unified model** across all documents. Only **5 statuses** — anything more confuses SMBs.

| Internal Status | User-Facing Label | Emoji | Color | Trigger |
| :--- | :--- | :--- | :--- | :--- |
| `new` | "🆕 Fresh Lead" | 🆕 | Blue | Discovered via Maps or added manually |
| `contacted` | "📞 Reached Out" | 📞 | Amber | Any outbound action (WhatsApp/Call/Email) |
| `responded` | "🔥 Interested!" | 🔥 | Orange | Lead replied or showed interest |
| `won` | "🤝 Customer" | 🤝 | Green | Deal closed, payment received |
| `lost` | "❄️ Not Now" | ❄️ | Grey | Lead declined or went cold |

**Rules:**
- **Auto-transition `new` → `contacted`:** When owner clicks WhatsApp or Call button.
- **Manual transition `contacted` → `responded`:** Owner taps the **"🔥 They Replied!"** button on the card (see §2.D).
- **Manual transition only:** `responded` → `won`/`lost` (via status picker on Detail Screen).
- **"Not Now" ≠ "Dead":** Lost leads resurface automatically after 90 days.
- **No `qualified` or `demo_booked`:** SMBs don't think in these terms. If needed, use Notes.

**Where do "Lost" leads resurface?**
- In the **Morning Briefing** as a separate line: *"🔄 3 old leads worth reconnecting"*.
- In the **Feed** as a new urgency group: **"🔄 RECONNECT? (3)"** — appears below all active groups.
- Each resurfaced card shows: *"You marked this as 'Not Now' 90 days ago. Worth another try?"*
- Actions: **[📱 Reconnect]** (reopens as `new`) or **[❌ Remove]** (permanently archives).

---

## 8. Implementation Roadmap (V1)

### Step 1: "Health Ring + Inline Actions" (Highest Impact, Lowest Effort)
- Add `getHealthStatus()` utility function with configurable thresholds.
- Update `LeadCard` component:
  - Add colored health dot/ring.
  - Add inline WhatsApp + Call buttons (stop clicks from propagating to detail screen).
  - Add **"🔥 They Replied!"** button (visible when status = `contacted`).
  - Show context line (last interaction or "New lead · ⭐ 4.9").
  - Show **"🟢 Open Now"** badge when Google Places opening hours indicate open.
- Wire `onClick` of WhatsApp/Call buttons to create `interactions` docs automatically.
- Wire `onClick` of "They Replied" button to transition status → `responded`.

### Step 2: "Urgency-Grouped Feed"
- Update `LeadListScreen` to show leads grouped by urgency (Replied → Follow-up Today → Needs Attention → New → Reconnect?).
- Add toggle to switch between "Smart Feed" (grouped) and "All Leads" (flat list with status filter tabs).
- Keep existing status filter tabs accessible in "All Leads" view.
- Add **"🔄 RECONNECT?"** group for lost leads older than 90 days.

### Step 3: "Morning Briefing"
- Add `MorningBriefingCard` component at top of Lead Feed.
- Compute counts from leads data (replied, slipping, follow-ups due, reconnectable).
- "Start My Day" enters Smart Queue mode (sequential card view).

### Step 4: "Quick-Send Tray"
- Add `quick_replies` array to `tenants.config` schema.
- Add "Quick Replies" section in Settings screen for setup (label + message text).
- Add "📩 Send Info" button on LeadCard and LeadDetailScreen.
- Bottom sheet picker → opens `wa.me` with pre-filled text.

### Step 5: "Business Type Defaults"
- Add "What's your business?" question to onboarding flow (after Company Setup).
- Store as `tenants.config.business_type` and `tenants.config.health_thresholds`.
- Apply default Health Ring thresholds and follow-up frequency per business type.

### Step 6: "Flexible Snooze + Bulk Actions" (Phase 1.5)
- Replace hardcoded 7-day snooze with quick picker (Tomorrow / 3 Days / 1 Week / 1 Month / Pick Date).
- Add "Select Multiple" mode to Lead Feed:
  - Long-press a card → enters selection mode.
  - Bulk actions bar appears: **[📱 Send Intro to All]** | **[⏰ Snooze All]** | **[🗑️ Archive All]**.
  - "Send Intro to All" opens WhatsApp sequentially for each selected lead (or uses Quick-Send template).

---

## 9. What Makes This "Can't Work Without" (Retention Hooks)

| Hook | Mechanism | Why It Works |
| :--- | :--- | :--- |
| **Morning Briefing** | Opens app → Sees exactly what to do → Acts in 5 min | Creates daily habit. Like checking WhatsApp. |
| **Health Ring** | Red dots create anxiety → Owner acts → Green feels good | Loss aversion + completion dopamine. |
| **Smart Queue** | "Start My Day" → Work through queue → "All done! 🎉" | Gamification without gamification. |
| **Implicit Tracking** | Owner never enters data → But history is always there | "How do I go back to NOT having this?" |
| **Quick-Send** | Pre-written messages → One tap → Sent | Saves 5 min per lead per day. |
| **Resurfacing** | Lost leads come back after 90 days → "Reconnect?" | Turns dead leads into second chances. |

**The ultimate test:** *If the owner stops using CoCRM for 3 days, do they feel anxious about missing follow-ups?* If yes, we've won.

---

## 10. Design Reference: Screen-Level Wireframes

### 10.1 Lead Feed (Default View)
```
┌──────────────────────────────┐
│  CoCRM          ₹340  🔔  ⚙️ │
│ ──────────────────────────── │
│  ┌──────────────────────────┐│
│  │ Good Morning, Rahul! ☀️  ││
│  │ 🔥 2 replied · 🔴 3 need ││
│  │ attention · 📞 5 due     ││
│  │      [▶️ Start My Day]   ││
│  └──────────────────────────┘│
│                              │
│  🔍 Search leads...          │
│                              │
│  🔥 REPLIED (2)              │
│  ┌──────────────────────────┐│
│  │🔴 Acme Architects  ⭐4.9 ││
│  │  "Yes, send the catalog!"││
│  │  2m ago        [Reply →] ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │🟡 Kumar Studios    ⭐4.2 ││
│  │  "Missed call (3:45 PM)" ││
│  │  4h ago     [Call Back →]││
│  └──────────────────────────┘│
│                              │
│  📞 FOLLOW UP TODAY (3)      │
│  ┌──────────────────────────┐│
│  │🟡 Design Hub       ⭐4.5 ││
│  │  Last: Sent catalog, no  ││
│  │  reply. Try calling?     ││
│  │  3d ago    [📞][📱][⏰] ││
│  └──────────────────────────┘│
│          ...                 │
│                         [+]  │
│ ──────────────────────────── │
│  📊 Leads  💬 Chat  ✅ Tasks │
└──────────────────────────────┘
```

### 10.2 Lead Detail Screen (Tap to Expand)
```
┌──────────────────────────────┐
│  ← Acme Architects     •••  │
│ ──────────────────────────── │
│  ┌──────────────────────────┐│
│  │🆕← 📞 ← 🔥 ← 🤝       ││
│  │      ▲ currently here    ││
│  └──────────────────────────┘│
│                              │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │ 📱 │ │ 📞 │ │ 📩 │       │
│  │ WA │ │Call│ │Info│       │
│  └────┘ └────┘ └────┘       │
│                              │
│  ┌──────────────────────────┐│
│  │ ✨ Smart Insight          ││
│  │ Score: 85 · #Partner     ││
│  │ "High potential. Has     ││
│  │  website, no booking     ││
│  │  system. Offer trial."   ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 📝 Quick Note            ││
│  │ ┌────────────────────┐   ││
│  │ │ Type a note...     │   ││
│  │ └────────────────────┘   ││
│  └──────────────────────────┘│
│                              │
│  📍 Indiranagar, Bangalore   │
│  🌐 www.acmearch.com         │
│  ⭐ 4.9 (128 reviews)        │
│                              │
│  ── Timeline ──              │
│  📱 WhatsApp sent · 2d ago   │
│  📞 Called, no answer · 5d   │
│  🆕 Discovered · 12d ago     │
└──────────────────────────────┘
```

### 10.3 Smart Queue ("Start My Day" Mode)
```
┌──────────────────────────────┐
│  ← Smart Queue    3 of 10   │
│ ──────────────────────────── │
│                              │
│  ┌──────────────────────────┐│
│  │                          ││
│  │  🔴 Acme Architects      ││
│  │  ⭐ 4.9 · Indiranagar    ││
│  │                          ││
│  │  "Replied: Yes, send     ││
│  │   the catalog please!"   ││
│  │                          ││
│  │  Last: You sent an       ││
│  │  intro message 2 days    ││
│  │  ago. They replied!      ││
│  │                          ││
│  │  ┌────────────────────┐  ││
│  │  │ 📱 Reply on WhatsApp│  ││
│  │  └────────────────────┘  ││
│  │  ┌────────────────────┐  ││
│  │  │ 📩 Send Catalog    │  ││
│  │  └────────────────────┘  ││
│  │  ┌────────────────────┐  ││
│  │  │ ⏰ Snooze 7 days   │  ││
│  │  └────────────────────┘  ││
│  │                          ││
│  └──────────────────────────┘│
│                              │
│  [← Prev]    [Skip]  [Next →]│
└──────────────────────────────┘
```

---

*This system requires **zero training**. You open the app, you see red dots, you tap WhatsApp. The app handles the remembering, the scoring, and the follow-ups. Just keep the lights green.*
