import test from "node:test";
import assert from "node:assert/strict";
import {
  getMainAppPageMeta,
  getRouteRedirect,
  isGuestOnlyRoute,
  isMainAppRoute,
  isProtectedRoute,
  sanitizeNextUrl,
} from "./route-access.ts";

test("route classification identifies main app, protected, and guest-only routes", () => {
  assert.equal(isMainAppRoute("/workspace"), true);
  assert.equal(isMainAppRoute("/workspace/plans/42"), true);
  assert.equal(isMainAppRoute("/solve"), true);
  assert.equal(isMainAppRoute("/innovations"), true);
  assert.equal(isMainAppRoute("/innovations/aqua-guard-gdynia"), true);
  assert.equal(isMainAppRoute("/compare"), true);
  assert.equal(isMainAppRoute("/"), false);
  assert.equal(isMainAppRoute("/login"), false);
  assert.equal(isMainAppRoute("/admin"), false);
  assert.equal(isMainAppRoute("/design-system"), false);

  assert.equal(isProtectedRoute("/workspace"), true);
  assert.equal(isProtectedRoute("/workspace/plans/7"), true);
  assert.equal(isProtectedRoute("/admin"), true);
  assert.equal(isProtectedRoute("/solve"), false);

  assert.equal(isGuestOnlyRoute("/"), true);
  assert.equal(isGuestOnlyRoute("/login"), true);
  assert.equal(isGuestOnlyRoute("/register"), true);
  assert.equal(isGuestOnlyRoute("/innovations"), false);
});

test("sanitizeNextUrl blocks external URLs, guest-only loops, and unauthorized admin targets", () => {
  assert.equal(sanitizeNextUrl("https://evil.com"), "/workspace");
  assert.equal(sanitizeNextUrl("//evil.com"), "/workspace");
  assert.equal(sanitizeNextUrl("/"), "/workspace");
  assert.equal(sanitizeNextUrl("/login?next=/solve"), "/workspace");
  assert.equal(sanitizeNextUrl("/register"), "/workspace");
  assert.equal(sanitizeNextUrl("/innovations/aqua-guard-gdynia?deploy=1"), "/innovations/aqua-guard-gdynia?deploy=1");
  assert.equal(sanitizeNextUrl("/admin", "/workspace", false), "/workspace");
  assert.equal(sanitizeNextUrl("/admin", "/workspace", true), "/admin");
});

test("getRouteRedirect enforces guest and authenticated route blocking", () => {
  // Guest rules
  assert.equal(
    getRouteRedirect({ pathname: "/workspace", authenticated: false, isPciAdmin: false }),
    "/login?next=%2Fworkspace",
  );
  assert.equal(
    getRouteRedirect({
      pathname: "/workspace/plans/12",
      search: "?print=1",
      authenticated: false,
      isPciAdmin: false,
    }),
    "/login?next=%2Fworkspace%2Fplans%2F12%3Fprint%3D1",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/admin", authenticated: false, isPciAdmin: false }),
    "/login?next=%2Fadmin",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/", authenticated: false, isPciAdmin: false }),
    null,
  );
  assert.equal(
    getRouteRedirect({ pathname: "/solve", authenticated: false, isPciAdmin: false }),
    null,
  );

  // Authenticated adopter rules
  assert.equal(
    getRouteRedirect({ pathname: "/", authenticated: true, isPciAdmin: false }),
    "/workspace",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/login", authenticated: true, isPciAdmin: false }),
    "/workspace",
  );
  assert.equal(
    getRouteRedirect({
      pathname: "/register",
      search: "?next=%2Fcompare",
      authenticated: true,
      isPciAdmin: false,
    }),
    "/compare",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/admin", authenticated: true, isPciAdmin: false }),
    "/workspace",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/workspace", authenticated: true, isPciAdmin: false }),
    null,
  );

  // Authenticated PCI admin rules
  assert.equal(
    getRouteRedirect({ pathname: "/admin", authenticated: true, isPciAdmin: true }),
    null,
  );
  assert.equal(
    getRouteRedirect({
      pathname: "/login",
      search: "?next=%2Fadmin",
      authenticated: true,
      isPciAdmin: true,
    }),
    "/admin",
  );
  assert.equal(
    getRouteRedirect({ pathname: "/", authenticated: true, isPciAdmin: true }),
    "/workspace",
  );
});

test("getMainAppPageMeta provides title and breadcrumbs for all app routes", () => {
  assert.equal(getMainAppPageMeta("/workspace", true).title, "Moje wdrożenia");
  assert.equal(getMainAppPageMeta("/workspace/plans/9", true).breadcrumbs.length, 3);
  assert.equal(getMainAppPageMeta("/solve", false).breadcrumbs[0]?.href, "/");
  assert.equal(getMainAppPageMeta("/solve", true).breadcrumbs[0]?.href, "/workspace");
  assert.equal(getMainAppPageMeta("/innovations/test-slug", true).breadcrumbs[1]?.href, "/innovations");
});

test("catalog and problem entry share search title and detail breadcrumb", () => {
  for (const route of ["/innovations", "/solve"]) {
    assert.equal(getMainAppPageMeta(route, false).title, "Szukaj innowacji");
    assert.equal(getMainAppPageMeta(route, true).breadcrumbs[1].label, "Szukaj innowacji");
  }
  assert.equal(getMainAppPageMeta("/innovations/example", false).breadcrumbs[1].label, "Szukaj innowacji");
});
