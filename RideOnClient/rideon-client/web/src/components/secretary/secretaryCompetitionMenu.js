import {
  BarChart3,
  CalendarDays,
  Clock3,
  Users,
  Package,
  FileHeart,
  History,
  CreditCard,
  ChevronRight,
} from "lucide-react";

function buildCompetitionPath(competitionId, sectionPath) {
  return "/competitions/" + competitionId + "/" + sectionPath;
}

const secretaryCompetitionMenu = [
  {
    key: "classes",
    label: "מקצים",
    icon: CalendarDays,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "classes");
    },
  },
  {
    key: "paid-time",
    label: "פייד-טיים",
    icon: Clock3,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "paid-time");
    },
  },
  {
    key: "stalls",
    label: "תאים",
    icon: Users,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "stalls");
    },
  },
  {
    key: "shavings",
    label: "הזמנות נסורת",
    icon: Package,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "shavings");
    },
  },
  {
    key: "health-certificates",
    label: "תעודות בריאות",
    icon: FileHeart,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "health-certificates");
    },
  },
  {
    key: "change-tracking",
    label: "מעקב שינויים",
    icon: History,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "change-tracking");
    },
  },
  {
    key: "payments",
    label: "תשלומים",
    icon: CreditCard,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "payments");
    },
  },
    {
    key: "competition-summary",
    label: "סיכום תחרות",
    icon: BarChart3,
    getPath: function (competitionId) {
      return buildCompetitionPath(competitionId, "summary");
    },
  },
  {
    key: "back-to-competitions",
    label: "חזרה ללוח תחרויות",
    icon: ChevronRight,
    getPath: function () {
      return "/competitions";
    },
  },
];

export default secretaryCompetitionMenu;