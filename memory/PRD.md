# Medicine Tracker PRD

## Original Problem Statement
Build a medicine tracking app based on a doctor's prescription that shows medicines to take based on selected date/time. User can track intake with checkboxes. Print/export schedule feature required.

## User Inputs
- Start Date: February 7, 2026, 8PM
- Include all 12 medicines (removed duplicate ASPIRIN)
- Light theme (Clinical Zen)
- Print/Export schedule feature

## Architecture
- **Backend**: FastAPI with MongoDB
- **Frontend**: React with Tailwind CSS + Shadcn UI
- **Database**: MongoDB for intake tracking records

## User Personas
- Post-surgery patient needing to track 12 different medications
- Caregivers helping manage patient medication schedule

## Core Requirements
1. Display medicines by date selection
2. Group by time period (Morning/Afternoon/Evening)
3. Checkbox tracking for taken/untaken
4. Progress visualization
5. Print/Export schedule

## What's Implemented (Jan 2026)
- ✅ Dashboard with date picker and medicine list
- ✅ 12 medicines from prescription loaded
- ✅ Checkbox tracking with MongoDB persistence
- ✅ Morning/Afternoon/Evening grouping
- ✅ Progress ring with percentage
- ✅ Print Schedule page with date range filter
- ✅ CSV export functionality
- ✅ Medicine filter on print page

## Medicines Included
1. CEFTUM-CV 500MG - Twice daily (7 days)
2. ETOVA-ER 400MG - Twice daily (14 days)
3. DOLO 650MG - Thrice daily (5 days)
4. ASPIRIN 75MG - Twice daily (30 days)
5. PREGABALIN-D 75/20MG - Once daily 8PM (14 days)
6. AFICAL PLUS - Twice daily (30 days)
7. PAN-D 40MG - Once daily 7AM (30 days)
8. NEURONEX-CD3 - Once daily 2PM (30 days)
9. ELIQUIS 2.5MG - Twice daily (30 days)
10. BETACAP TR 20MG - Twice daily (30 days)
11. STAMLO 5MG - Once daily (30 days)
12. ULTRACET - Twice daily (14 days)

## Prioritized Backlog
### P0 (Done)
- Medicine display by date
- Checkbox tracking
- Print/Export

### P1 (Future)
- Push notifications/reminders
- Medicine refill alerts
- Doctor notes integration

### P2 (Future)
- Multi-user support
- Medicine interaction warnings
- Health vitals tracking

## Next Tasks
- Add browser notification reminders
- Add medicine inventory tracking
- Add notes per medicine dose
