import { database, ref, set, get, onValue } from '../lib/firebase';

// Firebase path for intake records
const INTAKE_PATH = 'intake_records';

// Save intake record to Firebase
export const saveIntakeRecord = async (dateStr, medicineId, time, taken) => {
  try {
    const key = `${medicineId}_${time.replace(':', '')}`;
    const recordRef = ref(database, `${INTAKE_PATH}/${dateStr}/${key}`);
    
    await set(recordRef, {
      medicine_id: medicineId,
      time: time,
      taken: taken,
      taken_at: taken ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    return false;
  }
};

// Get intake records for a specific date from Firebase
export const getIntakeRecordsForDate = async (dateStr) => {
  try {
    const recordsRef = ref(database, `${INTAKE_PATH}/${dateStr}`);
    const snapshot = await get(recordsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const records = {};
      
      Object.values(data).forEach(record => {
        const key = `${record.medicine_id}-${record.time}`;
        records[key] = record.taken;
      });
      
      return records;
    }
    
    return {};
  } catch (error) {
    console.error('Error reading from Firebase:', error);
    return {};
  }
};

// Subscribe to real-time updates for a specific date
export const subscribeToIntakeRecords = (dateStr, callback) => {
  const recordsRef = ref(database, `${INTAKE_PATH}/${dateStr}`);
  
  const unsubscribe = onValue(recordsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const records = {};
      
      Object.values(data).forEach(record => {
        const key = `${record.medicine_id}-${record.time}`;
        records[key] = record.taken;
      });
      
      callback(records);
    } else {
      callback({});
    }
  }, (error) => {
    console.error('Firebase subscription error:', error);
    callback({});
  });
  
  return unsubscribe;
};

// Get stats for a specific date
export const getStatsFromRecords = (scheduled, intakeRecords) => {
  const total = scheduled.length;
  let taken = 0;
  
  scheduled.forEach(med => {
    const key = `${med.medicine_id}-${med.time}`;
    if (intakeRecords[key]) {
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
