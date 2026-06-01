import {
  ArrowRight,
  Flag,
  GitBranch,
  Image,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Music,
  Play,
  Sparkles,
  Settings,
  Square,
  Tag,
  UserMinus,
  UserPlus,
  Variable,
  Volume2,
  type LucideIcon,
} from "lucide-react";

export const BLOCK_ICONS: Record<string, LucideIcon> = {
  loading: Loader2,
  main_menu: LayoutGrid,
  settings: Settings,
  start: Play,
  scene: Image,
  dialogue: MessageSquare,
  choice: GitBranch,
  show_character: UserPlus,
  hide_character: UserMinus,
  music: Music,
  sound: Volume2,
  effect: Sparkles,
  set_variable: Variable,
  unlock_cg: Image,
  condition: GitBranch,
  jump: ArrowRight,
  label: Tag,
  end: Square,
};

export function getBlockIcon(type: string): LucideIcon {
  return BLOCK_ICONS[type] ?? Flag;
}
