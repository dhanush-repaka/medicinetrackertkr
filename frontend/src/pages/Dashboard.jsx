import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format, addDays, subDays, parseISO } from "date-fns";
import { Calendar } from "../components/ui/calendar";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { 
  Pill, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Printer,
  Sun,
  Sunset,
  Moon,
  Activity
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getTimeBadgeClass = (time) => {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "time-badge time-badge-morning";
  if (hour < 17) return "time-badge time-badge-afternoon";
  return "time-badge time-badge-evening";
};

const getTimeIcon = (time) => {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return <Sun className="w-3.5 h-3.5" />;
  if (hour < 17) return <Sunset className="w-3.5 h-3.5" />;
  return <Moon className="w-3.5 h-3.5" />;
};

const formatTime = (time) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const MedicineCard = ({ medicine, taken, onToggle, index }) => {
  return (
    <div 
      className={`medicine-card ${taken ? 'medicine-card-taken' : 'medicine-card-pending'} animate-slide-up stagger-${Math.min(index + 1, 8)}`}
      style={{ opacity: 0 }}
      data-testid={`medicine-card-${medicine.medicine_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Checkbox
            checked={taken}
            onCheckedChange={onToggle}
            className="medicine-checkbox mt-1"
            data-testid={`medicine-checkbox-${medicine.medicine_id}-${medicine.time}`}
            aria-label={`Mark ${medicine.name} as ${taken ? 'not taken' : 'taken'}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg text-slate-900">{medicine.name}</h3>
              {medicine.dosage && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {medicine.dosage}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{medicine.instruction}</p>
          </div>
        </div>
        <div className={getTimeBadgeClass(medicine.time)}>
          {getTimeIcon(medicine.time)}
          <span>{formatTime(medicine.time)}</span>
        </div>
      </div>
      {taken && (
        <div className="flex items-center gap-1.5 mt-3 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>Taken</span>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="stat-card">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-2xl font-bold text-slate-900">{value}</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 1, 7));
  const [medicines, setMedicines] = useState([]);
  const [intakeRecords, setIntakeRecords] = useState({});
  const [stats, setStats] = useState({ total: 0, taken: 0, pending: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleRes, intakeRes, statsRes] = await Promise.all([
        axios.get(`${API}/medicines/schedule/${dateStr}`),
        axios.get(`${API}/intake/${dateStr}`),
        axios.get(`${API}/stats/${dateStr}`)
      ]);

      setMedicines(scheduleRes.data);
      
      const intakeMap = {};
      intakeRes.data.forEach(record => {
        intakeMap[`${record.medicine_id}-${record.time}`] = record.taken;
      });
      setIntakeRecords(intakeMap);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (medicine, currentTaken) => {
    const key = `${medicine.medicine_id}-${medicine.time}`;
    const newTaken = !currentTaken;
    
    setIntakeRecords(prev => ({ ...prev, [key]: newTaken }));
    setStats(prev => ({
      ...prev,
      taken: newTaken ? prev.taken + 1 : prev.taken - 1,
      pending: newTaken ? prev.pending - 1 : prev.pending + 1,
      percentage: Math.round(((newTaken ? prev.taken + 1 : prev.taken - 1) / prev.total) * 100)
    }));

    try {
      await axios.post(`${API}/intake`, {
        medicine_id: medicine.medicine_id,
        date: dateStr,
        time: medicine.time,
        taken: newTaken
      });
      
      if (newTaken) {
        toast.success(`${medicine.name} marked as taken`, {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        });
      }
    } catch (error) {
      setIntakeRecords(prev => ({ ...prev, [key]: currentTaken }));
      setStats(prev => ({
        ...prev,
        taken: currentTaken ? prev.taken : prev.taken - 1,
        pending: currentTaken ? prev.pending : prev.pending + 1,
        percentage: Math.round((currentTaken ? prev.taken : prev.taken - 1) / prev.total * 100)
      }));
      toast.error("Failed to update. Please try again.");
    }
  };

  const groupedMedicines = medicines.reduce((acc, med) => {
    const hour = parseInt(med.time.split(":")[0]);
    let period;
    if (hour < 12) period = "Morning";
    else if (hour < 17) period = "Afternoon";
    else period = "Evening";
    
    if (!acc[period]) acc[period] = [];
    acc[period].push(med);
    return acc;
  }, {});

  const navigateDate = (direction) => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Pill className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Medicine Tracker</h1>
                <p className="text-sm text-muted-foreground">Post-Surgery Recovery</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="gap-2 rounded-full"
              onClick={() => window.open('/print', '_blank')}
              data-testid="print-schedule-btn"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Schedule</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="dashboard-grid">
          <aside className="space-y-6 no-print">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigateDate('prev')}
                    data-testid="prev-date-btn"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="font-medium"
                        data-testid="date-picker-btn"
                      >
                        {format(selectedDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }
                        }}
                        defaultMonth={selectedDate}
                        data-testid="calendar"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigateDate('next')}
                    data-testid="next-date-btn"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Today's Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full progress-ring" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="hsl(160, 84%, 39%)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        className="progress-ring-circle"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.percentage / 100)}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{stats.percentage}%</span>
                      <span className="text-xs text-muted-foreground">Complete</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-emerald-700">{stats.taken}</span>
                    <p className="text-xs text-emerald-600">Taken</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-slate-700">{stats.pending}</span>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6" data-testid="medicine-schedule">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {format(selectedDate, "EEEE, MMMM d")}
                </h2>
                <p className="text-muted-foreground">
                  {stats.total} medicines scheduled
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : medicines.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Pill className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No medicines scheduled</h3>
                  <p className="text-muted-foreground">
                    There are no medicines scheduled for this date.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedMedicines).map(([period, meds]) => (
                  <div key={period}>
                    <div className="flex items-center gap-2 mb-4">
                      {period === "Morning" && <Sun className="w-5 h-5 text-amber-500" />}
                      {period === "Afternoon" && <Sunset className="w-5 h-5 text-sky-500" />}
                      {period === "Evening" && <Moon className="w-5 h-5 text-indigo-500" />}
                      <h3 className="text-lg font-semibold text-slate-800">{period}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {meds.filter(m => intakeRecords[`${m.medicine_id}-${m.time}`]).length}/{meds.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {meds.map((medicine, idx) => (
                        <MedicineCard
                          key={`${medicine.medicine_id}-${medicine.time}`}
                          medicine={medicine}
                          taken={intakeRecords[`${medicine.medicine_id}-${medicine.time}`] || false}
                          onToggle={() => handleToggle(
                            medicine, 
                            intakeRecords[`${medicine.medicine_id}-${medicine.time}`] || false
                          )}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
