// Medicine data from prescription - Start Date: Feb 7, 2026
export const MEDICINES = [
  {
    id: "1",
    name: "CEFTUM-CV",
    dosage: "500MG",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 7,
    instruction: "PER ORAL TWICE DAILY AT 8AM AND 8PM X 1 WEEK",
    start_date: "2026-02-07"
  },
  {
    id: "2",
    name: "ETOVA-ER",
    dosage: "400MG",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 14,
    instruction: "TWICE DAILY AT 8AM AND 8PM X 14 DAYS",
    start_date: "2026-02-07"
  },
  {
    id: "3",
    name: "DOLO",
    dosage: "650MG",
    frequency: "thrice",
    times: ["08:00", "14:00", "20:00"],
    duration_days: 5,
    instruction: "THRICE DAILY AT 8AM-2PM-8PM X 5 DAYS",
    start_date: "2026-02-07"
  },
  {
    id: "4",
    name: "ASPIRIN",
    dosage: "75MG",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 30,
    instruction: "TWICE DAILY FOR 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "5",
    name: "PREGABALIN-D",
    dosage: "75/20MG",
    frequency: "once",
    times: ["20:00"],
    duration_days: 30,
    instruction: "ONCE DAILY AT 8 PM X 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "6",
    name: "AFICAL PLUS",
    dosage: "",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 30,
    instruction: "TWICE DAILY AT 8AM AND 8PM X 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "7",
    name: "PAN-D",
    dosage: "40MG",
    frequency: "once",
    times: ["07:00"],
    duration_days: 30,
    instruction: "ONCE DAILY AT 7AM BEFORE BREAKFAST X 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "8",
    name: "NEURONEX-CD3",
    dosage: "",
    frequency: "once",
    times: ["14:00"],
    duration_days: 30,
    instruction: "ONCE DAILY AT 2 PM X 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "9",
    name: "ELIQUIS",
    dosage: "2.5MG",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 30,
    instruction: "TWICE DAILY FOR 1 MONTH",
    start_date: "2026-02-07"
  },
  {
    id: "10",
    name: "BETACAP TR",
    dosage: "20MG",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 30,
    instruction: "TWICE TO CONTINUE",
    start_date: "2026-02-07"
  },
  {
    id: "11",
    name: "STAMLO",
    dosage: "5MG",
    frequency: "once",
    times: ["08:00"],
    duration_days: 30,
    instruction: "ONCE A DAY TO CONTINUE",
    start_date: "2026-02-07"
  },
  {
    id: "12",
    name: "ULTRACET",
    dosage: "",
    frequency: "twice",
    times: ["08:00", "20:00"],
    duration_days: 14,
    instruction: "TWICE A DAY FOR 2 WEEKS",
    start_date: "2026-02-07"
  }
];

// Storage keys
const INTAKE_STORAGE_KEY = "medicine_intake_records";

// Get medicines scheduled for a specific date
export const getMedicinesForDate = (dateStr) => {
  const targetDate = new Date(dateStr);
  const scheduled = [];

  MEDICINES.forEach(med => {
    const startDate = new Date(med.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + med.duration_days);

    if (targetDate >= startDate && targetDate < endDate) {
      med.times.forEach(time => {
        scheduled.push({
          medicine_id: med.id,
          name: med.name,
          dosage: med.dosage,
          time: time,
          instruction: med.instruction,
          frequency: med.frequency
        });
      });
    }
  });

  // Sort by time
  scheduled.sort((a, b) => a.time.localeCompare(b.time));
  return scheduled;
};

// Get all intake records from localStorage
export const getAllIntakeRecords = () => {
  try {
    const stored = localStorage.getItem(INTAKE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Error reading intake records:", e);
    return {};
  }
};

// Get intake records for a specific date
export const getIntakeRecordsForDate = (dateStr) => {
  const allRecords = getAllIntakeRecords();
  return allRecords[dateStr] || {};
};

// Save intake record
export const saveIntakeRecord = (dateStr, medicineId, time, taken) => {
  try {
    const allRecords = getAllIntakeRecords();
    
    if (!allRecords[dateStr]) {
      allRecords[dateStr] = {};
    }
    
    const key = `${medicineId}-${time}`;
    allRecords[dateStr][key] = {
      medicine_id: medicineId,
      time: time,
      taken: taken,
      taken_at: taken ? new Date().toISOString() : null
    };
    
    localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(allRecords));
    return true;
  } catch (e) {
    console.error("Error saving intake record:", e);
    return false;
  }
};

// Get stats for a specific date
export const getStatsForDate = (dateStr) => {
  const scheduled = getMedicinesForDate(dateStr);
  const intakeRecords = getIntakeRecordsForDate(dateStr);
  
  const total = scheduled.length;
  let taken = 0;
  
  scheduled.forEach(med => {
    const key = `${med.medicine_id}-${med.time}`;
    if (intakeRecords[key]?.taken) {
      taken++;
    }
  });
  
  return {
    total,
    taken,
    pending: total - taken,
    percentage: total > 0 ? Math.round((taken / total) * 100) : 0
  };
};

// Get full schedule for export
export const getFullSchedule = () => {
  const schedule = [];
  
  MEDICINES.forEach(med => {
    const startDate = new Date(med.start_date);
    
    for (let day = 0; day < med.duration_days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      med.times.forEach(time => {
        schedule.push({
          medicine_id: med.id,
          name: med.name,
          dosage: med.dosage,
          date: dateStr,
          time: time,
          instruction: med.instruction
        });
      });
    }
  });
  
  schedule.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  
  return schedule;
};
