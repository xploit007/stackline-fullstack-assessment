# StackShop - Full Stack Assessment

## Overview

Before making any changes, I went through every file in the project and traced how data flows from the JSON file through the ProductService, API routes, and into the React components. This helped me understand which issues were connected and what to fix first.

The most important finding was how the product detail page worked. The list page was serializing the entire product object as JSON in the URL, and the detail page was parsing it back with `JSON.parse`. This one decision caused multiple problems: a potential XSS vulnerability, internal data leaking into browser URLs, and product pages that couldn't be bookmarked or shared. Fixing this was my top priority.

**Summary:**
- Found 17 issues across security, functionality, UX, accessibility, and code quality
- Fixed all critical and high severity issues in 11 commits
- Added no new dependencies

---

## Approach

I prioritized fixes in this order: security first, then core functionality, then UX, then polish. Security issues affect every user including malicious ones, so those come first. Broken features come next because a broken feature is worse than a missing one. UX and polish come last, but only after the app works correctly and safely.

Each commit addresses one specific issue or a group of closely related issues. I structured them this way so each change is easy to review on its own, and the commit order follows the dependency chain. For example, fixing the Product type system had to happen before adding price display, since prices depend on having the correct type.

I also made a deliberate choice to add zero new dependencies. Every fix uses built-in browser APIs, React hooks, or Next.js features. For an app of this size, adding a debounce library or a state management library would be unnecessary overhead.

---

## How to Run

```bash
yarn install
yarn dev
# Open http://localhost:3000
```

---

## Issues Found

### Critical

| # | Issue | File | Description |
|---|-------|------|-------------|
| 1 | XSS via URL-serialized product data | `product/page.tsx` | `JSON.parse` on user-controlled URL input, rendered directly into DOM |
| 2 | Subcategory filter broken | `page.tsx` | API call missing `?category=` param, all subcategories shown regardless of selection |
| 3 | No prices on list page | `page.tsx` | `retailPrice` not in the Product type and never rendered |
| 4 | No prices on detail page | `product/page.tsx` | Same issue on the detail page |

### High

| # | Issue | File | Description |
|---|-------|------|-------------|
| 5 | Product data exposed in URL | `page.tsx` | Full product JSON visible in browser address bar and history |
| 6 | No error handling on fetches | `page.tsx` | All fetch calls had no `.catch()` or `res.ok` check. Errors caused infinite spinner |
| 7 | Detail page ignores SKU API route | `product/page.tsx` | A proper `/api/products/[sku]` endpoint existed but was never used |
| 8 | Duplicate Product types | Multiple files | Three separate Product interfaces with different fields |
| 9 | No product count or pagination info | `page.tsx` | Shows "20 products" with no indication that more exist |

### Medium

| # | Issue | File | Description |
|---|-------|------|-------------|
| 10 | Page title is "Create Next App" | `layout.tsx` | Default boilerplate metadata |
| 11 | Can't clear category without clearing search | `page.tsx` | No "All Categories" option in the dropdown |
| 12 | Search fires on every keystroke | `page.tsx` | No debounce, typing "kindle" sends 6 API calls |
| 13 | Gallery buttons missing accessibility | `product/page.tsx` | No aria-labels, no aria-current for selected state |
| 14 | Button nested inside Link | `page.tsx` | Invalid HTML, broken for screen readers |
| 15 | No limit validation on API | `api/products/route.ts` | User can send `?limit=999999` and get full catalog |

### Low

| # | Issue | File | Description |
|---|-------|------|-------------|
| 16 | No image fallback | `page.tsx` | Empty gray box when product has no images |
| 17 | Generic empty state | `page.tsx` | "No products found" with no guidance on what to do next |

---

## Fixes Applied

### Product Type Consolidation (#8)

The Product type was defined three times across the codebase, each with different fields. The canonical type in `lib/products.ts` was missing `retailPrice` even though every record in the JSON has it.

I removed the duplicate interfaces from both page files and added `retailPrice` to the single Product interface in `lib/products.ts`. Both pages now import from one place. I did this first because every other fix depends on having the correct type. Without a single source of truth, adding `retailPrice` would mean updating three separate interfaces and hoping they stay in sync.

### Price Display (#3, #4)

An eCommerce app that doesn't show prices is fundamentally broken. I added price rendering to both pages using `toLocaleString('en-US', { style: 'currency', currency: 'USD' })`. I chose this over adding a formatting library because it handles currency formatting well enough for a single-currency catalog without adding a dependency. A multi-currency production app would need something more robust, but that felt like over-engineering for this use case.

### Subcategory Filter (#2)

One-line fix. The API already supported filtering by category, the client just wasn't sending the parameter. Changed the fetch URL to include `?category=${encodeURIComponent(selectedCategory)}`. I also added a reset for the subcategory selection when the category changes. Without this, a user could select "Tablets" under Electronics, switch to "Clothing," and still have "Tablets" selected even though it doesn't belong to that category.

### Architecture Refactor - Product Detail Page (#1, #5, #7)

This was the most important change. The original approach of passing product data through the URL was the root cause of multiple issues, so instead of patching each one individually, I replaced the entire pattern.

What I changed:
- Moved `app/product/page.tsx` to `app/product/[sku]/page.tsx` for proper dynamic routing
- Rewrote the detail page as a server component that calls `productService.getById(sku)` directly
- Extracted the image gallery into a separate client component since it needs `useState` for the selected image index
- Updated links on the list page to point to `/product/${product.stacklineSku}` instead of passing serialized JSON

I chose to make this a server component instead of a client component that fetches from the API because the product detail page is mostly static content. Calling the data layer directly on the server avoids a network round-trip and sends rendered HTML to the browser. The `/api/products/[sku]` route still exists for any external API consumers.

I also considered using `generateStaticParams` for full static generation, but that felt like overkill for 500 products with a static JSON source when on-demand server rendering already works well.

This single refactor fixed the XSS vector, the data leakage, and the deep-linking issue all at once.

### Error Handling and Product Count (#6, #9)

All three fetch calls on the home page had no error handling at all. No `.catch()`, no `res.ok` check. A single network failure would leave users stuck on an infinite loading spinner with no way to recover.

I converted everything to `async/await` with `try/catch` and `res.ok` checks, and added an error state with a "Try Again" button. I chose to show a retry button instead of just an error message because transient network issues are common and users should be able to recover without refreshing the page.

I also changed "Showing 20 products" to "Showing 20 of 347 products" using the total from the API response. The API was already returning this count, it was just being ignored. I considered building full pagination (the API supports offset/limit), but showing the count was the higher-priority fix since users didn't even know more products existed.

### Search Debounce (#12)

Typing "kindle" was firing 6 separate API calls, one for each keystroke. I added a 300ms debounce using `setTimeout`/`clearTimeout` in a `useEffect`. The search state is now split into `searchInput` (updates immediately for the input field) and `search` (updates after 300ms for the API call). I went with 300ms because it is the standard threshold: fast enough to feel responsive, slow enough to batch keystrokes into one call.

I considered using React 19's `useDeferredValue` instead, but it doesn't give explicit control over the delay duration. The manual approach is a few more lines but more predictable.

### Category Reset (#11)

Once a category was selected, the only way to clear it was the "Clear Filters" button, which also wiped the search input. I added "All Categories" and "All Subcategories" options to the dropdowns using a sentinel value (`"all"`) that maps to `undefined` internally. I chose this pattern because Radix UI's Select component doesn't handle empty string values well, and the sentinel approach works cleanly with its API.

### Page Metadata (#10)

Updated the page title from "Create Next App" to "StackShop | Product Catalog". Small fix, but a default boilerplate title in a browser tab is something a reviewer would notice immediately.

### Accessibility Fixes (#13, #14)

The product cards had a `<Button>` nested inside a `<Link>`. This is invalid HTML because you can't put a `<button>` inside an `<a>` tag, and it causes unpredictable behavior for screen readers. Since the entire card is already wrapped in a Link, the button was redundant. I removed it and added a hover animation (`hover:-translate-y-1 hover:shadow-lg`) so there's still a visual signal that the card is clickable.

For the image gallery, thumbnail buttons had no accessibility attributes at all. I added `type="button"` to prevent accidental form submission, `aria-label` so screen readers announce what each button does (e.g. "View image 1 of 4"), and `aria-current` to communicate which image is currently selected.

### API Input Validation (#15)

The `limit` query parameter on `/api/products` was parsed from user input with no bounds. Someone could send `?limit=999999` and dump the entire catalog. I clamped it to 1-100 with `Math.max(1, Math.min(100, ...))`. Even with an in-memory data source this is a bad habit to leave in. In a production system backed by a database, this would be a real resource abuse vector.

### Image Fallback (#16)

Products without images were rendering an empty gray box with no explanation. I added a "No image available" text placeholder on both the list page and the detail page. Kept the `bg-muted` background so the card maintains its visual weight in the grid.

### Empty State (#17)

The empty state just said "No products found" with nothing else. That's a dead end. I added "Try adjusting your search or filters" as guidance and a "Clear Filters" button so users have an obvious next step instead of being stuck.

### LCP Optimization

Next.js lazy-loads all images by default, which is correct for images below the fold but hurts Largest Contentful Paint for the first visible image. I added `priority` to the first product card's image so the browser preloads it. This improves Core Web Vitals without affecting load performance for the rest of the images.

---

## Enhancements

### URL-Synced Filter State

This wasn't a bug, but filter state was completely lost when navigating to a product detail page and coming back. I synced the search, category, and subcategory state to URL query params using `router.replace()`. I used `replace` instead of `push` to avoid adding a history entry for every filter change, which would make the back button useless. I wrapped the page in a `Suspense` boundary because `useSearchParams()` requires it in the App Router.

This means filters survive back/forward navigation, and filter URLs are shareable (e.g. `/?search=kindle&category=Electronics`).

### Server-Side Product Detail Page

Converting the detail page to a server component was part of the architecture fix, but it is also a performance win. Static product content now renders on the server with zero client-side JavaScript, except for the interactive image gallery which needs `useState`.

---

## Out of Scope

I chose to skip a few things deliberately.

**Converting the home page to server components** would require splitting it into server and client boundaries and rethinking the entire data fetching strategy. That is a significant architectural change, and the right time to do it is when migrating to server-side data fetching, not during a bug-fix audit.

**Full pagination UI** was deferred even though the API supports offset/limit. Building a proper paginated or infinite-scroll experience would take time away from higher-priority fixes. Showing "X of Y products" was the more impactful change because it makes the limitation visible instead of hidden.

**Multi-currency support** is a feature, not a bug fix. Prices are formatted as USD, which is appropriate for a single-currency catalog.

---

## Testing

| Scenario | Expected Result |
|----------|----------------|
| Select "Electronics" category | Subcategory dropdown shows only Electronics subcategories |
| Navigate to product detail | URL is `/product/[sku]`, price visible, page is refreshable |
| Visit `/product/E8ZVY2BP3` in a new tab | Product loads via server rendering |
| Visit `/product/NONEXISTENT-SKU` | "Product not found" with link back to catalog |
| Type "kindle" in search | Single API call after 300ms (check Network tab) |
| Select category, then "All Categories" | Category resets without clearing search |
| Open `/?search=tablet&category=Electronics` in new tab | Filters restored from URL |
| Product with no images | "No image available" placeholder on both pages |
| Search for "xyznonexistent" | Empty state with "Clear Filters" button |
| Send `GET /api/products?limit=999999` | Response limited to 100 products |
| Hover over product card | Subtle lift animation with shadow |
| Screen reader on image gallery | Thumbnails announce "View image 1 of 4" |