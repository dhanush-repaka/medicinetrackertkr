import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO, addDays } from "date-fns";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { 
  Printer, 
  Download, 
  Calendar as CalendarIcon, 
  ArrowLeft,
  Pill
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatTime = (time) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function PrintSchedule() {
  const [medicines, setMedicines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(2026, 1, 7));
  const [endDate, setEndDate] = useState(new Date(2026, 2, 9));
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await axios.get(`${API}/medicines`);
        setMedicines(res.data);
        setSelectedMedicines(res.data.map(m => m.id));
      } catch (error) {
        console.error("Error fetching medicines:", error);
      }
    };
    fetchMedicines();
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/schedule/full`);
        setSchedule(res.data);
      } catch (error) {
        console.error("Error fetching schedule:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const filteredSchedule = schedule.filter(item => {
    const itemDate = parseISO(item.date);
    return (
      selectedMedicines.includes(item.medicine_id) &&
      itemDate >= startDate &&
      itemDate <= endDate
    );
  });

  const groupedByDate = filteredSchedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const toggleMedicine = (id) => {
    setSelectedMedicines(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    const headers = ["Date", "Time", "Medicine", "Dosage", "Instructions"];
    const rows = filteredSchedule.map(item => [
      format(parseISO(item.date), "yyyy-MM-dd"),
      formatTime(item.time),
      item.name,
      item.dosage || "-",
      item.instruction
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medicine-schedule-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = '/'}
                data-testid="back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Print Schedule</h1>
                <p className="text-sm text-muted-foreground">Export your medicine schedule</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="gap-2 rounded-full"
                onClick={exportCSV}
                data-testid="export-csv-btn"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button 
                className="gap-2 rounded-full btn-primary"
                onClick={handlePrint}
                data-testid="print-btn"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 no-print">
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Date Range
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">From</label>
                  <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        data-testid="start-date-picker"
                      >
                        {format(startDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          if (date) {
                            setStartDate(date);
                            setStartCalendarOpen(false);
                          }
                        }}
                        defaultMonth={startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">To</label>
                  <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        data-testid="end-date-picker"
                      >
                        {format(endDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          if (date) {
                            setEndDate(date);
                            setEndCalendarOpen(false);
                          }
                        }}
                        defaultMonth={endDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" />
                Medicines ({selectedMedicines.length}/{medicines.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {medicines.map(med => (
                  <label 
                    key={med.id} 
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedMedicines.includes(med.id)}
                      onCheckedChange={() => toggleMedicine(med.id)}
                      data-testid={`medicine-filter-${med.id}`}
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      {med.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-slate-900">{filteredSchedule.length}</span> doses 
                from <span className="font-semibold text-slate-900">{format(startDate, "MMM d, yyyy")}</span> to{" "}
                <span className="font-semibold text-slate-900">{format(endDate, "MMM d, yyyy")}</span>
              </p>
            </div>
          </section>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden print:border-none print:rounded-none">
          <div className="p-6 border-b border-border print:p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center print:hidden">
                <Pill className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Medicine Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  {format(startDate, "MMMM d, yyyy")} - {format(endDate, "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No medicines found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full print-schedule-table" data-testid="schedule-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Medicine</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Dosage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 print:hidden">Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedByDate).map(([date, items]) => (
                    items.map((item, idx) => (
                      <tr 
                        key={`${item.medicine_id}-${date}-${item.time}`}
                        className="border-b border-border hover:bg-slate-50"
                      >
                        {idx === 0 ? (
                          <td 
                            className="px-4 py-3 text-sm font-medium text-slate-900 bg-slate-50/50"
                            rowSpan={items.length}
                          >
                            {format(parseISO(date), "EEE, MMM d")}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatTime(item.time)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.dosage || "-"}
                        </td>
                        <td className="px-4 py-3 print:hidden">
                          <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-border bg-slate-50 print:bg-white">
            <p className="text-xs text-muted-foreground text-center">
              Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")} • Post-Surgery Medicine Tracker
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
