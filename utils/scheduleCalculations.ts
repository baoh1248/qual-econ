
/**
 * Schedule Calculations Utility
 * Pure functions for schedule-related calculations
 */

import type { ScheduleEntry, ScheduleStats } from '../types/schedule';

/**
 * Calculate payment for a single entry
 */
export function calculateEntryPay(
  entry: ScheduleEntry,
  defaultRate: number = 15
): number {
  const paymentType = entry.paymentType || 'hourly';
  const hours = entry.hours || 0;

  if (paymentType === 'flat_rate') {
    const flatRate = entry.flatRateAmount || 0;
    const bonus = entry.bonusAmount || 0;
    const deductions = entry.deductions || 0;
    return flatRate + bonus - deductions;
  }

  const hourlyRate = entry.hourlyRate || defaultRate;
  const overtimeMultiplier = entry.overtimeRate || 1.5;

  const regularHours = Math.min(hours, 8);
  const overtimeHours = Math.max(0, hours - 8);

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  const bonus = entry.bonusAmount || 0;
  const deductions = entry.deductions || 0;

  return regularPay + overtimePay + bonus - deductions;
}

/**
 * Calculate statistics for a schedule
 */
export function calculateScheduleStats(schedule: ScheduleEntry[]): ScheduleStats {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return getEmptyStats();
  }

  let totalHours = 0;
  let completedEntries = 0;
  let pendingEntries = 0;
  let totalHourlyJobs = 0;
  let totalFlatRateJobs = 0;
  let totalHourlyAmount = 0;
  let totalFlatRateAmount = 0;
  let totalBonusAmount = 0;
  let totalDeductions = 0;
  let totalPayroll = 0;
  let overtimeHours = 0;
  let overtimeAmount = 0;
  let totalHourlyRateSum = 0;
  let hourlyJobCount = 0;

  const cleanerHours = new Map<string, number>();

  for (const entry of schedule) {
    if (!entry) continue;

    const hours = typeof entry.hours === 'number' ? entry.hours : 0;
    totalHours += hours;

    if (entry.status === 'completed') completedEntries++;
    else if (entry.status === 'scheduled') pendingEntries++;

    const cleanerName = entry.cleanerName || 'Unknown';
    const current = cleanerHours.get(cleanerName) || 0;
    cleanerHours.set(cleanerName, current + hours);

    const paymentType = entry.paymentType || 'hourly';
    const entryPay = calculateEntryPay(entry);
    totalPayroll += entryPay;

    totalBonusAmount += entry.bonusAmount || 0;
    totalDeductions += entry.deductions || 0;

    if (paymentType === 'flat_rate') {
      totalFlatRateJobs++;
      totalFlatRateAmount += entry.flatRateAmount || 0;
    } else {
      totalHourlyJobs++;
      const hourlyRate = entry.hourlyRate || 15;
      totalHourlyRateSum += hourlyRate;
      hourlyJobCount++;

      const entryOvertimeHours = Math.max(0, hours - 8);
      overtimeHours += entryOvertimeHours;

      if (entryOvertimeHours > 0) {
        const overtimeMultiplier = entry.overtimeRate || 1.5;
        overtimeAmount += entryOvertimeHours * hourlyRate * (overtimeMultiplier - 1);
      }

      totalHourlyAmount += entryPay;
    }
  }

  const averageHoursPerCleaner =
    cleanerHours.size > 0
      ? Array.from(cleanerHours.values()).reduce((sum, h) => sum + h, 0) / cleanerHours.size
      : 0;

  const utilizationRate =
    schedule.length > 0 ? (completedEntries / schedule.length) * 100 : 0;

  const averageHourlyRate = hourlyJobCount > 0 ? totalHourlyRateSum / hourlyJobCount : 0;

  return {
    totalHours,
    totalEntries: schedule.length,
    completedEntries,
    pendingEntries,
    conflictCount: 0,
    utilizationRate,
    averageHoursPerCleaner,
    totalHourlyJobs,
    totalFlatRateJobs,
    totalHourlyAmount,
    totalFlatRateAmount,
    totalBonusAmount,
    totalDeductions,
    totalPayroll,
    averageHourlyRate,
    overtimeHours,
    overtimeAmount,
  };
}

/**
 * Get empty stats object
 */
function getEmptyStats(): ScheduleStats {
  return {
    totalHours: 0,
    totalEntries: 0,
    completedEntries: 0,
    pendingEntries: 0,
    conflictCount: 0,
    utilizationRate: 0,
    averageHoursPerCleaner: 0,
    totalHourlyJobs: 0,
    totalFlatRateJobs: 0,
    totalHourlyAmount: 0,
    totalFlatRateAmount: 0,
    totalBonusAmount: 0,
    totalDeductions: 0,
    totalPayroll: 0,
    averageHourlyRate: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
  };
}

/**
 * Add hours to time string
 */
export function addHoursToTime(time: string, hours: number): string {
  const [hoursStr, minutesStr] = time.split(':');
  const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + hours * 60;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Validate schedule entry
 */
export function validateEntry(entry: Partial<ScheduleEntry>): string[] {
  const errors: string[] = [];

  if (!entry.clientName?.trim()) {
    errors.push('Client name is required');
  }

  if (!entry.buildingName?.trim()) {
    errors.push('Building name is required');
  }

  if (!entry.cleanerName?.trim() && (!entry.cleanerNames || entry.cleanerNames.length === 0)) {
    errors.push('At least one cleaner is required');
  }

  if (!entry.hours || entry.hours <= 0) {
    errors.push('Hours must be greater than 0');
  }

  if (!entry.date) {
    errors.push('Date is required');
  }

  return errors;
}

/**
 * FIXED: Calculate payroll for a pay period with proper overtime handling
 * Overtime is calculated per week (40 hours), not per day
 */
export function calculatePayrollForPeriod(
  entries: ScheduleEntry[],
  cleanerName: string,
  defaultHourlyRate: number = 15
): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  flatRatePay: number;
  totalPay: number;
  breakdown: {
    hourlyJobs: number;
    flatRateJobs: number;
    completedHours: number;
    scheduledHours: number;
  };
} {
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let regularPay = 0;
  let overtimePay = 0;
  let flatRatePay = 0;
  let hourlyJobCount = 0;
  let flatRateJobCount = 0;
  let completedHours = 0;
  let scheduledHours = 0;

  // Group entries by week to calculate overtime correctly
  const entriesByWeek = new Map<string, ScheduleEntry[]>();
  
  for (const entry of entries) {
    if (!entry) continue;
    
    const cleaners = entry.cleanerNames || [entry.cleanerName];
    if (!cleaners.includes(cleanerName)) continue;

    const weekId = entry.weekId || entry.date;
    if (!entriesByWeek.has(weekId)) {
      entriesByWeek.set(weekId, []);
    }
    entriesByWeek.get(weekId)!.push(entry);
  }

  // Calculate hours and pay per week
  for (const [weekId, weekEntries] of entriesByWeek) {
    let weekHours = 0;
    let weekRegularPay = 0;
    let weekOvertimePay = 0;

    for (const entry of weekEntries) {
      const hours = entry.hours || 0;
      const paymentType = entry.paymentType || 'hourly';

      if (paymentType === 'flat_rate') {
        flatRatePay += entry.flatRateAmount || 0;
        flatRateJobCount++;
      } else {
        const hourlyRate = entry.hourlyRate || defaultHourlyRate;
        weekHours += hours;
        hourlyJobCount++;

        if (entry.status === 'completed') {
          completedHours += hours;
        } else if (entry.status === 'scheduled') {
          scheduledHours += hours;
        }
      }
    }

    // Calculate regular vs overtime for this week
    if (weekHours > 0) {
      const weekRegularHours = Math.min(weekHours, 40);
      const weekOvertimeHours = Math.max(0, weekHours - 40);

      regularHours += weekRegularHours;
      overtimeHours += weekOvertimeHours;

      // Calculate pay for this week
      for (const entry of weekEntries) {
        const paymentType = entry.paymentType || 'hourly';
        if (paymentType === 'hourly') {
          const hourlyRate = entry.hourlyRate || defaultHourlyRate;
          const hours = entry.hours || 0;

          // Allocate hours to regular or overtime
          const hoursToRegular = Math.min(hours, Math.max(0, 40 - (regularHours - weekRegularHours)));
          const hoursToOvertime = hours - hoursToRegular;

          weekRegularPay += hoursToRegular * hourlyRate;
          weekOvertimePay += hoursToOvertime * hourlyRate * 1.5;
        }
      }
    }

    regularPay += weekRegularPay;
    overtimePay += weekOvertimePay;
  }

  totalHours = regularHours + overtimeHours;
  const totalPay = regularPay + overtimePay + flatRatePay;

  return {
    totalHours,
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    flatRatePay,
    totalPay,
    breakdown: {
      hourlyJobs: hourlyJobCount,
      flatRateJobs: flatRateJobCount,
      completedHours,
      scheduledHours,
    },
  };
}

/**
 * FIXED: Calculate payroll summary for multiple cleaners
 */
export function calculatePayrollSummary(
  entries: ScheduleEntry[],
  cleanerNames: string[],
  defaultHourlyRate: number = 15
): Map<string, ReturnType<typeof calculatePayrollForPeriod>> {
  const summary = new Map<string, ReturnType<typeof calculatePayrollForPeriod>>();

  for (const cleanerName of cleanerNames) {
    const payroll = calculatePayrollForPeriod(entries, cleanerName, defaultHourlyRate);
    if (payroll.totalHours > 0 || payroll.flatRatePay > 0) {
      summary.set(cleanerName, payroll);
    }
  }

  return summary;
}
