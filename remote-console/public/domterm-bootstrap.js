(() => {
  const globalScope = window;
  const domTerm = (globalScope.DomTerm = globalScope.DomTerm || {});
  const versions = (domTerm.versions = domTerm.versions || {});
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    const matchers = [
      [/QtWebEngine\/([^ ]+)/, "qtwebengine"],
      [/Electron\/([^ ]+)/, "electron"],
      [/Chrome\/([^ ]+)/, "chrome"],
      [/Edg\/([^ ]+)/, "edge"],
      [/Firefox\/([^ ]+)/, "firefox"],
      [/Atom\/([^ ]+)/, "atom"],
      [/JavaFX\/([^ ]+)/, "javaFX"],
      [/AppleWebKit\/([^ ]+)/, "appleWebKit"],
    ];
    for (const [pattern, key] of matchers) {
      const match = navigator.userAgent.match(pattern);
      if (match && match[1]) {
        versions[key] = match[1];
      }
    }
    versions.userAgent = navigator.userAgent;
  }
  domTerm.inAtomFlag = Boolean(domTerm.inAtomFlag);
  domTerm.versionString = domTerm.versionString || "embedded";
  domTerm.versionInfo = domTerm.versionInfo || `version=${domTerm.versionString}`;
  if (typeof domTerm.isElectron !== "function") {
    domTerm.isElectron = function isElectron() {
      return Boolean(this?.versions?.electron);
    };
  }
  if (typeof domTerm.isAtom !== "function") {
    domTerm.isAtom = function isAtom() {
      return Boolean(this?.inAtomFlag);
    };
  }
  domTerm.isMac = typeof navigator !== "undefined" ? /Mac/.test(navigator.platform) : false;
  if (typeof domTerm.usingXtermJs !== "function") {
    domTerm.usingXtermJs = function usingXtermJs() {
      return String(location.pathname || "").includes("xtermjs");
    };
  }
  if (typeof domTerm.usingQtWebEngine !== "boolean") {
    domTerm.usingQtWebEngine = Boolean(
      typeof navigator !== "undefined" && /QtWebEngine[/]([^ ]+)/.test(navigator.userAgent || "")
    );
  }
  domTerm.mainSearchParams =
    domTerm.mainSearchParams ||
    new URLSearchParams(
      location.hash.startsWith("#") ? location.hash.slice(1) : location.search.startsWith("?") ? location.search.slice(1) : ""
    );
  globalScope.DomTerm = domTerm;
  globalScope.domterm = domTerm;
})();
