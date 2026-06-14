import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ModuleWidgetProps } from '../../types/campus'
import {
  createLeaveApplication,
  fetchLeaveWorkspace,
  saveLeaveConfig,
  updateCurfewCount,
  updateLeaveApplicationStatus,
} from './api'
import { addDays, fallbackLeaveWorkspace } from './defaultLeave'
import type {
  CampusLeaveWorkspace,
  LeaveApplicationRecord,
  LeaveApplicationRequest,
  LeaveSetupConfig,
  LeaveTab,
} from './types'
import './CampusLeave.css'

interface LeaveDraft {
  fromDate: string
  toDate: string
  departureTime: string
  returnTime: string
  leaveType: string
  destination: string
  reason: string
  guardianRelation: string
  guardianEmail: string
  guardianPhone: string
  emergencyContact: string
}

function normalizeExternalUrl(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function draftFromWorkspace(workspace: CampusLeaveWorkspace): LeaveDraft {
  return {
    fromDate: addDays(1),
    toDate: addDays(2),
    departureTime: '18:00',
    returnTime: '20:30',
    leaveType: 'Home visit',
    destination: '',
    reason: '',
    guardianRelation: workspace.profile.guardian_relation,
    guardianEmail: workspace.profile.guardian_email,
    guardianPhone: workspace.profile.guardian_phone,
    emergencyContact: workspace.profile.phone,
  }
}

function CampusLeavePage({
  campusId,
  designations,
  role,
  userId,
}: ModuleWidgetProps) {
  const fallback = fallbackLeaveWorkspace(campusId, userId)
  const [workspace, setWorkspace] = useState<CampusLeaveWorkspace>(() => fallback)
  const [configDraft, setConfigDraft] = useState<LeaveSetupConfig>(() => fallback.config)
  const [leaveDraft, setLeaveDraft] = useState<LeaveDraft>(() => draftFromWorkspace(fallback))
  const [activeTab, setActiveTab] = useState<LeaveTab>('apply')
  const [curfewUserId, setCurfewUserId] = useState(fallback.student_directory[0]?.user_id ?? '')
  const [curfewCount, setCurfewCount] = useState(String(fallback.student_directory[0]?.curfew_violations ?? 0))
  const [securityNotes, setSecurityNotes] = useState('')
  const [status, setStatus] = useState('')

  const canConfigure = role === 'admin'
  const canSecurity = role === 'admin' || designations.includes('security')
  const canWarden = role === 'admin' || designations.includes('warden')
  const canManageLeave = canSecurity || canWarden
  const externalUrl = normalizeExternalUrl(configDraft.source_url)

  useEffect(() => {
    let ignore = false
    fetchLeaveWorkspace(campusId, userId, role, designations).then((data) => {
      if (!ignore) {
        setWorkspace(data)
        setConfigDraft(data.config)
        setLeaveDraft(draftFromWorkspace(data))
        const firstStudent = data.student_directory[0]
        if (firstStudent) {
          setCurfewUserId(firstStudent.user_id)
          setCurfewCount(String(firstStudent.curfew_violations))
        }
      }
    })

    return () => {
      ignore = true
    }
  }, [campusId, userId, role, designations])

  const tabs = useMemo(() => ([
    { id: 'apply' as const, label: 'Apply' },
    { id: 'applications' as const, label: 'Applications' },
    { id: 'profile' as const, label: 'Profile' },
    { id: 'curfew' as const, label: 'Curfew' },
    ...(canSecurity ? [{ id: 'security' as const, label: 'Security' }] : []),
    ...(canWarden ? [{ id: 'warden' as const, label: 'Warden' }] : []),
    ...(canConfigure ? [{ id: 'setup' as const, label: 'Setup' }] : []),
  ]), [canSecurity, canWarden, canConfigure])

  const pendingApplications = workspace.all_applications.filter((application) => (
    application.status === 'submitted'
    || application.status === 'warden_approved'
  ))

  const handleConfigSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConfigure) return

    setStatus('Saving leave module setup...')
    const response = await saveLeaveConfig(configDraft, role, designations)
    setWorkspace((current) => ({
      ...current,
      config: response.data ?? configDraft,
    }))
    setStatus(response.status === 'preview' ? 'Leave setup previewed locally.' : 'Leave setup saved.')
  }

  const handleLeaveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!leaveDraft.destination || !leaveDraft.reason) return
    if (leaveDraft.fromDate > leaveDraft.toDate) {
      setStatus('To date must be after from date.')
      return
    }

    const request: LeaveApplicationRequest = {
      campus_id: campusId,
      user_id: userId,
      student_name: workspace.profile.student_name,
      from_date: leaveDraft.fromDate,
      to_date: leaveDraft.toDate,
      departure_time: leaveDraft.departureTime,
      return_time: leaveDraft.returnTime,
      leave_type: leaveDraft.leaveType,
      destination: leaveDraft.destination,
      reason: leaveDraft.reason,
      guardian_relation: leaveDraft.guardianRelation,
      guardian_email: leaveDraft.guardianEmail,
      guardian_phone: leaveDraft.guardianPhone,
      emergency_contact: leaveDraft.emergencyContact,
    }
    setStatus('Submitting leave application...')
    const response = await createLeaveApplication(request, role, designations)
    const saved = response.data
    if (saved) {
      setWorkspace((current) => ({
        ...current,
        applications: [saved, ...current.applications],
        all_applications: canManageLeave ? [saved, ...current.all_applications] : current.all_applications,
      }))
    }
    setLeaveDraft((current) => ({ ...current, destination: '', reason: '' }))
    setStatus(response.status === 'preview' ? 'Leave application previewed locally.' : 'Leave application submitted.')
  }

  const markLeave = async (application: LeaveApplicationRecord, nextStatus: string) => {
    if (!canManageLeave) return
    const response = await updateLeaveApplicationStatus(
      campusId,
      application.id,
      nextStatus,
      userId,
      securityNotes,
      role,
      designations,
    )
    const statusValue = response.data?.status ?? nextStatus
    const notesValue = response.data?.security_notes ?? securityNotes
    setWorkspace((current) => ({
      ...current,
      applications: current.applications.map((item) => (
        item.id === application.id
          ? { ...item, status: statusValue, security_notes: notesValue }
          : item
      )),
      all_applications: current.all_applications.map((item) => (
        item.id === application.id
          ? { ...item, status: statusValue, security_notes: notesValue }
          : item
      )),
    }))
    setStatus(response.status === 'preview' ? 'Leave status previewed locally.' : 'Leave status updated.')
  }

  const handleCurfewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSecurity) return
    const count = Number(curfewCount)
    const response = await updateCurfewCount(campusId, curfewUserId, count, role, designations)
    setWorkspace((current) => ({
      ...current,
      student_directory: current.student_directory.map((profile) => (
        profile.user_id === curfewUserId
          ? { ...profile, curfew_violations: response.data?.curfew_violations ?? count }
          : profile
      )),
      curfew_violations: current.profile.user_id === curfewUserId
        ? response.data?.curfew_violations ?? count
        : current.curfew_violations,
      profile: current.profile.user_id === curfewUserId
        ? { ...current.profile, curfew_violations: response.data?.curfew_violations ?? count }
        : current.profile,
    }))
    setStatus(response.status === 'preview' ? 'Curfew count previewed locally.' : 'Curfew count updated.')
  }

  const renderSetup = () => (
    <form className="leave-setup" onSubmit={handleConfigSave}>
      <div className="leave-section-heading">
        <div>
          <span>Module Setup</span>
          <h3>Leave Source</h3>
        </div>
        <strong>{configDraft.mode === 'default_app' ? 'Default App' : 'Website'}</strong>
      </div>

      <div className="leave-button-row" role="group" aria-label="Leave module source">
        <button
          className={configDraft.mode === 'external_website' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'external_website' }))}
          type="button"
        >
          Add a website
        </button>
        <button
          className={configDraft.mode === 'default_app' ? 'active' : ''}
          onClick={() => setConfigDraft((current) => ({ ...current, mode: 'default_app' }))}
          type="button"
        >
          Add Default App
        </button>
      </div>

      <label>
        Website
        <input
          onChange={(event) => setConfigDraft((current) => ({ ...current, source_url: event.target.value }))}
          placeholder="campus.iiitb.net"
          type="text"
          value={configDraft.source_url ?? ''}
        />
      </label>

      <label className="leave-toggle">
        <input
          checked={configDraft.is_active}
          onChange={(event) => setConfigDraft((current) => ({ ...current, is_active: event.target.checked }))}
          type="checkbox"
        />
        Active
      </label>

      <button type="submit">Save Setup</button>
    </form>
  )

  const renderExternal = () => (
    <section className="leave-external">
      <div>
        <span>Website Source</span>
        <h3>{configDraft.source_url || 'campus.iiitb.net'}</h3>
      </div>
      {externalUrl && (
        <a href={externalUrl} rel="noreferrer" target="_blank">
          Open Website
        </a>
      )}
    </section>
  )

  const renderApply = () => (
    <form className="leave-form" onSubmit={handleLeaveSubmit}>
      <div className="leave-section-heading">
        <div>
          <span>Leave Application</span>
          <h3>Request Leave</h3>
        </div>
      </div>

      <div className="leave-form-grid">
        <label>
          From
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, fromDate: event.target.value }))}
            type="date"
            value={leaveDraft.fromDate}
          />
        </label>
        <label>
          To
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, toDate: event.target.value }))}
            type="date"
            value={leaveDraft.toDate}
          />
        </label>
        <label>
          Leave Type
          <select
            onChange={(event) => setLeaveDraft((current) => ({ ...current, leaveType: event.target.value }))}
            value={leaveDraft.leaveType}
          >
            <option>Home visit</option>
            <option>Medical</option>
            <option>Academic travel</option>
            <option>Emergency</option>
          </select>
        </label>
      </div>

      <div className="leave-form-grid">
        <label>
          Departure Time
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, departureTime: event.target.value }))}
            type="time"
            value={leaveDraft.departureTime}
          />
        </label>
        <label>
          Return Time
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, returnTime: event.target.value }))}
            type="time"
            value={leaveDraft.returnTime}
          />
        </label>
        <label>
          Emergency Contact
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, emergencyContact: event.target.value }))}
            type="tel"
            value={leaveDraft.emergencyContact}
          />
        </label>
      </div>

      <label>
        Destination
        <input
          onChange={(event) => setLeaveDraft((current) => ({ ...current, destination: event.target.value }))}
          placeholder="City, address, or place"
          type="text"
          value={leaveDraft.destination}
        />
      </label>

      <label>
        Reason
        <textarea
          onChange={(event) => setLeaveDraft((current) => ({ ...current, reason: event.target.value }))}
          rows={3}
          value={leaveDraft.reason}
        />
      </label>

      <div className="leave-form-grid">
        <label>
          Parent or Guardian
          <select
            onChange={(event) => setLeaveDraft((current) => ({ ...current, guardianRelation: event.target.value }))}
            value={leaveDraft.guardianRelation}
          >
            <option>Mother</option>
            <option>Father</option>
            <option>Guardian</option>
          </select>
        </label>
        <label>
          Guardian Email
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, guardianEmail: event.target.value }))}
            type="email"
            value={leaveDraft.guardianEmail}
          />
        </label>
        <label>
          Guardian Phone
          <input
            onChange={(event) => setLeaveDraft((current) => ({ ...current, guardianPhone: event.target.value }))}
            type="tel"
            value={leaveDraft.guardianPhone}
          />
        </label>
      </div>

      <button type="submit">Submit Leave</button>
    </form>
  )

  const renderApplicationList = (
    applications: LeaveApplicationRecord[],
    mode: 'student' | 'warden' | 'security',
  ) => (
    <div className="leave-application-list">
      {applications.length === 0 && <p className="leave-empty">No leave applications.</p>}
      {applications.map((application) => (
        <article key={application.id}>
          <div className="leave-application-main">
            <span>{application.student_name}</span>
            <h3>{application.leave_type} · {application.destination}</h3>
            <p>{formatDate(application.from_date)} - {formatDate(application.to_date)}</p>
            <em>{application.reason}</em>
          </div>
          <div className="leave-application-status">
            <strong>{titleCase(application.status)}</strong>
            <span>{application.guardian_relation}: {application.guardian_phone}</span>
            {application.security_notes && <span>{application.security_notes}</span>}
            {mode === 'warden' && (
              <div className="leave-action-row">
                <button onClick={() => markLeave(application, 'warden_approved')} type="button">Approve</button>
                <button onClick={() => markLeave(application, 'rejected')} type="button">Reject</button>
              </div>
            )}
            {mode === 'security' && (
              <div className="leave-action-row">
                <button onClick={() => markLeave(application, 'security_checked_out')} type="button">Check Out</button>
                <button onClick={() => markLeave(application, 'security_checked_in')} type="button">Check In</button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )

  const renderApplications = () => (
    <section className="leave-list-panel">
      <div className="leave-section-heading">
        <div>
          <span>Applications</span>
          <h3>History</h3>
        </div>
        <strong>{workspace.applications.length}</strong>
      </div>
      {renderApplicationList(workspace.applications, 'student')}
    </section>
  )

  const renderProfile = () => (
    <div className="leave-profile-grid">
      <article>
        <span>Student</span>
        <h3>{workspace.profile.student_name}</h3>
        <p>{workspace.profile.program} · Batch {workspace.profile.batch}</p>
        <strong>{workspace.profile.email}</strong>
        <strong>{workspace.profile.phone}</strong>
      </article>
      <article>
        <span>Room</span>
        <h3>{workspace.profile.room_number}</h3>
        <p>{workspace.profile.hostel}</p>
      </article>
      <article>
        <span>Parent or Guardian</span>
        <h3>{workspace.profile.guardian_name}</h3>
        <p>{workspace.profile.guardian_relation}</p>
        <strong>{workspace.profile.guardian_email}</strong>
        <strong>{workspace.profile.guardian_phone}</strong>
      </article>
    </div>
  )

  const renderCurfew = () => (
    <section className="leave-curfew-panel">
      <div className="leave-section-heading">
        <div>
          <span>Curfew</span>
          <h3>Violation Count</h3>
        </div>
        <strong>{workspace.curfew_violations}</strong>
      </div>
      <p>
        {workspace.profile.student_name} has {workspace.curfew_violations} curfew violation(s) on record.
      </p>
    </section>
  )

  const renderSecurity = () => (
    <div className="leave-two-column">
      <section className="leave-list-panel">
        <div className="leave-section-heading">
          <div>
            <span>Security</span>
            <h3>Leave Queue</h3>
          </div>
          <strong>{pendingApplications.length}</strong>
        </div>
        <label>
          Security Notes
          <input
            onChange={(event) => setSecurityNotes(event.target.value)}
            placeholder="Gate pass note"
            type="text"
            value={securityNotes}
          />
        </label>
        {renderApplicationList(workspace.all_applications, 'security')}
      </section>

      <form className="leave-form" onSubmit={handleCurfewSubmit}>
        <div className="leave-section-heading">
          <div>
            <span>Curfew</span>
            <h3>Update Count</h3>
          </div>
        </div>
        <label>
          Student
          <select
            onChange={(event) => {
              const profile = workspace.student_directory.find((item) => item.user_id === event.target.value)
              setCurfewUserId(event.target.value)
              setCurfewCount(String(profile?.curfew_violations ?? 0))
            }}
            value={curfewUserId}
          >
            {workspace.student_directory.map((profile) => (
              <option key={profile.user_id} value={profile.user_id}>
                {profile.student_name} · {profile.room_number}
              </option>
            ))}
          </select>
        </label>
        <label>
          Violations
          <input
            min="0"
            onChange={(event) => setCurfewCount(event.target.value)}
            type="number"
            value={curfewCount}
          />
        </label>
        <button type="submit">Update Curfew</button>
      </form>
    </div>
  )

  const renderWarden = () => (
    <div className="leave-two-column">
      <section className="leave-list-panel">
        <div className="leave-section-heading">
          <div>
            <span>Warden</span>
            <h3>Pending Applications</h3>
          </div>
          <strong>{pendingApplications.length}</strong>
        </div>
        {renderApplicationList(pendingApplications, 'warden')}
      </section>

      <section className="leave-table-panel">
        <div className="leave-section-heading">
          <div>
            <span>Student Rooms</span>
            <h3>Directory</h3>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Room</th>
              <th>Phone</th>
              <th>Curfew</th>
            </tr>
          </thead>
          <tbody>
            {workspace.student_directory.map((profile) => (
              <tr key={profile.user_id}>
                <td>{profile.student_name}</td>
                <td>{profile.hostel} {profile.room_number}</td>
                <td>{profile.phone}</td>
                <td>{profile.curfew_violations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )

  const renderActiveTab = () => {
    if (activeTab === 'apply') return renderApply()
    if (activeTab === 'applications') return renderApplications()
    if (activeTab === 'profile') return renderProfile()
    if (activeTab === 'curfew') return renderCurfew()
    if (activeTab === 'security') return renderSecurity()
    if (activeTab === 'warden') return renderWarden()
    return renderSetup()
  }

  return (
    <section className="leave-panel">
      <header className="leave-header">
        <div>
          <span>Campus Portal</span>
          <h2>Leave Application</h2>
        </div>
        <div className="leave-header-meta">
          <strong>{workspace.applications.length} applications</strong>
          <em>{configDraft.mode === 'default_app' ? 'Default app' : 'Website source'}</em>
        </div>
      </header>

      {renderExternal()}

      <div className="leave-tabs" role="tablist" aria-label="Leave application tabs">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'active' : ''}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="leave-tab-body">
        {renderActiveTab()}
      </div>

      {status && <p className="leave-status">{status}</p>}
    </section>
  )
}

export default CampusLeavePage
