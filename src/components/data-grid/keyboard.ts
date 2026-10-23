// True when a key event comes from a text field rendered inside a cell.
// The grid must not treat arrow keys, Home/End etc. there as cell navigation.
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, select')
  );
}
