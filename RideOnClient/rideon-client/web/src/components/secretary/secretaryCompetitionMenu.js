import {
  CalendarDays,
  Clock3,
  Users,
  Package,
  FileHeart,
  History,
  CreditCard,
  BarChart3,
  ChevronRight,
} from "lucide-react";

const secretaryCompetitionMenu = [
  { key: "classes", label: "מקצים", icon: CalendarDays },
  { key: "paid-time", label: "פייד-טיים", icon: Clock3 },
  { key: "stalls", label: "תאים", icon: Users },
  { key: "shavings", label: "הזמנות נסורת", icon: Package },
  { key: "health-certificates", label: "תעודות בריאות", icon: FileHeart },
  { key: "change-tracking", label: "מעקב שינויים", icon: History },
  { key: "payments", label: "תשלומים", icon: CreditCard },
  { key: "competition-summary", label: "סיכום תחרות", icon: BarChart3 },
  { key: "back-to-competitions", label: "חזרה ללוח תחרויות", icon: ChevronRight },
];

export default secretaryCompetitionMenu;