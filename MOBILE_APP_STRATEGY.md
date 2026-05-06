# ProfitPath Mobile App Strategy

This document outlines the approach for packaging ProfitPath as native iOS and Android apps via Capacitor, along with monetization strategy and deployment workflow.

---

## Executive Summary

**Goal**: Deploy ProfitPath to iOS App Store and Google Play Store by Q3 2026  
**Approach**: Capacitor wrapper around existing web codebase  
**Timeline**: 8-10 weeks (solo hobby development, flexible pace)  
**Effort**: ~40-50 hours total across setup, testing, and submission  
**Launch**: **Free-only** (all current features available)  
**Monetization**: Freemium model added later (Premium tier for advanced features TBD)  

---

## Why Capacitor?

| Factor | Capacitor | React Native | Native (Swift/Kotlin) |
|--------|-----------|--------------|---------------------|
| Code reuse | 100% (web codebase) | ~70% (shared logic only) | 0% (rewrite everything) |
| Time to market | 8-10 weeks | 16-20 weeks | 20-30 weeks |
| Maintenance burden | 1 codebase | 1.5-2 codebases | 2 separate codebases |
| Mobile performance | Good (sufficient for calculator) | Excellent | Excellent |
| Learning curve | Minimal (uses existing tech) | Medium (JSX + platform APIs) | High (2 languages) |
| Feature sync | Automatic | Manual (2 implementations) | Manual (3 implementations) |

**Decision**: Capacitor is the optimal path for a solo hobbyist with an existing web app.

---

## Technology Stack

### Current Web Stack (No Changes)
- **Build**: Vite
- **Language**: JavaScript (ES6+)
- **Testing**: Vitest + Playwright
- **PWA**: Service worker (sw.js), manifest.json
- **State**: localStorage (client-only)

### New Mobile Layer
- **Framework**: Capacitor 6.x (latest)
- **iOS**: Xcode 15+ (Mac required)
- **Android**: Android Studio (any OS)
- **Native plugins**: Capacitor plugins for Keyboard, StatusBar, SplashScreen

### Why Zero Breaking Changes
- Capacitor is a **wrapper**, not a framework replacement
- Existing service worker + localStorage already mobile-optimized
- No platform-specific code needed for core functionality
- App shell is pure web code you already have

---

## Implementation Roadmap

### Phase 1: Setup (Week 1) — 4-5 hours

**1.1 Initialize Capacitor**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init profitpath "ProfitPath"
```

**1.2 Install Native Platforms**
```bash
npx cap add ios
npx cap add android
```

**1.3 Install Essential Plugins**
- `@capacitor/keyboard` — Mobile keyboard handling
- `@capacitor/status-bar` — Status bar customization
- `@capacitor/splash-screen` — Launch screen
- `@capacitor/storage` — localStorage fallback (optional, web version sufficient)

**1.4 Update Configuration**
- `capacitor.config.ts` — App ID, version, iOS deployment target (14.0+), Android target API 34+
- `package.json` — Bump version to 2.0.0 (major version bump for app stores)

**Checklist:**
- [ ] Capacitor CLI installed and verified
- [ ] iOS and Android projects generated
- [ ] capacitor.config.ts configured
- [ ] Plugins installed and tested locally
- [ ] Package.json updated with correct version

---

### Phase 2: iOS Build (Week 2-3) — 8-10 hours

#### Prerequisites
- Mac with Xcode 15+ (required; no workarounds)
- Apple Developer account ($99/year, already needed for App Store)
- ~1-2 hours to set up certificates and provisioning profiles

#### 2.1 Local Development Build

```bash
npm run build          # Production build of web app
npx cap sync ios      # Sync web assets to Xcode project
npx cap open ios      # Opens Xcode
```

In Xcode:
- Select "ProfitPath" scheme
- Select a simulator (iPhone 15, iOS 18)
- Build & run (`Cmd+R`)
- Test all core flows: calculations, scenario save/load, exports

**Time**: 1-2 hours (mostly learning Xcode UI)

#### 2.2 Certificate & Provisioning Setup

**One-time setup (detailed steps in [iOS Certificates Guide](#ios-certificates-guide)):**
1. Create App ID in Apple Developer portal
2. Generate signing certificate (CSR from Xcode)
3. Create provisioning profile
4. Download and install in Xcode

**Why this sucks**: Apple's process is intentionally complex for security. Budget 1-2 hours first time, <5 min after.

**Time**: 1-2 hours (first time), 5 min (subsequent)

#### 2.3 Real Device Testing

- Connect iPhone, select device in Xcode
- Build to device (`Cmd+R`)
- Test on real network (cellular + WiFi)
- Test offline mode (enable Airplane mode, verify service worker works)
- Test UI on different screen sizes (iPhone 13 mini through 15 Pro Max)

**Time**: 1 hour

#### 2.4 App Store Screenshots & Metadata

Required assets:
- **App Icon**: 1024×1024 PNG (auto-scaled by App Store)
- **Screenshots**: 2-5 per language (use simulator screenshots)
  - iPhone 6.5" (Pro Max): 1242×2688 px
  - iPad 12.9": 2048×2732 px
- **App Description**: <30 words (e.g., "Profitability calculator for service businesses")
- **Keywords**: "business, profitability, calculator, service business" (5-6 keywords)
- **Privacy Policy URL**: Required (see [Privacy Policy](#privacy-policy) section)
- **Support URL**: Optional (can use GitHub or personal site)

**Time**: 1-2 hours

#### 2.5 Submission

- Create App Store Connect account (linked to Apple Developer)
- Fill out app details, screenshots, pricing (free)
- Submit for review
- Apple reviews in 24-48 hours typically
- First app often gets nitpicks; plan 2-3 submission rounds

**Time**: 0.5 hours (submission), 1-2 hours (handling rejection/resubmission if needed)

**Total Phase 2: 8-10 hours**

---

### Phase 3: Android Build (Week 3-4) — 6-8 hours

#### Prerequisites
- Android Studio (free, works on Mac/Linux/Windows)
- Android SDK 34+ (auto-downloaded by Android Studio)
- Java Development Kit 11+ (auto-bundled with Android Studio)
- No paid account needed initially (Google Play account is $25 one-time, flat fee)

#### 3.1 Local Development Build

```bash
npx cap sync android   # Sync web assets to Android project
npx cap open android   # Opens Android Studio
```

In Android Studio:
- Open ProfitPath project
- Create virtual device (Pixel 6, Android 14)
- Build & run (`Shift+F10`)
- Test all core flows

**Time**: 1-2 hours (Android Studio is less intuitive than Xcode initially)

#### 3.2 Signing Configuration

Android requires a signing key to upload to Play Store. **One-time setup:**

```bash
# Generate signing key (interactive, creates keystore)
keytool -genkey -v -keystore profitpath.jks -keyalg RSA -keysize 2048 -validity 10000 -alias profitpath
```

Then configure in `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        keyAlias 'profitpath'
        keyPassword 'YOUR_PASSWORD'
        storeFile file('profitpath.jks')
        storePassword 'YOUR_PASSWORD'
    }
}
```

**⚠️ Critical**: Save the `.jks` file somewhere safe. Losing it means you can't update the app.

**Time**: 0.5 hours

#### 3.3 Production Build

```bash
cd android && ./gradlew build  # Creates release APK/AAB
```

This generates an Android App Bundle (AAB), which is what Play Store requires.

**Time**: 0.5 hours (mostly just waiting for compilation)

#### 3.4 Real Device Testing

- Connect Android phone via USB (enable Developer Mode)
- Install APK on device
- Test same flows as iOS
- Test offline mode
- Test on different screen sizes (test on at least 1 phone)

**Time**: 1 hour

#### 3.5 Google Play Store Metadata

Required assets:
- **App Icon**: 512×512 PNG
- **Screenshots**: 2-5 per language (1080×1920 px is safe for all phones)
- **App Description**: Same as iOS
- **Keywords**: Same as iOS
- **Privacy Policy URL**: Same as iOS
- **Category**: "Business"
- **Content Rating**: Requires questionnaire (2-5 minutes)

**Time**: 1 hour

#### 3.6 Submission

- Create Google Play Developer account ($25 one-time)
- Fill out app details, screenshots, pricing (free)
- Submit for review
- Google typically approves in 2-4 hours (much faster than Apple)
- First app rarely gets rejected; usually approved first try

**Time**: 0.5 hours

**Total Phase 3: 6-8 hours**

---

### Phase 4: Post-Launch (Week 4+) — Ongoing

#### 4.1 Monitor Reviews & Crashes

- Check app store reviews weekly
- Use Xcode Organizer to monitor crashes (iOS)
- Use Google Play Console to monitor crashes (Android)
- Respond to user feedback quickly (shows engagement)

#### 4.2 Update Workflow

When you release a new version on the web:

```bash
# 1. Bump version in package.json AND capacitor.config.ts
#    Example: 1.3.2 → 1.3.3

# 2. Build and sync
npm run build
npx cap sync

# 3. Test locally in simulators/devices

# 4. iOS: Xcode build → archive → submit to App Store
# 5. Android: ./gradlew build → submit AAB to Play Store

# 6. Both: Typically approved within 1-2 days
```

**Note**: App Store updates go through the same review process as the initial submission (takes 24-48 hours). This is a constraint of the platform, not Capacitor.

#### 4.3 Version Parity

Keep web and mobile versions in sync:
- Same version number across all platforms (web, iOS, Android)
- Release all three at the same time (or within 1-2 days)
- Prevents user confusion ("which version am I on?")

---

## Privacy Policy & Legal

### Required Privacy Policy

Both app stores require a privacy policy URL. Since ProfitPath is **100% client-side** (no server, no data transmission), the policy is simple:

```markdown
# Privacy Policy for ProfitPath

## Data Collection
ProfitPath does not collect, transmit, or store any user data. All calculations are performed locally on your device. No personal information is sent to any server.

## Local Storage
Your scenarios and settings are stored locally on your device using browser storage. You control this data completely and can delete it at any time.

## Third-Party Services
None. ProfitPath has no third-party integrations.

## Changes to This Policy
We may update this policy. Changes will be posted on this page with an updated date.

---
Last updated: [DATE]
```

### Where to Host It
- **Option 1**: GitHub (free) — Create `PRIVACY.md` in repo, GitHub Pages auto-renders as HTML
- **Option 2**: Personal website (if you have one)
- **Option 3**: Privacy policy generator services (iubenda, privacy.com, etc.) — mostly free

**Time**: 0.5 hours

---

## Testing Strategy

### What to Test Before Submission

#### Core Functionality (Critical Path)
- [ ] Load calculator, enter data
- [ ] Save scenario (localStorage)
- [ ] Load scenario
- [ ] Switch experience levels
- [ ] Export PDF
- [ ] Export CSV
- [ ] Share scenario (URL encoding)
- [ ] Load shared scenario from URL

#### Mobile-Specific
- [ ] Keyboard appears/dismisses correctly
- [ ] Input fields don't get hidden by keyboard
- [ ] Orientation change (portrait ↔ landscape) preserves data
- [ ] Zoom/pinch doesn't break layout
- [ ] Back button (Android) exits correctly
- [ ] Status bar visibility (iOS safe area)

#### Offline Mode
- [ ] Turn on Airplane mode
- [ ] Verify app still works (service worker should cache everything)
- [ ] Save scenario offline
- [ ] Go back online; verify sync

#### Device-Specific
- [ ] Test on small screen (iPhone SE, iPhone 13 mini)
- [ ] Test on large screen (iPhone 15 Pro Max, iPad)
- [ ] Test on Android small (Pixel 6a)
- [ ] Test on Android large (Pixel 7 Pro)

### Automated Testing (Already Have)
- All existing Vitest + Playwright tests pass as-is
- No additional test code needed for Capacitor
- Run suite before each app store submission

**Time Budget**: 2-3 hours per release

---

## Monetization Strategy

### Launch Approach: Free-Only (Later → Freemium)

**Phase 1 (Launch)**: 100% free, no paywalls. Focus on getting users and gathering feedback.

**Phase 2 (3-6 months post-launch)**: Add freemium tier with premium features (details TBD based on user feedback).

**Rationale**: 
- Don't monetize before validating the market exists
- User feedback will reveal which features are valuable enough to lock behind paywall
- Building freemium now adds complexity; ship it free first
- One-time purchase limits revenue as user base grows
- Freemium + subscription is proven model for business SaaS

### Tier Structure (Planned, Post-Launch)

**Tier 1: Free (Current App)**
- All calculator features (forecast, current mode)
- Basic scenario management (localStorage)
- Single-format export (CSV)
- Experience level 1-2 (Beginner/Intermediate)
- ~80% of users likely here

**Tier 2: Premium ($4.99/month or $39/year)**
- Advanced experience level 3 (all features)
- Multi-format exports (PDF, Excel, HTML)
- Scenario comparison (side-by-side)
- Sensitivity analysis
- Tax calculations
- Performance dashboard
- Unlimited scenario storage (optional sync to cloud)
- ~15% of users likely here

**Tier 3: Pro ($9.99/month or $79/year)** (Consider later if demand exists)
- Team sharing (read-only links with comments)
- Automated email reports
- Custom branding (white-label PDFs)
- Priority support
- ~5% of users likely here

### Implementation Timeline
1. **Phase 1** (Now → Launch): Free tier only. Establish user base, gather feedback.
2. **Phase 2** (3-6 months post-launch): Add paywall for Premium tier. Lightweight in-app purchase or Stripe.
3. **Phase 3** (6-12 months): Monitor adoption, consider Pro tier if demand.

### Revenue Projections (Conservative)
- **Year 1**: Free tier only (0 revenue, but ~1000-5000 downloads)
- **Year 2**: Premium tier launches. Assume 5% conversion at $39/yr → $1,950-9,750 annual recurring
- **Year 3**: Improve conversion, Pro tier. Assume 8% Premium + 1% Pro → $7,500-35,000 annual recurring

These are hobby-level projections. Real revenue depends entirely on marketing effort (which you're probably not prioritizing now).

### Technical Implementation (Later)

When you're ready to monetize:

**Option A: RevenueCat** (Recommended)
- Handles iOS in-app purchases + Android Billing
- Unified dashboard across platforms
- Subscription management (free trial, etc.)
- ~20% fee (after Apple/Google take their cut)
- Time to integrate: 2-3 hours

**Option B: Stripe** (More Complex)
- Self-manage subscriptions
- Better for web integration
- More control, higher overhead
- Time to integrate: 4-6 hours (requires backend or Stripe's serverless functions)

**Option C: Native In-App Purchases** (Tedious)
- Implement iOS + Android separately
- No unified dashboard
- ~6 hours integration, 2 hours per maintenance update

**Recommendation for Phase 1**: Launch free, don't think about monetization. When you're ready, use RevenueCat.

---

## Timeline & Milestones

```
Week 1 (Feb 2026)     — Capacitor setup, local testing
Week 2-3 (Feb-Mar)    — iOS build, certificates, submission
Week 3-4 (Mar)        — Android build, submission
Week 4+ (Apr+)        — Launch monitoring, bug fixes, updates
```

### Go/No-Go Checklist Before Submission

**iOS:**
- [ ] All core features tested on real iPhone
- [ ] Offline mode verified
- [ ] Keyboard handling correct on all screen sizes
- [ ] Icons + screenshots in App Store Connect
- [ ] Privacy policy live and accessible
- [ ] EULA (can reuse existing or use default)
- [ ] Test Flight build successful

**Android:**
- [ ] All core features tested on real Android device
- [ ] Offline mode verified
- [ ] Back button handling correct
- [ ] Icons + screenshots in Play Console
- [ ] Privacy policy live and accessible
- [ ] Content rating questionnaire completed
- [ ] Signing key generated and backed up

---

## Common Pitfalls (Learn From Others)

1. **Forgetting to update version numbers**
   - Update in `package.json` AND `capacitor.config.ts`
   - App Store will reject if you don't bump version
   - **Time cost**: Delays launch by 1 day

2. **Not testing offline mode before submission**
   - App Store might reject if it crashes without network
   - Your service worker handles this; test it
   - **Time cost**: Resubmission delay if caught

3. **Icon/screenshot dimensions wrong**
   - Each platform has specific requirements
   - Using wrong dimensions = App Store rejection
   - **Time cost**: 1-2 hours to regenerate + resubmit

4. **Not reading App Store guidelines**
   - Apple has a 60-page guideline document
   - Common rejections: misleading screenshots, incorrect privacy policy, inappropriate permissions
   - **Time cost**: 1-2 day resubmission cycle per mistake

5. **Hardcoding test data in production build**
   - Easy to forget console.log or test URLs in web code
   - Syncs to mobile build
   - **Time cost**: App Store rejection if caught

---

## iOS Certificates Guide

This is detailed enough to warrant a separate section because it's the most annoying part.

### One-Time Setup (Do Once, Then Forget)

1. **Create App ID in Apple Developer Portal**
   - Go to developer.apple.com
   - Certificates, IDs & Profiles → Identifiers
   - Click "+" to create new
   - Select "App IDs"
   - Bundle ID: `com.yourname.profitpath` (must be unique globally)
   - Capabilities: Disable everything (you don't need camera, Bluetooth, etc.)

2. **Request Signing Certificate**
   - Open Keychain Access on Mac (Cmd+Space → type "Keychain Access")
   - Certificate Assistant → Request a Certificate from a Certificate Authority
   - Email: your email
   - Common name: Your name or "ProfitPath"
   - Request is saved to disk

3. **Upload CSR to Apple**
   - Back in Developer Portal, Certificates
   - Click "+" → Apple Development certificate
   - Upload the `.certSigningRequest` file from Keychain
   - Download the resulting `.cer` file
   - Double-click to install in Keychain

4. **Create Provisioning Profile**
   - Developer Portal → Profiles
   - Click "+" → iOS App Development
   - Select your App ID
   - Select your certificate
   - Select your device (or "All" for testing)
   - Download `.mobileprovision` file
   - Double-click to install

5. **Configure Xcode**
   - Xcode → Preferences → Accounts
   - Add your Apple Developer account
   - Xcode auto-downloads profiles

**You're done.** Xcode will auto-sign after this.

### Submitting to App Store (Different Certificate)

When you're ready to submit, you need a **Distribution** certificate, not Development. Repeat steps 1-4 but select "Distribution" instead of "Development" in step 2.

---

## Maintenance & Updates

### Web → Mobile Update Flow

Every time you release a new version on the web:

1. Update version in `package.json` + `capacitor.config.ts`
2. Run `npm run build`
3. Run `npx cap sync ios && npx cap sync android`
4. Test in simulators for ~30 minutes
5. Build in Xcode + Android Studio (15 min compile time each)
6. Submit both to App Stores (5 min)
7. Wait for approval (1-2 days)

**Total time per release**: ~1.5 hours hands-on, ~2-3 hours waiting for App Store approval.

### Why This Matters

- App Store updates are **not instant** like web
- Users might be on older versions for weeks
- You can't fix a bug instantly; you push, wait 24-48 hours, then users get it
- Plan feature releases accordingly (don't ship major bugs)

### Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`

- `1.0.0` — Initial app store launch
- `1.0.1` — Bug fix (small)
- `1.1.0` — New feature (backward compatible)
- `2.0.0` — Breaking change (rare for a calculator)

Update all three platforms (web, iOS, Android) together.

---

## Success Criteria

✅ **Launch is successful when:**
- App is live in both stores
- Can be searched for and downloaded
- Core flows work on real devices
- 4+ star rating within first 2 weeks (realistic goal)
- No critical bugs reported

⚠️ **Common "failures" that aren't actually failures:**
- Gets rejected once (normal; resubmit with fix)
- Early reviews are mixed (iterate based on feedback)
- Download rate is slow (you haven't marketed it yet; totally expected)
- Need to fix a bug after launch (ship 1.0.1 quickly)

---

## Questions? Next Steps

1. **Ready to start?** → Begin Phase 1 (Capacitor setup)
2. **Want to understand Xcode better first?** → Run Phase 2.1 locally (simpler than real submission)
3. **Worried about iOS certificates?** → Read the [iOS Certificates Guide](#ios-certificates-guide) above, it's less scary after you see the steps
4. **Want to discuss monetization more?** → See [Monetization Strategy](#monetization-strategy) section

---

**Last updated**: May 5, 2026  
**Status**: Ready for Phase 1 implementation
