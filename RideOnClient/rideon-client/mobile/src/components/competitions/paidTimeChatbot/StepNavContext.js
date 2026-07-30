import { createContext, useContext } from "react";

// מאפשר ל-StepLayout להצהיר על הניווט של השלב, ול-PaidTimeChatbotModal
// לרנדר אותו כסרגל תחתון קבוע מחוץ לאזור הגלילה.
//
// הפרדה מכוונת בין שני סוגי מידע:
//   handlersRef - הפונקציות עצמן, נשמרות ב-ref ולא ב-state. שלבים מסוימים
//                 מעבירים פונקציה אנונימית חדשה בכל render, ואם היא הייתה
//                 נכנסת ל-state הייתה נוצרת לולאת רינדור.
//   setNavState - רק ערכים פרימיטיביים (האם אפשר להתקדם, תוויות, סיבת
//                 חסימה), כך שה-effect נדלק רק כשמשהו באמת השתנה.
//
// אם אין Provider, StepLayout חוזר להתנהגות הקודמת ומרנדר את הכפתורים בעצמו.
const StepNavContext = createContext(null);

export function useStepNav() {
  return useContext(StepNavContext);
}

export default StepNavContext;
