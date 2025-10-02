function layout() {
  // Tunables
  const MIN_RATIO = 0.20; // smallest total center width (as fraction of screen)
  const MAX_RATIO = 0.90; // largest  total center width (as fraction of screen)
  const STEP      = 0.05; // how much expand/shrink changes total center width

  return {
    name: "Centered Twin Columns",

    // Persisted state for this layout instance
    initialState: {
      mainRatio: 0.50 // total width of the two center panes as a fraction of the screen
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

      // If only one window, just full-screen it.
      if (N === 1) {
        const w = windows[0];
        frames[w.id] = { x: screenFrame.x, y: screenFrame.y, width: screenFrame.width, height: screenFrame.height };
        return frames;
      }

      // We bind PHYSICAL SLOTS to ARRAY INDICES:
      // N windows => 2 centered + (N-2) secondaries.
      // windows[0..leftCount-1]      -> left columns (left→right, far→near)
      // windows[leftCount]           -> center-left
      // windows[leftCount+1]         -> center-right
      // windows[leftCount+2..N-1]    -> right columns (left→right, near→far)
      const M = Math.max(0, N - 2);
      const leftCount  = Math.ceil(M / 2);
      const centerLeftIndex  = Math.min(leftCount, N - 2);
      const centerRightIndex = Math.min(leftCount + 1, N - 1);

      const centerLeft  = windows[centerLeftIndex];
      const centerRight = windows[centerRightIndex];

      // Geometry for centered twins
      const mainRatio = clamp(state.mainRatio ?? 0.50, MIN_RATIO, MAX_RATIO);
      const totalCenterW = Math.round(screenFrame.width * mainRatio);
      const halfCenterW  = Math.floor(totalCenterW / 2); // left pane width
      const otherHalfW   = totalCenterW - halfCenterW;   // right pane width (eat remainder)

      const midX = Math.round(screenFrame.x + screenFrame.width / 2);
      const mainY = screenFrame.y;
      const mainH = screenFrame.height;

      // Center-left: extends leftward from the midpoint
      const clX = midX - halfCenterW;
      frames[centerLeft.id] = {
        x: clX,
        y: mainY,
        width: halfCenterW,
        height: mainH
      };

      // Center-right: begins at the midpoint, extends rightward
      const crX = midX;
      frames[centerRight.id] = {
        x: crX,
        y: mainY,
        width: otherHalfW,
        height: mainH
      };

      // Side regions outside the twin center panes
      const leftRegion  = {
        x: screenFrame.x,
        y: screenFrame.y,
        width: Math.max(0, clX - screenFrame.x), // from screen left to center-left's left edge
        height: screenFrame.height
      };
      const rightRegion = {
        x: crX + otherHalfW,
        y: screenFrame.y,
        width: Math.max(0, (screenFrame.x + screenFrame.width) - (crX + otherHalfW)), // from center-right's right edge to screen right
        height: screenFrame.height
      };

      // Collect side IDs based on array order mapping
      const leftIDs  = windows.slice(0, leftCount).map(w => w.id);
      const rightIDs = windows.slice(centerRightIndex + 1).map(w => w.id);

      // Lay out sides as equal-width columns filling left→right within each region
      const layoutSide = (ids, region) => {
        const k = ids.length;
        if (k === 0 || region.width <= 0) return;
        const colW = Math.floor(region.width / k);
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

      layoutSide(leftIDs,  leftRegion);
      layoutSide(rightIDs, rightRegion);

      return frames;
    },

    /**
     * Respond to Amethyst-driven changes (commands, mouse resizes, focus, etc.)
     * For commands: change = { type: "command", command: <string> }
     */
    updateWithChange: (change, state) => {
      if (!change || !change.type) return state;

      if (change.type === "command") {
        switch (change.command) {
          // Expanding increases both center panes outward symmetrically,
          // keeping the meeting line fixed at the screen midpoint.
          case "expandMain":
          case "increaseMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.50) + STEP, MIN_RATIO, MAX_RATIO) };
          case "shrinkMain":
          case "decreaseMain":
            return { ...state, mainRatio: clamp((state.mainRatio ?? 0.50) - STEP, MIN_RATIO, MAX_RATIO) };
          default:
            return state;
        }
      }

      // Optional: if your Amethyst sends a pixel-based resize of the center,
      // interpret it as symmetric change around the midpoint.
      if (change.type === "resizedMain" && typeof change.delta === "number") {
        // delta is interpreted as change to TOTAL center width.
        const ratioDelta = change.delta / (change.screenWidth || 1);
        return { ...state, mainRatio: clamp((state.mainRatio ?? 0.50) + ratioDelta, MIN_RATIO, MAX_RATIO) };
        // Note: The getFrameAssignments logic already keeps the inner seam at mid-screen.
      }

      if (change.type === "hardReset") {
        return { mainRatio: 0.50 };
      }

      return state;
    },

    // Declare which built-in commands we handle so your usual keybinds work.
    commands: {
      expandMain: {
        description: "Widen the two centered panes (outward from midpoint)",
        updateState: (state /*, focusedWindowID */) =>
          ({ ...state, mainRatio: Math.min(MAX_RATIO, (state.mainRatio ?? 0.50) + STEP) })
      },
      shrinkMain: {
        description: "Narrow the two centered panes (inward toward midpoint)",
        updateState: (state /*, focusedWindowID */) =>
          ({ ...state, mainRatio: Math.max(MIN_RATIO, (state.mainRatio ?? 0.50) - STEP) })
      },
      increaseMain: { description: "Alias of expandMain", updateState: (s) => ({ ...s, mainRatio: Math.min(MAX_RATIO, (s.mainRatio ?? 0.50) + STEP) }) },
      decreaseMain: { description: "Alias of shrinkMain", updateState: (s) => ({ ...s, mainRatio: Math.max(MIN_RATIO, (s.mainRatio ?? 0.50) - STEP) }) }
    }
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
}
