# Operational Scope: Products & Services

**Goal:** Define the "Items for Sale" so the AI Agent knows *exactly* what to pitch and what prices to quote.
**Context:** This data is injected into the RAG (Retrieval Augmented Generation) pipeline.

## 1. The "Product" Entity

The AI cannot rely solely on unstructured PDFs for pricing. We need a structured catalog.

### Data Structure (`products` collection)

*   `name`: (String) e.g., "MPSC Foundation Course".
*   `description`: (String) "6-month rigorous coaching for Prelims. Includes 10 mock tests."
*   `price`: (Integer) Stored in **paisa**. e.g., 2500000 (= ₹25,000.00). All price values in this collection are in paisa — divide by 100 for display.
*   `billing_cycle`: (String) "one_time", "monthly", "yearly".
*   `is_active`: (Boolean)
*   `metadata`: (Map)
    *   `duration`: "6 months"
    *   `mode`: "Offline/Online"

## 2. Integration with AI "The Sales Rep"

When the AI constructs a reply (in `4_System_Prompts.md`), it will query this collection.

**New Prompt Injection:**

> **Available Products:**
> 1. {Name}: {Price} - {Description}
> 2. {Name}: {Price} - {Description}
>
> **Rule:** IF the user asks for the price of "MPSC", ONLY quote the price listed above. DO NOT guess.

## 3. Operational Limits

*   **Stock/Inventory:** Not tracked in this MVP. We assume services are always "available" unless `is_active` is false.
*   **Discounts:** The AI is **NOT ALLOWED** to offer discounts unless explicitly configured in a future "Promotions" module.

---

**End of File**
