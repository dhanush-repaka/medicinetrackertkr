import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays } from "date-fns";
import { Calendar } from "../components/ui/calendar";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { 
  Pill, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Printer,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Activity,
  Cloud,
  CloudOff
} from "lucide-react";
import { getMedicinesForDate } from "../data/medicines";
import { 
  saveIntakeRecord, 
  subscribeToIntakeRecords, 
  getStatsFromRecords 
} from "../data/firebaseService";

const getTimeBadgeClass = (time) => {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 8) return "time-badge time-badge-early";
  if (hour < 12) return "time-badge time-badge-morning";
  if (hour < 18) return "time-badge time-badge-afternoon";
  return "time-badge time-badge-evening";
};

const getTimeIcon = (time) => {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 8) return <Sunrise className="w-3.5 h-3.5" />;
  if (hour < 12) return <Sun className="w-3.5 h-3.5" />;
  if (hour < 18) return <Sunset className="w-3.5 h-3.5" />;
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

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 1, 7));
  const [medicines, setMedicines] = useState([]);
  const [intakeRecords, setIntakeRecords] = useState({});
  const [stats, setStats] = useState({ total: 0, taken: 0, pending: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Load medicines for selected date
  useEffect(() => {
    const scheduledMedicines = getMedicinesForDate(dateStr);
    setMedicines(scheduledMedicines);
  }, [dateStr]);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = subscribeToIntakeRecords(dateStr, (records) => {
      setIntakeRecords(records);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dateStr]);

  // Update stats when medicines or records change
  useEffect(() => {
    const newStats = getStatsFromRecords(medicines, intakeRecords);
    setStats(newStats);
  }, [medicines, intakeRecords]);

  const handleToggle = async (medicine, currentTaken) => {
    const key = `${medicine.medicine_id}-${medicine.time}`;
    const newTaken = !currentTaken;
    
    // Optimistic update
    setIntakeRecords(prev => ({ ...prev, [key]: newTaken }));
    setSyncing(true);

    // Save to Firebase
    const success = await saveIntakeRecord(dateStr, medicine.medicine_id, medicine.time, newTaken);
    
    setSyncing(false);
    
    if (success && newTaken) {
      toast.success(`${medicine.name} marked as taken`, {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      });
    } else if (!success) {
      // Revert on failure
      setIntakeRecords(prev => ({ ...prev, [key]: currentTaken }));
      toast.error("Failed to sync. Please try again.");
    }
  };

  const periodOrder = ["Early Morning", "Morning", "Afternoon", "Evening"];

  const groupedMedicines = medicines.reduce((acc, med) => {
    const hour = parseInt(med.time.split(":")[0]);
    let period;
    if (hour < 8) period = "Early Morning";
    else if (hour < 12) period = "Morning";
    else if (hour < 18) period = "Afternoon";
    else period = "Evening";
    
    if (!acc[period]) acc[period] = [];
    acc[period].push(med);
    return acc;
  }, {});

  const getFilteredMedicines = () => {
    if (activeTab === "all") return groupedMedicines;
    if (groupedMedicines[activeTab]) {
      return { [activeTab]: groupedMedicines[activeTab] };
    }
    return {};
  };

  const getPeriodCount = (period) => {
    if (!groupedMedicines[period]) return { taken: 0, total: 0 };
    const meds = groupedMedicines[period];
    const taken = meds.filter(m => intakeRecords[`${m.medicine_id}-${m.time}`]).length;
    return { taken, total: meds.length };
  };

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {syncing ? (
                  <>
                    <Cloud className="w-4 h-4 animate-pulse text-primary" />
                    <span className="hidden sm:inline">Syncing...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">Synced</span>
                  </>
                )}
              </div>
              <Button 
                variant="outline" 
                className="gap-2 rounded-full"
                onClick={() => window.location.hash = '#/print'}
                data-testid="print-schedule-btn"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print Schedule</span>
              </Button>
            </div>
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex mb-6 bg-slate-100 p-1 rounded-xl h-auto flex-wrap gap-1" data-testid="time-tabs">
                  <TabsTrigger 
                    value="all" 
                    className="flex-1 min-w-[80px] rounded-lg py-2.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    data-testid="tab-all"
                  >
                    <span className="font-medium">All</span>
                    <Badge variant="secondary" className="ml-2 text-xs">{stats.taken}/{stats.total}</Badge>
                  </TabsTrigger>
                  {periodOrder.map(period => {
                    const count = getPeriodCount(period);
                    if (count.total === 0) return null;
                    return (
                      <TabsTrigger 
                        key={period} 
                        value={period}
                        className="flex-1 min-w-[100px] rounded-lg py-2.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        data-testid={`tab-${period.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {period === "Early Morning" && <Sunrise className="w-4 h-4 text-orange-500" />}
                          {period === "Morning" && <Sun className="w-4 h-4 text-amber-500" />}
                          {period === "Afternoon" && <Sunset className="w-4 h-4 text-sky-500" />}
                          {period === "Evening" && <Moon className="w-4 h-4 text-indigo-500" />}
                          <span className="font-medium hidden sm:inline">{period}</span>
                          <Badge variant="secondary" className="ml-1 text-xs">{count.taken}/{count.total}</Badge>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  <div className="space-y-8">
                    {periodOrder.filter(period => getFilteredMedicines()[period]).map((period) => (
                      <div key={period}>
                        <div className="flex items-center gap-2 mb-4">
                          {period === "Early Morning" && <Sunrise className="w-5 h-5 text-orange-400" />}
                          {period === "Morning" && <Sun className="w-5 h-5 text-amber-500" />}
                          {period === "Afternoon" && <Sunset className="w-5 h-5 text-sky-500" />}
                          {period === "Evening" && <Moon className="w-5 h-5 text-indigo-500" />}
                          <h3 className="text-lg font-semibold text-slate-800">{period}</h3>
                          <Badge variant="secondary" className="ml-auto">
                            {getFilteredMedicines()[period].filter(m => intakeRecords[`${m.medicine_id}-${m.time}`]).length}/{getFilteredMedicines()[period].length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {getFilteredMedicines()[period].map((medicine, idx) => (
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
                </TabsContent>
              </Tabs>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
