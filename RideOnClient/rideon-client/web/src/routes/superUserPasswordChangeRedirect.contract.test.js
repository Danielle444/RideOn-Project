import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test (this repo has no DOM test environment and no
// React Testing Library — see ToastMessage.contract.test.js, which this
// mirrors). Pins the fix for the SuperUser mustChangePassword lockout: both
// route guards used to redirect to "/superuser-change-password", a path
// never declared in router.jsx, so a fresh/reset SuperUser hit the wildcard
// "Page Not Found" route with no way back into the app.

const PROTECTED_ROUTE_PATH = new URL("./ProtectedRoute.jsx", import.meta.url);
const PUBLIC_ROUTE_PATH = new URL("./PublicRoute.jsx", import.meta.url);
const LOGIN_SCREEN_PATH = new URL(
  "../pages/auth/LoginScreen.jsx",
  import.meta.url,
);
const ROUTER_PATH = new URL("../router/router.jsx", import.meta.url);

const protectedRouteSource = readFileSync(PROTECTED_ROUTE_PATH, "utf8").replace(
  /\r\n/g,
  "\n",
);
const publicRouteSource = readFileSync(PUBLIC_ROUTE_PATH, "utf8").replace(
  /\r\n/g,
  "\n",
);
const loginScreenSource = readFileSync(LOGIN_SCREEN_PATH, "utf8").replace(
  /\r\n/g,
  "\n",
);
const routerSource = readFileSync(ROUTER_PATH, "utf8").replace(/\r\n/g, "\n");

describe("SuperUser mustChangePassword redirect — dead route removed", () => {
  it("router.jsx declares /change-password but never /superuser-change-password", () => {
    expect(routerSource).toContain('path: "/change-password"');
    expect(routerSource).not.toContain("superuser-change-password");
  });

  it("ProtectedRoute.jsx no longer references the dead route anywhere", () => {
    expect(protectedRouteSource).not.toContain("superuser-change-password");
  });

  it("PublicRoute.jsx no longer references the dead route anywhere", () => {
    expect(publicRouteSource).not.toContain("superuser-change-password");
  });

  it("ProtectedRoute.jsx's getSuperUserRoute() points a mustChangePassword SuperUser at /change-password", () => {
    const fnStart = protectedRouteSource.indexOf("function getSuperUserRoute()");
    const fnEnd = protectedRouteSource.indexOf("\n  }", fnStart);
    const fnBody = protectedRouteSource.slice(fnStart, fnEnd);

    expect(fnBody).toContain('return "/change-password";');
  });

  it("PublicRoute.jsx's getSuperUserRoute() points a mustChangePassword SuperUser at /change-password", () => {
    const fnStart = publicRouteSource.indexOf("function getSuperUserRoute()");
    const fnEnd = publicRouteSource.indexOf("\n  }", fnStart);
    const fnBody = publicRouteSource.slice(fnStart, fnEnd);

    expect(fnBody).toContain('return "/change-password";');
  });

  it("the requireSuperUser branch compares against and redirects to /change-password, not the dead route", () => {
    expect(protectedRouteSource).toContain(
      'user.mustChangePassword &&\n      location.pathname !== "/change-password"',
    );
    expect(protectedRouteSource).toContain(
      '<Navigate to="/change-password" replace />',
    );
  });

  it("lets a mustChangePassword SuperUser actually reach /change-password instead of bouncing them right back out", () => {
    // Without this exception, the blanket "SuperUser can't access regular
    // routes" check below would immediately Navigate a mustChangePassword
    // SuperUser away from /change-password back to getSuperUserRoute()
    // (itself /change-password) — an unrenderable loop back to the same
    // location instead of an actual fix.
    const guardStart = protectedRouteSource.indexOf(
      'if (user.userType === "superUser") {',
    );
    const guardEnd = protectedRouteSource.indexOf("\n  }", guardStart);
    const guardBody = protectedRouteSource.slice(guardStart, guardEnd);

    expect(guardBody).toContain(
      'if (user.mustChangePassword && location.pathname === "/change-password") {',
    );
    expect(guardBody.indexOf("return children;")).toBeGreaterThan(-1);
    expect(guardBody.indexOf("return children;")).toBeLessThan(
      guardBody.indexOf("return <Navigate to={getSuperUserRoute()} replace />;"),
    );
  });

  it("LoginScreen.jsx's own getSuperUserRoute() is untouched and still returns /change-password", () => {
    expect(loginScreenSource).toContain(
      'function getSuperUserRoute(user) {\n    if (user && user.mustChangePassword) {\n      return "/change-password";',
    );
  });
});
