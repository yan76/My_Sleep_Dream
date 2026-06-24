export type NavigationGuardTarget = {
  href: string;
  method: "push" | "replace";
};

type NavigationGuard = (target: NavigationGuardTarget) => boolean;

let activeNavigationGuard: NavigationGuard | null = null;

export function setNavigationGuard(guard: NavigationGuard | null) {
  activeNavigationGuard = guard;

  return () => {
    if (activeNavigationGuard === guard) {
      activeNavigationGuard = null;
    }
  };
}

export function requestNavigationGuard(target: NavigationGuardTarget): boolean {
  return activeNavigationGuard?.(target) ?? false;
}
