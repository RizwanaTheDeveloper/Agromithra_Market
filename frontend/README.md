# Agromitra Market frontend

The complete frontend from the supplied APK, adapted for phones, tablets and desktops. All 49 APK routes share local application state. No backend files were changed, and the application makes no backend API calls.

## Run

Run inside `frontend`:

```powershell
npm ci
npm run web
```

The preweb script builds the assets, then starts the browser-only development server at http://localhost:4173. Source changes rebuild and reload the browser automatically. Keep this terminal running. Expo web remains available with npm run web:expo. Fresh browsers start with the APK onboarding; returning profiles open Home.

For a standalone browser build:

```powershell
npm run build:web
npm run preview
# http://localhost:4173
```

The static output is `dist/`. Hash URLs such as `/#/smart-center` and `/#/detail?id=L101` support browser back/forward and refresh. Earlier Home/Profile/account paths have compatibility mappings.

For the native Expo shell:

```powershell
npm run android
# On macOS:
npm run ios
```

The native app uses an offline WebView containing the same complete frontend, CSS, data and inlined illustrations. It does not load a hosted website. Android back, external links and printing have native bridges. File picking, printing, WhatsApp and calling depend on device capabilities. This preserves the APK's web UI instead of maintaining a second, partial React Native implementation. Android export verifies compilation; actual device testing is still required.

## Maintained folders

```text
frontend/
  src/
    app/                       Expo web/native entry points
    components/                Shared UI, forms, dialogs and icons
    core/                      State, routing, action and form handlers
    data/                      Marketplace, price fixtures and migrations
    features/
      account/                 Profile, settings and demo plans
      administration/          Management and moderation
      guide/                   Buying/selling and price/quality guides
      insights/                Analysis, reports, imports and area prices
      listings/                Listing screens and draft storage
      marketplace/             Home, browse, filters, saved items and details
      media/                   Uploads, gallery, IndexedDB and capture checks
      messaging/               Conversations and notifications
      onboarding/              Welcome and profile setup
      payments/                Fictional payment records
      requirements/            Buyer needs and supplier quotes
      services/                Inspections and transport
      support/                 Help, tickets and disputes
      trades/                  Activity, quotes, terms and completion
      verification/            Demo OTP, review and contact permissions
    lib/                       Price engine and CSV/JSON processing
    styles/                    Base, comfort, insights and responsive styles
    utils/                     Shared input validation
    generated/                 Generated native HTML; do not edit
    manifest.json              Source module and stylesheet order
  assets/images/apk/           Illustrations
  public/market/               Generated browser assets; do not edit
  scripts/                     Build and development/preview servers
  tests/                       Browser workflow and responsive tests
  preview/                     Verification screenshots
  reference/                   APK source and archived implementations
```

Edit the related folders under `src/`, then run `npm run build:web` or restart `npm run web`. The base, comfort and insights modules preserve the APK's layer order. The manifest composes them into one runtime so all screens share their state and handlers. `reference/tools/convert-apk.cjs` is a one-time extraction tool; do not rerun it over maintained application changes.

## Screen inventory

| Feature | APK routes |
| --- | --- |
| Entry and marketplace | welcome, onboard, home, browse, detail, saved |
| Selling | seller-home, sell (three steps), manage-listings, success |
| Requirements | requests, request-detail, request-form, offer |
| Activity and trades | activity, deals, deal, agreement, receipt, document |
| Inspections and transport | inspection, inspection-results, transport, services |
| Payments | payment, payments |
| Messaging | inbox, chat, notifications |
| Profile and plans | account, profile, plans |
| Verification/privacy | verification, buyer-review, contact-history, contact-privacy, seller-enquiries |
| Guides | flow-guide |
| Insights | smart-center, smart-analysis, smart-report, smart-data, smart-market, smart-document |
| Support and administration | support, ticket, help, admin, moderation |

## Implemented local features

- English/Telugu, buying/selling modes, local profile preferences, all eight categories, search, filters, sorting, saved items and details.
- Three-step listing creation/editing; six real photos and one video; cover selection, deletion, gallery, saved drafts, publishing, pause/activate, renew and sold status.
- IndexedDB media storage. Capture checks measure brightness, resolution, detail and sampled video frames. AI examples remain explicitly simulated.
- Demo OTP and reviewer approval, WhatsApp/call permissions, buyer blocks and enquiry history.
- Buyer requirements/quotations, conversations, simulated replies and notifications.
- Complete trade progression: quote/counteroffer, inspection/results, written terms, fictional advance, transport readiness, pickup, receipt, balance settlement, inventory deduction and reviews.
- Service history, sample plans/promotions, payment records, printable documents, support tickets and disputes.
- Product/variety/unit matching, reference prices, lot costs, freshness/provenance, buyer evidence, CSV/JSON import/validation and area price board.
- Demonstration administration/moderation, local reset and persistent state/media.
- Phone bottom navigation, tablet grids, desktop sidebar, responsive forms/cards and print styles.

## Data and external actions

The app uses `agromitra.market.prototype.v1` in localStorage and `agromitra.media.v11` in IndexedDB. Profile, saved items and owned listings from the earlier partial frontend migrate when no complete-app store exists. The earlier key remains untouched for recovery; records with incompatible trade schemas remain available to the archived implementation.

All business operations are local simulations. Imports read files on the device. Opening an official source, WhatsApp or the phone dialer is an explicit user action. APK prices are dated fictional fixtures. Uploads do not certify product quality or animal health. There is no live SMS, AI model, payment processing, market sync or service booking.

## Verification

```powershell
npm run check
npm run test:frontend
npm run export:web
npx expo export --platform android --output-dir .expo/native-check
```

The browser suite checks onboarding, search/saved listings, real image upload and rehydration, verification/contact preview, the quote-to-settlement lifecycle, messaging/support, image checks, CSV import, deep-link refresh and Telugu. It renders every route at 360, 768 and 1440 pixels, checks overflow and navigation overlap, and rejects runtime errors and backend requests. Screenshots are saved to `preview/`. Android export is a bundle check, not an emulator/device UI test.

## Android, iOS and responsive web

The shared layout supports compact phones (320 px), larger Android/iPhone widths, landscape, tablets and desktop browsers. Native SafeAreaView handles device cutouts and the home indicator; the browser uses CSS safe-area insets. The native HTML is marked to avoid applying those insets twice.

KeyboardAvoidingView manages the native keyboard and the WebView disables duplicate iOS keyboard adjustments. Bottom navigation hides while typing, and web chat/dialog positions follow the visual viewport. Portrait/landscape rotation stays enabled, form text avoids automatic iOS zoom, and controls have touch-sized targets.

Additional responsive verification:

```powershell
npm run test:platforms
npx expo export --platform android --platform ios --output-dir .expo/platform-check
```

The platform suite checks all 49 routes in Chrome and WebKit at 320x568, 393x852, 412x915, 844x390, 768x1024, 1024x768 and 1440x900, plus keyboard-state transitions and landscape safe-area padding. It uses the installed Chrome executable on Windows. Install Playwright WebKit before running the suite; in this workspace it is cached under `.expo/browsers`.

These are browser-engine/layout and native-compilation checks. Actual Android and iOS device testing, including their real keyboards and file pickers, remains required before release.
