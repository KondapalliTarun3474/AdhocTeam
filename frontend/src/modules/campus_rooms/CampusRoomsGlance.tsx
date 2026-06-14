import { useEffect, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import { fallbackRoomsWorkspace } from './defaultRooms'
import { fetchRoomsWorkspace } from './api'
import type { CampusRoomsWorkspace } from './types'
import './CampusRooms.css'

function formatBookingTime(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  })
  const endFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(new Date(startAt))} - ${endFormatter.format(new Date(endAt))}`
}

function CampusRoomsGlance({
  campusId,
  designations,
  isLoading,
  openModule,
  role,
}: ModuleWidgetProps) {
  const [workspace, setWorkspace] = useState<CampusRoomsWorkspace>(() => fallbackRoomsWorkspace(campusId))

  useEffect(() => {
    let ignore = false
    fetchRoomsWorkspace(campusId, role, designations).then((data) => {
      if (!ignore) {
        setWorkspace(data)
      }
    })

    return () => {
      ignore = true
    }
  }, [campusId, role, designations])

  const nextBooking = workspace.next_booking
  const canSupport = role === 'admin' || designations.includes('classroom_support')

  return (
    <section className="rooms-glance" aria-label="Campus room tracker glance">
      <div className="rooms-glance-header">
        <div>
          <span>Rooms</span>
          <h2>Next Booking</h2>
        </div>
        <strong>{isLoading ? 'Loading' : `${workspace.bookings.length} entries`}</strong>
      </div>

      {nextBooking ? (
        <div className="rooms-glance-body">
          <div>
            <span>{nextBooking.room_name}</span>
            <h3>{nextBooking.title}</h3>
          </div>
          <p>{formatBookingTime(nextBooking.start_at, nextBooking.end_at)}</p>
          <em>{nextBooking.professor_name ?? nextBooking.status}</em>
        </div>
      ) : (
        <p className="rooms-empty">No bookings available.</p>
      )}

      {canSupport && (
        <div className="rooms-glance-reminder">
          <strong>Classroom Support</strong>
          <span>Book or block rooms from the full module.</span>
        </div>
      )}

      <button onClick={() => openModule?.('campus_rooms')} type="button">
        Open Rooms
      </button>
    </section>
  )
}

export default CampusRoomsGlance
