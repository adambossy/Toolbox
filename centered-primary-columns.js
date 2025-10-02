function layout() {
  // ---- Tunables -------------------------------------------------------------
  const MIN_RATIO = 0.20; // minimum center width as fraction of screen
  const MAX_RATIO = 0.80; // maximum center width as fraction of screen
  const STEP      = 0.05; // how much expand/shrink changes width
  const START     = 0.40; // initial center width fraction

  return {
    name: "Centered Primary Columns",

    // Persisted state for this layout instance
    initialState: {
      mainRatio: START,
      mainWindowID: null // which window is "primary"
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

      // ---- Sticky primary: do NOT fall back to focused ----
      const primary =
        windows.find(w => w.id === state.mainWindowID) ||
        windows[0];

      // Primary geometry (centered, full height)
      const mainRatio = clamp(state.mainRatio ?? START, MIN_RATIO, MAX_RATIO);
      const mainW = Math.round(screenFrame.width * mainRatio);
      const mainX = Math.round(screenFrame.x + (screenFrame.width - mainW) / 2);
      const mainY = screenFrame.y;
      const mainH = screenFrame.height;

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

      // ---- Clockwise order we want: left side (L→R), then primary, then right side (L→R)
      // We insert frames in that order so swap-clockwise follows it.
      const layoutSide = (ids, region) => {
        const k = ids.length;
        if (k === 0 || region.width <= 0) return;
        const colW = Math.floor(region.width / k);
        ids.forEach((id, i) => {
          const x = region.x + i * colW;
          frames[id] = {
            x,
            y: region.y,
            width: (i === k - 1) ? region.width - colW * (k - 1) : colW, // last takes remainder
            height: region.height
          };
        });
      };

      // Insert frames in the desired clockwise order:
      // 1) Left side (L→R)
      layoutSide(leftIDs,  leftRegion);
      // 2) Primary (centered)
      frames[primary.id] = {
        x: mainX,
        y: mainY,
        width: mainW,
        height: mainH
      };
      // 3) Right side (L→R)
      layoutSide(rightIDs, rightRegion);

      return frames;
    },

    /**
     * Keep primary sticky; repair if it disappears.
     * Also allow (optional) reactions to swaps or hard resets.
     */
    updateWithChange: (change, state) => {
      if (!change || !change.type) return state;

      // 1) NEVER change primary on focus/click
      if (change.type === "focusedWindowChanged") {
        return state;
      }

      // 2) Ensure we have a primary; repair it if the old one disappeared
      if (change.type === "windowsChanged" && Array.isArray(change.windows)) {
        const ids = change.windows.map(w => w.id);
        if (!state.mainWindowID || !ids.includes(state.mainWindowID)) {
          return { ...state, mainWindowID: ids[0] ?? null };
        }
        return state;
      }

      // 3) If your Amethyst emits an event when swapping focused with main, honor it
      if (change.type === "swappedFocusedWithMain" && change.focusedWindowId) {
        return { ...state, mainWindowID: change.focusedWindowId };
      }

      // 4) Optional: mouse-driven center resize (if provided by your Amethyst)
      if (change.type === "resizedMain" && typeof change.delta === "number") {
        const width = change.screenWidth || 1;
        const ratioDelta = width ? (change.delta / width) : 0;
        return { ...state, mainRatio: clamp((state.mainRatio ?? START) + ratioDelta, MIN_RATIO, MAX_RATIO) };
      }

      // 5) Hard reset
      if (change.type === "hardReset") {
        return { mainRatio: START, mainWindowID: null };
      }

      return state;
    },

    // ---- Pane commands (wired to Amethyst keybinds) -------------------------
    commands: {
      expandMain: {
        description: "Widen the centered primary",
        updateState: (state /*, focusedId */) =>
          ({ ...state, mainRatio: clamp((state.mainRatio ?? START) + STEP, MIN_RATIO, MAX_RATIO) })
      },
      shrinkMain: {
        description: "Narrow the centered primary",
        updateState: (state /*, focusedId */) =>
          ({ ...state, mainRatio: clamp((state.mainRatio ?? START) - STEP, MIN_RATIO, MAX_RATIO) })
      },
      // We always keep exactly one primary; these are no-ops here.
      increaseMain: { description: "No-op", updateState: (s) => s },
      decreaseMain: { description: "No-op", updateState: (s) => s },

      // Convenience: bind this if you want a manual way to choose the primary
      setFocusedAsMain: {
        description: "Make focused window the primary",
        updateState: (state, focusedId) =>
          focusedId ? ({ ...state, mainWindowID: focusedId }) : state
      }
    }

    // Note: If your Amethyst version supports an explicit "ordering" API for swap,
    // it will use our insertion order above. If not, the insertion order of `frames`
    // typically defines the clockwise sequence.
  };

  // ---- Helpers --------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
}
