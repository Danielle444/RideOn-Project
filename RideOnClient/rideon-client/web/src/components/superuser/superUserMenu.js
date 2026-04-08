import {
  Users,
  UserCog,
  GitBranch,
  LayoutList,
  Gavel,
  Award,
  AlertTriangle,
  Bell,
  Route,
} from "lucide-react";

const superUserMenu = [
  { key: "requests", label: "בקשות משתמשים וחוות", icon: Users },
  { key: "super-users", label: "משתמשי מערכת", icon: UserCog },
  { key: "fields", label: "ענפים", icon: GitBranch },
  { key: "classes", label: "מקצים", icon: LayoutList },
  { key: "judges", label: "שופטים", icon: Gavel },
  { key: "reining-patterns", label: "מסלולי ריינינג", icon: Route },
  { key: "prizes", label: "פרסים", icon: Award },
  { key: "fines", label: "קנסות", icon: AlertTriangle },
  { key: "notifications", label: "התראות", icon: Bell },
];

export default superUserMenu;