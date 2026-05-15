const ROLE_PALETTE = [
  "#5865F2",
  "#57F287",
  "#FEE75C",
  "#EB459E",
  "#ED4245",
  "#3498DB",
  "#E67E22",
  "#9B59B6",
  "#1ABC9C",
  "#E74C3C",
]

export function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return ROLE_PALETTE[hash % ROLE_PALETTE.length]
}

export function permissionsEqual(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of allKeys) {
    if (!!a[k] !== !!b[k]) return false
  }
  return true
}
