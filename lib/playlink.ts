// Turns whatever a developer pastes into a clean Android package name,
// and builds the Google Play links we show testers from it.

const PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function isPackageName(value: string): boolean {
  return value.length <= 150 && PACKAGE_RE.test(value);
}

/**
 * Accepts:
 *   https://play.google.com/apps/testing/com.example.app        (web opt-in link)
 *   https://play.google.com/store/apps/details?id=com.example.app (Play Store link)
 *   com.example.app                                              (bare package name)
 * Returns the package name, or null if it isn't one of those.
 */
export function parsePlayLink(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (isPackageName(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname !== 'play.google.com') return null;

  const testing = url.pathname.match(/^\/apps\/testing\/([^/]+)\/?$/);
  if (testing) {
    const pkg = decodeURIComponent(testing[1]);
    return isPackageName(pkg) ? pkg : null;
  }

  if (/^\/store\/apps\/details\/?$/.test(url.pathname)) {
    const pkg = url.searchParams.get('id') ?? '';
    return isPackageName(pkg) ? pkg : null;
  }

  return null;
}

/** Page where a tester taps "Become a tester". */
export function optInUrl(pkg: string): string {
  return `https://play.google.com/apps/testing/${encodeURIComponent(pkg)}`;
}

/** Play Store listing: install / open the app. */
export function storeUrl(pkg: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
}
