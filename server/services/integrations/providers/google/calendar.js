/**
 * INSIGHT 360 - Google Calendar Integration
 *
 * Read events, create events via Calendar API.
 */

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

class CalendarService {
    /**
     * Get upcoming events
     */
    async getUpcoming(accessToken, options = {}) {
        const {
            maxResults = 10,
            calendarId = 'primary',
            timeMin = new Date().toISOString()
        } = options;

        const params = new URLSearchParams({
            maxResults: String(maxResults),
            timeMin,
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            events: (data.items || []).map(e => ({
                id: e.id,
                summary: e.summary || '(no title)',
                description: e.description || '',
                start: e.start?.dateTime || e.start?.date || '',
                end: e.end?.dateTime || e.end?.date || '',
                location: e.location || '',
                attendees: (e.attendees || []).map(a => ({
                    email: a.email,
                    name: a.displayName || a.email,
                    responseStatus: a.responseStatus
                })),
                htmlLink: e.htmlLink
            }))
        };
    }

    /**
     * Get a single event
     */
    async getEvent(accessToken, eventId, calendarId = 'primary') {
        const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Calendar API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Create a calendar event
     */
    async createEvent(accessToken, eventData, calendarId = 'primary') {
        const event = {
            summary: eventData.summary || eventData.title,
            description: eventData.description || '',
            start: {
                dateTime: eventData.startTime || eventData.start,
                timeZone: eventData.timeZone || 'UTC'
            },
            end: {
                dateTime: eventData.endTime || eventData.end,
                timeZone: eventData.timeZone || 'UTC'
            },
            location: eventData.location || '',
            attendees: (eventData.attendees || []).map(email => ({ email }))
        };

        const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Calendar create event failed: ${error}`);
        }

        return response.json();
    }

    /**
     * List calendars
     */
    async listCalendars(accessToken) {
        const response = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        return (data.items || []).map(c => ({
            id: c.id,
            summary: c.summary,
            primary: c.primary || false
        }));
    }

    /**
     * Format events for agent context injection
     */
    formatForContext(events) {
        if (!events || events.length === 0) return 'No upcoming events.';

        return events.map((e, i) => {
            const start = new Date(e.start);
            const formatted = start.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const attendeeList = e.attendees?.length
                ? `\n   Attendees: ${e.attendees.map(a => a.name || a.email).join(', ')}`
                : '';
            return `${i + 1}. ${e.summary} - ${formatted}${e.location ? `\n   Location: ${e.location}` : ''}${attendeeList}`;
        }).join('\n\n');
    }
}

module.exports = CalendarService;
