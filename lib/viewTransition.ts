import { flushSync } from "react-dom";

export function circleViewTransition(
  event: React.MouseEvent<HTMLElement>,
  applyChange: () => void
) {
  if (typeof document.startViewTransition !== "function") {
    applyChange();
    return;
  }

  const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  document.documentElement.style.setProperty("--view-transition-x", `${x}px`);
  document.documentElement.style.setProperty("--view-transition-y", `${y}px`);
  document.documentElement.style.setProperty("--view-transition-r", `${radius}px`);

  const transition = document.startViewTransition(() => flushSync(applyChange));
  transition.finished.catch(() => {});
}
