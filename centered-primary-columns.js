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
      mainWindowID: null // kept for compatibility (not used for slotting)
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

      // We bind PHYSICAL SLOTS to ARRAY INDICES to make swaps traverse
      // leftmost -> ... -> center -> ... -> rightmost in order.
      // N windows => M=N-1 secondaries around the center.
      const M = Math.max(0, N - 1);
      const leftCount  = Math.ceil(M / 2);  // earlier items go on the left
      const rightCount = Math.floor(M / 2); // remaining items on the right

      // Center (primary) is always windows[leftCount]
      const primaryIndex = Math.min(leftCount, N - 1);
      const primary = windows[primaryIndex];

      // Primary geometry (centered, full height)
      const mainRatio = clamp(state.mainRatio ?? 0.40, MIN_RATIO, MAX_RATIO);
      const mainW = Math.round(screenFrame.width * mainRatio);
      const mainX = Math.round(screenFrame.x + (screenFrame.width - mainW) / 2);
      const mainY = screenFrame.y;
      const mainH = screenFrame.height;

      frames[primary.id] = { x: mainX, y: mainY, width: mainW, height: mainH };

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

      // Slot mapping:
      //   windows[0..leftCount-1]      -> left columns (left→right, far→near)
      //   windows[primaryIndex]        -> center
      //   windows[primaryIndex+1..N-1] -> right columns (left→right, near→far)
      const leftIDs  = windows.slice(0, leftCount).map(w => w.id);
      const rightIDs = windows.slice(primaryIndex + 1).map(w => w.id);

      // Lay out a side as equal-width columns filling left→right within its region
      const layoutSide = (ids, region) => {
        const k = ids.length;
        if (k === 0 || region.width <= 0) return;
        const colW = Math.floor(region.width / Math.max(1, k));
        ids.forEach((id, i) => {
          const x = region.x + i * colW;
          frames[id] = {
            x,
            y: region.y,
            width: (i === k - 1) ? region.width - colW * (k - 1) : colW, // last column eats remainder
            height: region.height
          };
        });
      };

      layoutSide(leftIDs,  leftRegion);   // leftmost is windows[0]
      layoutSide(rightIDs, rightRegion);  // near-center right is windows[primaryIndex+1]

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

      // We keep mainWindowID for compatibility/other commands, but the center slot
      // is determined by array index in getFrameAssignments (not by this value).
      if (change.type === "windowsChanged" && Array.isArray(change.windows)) {
        if (state.mainWindowID && !change.windows.some(w => w.id === state.mainWindowID)) {
          return { ...state, mainWindowID: change.windows[0]?.id ?? null };
        }
        return state;
      }

      if (change.type === "swappedFocusedWithMain" && change.focusedWindowId) {
        // No-op for slotting; still store it for other possible commands.
        return { ...state, mainWindowID: change.focusedWindowId };
      }

      if (change.type === "command") {
        switch (change.command) {
          case "expandMain":
          case "increaseMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.40) + STEP, MIN_RATIO, MAX_RATIO) };
          case "shrinkMain":
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
      // We always keep exactly one "visual center", sized by mainRatio.
      increaseMain: { description: "Alias of expandMain", updateState: (s) => ({ ...s, mainRatio: Math.min(MAX_RATIO, (s.mainRatio ?? 0.40) + STEP) }) },
      decreaseMain: { description: "Alias of shrinkMain", updateState: (s) => ({ ...s, mainRatio: Math.max(MIN_RATIO, (s.mainRatio ?? 0.40) - STEP) }) },
      // Optional custom:
      // setFocusedAsMain: true
    }
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
}
