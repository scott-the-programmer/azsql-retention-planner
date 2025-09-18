import { useState, useEffect } from 'preact/hooks'
import { type RetentionSettings } from "../lib/cost-calculator";

interface BackupEvent {
  date: Date
  type: 'weekly' | 'monthly' | 'yearly'
  retainUntil: Date
}

interface BackupTimelineProps {
  retention: RetentionSettings
}

export function BackupTimeline({ retention }: BackupTimelineProps) {
  const [backupEvents, setBackupEvents] = useState<BackupEvent[]>([])
  const [timeRange, setTimeRange] = useState(12)

  useEffect(() => {
    generateBackupEvents()
  }, [retention, timeRange])

  const generateBackupEvents = () => {
    const events: BackupEvent[] = []
    const today = new Date()
    const startDate = new Date(today)
    startDate.setMonth(startDate.getMonth() - 6)

    const endDate = new Date(today)
    endDate.setMonth(endDate.getMonth() + timeRange)

    const current = new Date(startDate)
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek === 0 && retention.weekly > 0) {
        const retainUntil = new Date(current)
        retainUntil.setDate(retainUntil.getDate() + (retention.weekly * 7))

        events.push({
          date: new Date(current),
          type: 'weekly',
          retainUntil
        })
      }
      current.setDate(current.getDate() + 1)
    }

    const monthlyDate = new Date(startDate)
    monthlyDate.setDate(1)
    while (monthlyDate <= endDate) {
      if (retention.monthly > 0) {
        const firstSunday = new Date(monthlyDate)
        while (firstSunday.getDay() !== 0) {
          firstSunday.setDate(firstSunday.getDate() + 1)
        }

        const retainUntil = new Date(firstSunday)
        retainUntil.setMonth(retainUntil.getMonth() + retention.monthly)

        events.push({
          date: new Date(firstSunday),
          type: 'monthly',
          retainUntil
        })
      }

      monthlyDate.setMonth(monthlyDate.getMonth() + 1)
    }

    const yearlyDate = new Date(startDate.getFullYear(), 0, 1)
    while (yearlyDate <= endDate) {
      if (retention.yearly > 0) {
        const firstSundayOfYear = new Date(yearlyDate)
        while (firstSundayOfYear.getDay() !== 0) {
          firstSundayOfYear.setDate(firstSundayOfYear.getDate() + 1)
        }

        const retainUntil = new Date(firstSundayOfYear)
        retainUntil.setFullYear(retainUntil.getFullYear() + retention.yearly)

        events.push({
          date: new Date(firstSundayOfYear),
          type: 'yearly',
          retainUntil
        })
      }

      yearlyDate.setFullYear(yearlyDate.getFullYear() + 1)
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime())
    setBackupEvents(events)
  }

  const getTimelineRange = () => {
    const today = new Date()
    const start = new Date(today)
    start.setMonth(start.getMonth() - 6)
    const end = new Date(today)
    end.setMonth(end.getMonth() + timeRange)
    return { start, end }
  }

  const getDatePosition = (date: Date) => {
    const { start, end } = getTimelineRange()
    const totalTime = end.getTime() - start.getTime()
    const dateOffset = date.getTime() - start.getTime()
    return (dateOffset / totalTime) * 100
  }

  const getBarWidth = (startDate: Date, endDate: Date) => {
    const { start, end } = getTimelineRange()
    const totalTime = end.getTime() - start.getTime()
    const duration = Math.min(endDate.getTime(), end.getTime()) - Math.max(startDate.getTime(), start.getTime())
    return Math.max(0, (duration / totalTime) * 100)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const formatDuration = (startDate: Date, endDate: Date) => {
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) {
      return `${diffDays} days`
    } else if (diffDays < 365) {
      return `${Math.round(diffDays / 30)} months`
    } else {
      return `${Math.round(diffDays / 365)} years`
    }
  }

  const { start: timelineStart, end: timelineEnd } = getTimelineRange()
  const today = new Date()

  const monthMarkers = []
  const markerDate = new Date(timelineStart)
  markerDate.setDate(1)

  const totalMonths = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const interval = totalMonths > 24 ? 3 : totalMonths > 12 ? 2 : 1

  let monthCount = 0
  while (markerDate <= timelineEnd) {
    if (monthCount % interval === 0) {
      monthMarkers.push({
        date: new Date(markerDate),
        position: getDatePosition(new Date(markerDate))
      })
    }
    markerDate.setMonth(markerDate.getMonth() + 1)
    monthCount++
  }

  const eventsByType = {
    weekly: backupEvents.filter(e => e.type === 'weekly'),
    monthly: backupEvents.filter(e => e.type === 'monthly'),
    yearly: backupEvents.filter(e => e.type === 'yearly')
  }

  return (
    <div class="backup-timeline">
      <div class="timeline-header">
        <h3>Backup Retention Timeline</h3>
        <div class="time-range-controls">
          <label>Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.currentTarget.value))}
          >
            <option value={6}>6 months</option>
            <option value={12}>1 year</option>
            <option value={24}>2 years</option>
            <option value={36}>3 years</option>
            <option value={60}>5 years</option>
          </select>
        </div>
      </div>

      <div class="timeline-legend">
        <div class="legend-item">
          <div class="legend-bar weekly"></div>
          <span>Weekly Backups ({retention.weekly} weeks retention)</span>
        </div>
        <div class="legend-item">
          <div class="legend-bar monthly"></div>
          <span>Monthly Backups ({retention.monthly} months retention)</span>
        </div>
        <div class="legend-item">
          <div class="legend-bar yearly"></div>
          <span>Yearly Backups ({retention.yearly} years retention)</span>
        </div>
      </div>

      <div class="timeline-container">
        <div class="time-axis">
          {monthMarkers.map((marker, index) => (
            <div
              key={index}
              class="time-marker"
              style={{ left: `${marker.position}%` }}
            >
              <div class="marker-line"></div>
              <div class="marker-label">
                {marker.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </div>
            </div>
          ))}
        </div>

        <div
          class="today-marker"
          style={{ left: `${getDatePosition(today)}%` }}
        >
          <div class="today-line"></div>
          <div class="today-label">Today</div>
        </div>

        {Object.entries(eventsByType).map(([type, events]) => {
          if (events.length === 0) return null

          return (
            <div key={type} class={`timeline-row ${type}`}>
              <div class="row-label">
                <span class="backup-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span class="backup-count">({events.length} backups)</span>
              </div>
              <div class="timeline-bars">
                {events.map((event, index) => {
                  const leftPos = getDatePosition(event.date)
                  const width = getBarWidth(event.date, event.retainUntil)
                  const isActive = event.date <= today && today <= event.retainUntil
                  const isPast = event.retainUntil < today
                  const isFuture = event.date > today

                  return (
                    <div
                      key={index}
                      class={`timeline-bar ${type} ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
                      style={{
                        left: `${leftPos}%`,
                        width: `${width}%`
                      }}
                      title={`${type} backup from ${formatDate(event.date)} - retained until ${formatDate(event.retainUntil)} (${formatDuration(event.date, event.retainUntil)})`}
                    >
                      <div class="bar-content">
                        <div class="bar-start"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div class="coverage-summary">
        <h4>Coverage Summary</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Active Backups:</span>
            <span class="summary-value">
              {backupEvents.filter(e => e.date <= today && today <= e.retainUntil).length}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Upcoming Backups:</span>
            <span class="summary-value">
              {backupEvents.filter(e => e.date > today).length}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Longest Retention:</span>
            <span class="summary-value">
              {Math.max(retention.weekly * 7, retention.monthly * 30, retention.yearly * 365)} days
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}