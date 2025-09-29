function layout() {
  // Tunables
  const MIN_RATIO = 0.20; // smallest center width as fraction of screen
  const MAX_RATIO = 0.80; // largest  center width as fraction of screen
  const STEP      = 0.05; // how much expand/shrink changes width

  return {
    name: "Centered Primary Columns",

    // Persisted state for this layout instance
    initialState: {
      mainRatio: 0.40,   // center width starts at 40% of the screen
      mainWindowID: null // which window is "primary" (falls back to windows[0])
    },

    /**
     * windows: [{ id, isFocused, ... }]
     * screenFrame: { x, y, width, height }
     * state: persisted object above
     * extendedFrames: (unused here)
     * Return: { [windowId]: { x, y, width, height } }
     */
    getFrameAssignments: (windows, screenFrame, state /*, extendedFrames */) => {
      const frames = {};
      const N = windows.length;
      if (N === 0) return frames;

      // Pick primary:
      // 1) use state.mainWindowID if present
      // 2) otherwise prefer focused window
      // 3) otherwise windows[0]
      const focused = windows.find(w => w.isFocused);
      const primary =
        windows.find(w => w.id === state.mainWindowID) ||
        windows[0];

      // Primary width & position (centered, full height)
      const mainRatio = clamp(state.mainRatio ?? 0.40, MIN_RATIO, MAX_RATIO);
      const mainW = Math.round(screenFrame.width * mainRatio);
      const mainX = Math.round(screenFrame.x + (screenFrame.width - mainW) / 2);
      const mainY = screenFrame.y;
      const mainH = screenFrame.height;

      frames[primary.id] = {
        x: mainX,
        y: mainY,
        width: mainW,
        height: mainH
      };

      // Side regions
      const leftRegion  = {
        x: screenFrame.x,
        y: screenFrame.y,
        width: Math.max(0, mainX - screenFrame.x),
        height: screenFrame.height
      };
      const rightRegion = {
        x: mainX + mainW,
        y: screenFrame.y,
        width: Math.max(0, (screenFrame.x + screenFrame.width) - (mainX + mainW)),
        height: screenFrame.height
      };

      // Build secondary order: alternate L, R, L, R...
      const secondaries = windows.filter(w => w.id !== primary.id);
      const leftIDs  = [];
      const rightIDs = [];
      secondaries.forEach((w, idx) => {
        if (idx % 2 === 0) leftIDs.push(w.id); else rightIDs.push(w.id);
      });

      // Helper: lay out a side as equal-width full-height columns
      const layoutSide = (ids, region, align = "left") => {
        const k = ids.length;
        if (k === 0 || region.width <= 0) return;
        const colW = Math.floor(region.width / k);
        ids.forEach((id, i) => {
          const colIndex = align === "left" ? i : i; // both sides fill left→right within their region
          const x = region.x + colIndex * colW;
          frames[id] = {
            x,
            y: region.y,
            width: (i === k - 1) ? region.width - colW * (k - 1) : colW, // last column takes any remainder
            height: region.height
          };
        });
      };

      layoutSide(leftIDs,  leftRegion,  "left");
      layoutSide(rightIDs, rightRegion, "left");

      return frames;
    },

    /**
     * Respond to Amethyst-driven changes (commands, mouse resizes, focus, etc.)
     * For commands: change = { type: "command", command: <string> }
     * For focus change: change = { type: "focusedWindowChanged", windowId }
     * For mouse resize of primary: change = { type: "resizedMain", delta }  // (supported in recent Amethyst)
     */
    updateWithChange: (change, state) => {
      if (!change || !change.type) return state;

      // Track which window is "primary": swap-to-main should update this too
      if (change.type === "focusedWindowChanged" && change.windowId) {
        // Optional: do nothing — primary stays sticky until explicitly swapped.
        return state;
      }

      if (change.type === "windowsChanged" && Array.isArray(change.windows)) {
        // If our primary disappeared, pick a new one deterministically.
        if (state.mainWindowID && !change.windows.some(w => w.id === state.mainWindowID)) {
          return { ...state, mainWindowID: change.windows[0]?.id ?? null };
        }
        return state;
      }

      if (change.type === "swappedFocusedWithMain" && change.focusedWindowId) {
        return { ...state, mainWindowID: change.focusedWindowId };
      }

      if (change.type === "command") {
        switch (change.command) {
          case "expandMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) + STEP, MIN_RATIO, MAX_RATIO) };
          case "shrinkMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) - STEP, MIN_RATIO, MAX_RATIO) };
          case "increaseMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) + STEP, MIN_RATIO, MAX_RATIO) };
          case "decreaseMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) - STEP, MIN_RATIO, MAX_RATIO) };
          default:
            return state;
        }
      }

      // Optional: react to mouse-driven center resize if your Amethyst version sends it
      if (change.type === "resizedMain" && typeof change.delta === "number") {
        const ratioDelta = change.delta / (change.screenWidth || 1);
        return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) + ratioDelta, MIN_RATIO, MAX_RATIO) };
      }

      // Hard reset support (Preferences → Hard reset layouts)
      if (change.type === "hardReset") {
        return { mainRatio: 0.40, mainWindowID: null };
      }

      return state;
    },

    // Declare which built-in commands we handle so your usual keybinds work.
    // (Works per the custom-layouts docs; expand/shrink are the important ones here.)
    commands: {
      expandMain: {
        description: "Widen the centered primary",
        updateState: (state /*, focusedWindowID */) =>
          ({ ...state, mainRatio: Math.min(MAX_RATIO, (state.mainRatio ?? 0.40) + STEP) })
      },
      shrinkMain: {
        description: "Narrow the centered primary",
        updateState: (state /*, focusedWindowID */) =>
          ({ ...state, mainRatio: Math.max(MIN_RATIO, (state.mainRatio ?? 0.40) - STEP) })
      },
      // We always keep exactly one window as primary in this layout.
      increaseMain: { description: "No-op", updateState: (s) => s },
      decreaseMain: { description: "No-op", updateState: (s) => s },
      // You can bind this custom one in .amethyst.yml if you like:
      // setFocusedAsMain: true
    }
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
}
