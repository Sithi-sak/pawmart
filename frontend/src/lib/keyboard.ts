// Tracks the on-screen keyboard so fixed UI can react to it. While it's open:
// - <html> gets the `keyboard-open` class, which the bottom nav bars use to
//   hide instead of riding up on top of the keyboard.
// - `--keyboard-inset` is how much of the layout viewport the keyboard covers
//   and `--visual-height` the visible height above it. Android resizes the
//   layout viewport itself (interactive-widget=resizes-content in index.html),
//   so the inset stays 0 there; iOS Safari only shrinks the visual viewport,
//   so sheets use the inset to lift themselves above the keyboard.

// Anything smaller is browser chrome (toolbars collapsing), not a keyboard.
const MIN_KEYBOARD_HEIGHT = 120

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
])

function isTextField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  // Non-filterable el-selects render a readonly input, which opens no keyboard.
  if (el instanceof HTMLInputElement) return !el.readOnly && !NON_TEXT_INPUT_TYPES.has(el.type)
  return el instanceof HTMLElement && el.isContentEditable
}

export function installKeyboardTracking() {
  const viewport = window.visualViewport
  if (!viewport) return

  const root = document.documentElement
  // Layout height with the keyboard closed, refreshed whenever nothing that
  // could raise the keyboard has focus.
  let restingHeight = window.innerHeight

  function update() {
    const focused = isTextField(document.activeElement)
    if (!focused) restingHeight = window.innerHeight

    const covered = Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop)
    const shrunk = restingHeight - window.innerHeight
    const open = focused && (covered > MIN_KEYBOARD_HEIGHT || shrunk > MIN_KEYBOARD_HEIGHT)

    root.classList.toggle('keyboard-open', open)
    if (open) {
      root.style.setProperty('--keyboard-inset', `${covered}px`)
      root.style.setProperty('--visual-height', `${viewport!.height}px`)
    } else {
      root.style.removeProperty('--keyboard-inset')
      root.style.removeProperty('--visual-height')
    }
  }

  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  document.addEventListener('focusin', update)
  // Deferred so tabbing between fields (focusout, then focusin) doesn't
  // flash the nav bars back in for a frame.
  document.addEventListener('focusout', () => requestAnimationFrame(update))
}
