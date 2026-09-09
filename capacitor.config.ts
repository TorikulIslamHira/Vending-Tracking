import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

// Hosted Web App shell: the native apps load the live production site
// directly (server.url below) rather than bundling a static build, so the
// same deployed Next.js app runs everywhere with nothing to keep in sync.
//
// Capacitor's own docs mark server.url/cleartext as intended for
// *live-reload development servers*, "not intended for use in production" —
// this project is deliberately using it that way anyway to avoid
// maintaining a second, bundled copy of the app. Two real consequences
// worth having on record, not just a link to fix later:
//   1. App Store review risk: Apple's Guideline 4.2 (Minimum Functionality)
//      has a documented history of rejecting apps that are effectively "a
//      website in a WebView" with no native-specific functionality. This
//      shell's whole value is the native UX plugins below (keyboard
//      avoidance, status bar, splash screen) plus whatever's added later
//      (push notifications, biometrics, etc.) — that's the argument for
//      minimum functionality if review ever raises it.
//   2. Zero offline behavior: webDir ('public') has no real app bundled
//      into it, so with no network at launch there is nothing to fall back
//      to but a blank WebView.
// (Also: this codebase has no Next.js Server Actions to preserve — it's a
// client-rendered app calling a separate Fastify REST API — so that
// specific rationale for choosing Hosted Web App doesn't actually apply
// here, though the "one deployment, no rebuild-and-resubmit for content
// changes" benefit still does.)
const config: CapacitorConfig = {
  appId: 'com.beenovelty.vending',
  appName: 'Bee Vending',
  webDir: 'public',
  server: {
    url: 'https://bee.adlyco.org',
    cleartext: true,
  },
  // Note: there is no `bundledWebRuntime` option in Capacitor 8 (this repo's
  // installed version) — it was a Capacitor 2.x config key, removed for
  // years now. @capacitor/core is always bundled as a normal npm dependency
  // today, so there's nothing to set here; omitted rather than left in as
  // a stale, type-error-producing no-op.
  plugins: {
    Keyboard: {
      // iOS only (Capacitor's own type docs) — pushes the page content up
      // so a focused input is never left hidden behind the keyboard.
      // Android's equivalent isn't a Capacitor config key at all; it's
      // android:windowSoftInputMode="adjustResize" on the Activity in
      // AndroidManifest.xml, set once that file exists after `cap add android`.
      resize: KeyboardResize.Body,
      // Works around a documented Android bug where the keyboard doesn't
      // resize the WebView while the app is edge-to-edge — which is exactly
      // the StatusBar.overlaysWebView setting below.
      resizeOnFullScreen: true,
    },
    StatusBar: {
      // Edge-to-edge: the WebView draws behind the status bar instead of
      // the OS reserving a separate colored bar above it. This is the
      // correct pairing with the app's existing CSS — every sticky/fixed
      // header already pads itself with env(safe-area-inset-top) (see
      // apps/web's (agent)/(mobile) layouts and their page headers), which
      // only does anything useful when the WebView actually extends under
      // the status bar in the first place.
      overlaysWebView: true,
      // Dark icons/text for the status bar, matching the app's default
      // light theme (globals.css --background is a near-white light color
      // by default). The app also supports a dark theme (tailwind
      // darkMode: 'class'), but syncing the status bar style to that at
      // runtime needs one small StatusBar.setStyle() call from the app's
      // own theme-toggle code — not added here since this app doesn't
      // currently have a user-facing theme toggle to hook into; worth
      // doing if/when one exists.
      style: 'DARK',
    },
    SplashScreen: {
      // launchAutoHide: false is the important part here, not a duration
      // tweak — with server.url pointing at a *live* remote page, the
      // actual load time varies with network conditions, so a fixed timer
      // (the default behavior) can easily hide the splash before the page
      // has anything to show, producing a blank-screen flash rather than a
      // seamless transition. Instead the splash stays up until the app
      // itself calls SplashScreen.hide() once mounted — see
      // NativeSplashScreenProvider in apps/web.
      launchAutoHide: false,
      launchFadeOutDuration: 200,
      // #F8FAFC = hsl(210 40% 98%), the app's own --background token
      // (apps/web/src/app/globals.css) converted to hex, not an approximation.
      backgroundColor: '#F8FAFC',
      androidScaleType: 'CENTER',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
    },
  },
};

export default config;
