import {
  Trophy,
  CalendarDays,
  TableProperties,
  Users,
  Settings,
} from "lucide-react";

const secretaryGeneralMenu = [
  {
    key: "competitions-board",
    label: "לוח תחרויות",
    icon: Trophy,
    path: "/competitions",
  },
  {
    key: "service-prices",
    label: "מחירון שירותים",
    icon: CalendarDays,
    path: "/service-prices",
  },
  {
    key: "arenas-and-stalls",
    label: "מגרשים ותאים",
    icon: TableProperties,
    path: "/arenas-and-stalls",
  },
  {
    key: "workers-management",
    label: "ניהול עובדים",
    icon: Users,
    path: "/workers-management",
  },
  {
    key: "profile-settings",
    label: "פרופיל והגדרות",
    icon: Settings,
    path: "/profile-settings",
  },
];

export default secretaryGeneralMenu;