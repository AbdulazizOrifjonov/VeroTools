// Single-icon imports (see metro.config.js resolveRequest): `import X from 'lucide-react-native/icons/x'`.
declare module 'lucide-react-native/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';
  const Icon: LucideIcon;
  export default Icon;
}
