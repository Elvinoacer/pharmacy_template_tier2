import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { themeBootstrap } from "../app/lib/theme-bootstrap";

describe("Afyvia Theme Architecture: Dark & Light Mode Integrity", () => {
  describe("1. ThemeScript / themeBootstrap Pre-paint Execution", () => {
    function createMockDom(initial: {
      localStorage?: Record<string, string>;
      cookie?: string;
      prefersDark?: boolean;
    }) {
      const storage: Record<string, string> = { ...(initial.localStorage || {}) };
      let cookieString = initial.cookie || "";

      const classListSet = new Set<string>();
      const dataset: Record<string, string> = {};
      const style: Record<string, string> = {};

      const docElement = {
        dataset,
        style,
        classList: {
          add: (c: string) => classListSet.add(c),
          remove: (c: string) => classListSet.delete(c),
          contains: (c: string) => classListSet.has(c),
        },
      };

      const mockWindow = {
        localStorage: {
          getItem: (key: string) => storage[key] ?? null,
          setItem: (key: string, val: string) => {
            storage[key] = String(val);
          },
        },
        document: {
          documentElement: docElement,
          get cookie() {
            return cookieString;
          },
          set cookie(val: string) {
            const [cookiePart] = val.split(";");
            cookieString = cookiePart.trim();
          },
        },
        matchMedia: (query: string) => ({
          matches: query.includes("dark") ? (initial.prefersDark ?? false) : false,
        }),
      };

      return { mockWindow, docElement, storage, getCookie: () => cookieString };
    }

    it("activates dark theme when afyvia-theme in localStorage is 'dark'", () => {
      const { mockWindow, docElement, getCookie } = createMockDom({
        localStorage: { "afyvia-theme": "dark" },
        prefersDark: false,
      });

      const runner = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runner(mockWindow.localStorage, mockWindow.document, mockWindow.matchMedia);

      assert.equal(docElement.dataset.theme, "dark");
      assert.equal(docElement.dataset.adminTheme, "dark");
      assert.equal(docElement.classList.contains("dark"), true);
      assert.equal(docElement.style.colorScheme, "dark");
      assert.match(getCookie(), /afyvia-theme=dark/);
    });

    it("activates light theme when afyvia-theme in localStorage is 'light'", () => {
      const { mockWindow, docElement, getCookie } = createMockDom({
        localStorage: { "afyvia-theme": "light" },
        prefersDark: true, // system dark overridden by user light choice
      });

      const runner = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runner(mockWindow.localStorage, mockWindow.document, mockWindow.matchMedia);

      assert.equal(docElement.dataset.theme, "light");
      assert.equal(docElement.dataset.adminTheme, "light");
      assert.equal(docElement.classList.contains("dark"), false);
      assert.equal(docElement.style.colorScheme, "light");
      assert.match(getCookie(), /afyvia-theme=light/);
    });

    it("falls back to afyvia-admin-theme if afyvia-theme is not set", () => {
      const { mockWindow, docElement } = createMockDom({
        localStorage: { "afyvia-admin-theme": "dark" },
        prefersDark: false,
      });

      const runner = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runner(mockWindow.localStorage, mockWindow.document, mockWindow.matchMedia);

      assert.equal(docElement.dataset.theme, "dark");
      assert.equal(docElement.dataset.adminTheme, "dark");
      assert.equal(docElement.classList.contains("dark"), true);
    });

    it("falls back to cookie if localStorage is empty", () => {
      const { mockWindow, docElement } = createMockDom({
        localStorage: {},
        cookie: "afyvia-theme=dark",
        prefersDark: false,
      });

      const runner = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runner(mockWindow.localStorage, mockWindow.document, mockWindow.matchMedia);

      assert.equal(docElement.dataset.theme, "dark");
      assert.equal(docElement.dataset.adminTheme, "dark");
      assert.equal(docElement.classList.contains("dark"), true);
    });

    it("resolves system preference when no preference is saved", () => {
      // System dark
      const domDark = createMockDom({ prefersDark: true });
      const runDark = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runDark(domDark.mockWindow.localStorage, domDark.mockWindow.document, domDark.mockWindow.matchMedia);
      assert.equal(domDark.docElement.dataset.theme, "dark");
      assert.equal(domDark.docElement.classList.contains("dark"), true);

      // System light
      const domLight = createMockDom({ prefersDark: false });
      const runLight = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runLight(domLight.mockWindow.localStorage, domLight.mockWindow.document, domLight.mockWindow.matchMedia);
      assert.equal(domLight.docElement.dataset.theme, "light");
      assert.equal(domLight.docElement.classList.contains("dark"), false);
    });
    it("preserves 'system' preference in localStorage even when cookie is present", () => {
      const { mockWindow, docElement } = createMockDom({
        localStorage: { "afyvia-theme": "system" },
        cookie: "afyvia-theme=light",
        prefersDark: true,
      });

      const runner = new Function(
        "localStorage",
        "document",
        "matchMedia",
        themeBootstrap
      );
      runner(mockWindow.localStorage, mockWindow.document, mockWindow.matchMedia);

      // System prefers dark, so resolved should be dark despite cookie=light
      assert.equal(docElement.dataset.theme, "dark");
      assert.equal(docElement.dataset.adminTheme, "dark");
      assert.equal(docElement.classList.contains("dark"), true);
    });
  });

  describe("2. CSS Contract: Tailwind v4 & Workspace Tokens", () => {
    const globalsCss = fs.readFileSync(
      path.resolve(__dirname, "../app/globals.css"),
      "utf-8"
    );
    const workspaceCss = fs.readFileSync(
      path.resolve(__dirname, "../app/components/workspace/workspace.css"),
      "utf-8"
    );
    const workspaceCompatCss = fs.readFileSync(
      path.resolve(__dirname, "../app/workspace-compat.css"),
      "utf-8"
    );

    it("defines @custom-variant dark for Tailwind v4 data-theme and .dark support", () => {
      assert.ok(
        globalsCss.includes("@custom-variant dark"),
        "globals.css must declare @custom-variant dark for Tailwind v4"
      );
      assert.ok(
        globalsCss.includes("[data-theme=\"dark\"]"),
        "globals.css @custom-variant dark must target data-theme=dark"
      );
    });

    it("binds .afyvia-workspace-root to dark mode tokens in globals.css", () => {
      assert.ok(
        globalsCss.includes(".afyvia-workspace-root[data-theme=\"dark\"]") ||
        globalsCss.includes("html[data-theme=\"dark\"] .afyvia-workspace-root"),
        "globals.css must apply dark tokens to .afyvia-workspace-root"
      );
      assert.ok(
        globalsCss.includes("body:has(header .theme-toggle, .shell-grid-admin, .afyvia-workspace-root)"),
        "globals.css must suppress global floating theme button when workspace is active"
      );
    });

    it("workspace.css imports workspace-compat.css for legacy utility support", () => {
      assert.ok(
        workspaceCss.includes("workspace-compat.css"),
        "workspace.css must import workspace-compat.css"
      );
    });

    it("workspace.css self-contained token definitions for light and dark modes", () => {
      assert.ok(
        workspaceCss.includes("html[data-theme=\"light\"] .afyvia-workspace-root"),
        "workspace.css must explicitly define light mode tokens"
      );
      assert.ok(
        workspaceCss.includes("html[data-theme=\"dark\"] .afyvia-workspace-root"),
        "workspace.css must explicitly define dark mode tokens"
      );
      assert.ok(
        workspaceCss.includes("--admin-panel: #11161e"),
        "workspace.css must set dark panel token"
      );
      assert.ok(
        workspaceCss.includes("--admin-card: #161d27"),
        "workspace.css must set dark card token"
      );
      assert.ok(
        workspaceCss.includes("--admin-text: #f1f5f9"),
        "workspace.css must set dark text token"
      );
    });

    it("workspace-compat.css includes .afyvia-workspace-root.shell-grid-admin flex layout safeguard", () => {
      assert.ok(
        workspaceCompatCss.includes(".afyvia-workspace-root.shell-grid-admin"),
        "workspace-compat.css must reset grid layout on .afyvia-workspace-root.shell-grid-admin"
      );
    });

    it("styles command dialog and mobile sheet in dark mode", () => {
      assert.ok(
        workspaceCss.includes(".afyvia-command-dialog"),
        "workspace.css must style command dialog"
      );
      assert.ok(
        workspaceCss.includes(".afyvia-mobile-sheet"),
        "workspace.css must style mobile dock sheet"
      );
      assert.ok(
        workspaceCss.includes("html[data-theme=\"dark\"] .afyvia-command-dialog"),
        "workspace.css must style command dialog in dark mode"
      );
      assert.ok(
        workspaceCss.includes("color-scheme: dark"),
        "workspace.css must declare color-scheme: dark for dark mode top-layer elements"
      );
    });

    it("safeguards .afyvia-workspace-root .theme-toggle button geometry", () => {
      assert.ok(
        workspaceCss.includes(".afyvia-workspace-root .theme-toggle"),
        "workspace.css must contain .afyvia-workspace-root .theme-toggle rules"
      );
      assert.ok(
        workspaceCss.includes("width: 36px !important"),
        "workspace.css must set 36px width for workspace theme toggle"
      );
      assert.ok(
        workspaceCss.includes("height: 36px !important"),
        "workspace.css must set 36px height for workspace theme toggle"
      );
      assert.ok(
        workspaceCss.includes("border-radius: 12px !important"),
        "workspace.css must set 12px border-radius for workspace theme toggle"
      );
    });
  });

  describe("3. Theme Module Exports & Compatibility", () => {
    it("ThemeProvider exports both useAppTheme and useTheme", async () => {
      const themeFile = fs.readFileSync(
        path.resolve(__dirname, "../app/components/ThemeProvider.tsx"),
        "utf-8"
      );
      assert.ok(themeFile.includes("export function ThemeProvider"), "Must export ThemeProvider");
      assert.ok(themeFile.includes("export const useAppTheme"), "Must export useAppTheme");
      assert.ok(themeFile.includes("export const useTheme"), "Must export useTheme alias");
      assert.ok(
        themeFile.includes("export function ThemeToggle") ||
        themeFile.includes("export default function ThemeToggle") ||
        themeFile.includes("export { ThemeToggle }"),
        "Must export ThemeToggle"
      );
      assert.ok(themeFile.includes("applyThemeToDocument"), "Must synchronize document classList and dataset");
      assert.ok(themeFile.includes("writeThemeCookie"), "Must write afyvia-theme cookie");

      try {
        const themeModule = await import("../app/components/ThemeProvider");
        if (typeof themeModule.useAppTheme === "function") {
          assert.equal(typeof themeModule.ThemeProvider, "function");
          assert.equal(typeof themeModule.useTheme, "function");
          assert.equal(themeModule.useTheme, themeModule.useAppTheme);
        }
      } catch {
        // In react-server condition, React 19 does not export createContext
      }
    });
  });

  describe("4. Workspace Shell & Navigation Theme Controls", () => {
    const workspaceShellFile = fs.readFileSync(
      path.resolve(__dirname, "../app/components/workspace/WorkspaceShell.tsx"),
      "utf-8"
    );
    const workspaceRailFile = fs.readFileSync(
      path.resolve(__dirname, "../app/components/workspace/WorkspaceRail.tsx"),
      "utf-8"
    );
    const mobileDockFile = fs.readFileSync(
      path.resolve(__dirname, "../app/components/workspace/MobileWorkspaceDock.tsx"),
      "utf-8"
    );
    const commandCenterFile = fs.readFileSync(
      path.resolve(__dirname, "../app/components/workspace/CommandCenter.tsx"),
      "utf-8"
    );

    it("WorkspaceShell renders compatibility classes and theme attributes", () => {
      assert.ok(
        workspaceShellFile.includes("shell-grid-admin admin-workspace"),
        "WorkspaceShell root div must include shell-grid-admin and admin-workspace classes"
      );
      assert.ok(
        workspaceShellFile.includes("data-theme={theme.hydrated ? theme.resolved : undefined}"),
        "WorkspaceShell root div must include data-theme"
      );
      assert.ok(
        workspaceShellFile.includes("data-admin-theme={theme.hydrated ? theme.resolved : undefined}"),
        "WorkspaceShell root div must include data-admin-theme"
      );
    });

    it("WorkspaceThemeToggle has theme-toggle class for global control suppression", () => {
      assert.ok(
        workspaceShellFile.includes("theme-toggle") &&
        (workspaceShellFile.includes("className=\"theme-toggle") ||
          workspaceShellFile.includes("className={`theme-toggle")),
        "WorkspaceThemeToggle must include the theme-toggle class"
      );
      assert.ok(
        workspaceShellFile.includes("export function WorkspaceThemeToggle"),
        "WorkspaceThemeToggle must be exported for use across docks/rails"
      );
    });

    it("WorkspaceRail and MobileWorkspaceDock include theme controls", () => {
      assert.ok(
        workspaceRailFile.includes("bottomContent"),
        "WorkspaceRail must support bottom controls"
      );
      assert.ok(
        workspaceShellFile.includes("WorkspaceUserRailControls"),
        "WorkspaceShell must supply rail theme controls"
      );
      assert.ok(
        mobileDockFile.includes("themeControl"),
        "MobileWorkspaceDock must accept and render themeControl"
      );
    });

    it("CommandCenter provides direct theme switching actions for dark and light queries", () => {
      assert.ok(
        commandCenterFile.includes("useAppTheme"),
        "CommandCenter must import and use useAppTheme"
      );
      assert.ok(
        commandCenterFile.includes("#switch-theme-light") &&
        commandCenterFile.includes("#switch-theme-dark") &&
        commandCenterFile.includes("#switch-theme-system"),
        "CommandCenter must offer theme commands for light, dark, and system modes"
      );
    });
  });
});
