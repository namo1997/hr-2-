import {
  simulateAssignments,
  type EmployeeOrg,
  type WeeklyShiftTemplate,
} from "./shift-logic.ts";

const isDirectExecution = () => {
  if (typeof process === "undefined") return false;
  if (!process.argv || process.argv.length === 0) return false;
  const currentPath = new URL("", import.meta.url).pathname;
  const invokedPath = process.argv[1];
  return invokedPath === currentPath || invokedPath === currentPath.slice(1);
};

if (isDirectExecution()) {
  const template: WeeklyShiftTemplate = {
    name: "กะเช้า",
    days: [
      {
        day: "MON",
        startTime: "08:00",
        endTime: "17:00",
        breakRules: [
          { type: "FIXED", startTime: "12:00", endTime: "13:00" },
        ],
      },
      {
        day: "TUE",
        startTime: "08:00",
        endTime: "17:00",
        breakRules: [
          {
            type: "DURATION",
            minutes: 60,
            startTime: "12:30",
            endTime: "16:30",
          },
        ],
      },
    ],
  };

  const employees: EmployeeOrg[] = [
    { id: 1, employeeCode: "EMP-001", zoneCode: "ZONE-001", branchCode: "BRN-001", departmentCode: "DEP-001" },
    { id: 2, employeeCode: "EMP-002", zoneCode: "ZONE-001", branchCode: "BRN-001", departmentCode: "DEP-002" },
    { id: 3, employeeCode: "EMP-003", zoneCode: "ZONE-002", branchCode: "BRN-004", departmentCode: "DEP-008" },
  ];

  const assignments = simulateAssignments(employees, template, [
    { shiftName: "กะเช้า", scope: { type: "ZONE", zoneCode: "ZONE-001" } },
    { shiftName: "กะเช้า", scope: { type: "DEPARTMENT", branchCode: "BRN-001", departmentCode: "DEP-002" } },
  ]);

  console.log(assignments);
}
