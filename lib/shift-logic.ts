export type DayOfWeek =
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT"
  | "SUN";

export type BreakRuleType = "DURATION" | "FIXED";

export interface DurationBreakRule {
  type: "DURATION";
  minutes: number;
  startTime: string;
  endTime: string;
}

export interface FixedBreakRule {
  type: "FIXED";
  startTime: string;
  endTime: string;
}

export type BreakRule = DurationBreakRule | FixedBreakRule;

export interface DailyShiftTemplate {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  breakRules: BreakRule[];
}

export interface WeeklyShiftTemplate {
  name: string;
  days: DailyShiftTemplate[];
}

export interface EmployeeOrg {
  id: number;
  employeeCode: string;
  zoneCode: string;
  branchCode: string;
  departmentCode: string;
}

export type AssignmentScope =
  | { type: "ZONE"; zoneCode: string }
  | { type: "BRANCH"; branchCode: string }
  | { type: "DEPARTMENT"; branchCode: string; departmentCode: string };

export interface ShiftAssignmentRule {
  shiftName: string;
  scope: AssignmentScope;
}

const parseTimeToMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const minutesBetween = (start: string, end: string) =>
  parseTimeToMinutes(end) - parseTimeToMinutes(start);

export const validateDailyShift = (template: DailyShiftTemplate) => {
  const errors: string[] = [];
  const totalMinutes = minutesBetween(template.startTime, template.endTime);
  if (totalMinutes <= 0) {
    errors.push(`เวลาทำงานของวัน ${template.day} ไม่ถูกต้อง`);
  }

  template.breakRules.forEach((breakRule, index) => {
    if (breakRule.type === "DURATION") {
      if (breakRule.minutes <= 0 || breakRule.minutes >= totalMinutes) {
        errors.push(
          `ระยะเวลาพักแบบยืดหยุ่นในวัน ${template.day} แถว ${index + 1} ไม่ถูกต้อง`,
        );
      }
      if (!breakRule.startTime || !breakRule.endTime) {
        errors.push(
          `กรุณาระบุช่วงเวลาพักที่อนุญาต (เริ่ม-สิ้นสุด) ในวัน ${template.day} แถว ${index + 1}`,
        );
      } else {
        const windowMinutes = minutesBetween(
          breakRule.startTime,
          breakRule.endTime,
        );
        if (windowMinutes <= 0) {
          errors.push(
            `ช่วงเวลาพักแบบยืดหยุ่นในวัน ${template.day} แถว ${index + 1} ไม่ถูกต้อง`,
          );
        }
        if (breakRule.startTime < template.startTime || breakRule.endTime > template.endTime) {
          errors.push(
            `ช่วงเวลาพักแบบยืดหยุ่นในวัน ${template.day} อยู่เกินเวลาทำงาน`,
          );
        }
        if (windowMinutes < breakRule.minutes) {
          errors.push(
            `ช่วงเวลาพักแบบยืดหยุ่นในวัน ${template.day} ต้องยาวกว่าหรือเท่ากับจำนวนเวลาที่ให้พัก`,
          );
        }
      }
    } else {
      const breakMinutes = minutesBetween(
        breakRule.startTime,
        breakRule.endTime,
      );
      if (breakMinutes <= 0) {
        errors.push(
          `ช่วงเวลาพักแบบกำหนดเวลาในวัน ${template.day} แถว ${index + 1} ไม่ถูกต้อง`,
        );
      }
      if (
        breakRule.startTime < template.startTime ||
        breakRule.endTime > template.endTime
      ) {
        errors.push(
          `ช่วงเวลาพักแบบกำหนดเวลาในวัน ${template.day} อยู่เกินเวลาทำงาน`,
        );
      }
    }
  });

  return errors;
};

export const validateWeeklyTemplate = (template: WeeklyShiftTemplate) => {
  const daySet = new Set(template.days.map((d) => d.day));
  if (daySet.size !== template.days.length) {
    throw new Error("พบวันซ้ำในเทมเพลตกะ");
  }

  if (template.days.length === 0) {
    throw new Error("ต้องกำหนดอย่างน้อยหนึ่งวัน");
  }

  const errors = template.days.flatMap((day) => validateDailyShift(day));
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  return true;
};

export const resolveEmployeesForRule = (
  employees: EmployeeOrg[],
  rule: AssignmentScope,
) => {
  switch (rule.type) {
    case "ZONE":
      return employees.filter((emp) => emp.zoneCode === rule.zoneCode);
    case "BRANCH":
      return employees.filter((emp) => emp.branchCode === rule.branchCode);
    case "DEPARTMENT":
      return employees.filter(
        (emp) =>
          emp.branchCode === rule.branchCode &&
          emp.departmentCode === rule.departmentCode,
      );
    default:
      return [];
  }
};

export const simulateAssignments = (
  employees: EmployeeOrg[],
  weeklyTemplate: WeeklyShiftTemplate,
  rules: ShiftAssignmentRule[],
) => {
  validateWeeklyTemplate(weeklyTemplate);

  return rules.map((rule) => {
    const assignedEmployees = resolveEmployeesForRule(employees, rule.scope);
    return {
      shiftName: rule.shiftName,
      scope: rule.scope,
      employeeCodes: assignedEmployees.map((emp) => emp.employeeCode),
    };
  });
};
