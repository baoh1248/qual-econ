
# Client Projects Management Feature

## Overview

The Client Projects Management feature allows supervisors to track and manage special projects for clients. Projects can be either included in the regular cleaning contract or billed separately as additional services.

## Use Cases

### Example 1: Mercedes (Included Project)
- **Regular Contract**: Showroom cleaning every 2 days
- **Project**: Floor polishing and shine once a month
- **Billing**: Included in contract (no extra charge)

### Example 2: Honda (Billable Project)
- **Regular Contract**: Regular cleaning every 2 days
- **Project**: Floor polishing and shine
- **Billing**: Charged separately (not included in contract)

## Features

### 1. Project Creation
- Associate projects with specific clients
- Define project name and description
- Set frequency (one-time, weekly, bi-weekly, monthly, quarterly, yearly)
- Mark as included in contract or billable
- Set billing amount for non-included projects
- Track project status (active, completed, cancelled, on-hold)
- Schedule next project date

### 2. Project Tracking
- View all projects in a filterable list
- Filter by status (active, completed, cancelled, on-hold)
- Filter by billing type (included vs. billable)
- Search projects by name, client, or description
- View project details and history

### 3. Project Completion
- Mark projects as complete
- Record completion details:
  - Who completed the project
  - Hours spent
  - Number of photos taken
  - Completion notes
- Track completion history for recurring projects

### 4. Dashboard Integration
- Quick access from supervisor dashboard
- View project statistics:
  - Total active projects
  - Projects included in contracts
  - Billable projects
  - Total revenue from billable projects

## Database Schema

### client_projects Table
```sql
- id: TEXT (Primary Key)
- client_name: TEXT (Client name)
- project_name: TEXT (Project name)
- description: TEXT (Project description)
- frequency: TEXT (one-time, weekly, bi-weekly, monthly, quarterly, yearly)
- is_included_in_contract: BOOLEAN (Whether included in contract)
- billing_amount: NUMERIC (Amount to charge if not included)
- status: TEXT (active, completed, cancelled, on-hold)
- next_scheduled_date: DATE (Next scheduled date)
- last_completed_date: DATE (Last completion date)
- notes: TEXT (Additional notes)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### project_completions Table
```sql
- id: TEXT (Primary Key)
- project_id: TEXT (Foreign Key to client_projects)
- completed_date: DATE (Date completed)
- completed_by: TEXT (Cleaner who completed)
- hours_spent: NUMERIC (Hours spent on project)
- notes: TEXT (Completion notes)
- photos_count: INTEGER (Number of photos taken)
- created_at: TIMESTAMPTZ
```

## Navigation

### Access Points
1. **Supervisor Dashboard**: Quick action button "Projects"
2. **Bottom Navigation**: "Projects" tab (briefcase icon)
3. **Direct URL**: `/supervisor/projects`

## User Interface

### Main Screen
- **Header**: Company logo, "Client Projects" title, add button
- **Filters**: Search bar, status filter, billing type filter
- **Stats Summary**: Active, Included, Billable, Revenue
- **Project Cards**: List of projects with key information

### Project Card
Each project card displays:
- Project name and status badge
- Client name
- Description (if available)
- Frequency
- Billing information (included or amount)
- Next scheduled date
- Action buttons: Complete, Edit, Delete

### Add/Edit Project Modal
Form fields:
- Client selection (dropdown)
- Project name
- Description
- Frequency
- Included in contract toggle
- Billing amount (if not included)
- Status
- Next scheduled date
- Notes

### Mark Complete Modal
Form fields:
- Completed by (cleaner name)
- Hours spent
- Photos count
- Completion notes

### Project Details Modal
Displays:
- Full project information
- Completion history with:
  - Completion dates
  - Who completed
  - Hours spent
  - Photos taken
  - Notes

## Workflow

### Creating a New Project
1. Navigate to Projects screen
2. Tap the "+" button in header
3. Select client from dropdown
4. Enter project details
5. Toggle "Included in Contract" if applicable
6. If not included, enter billing amount
7. Set frequency and next scheduled date
8. Save project

### Marking a Project Complete
1. Find project in list
2. Tap "Complete" button
3. Enter completion details:
   - Who completed it
   - Hours spent
   - Photos taken
   - Any notes
4. Save completion
5. System updates last_completed_date

### Viewing Project History
1. Tap on any project card
2. View full project details
3. Scroll to "Completion History" section
4. See all past completions with details

## Billing Integration

### Included Projects
- No additional charge
- Tracked for contract compliance
- Completion history maintained

### Billable Projects
- Billing amount specified per project
- Revenue tracked in dashboard stats
- Can be used for invoicing

## Best Practices

1. **Clear Naming**: Use descriptive project names (e.g., "Floor Polishing & Shine")
2. **Accurate Frequency**: Set realistic frequency based on client needs
3. **Contract Clarity**: Clearly mark if included in contract
4. **Regular Updates**: Mark projects complete promptly
5. **Documentation**: Add notes for special requirements or issues
6. **Photo Evidence**: Record photo count for quality assurance

## Future Enhancements

Potential future features:
- Link projects to schedule entries
- Automatic scheduling based on frequency
- Invoice generation for billable projects
- Project templates for common services
- Client approval workflow
- Before/after photo galleries
- Project cost tracking (materials, labor)
- Profitability analysis
- Email notifications for upcoming projects
- Mobile app integration for cleaners

## Technical Notes

- Projects are stored in Supabase database
- Real-time updates supported
- Row Level Security (RLS) enabled
- Optimized queries with indexes
- Cascading delete for completions when project deleted
- Automatic timestamp management
