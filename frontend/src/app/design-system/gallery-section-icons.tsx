import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { ChatCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatCircle";
import { CursorClickIcon } from "@phosphor-icons/react/dist/ssr/CursorClick";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { NavigationArrowIcon } from "@phosphor-icons/react/dist/ssr/NavigationArrow";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { RulerIcon } from "@phosphor-icons/react/dist/ssr/Ruler";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { ShapesIcon } from "@phosphor-icons/react/dist/ssr/Shapes";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr/SpinnerGap";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { TableIcon } from "@phosphor-icons/react/dist/ssr/Table";
import { TextAaIcon } from "@phosphor-icons/react/dist/ssr/TextAa";
import { TextboxIcon } from "@phosphor-icons/react/dist/ssr/Textbox";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";

const icons: Record<string, typeof HouseIcon> = {
  overview: HouseIcon,
  typography: TextAaIcon,
  colors: PaletteIcon,
  spacing: RulerIcon,
  icons: ShapesIcon,
  buttons: CursorClickIcon,
  forms: TextboxIcon,
  lists: ListBulletsIcon,
  "scoring-breakdown": ChartBarIcon,
  tables: TableIcon,
  "cards-metrics": SquaresFourIcon,
  banners: MegaphoneIcon,
  "badges-status": SealCheckIcon,
  "empty-states": TrayIcon,
  "loading-states": SpinnerGapIcon,
  "error-states": WarningCircleIcon,
  dialogs: ChatCircleIcon,
  "sheets-modals": SidebarSimpleIcon,
  "navigation-bars": NavigationArrowIcon,
};

export function GallerySectionIcon({ id }: { id: string }) {
  const Icon = icons[id] ?? SquaresFourIcon;
  return <Icon size={20} aria-hidden="true" focusable="false" />;
}
