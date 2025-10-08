# Recurring Events - Notion Integration

## Overview

This feature allows you to manage recurring events in a Notion calendar database. Unlike Notion's built-in recurring tasks that only create entries when scheduled, this implementation creates events ahead of time similar to Google Calendar, allowing you to see future occurrences.

## Features

- **Automatic Event Creation**: Generate recurring events based on frequency, cadence, and selected days
- **Lookahead Window**: Control how many weeks/periods ahead to create events
- **Template System**: Use "Recurring Source" to mark which event serves as the template
- **Batch Updates**: When a source event is updated, all future events sync automatically
- **Manual Sync**: Trigger sync manually through the web interface

## Setup Instructions

### 1. Create a Notion Integration

To access your Notion database programmatically, you need to create an integration and obtain a secret key:

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the details:
   - **Name**: Choose a name (e.g., "Recurring Events Integration")
   - **Associated workspace**: Select your workspace
   - **Type**: Internal integration
4. Click **"Submit"**
5. Copy the **Internal Integration Secret** to be used as the Secret Key

### 2. Share Database with Integration

After creating the integration, you must grant it access to your Notion database:

1. Open your Notion calendar database page
2. Click the **"..."** menu (top-right of the page)
3. Scroll down and click **"Add connections"**
4. Search for and select your integration name
5. Click **"Confirm"**

Your integration now has access to read and modify this database.

### 3. Get Database ID

You'll need the database ID for configuration:

1. Open your database in Notion (full page view)
2. Copy the URL from your browser
3. The database ID is the 32-character string after the workspace name and before the `?`
   - Format: `https://www.notion.so/[workspace]/[DATABASE_ID]?v=...`
   - Example: If URL is `https://www.notion.so/myworkspace/a1b2c3d4e5f6...?v=abc123`
   - Database ID is `a1b2c3d4e5f6...`

### 4. Putting It All Together

1. Go to /recurring-events
2. Click on Add Configuration
    - Title: you can choose a name
    - Database Id: grabbed ID from above
    - Secret Key: grabbed secret key from above

## Notion Database Setup

### Required Properties (case-sensitive)

Your Notion database must have the following properties. If you don't have these properties, it will be created for you after the first run:

1. **Date** (Date)
   - The date and time of the event
   - Must include time component

2. **Recurring Frequency** (Select)
   - Options: "Weekly"
   - Determines the recurrence pattern

3. **Recurring Cadence** (Number)
   - How often the event repeats within the frequency
   - Example: 1 = every week, 2 = every 2 weeks

4. **Recurring Days** (Multi-select)
   - Options: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
   - Days of the week the event should occur

5. **Recurring Lookahead Number** (Number)
   - Number of weeks to create events ahead
   - Example: 2 = create events up to 2 weeks in advance

6. **Recurring ID** (Text)
   - Unique identifier for the recurring event group
   - All related events share the same ID

7. **Recurring Source** (Checkbox)
   - Mark as `true` to designate this event as the template
   - All future events will copy properties from this source

## Usage Flow

### 1. Create Initial Recurring Event

1. Create a new event in your Notion database
2. Set the **Date** to your desired start date/time
3. Set **Recurring Frequency** to "Weekly"
4. Set **Recurring Cadence** (e.g., 1 for every week)
5. Select **Recurring Days** (e.g., Monday, Friday)
6. Set **Recurring Lookahead Number** (e.g., 2 for 2 weeks ahead)
7. Set **Recurring Source** to `true`

### 2. Run Sync

- Trigger the Sync via the endpoint "POST /recurring-events/{id-of-your-event}/sync"
- Navigate to `/recurring-events` in your browser
- Click on your configuration
- Click "Sync Now"
- The system will create future events based on your settings

### 3. Update Existing Recurring Events

To update all future events:
1. Modify the desired event in Notion
2. Set its **Recurring Source** to `true`
3. Run sync again
4. All future events with the same Recurring ID will update

## Example Scenario

**Initial Setup (2025-10-01):**
- Date: 2025-10-01 13:00
- Recurring Frequency: Weekly
- Recurring Cadence: 1
- Recurring Days: Monday, Friday
- Recurring Lookahead Number: 2
- Recurring ID: "team-meeting-001"
- Recurring Source: true

**First Sync Results:**
Creates events at:
- 2025-10-03 13:00 (Friday)
- 2025-10-06 13:00 (Monday)
- 2025-10-10 13:00 (Friday)
- 2025-10-13 13:00 (Friday) - marked as Recurring Source

**Subsequent Syncs:**
- If lookahead window is maintained, no new events created
- If lookahead increases or time passes, new events generated

## Edge Cases

### Duplicate Events
If an event already exists at the exact same time with the same Recurring ID, the system will skip creating a duplicate.

### Updating Template
When you mark a different event as the Recurring Source and sync:
- All future events (same or later Date) will update to match
- Past events remain unchanged

### Lookahead Changes
If you reduce the Lookahead Number:
- Existing future events are NOT deleted
- No new events created beyond the window

### Deleted Events
If you delete future events manually:
- Next sync will recreate them if within lookahead window

## API Endpoints

- `GET /recurring-events` - List all configurations
- `POST /recurring-events` - Create new configuration
- `GET /recurring-events/:id` - View specific configuration
- `PUT /recurring-events/:id/sync` - Trigger sync for configuration

## Sync Response Format

```json
{
  "success": true,
  "created": 5,
  "updated": 3,
  "skipped": 2,
  "errors": []
}
```

## Future Enhancements

- [ ] Automated scheduled sync (cron job)

## Troubleshooting

### Events Not Creating
- Verify all required properties exist in Notion
- Check property names match exactly (case-sensitive)
- Ensure Recurring Source is set to `true`
- Verify Recurring Lookahead Number > 0

### Events Not Updating
- Confirm the event is marked as Recurring Source
- Check that future events share the same Recurring ID
- Verify Date is on or after the source event

### Sync Errors
- Check Notion API key has proper permissions
- Verify database ID is correct
- Review error messages in sync results
