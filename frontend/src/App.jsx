import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:3001';
const DOC_TYPES = ['Valid ID', 'Signed Contract', 'NBI Clearance', 'TIN Form'];

function daysBetween(start, end) {
  if (!start || !end || end < start) return 0;
  const first = new Date(`${start}T00:00:00Z`).getTime();
  const last = new Date(`${end}T00:00:00Z`).getTime();
  let days = 0;
  for (let date = first; date <= last; date += 86400000) {
    const weekday = new Date(date).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    const error = new Error(message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

function Pill({ status }) {
  return <span className={`pill ${status}`}>{status}</span>;
}

function RequestForm({ types, balances, documents, onSubmit }) {
  const [form, setForm] = useState({ LeaveTypeID: types[0]?.LeaveTypeID ?? 1, StartDate: '', EndDate: '', Reason: '', file: '' });
  const [error, setError] = useState('');

  const type = types.find((item) => Number(item.LeaveTypeID) === Number(form.LeaveTypeID)) || types[0];
  const balance = balances.find((item) => item.LeaveTypeID === type?.LeaveTypeID) || { TotalDays: 0, UsedDays: 0 };
  const totalDays = daysBetween(form.StartDate, form.EndDate);
  const supportingDocuments = documents.filter(
    (document) =>
      document.OriginalFilename &&
      document.FileURL?.startsWith('/hr/documents/') &&
      document.VerificationStatus !== 'Rejected',
  );

  function updateField(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.StartDate || !form.EndDate || !form.Reason.trim()) {
      setError('Please complete the date range and reason before submitting.');
      return;
    }
    if (form.EndDate < form.StartDate) {
      setError('The end date must be on or after the start date.');
      return;
    }
    if (totalDays < 1) {
      setError('Choose at least one weekday for your leave request.');
      return;
    }
    if (type?.RequiresDocument && !supportingDocuments.some((document) => document.FileURL === form.file)) {
      setError('Upload and select a supporting document for this leave type.');
      return;
    }

    setError('');
    onSubmit({
      ...form,
      file: form.file || '',
      totalDays,
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="f">
        Leave type
        <select value={form.LeaveTypeID} onChange={updateField('LeaveTypeID')}>
          {types.map((item) => (
            <option key={item.LeaveTypeID} value={item.LeaveTypeID}>
              {item.LeaveTypeName}
            </option>
          ))}
        </select>
        <span className="hint">
          {Math.max(balance.TotalDays - balance.UsedDays - (balance.ReservedDays || 0), 0)} of {balance.TotalDays} days available
          {type?.RequiresDocument ? '. Needs a supporting document.' : '.'}
        </span>
      </label>

      <div className="row2">
        <label className="f">
          Start date
          <input type="date" value={form.StartDate} onChange={updateField('StartDate')} />
        </label>
        <label className="f">
          End date
          <input type="date" value={form.EndDate} min={form.StartDate} onChange={updateField('EndDate')} />
        </label>
      </div>

      {totalDays > 0 && (
        <p className="hint">
          This request covers {totalDays} {totalDays === 1 ? 'day' : 'days'}.
        </p>
      )}

      <label className="f">
        Reason
        <textarea rows="3" value={form.Reason} onChange={updateField('Reason')} />
      </label>

      <label className="f">
        Supporting document{type?.RequiresDocument ? '' : ' (optional)'}
        <select value={form.file} onChange={updateField('file')} required={type?.RequiresDocument}>
          <option value="">No supporting document</option>
          {supportingDocuments.map((document) => (
            <option key={document.DocumentID} value={document.FileURL}>
              {document.OriginalFilename} ({document.DocumentType})
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}

      <button className="btn" type="submit">
        Submit leave request
      </button>
    </form>
  );
}

function QueueItem({ approval, request, who, type, remaining, onDecide }) {
  const [remarks, setRemarks] = useState('');

  return (
    <div className="card item">
      <div>
        <strong>{who}</strong>
        <div>
          {type} leave, {request.TotalDays} {request.TotalDays === 1 ? 'day' : 'days'} ({request.StartDate} to {request.EndDate})
        </div>
        <div className="hint">
          Reason: {request.Reason}
          {remaining === null ? '.' : `. Balance before this request: ${remaining} days.`}
        </div>
        {request.DocumentURL?.startsWith('/hr/documents/') && (
          <a href={`${API_BASE}${request.DocumentURL}`} rel="noreferrer">Download supporting document</a>
        )}
        {request.DocumentURL && <div className="hint">Attached: {request.DocumentURL}</div>}
      </div>

      <input placeholder="Remarks (optional)" value={remarks} onChange={(event) => setRemarks(event.target.value)} />

      <div className="actions">
        <button className="btn" onClick={() => onDecide(approval, 'Approved', remarks)}>
          Approve
        </button>
        <button className="btn danger" onClick={() => onDecide(approval, 'Rejected', remarks)}>
          Reject
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [db, setDb] = useState({
    departments: [],
    employees: [],
    leaveTypes: [],
    leaveBalances: [],
    leaveRequests: [],
    leaveApprovals: [],
    onboardingDocuments: [],
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [view, setView] = useState('overview');
  const [toast, setToast] = useState('');
  const [docType, setDocType] = useState('Valid ID');
  const [docFile, setDocFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/auth/me')
      .then((profile) => {
        if (active) setCurrentUser(profile);
      })
      .catch((error) => {
        if (active) {
          if (error.status === 401) {
            setLoginError('Your session expired. Please sign in again.');
          } else {
            setLoginError(`Unable to restore your session: ${error.message}`);
          }
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.MustChangePassword) return undefined;
    let active = true;
    setDataLoading(true);
    setDataError('');

    const loadData = async () => {
      try {
        const [employees, departments, leaveTypes, leaveBalances, leaveRequests, leaveApprovals, onboardingDocuments] =
          await Promise.all([
            currentUser.Role === 'HRManager' ? apiRequest('/hr/employees') : Promise.resolve([]),
            apiRequest('/hr/departments'),
            apiRequest('/hr/leave-types'),
            apiRequest('/hr/leave-balances'),
            apiRequest('/hr/leave-requests'),
            apiRequest('/hr/approvals'),
            apiRequest('/hr/documents'),
          ]);

        if (active) {
          setDb({
            employees,
            departments,
            leaveTypes,
            leaveBalances,
            leaveRequests,
            leaveApprovals,
            onboardingDocuments,
          });
        }
      } catch (error) {
        if (active) setDataError(error.message);
        if (error.status === 401) {
          setCurrentUser(null);
        }
      } finally {
        if (active) setDataLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const user = currentUser;
  const userId = currentUser?.EmployeeID;
  const isAuthenticated = Boolean(currentUser);
  const department = db.departments.find((item) => item.DepartmentID === user?.DepartmentID);
  const who = (id) => {
    const match = db.employees.find((employee) => employee.EmployeeID === id);
    if (match) return `${match.FirstName} ${match.LastName}`;
    if (user?.EmployeeID === id) return `${user.FirstName} ${user.LastName}`;
    const request = db.leaveRequests.find((item) => item.EmployeeID === id);
    return request?.EmployeeName || `Employee #${id}`;
  };
  const typeName = (id) => db.leaveTypes.find((type) => type.LeaveTypeID === id)?.LeaveTypeName || 'Unknown';

  const say = (message) => {
    setToast(message);
    window.clearTimeout(say.timeout);
    say.timeout = window.setTimeout(() => setToast(''), 2200);
  };

  const isApprover = user?.Role === 'DepartmentHead' || user?.Role === 'HRManager';

  const myBalances = useMemo(
    () => db.leaveBalances.filter((item) => item.EmployeeID === userId),
    [db.leaveBalances, userId],
  );
  const myRequests = useMemo(
    () => db.leaveRequests.filter((request) => request.EmployeeID === userId).reverse(),
    [db.leaveRequests, userId],
  );
  const myDocs = useMemo(
    () => db.onboardingDocuments.filter((doc) => doc.EmployeeID === userId),
    [db.onboardingDocuments, userId],
  );

  const queue = useMemo(
    () =>
      db.leaveApprovals.filter(
        (approval) =>
          approval.Decision === 'Pending' &&
          approval.ApproverID === userId &&
          (approval.ApprovalLevel === 1 ||
            db.leaveApprovals.some(
              (match) =>
                match.LeaveRequestID === approval.LeaveRequestID &&
                match.ApprovalLevel === 1 &&
                match.Decision === 'Approved',
            )),
      ),
    [db, userId],
  );

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [employeeForm, setEmployeeForm] = useState({
    FirstName: '',
    LastName: '',
    Email: '',
    Position: '',
    DepartmentID: 1,
    Role: 'Employee',
    InitialPassword: '',
  });

  const isAdmin = user?.Role === 'HRManager';

  const nav = [
    ['overview', 'My leave'],
    ['request', 'Request leave'],
    ['documents', 'My documents'],
    ['security', 'Password & security'],
    ...(isApprover ? [['approvals', 'Approvals']] : []),
    ...(user?.Role === 'HRManager' ? [['onboarding', 'Onboarding review']] : []),
    ...(isAdmin ? [['employees', 'Employee management']] : []),
  ];

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email.trim().toLowerCase(),
          password: loginForm.password,
        }),
      });
      setCurrentUser(result.user);
      setLoginError('');
      setView('overview');
    } catch (error) {
      setLoginError(error.message);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      say(`Could not end the server session: ${error.message}`);
    }

    setCurrentUser(null);
    setDb({
      departments: [],
      employees: [],
      leaveTypes: [],
      leaveBalances: [],
      leaveRequests: [],
      leaveApprovals: [],
      onboardingDocuments: [],
    });
    setLoginForm({ email: '', password: '' });
    setLoginError('');
    setDataError('');
    setView('overview');
  }

  async function handleEmployeeSubmit(event) {
    event.preventDefault();

    try {
      const created = await apiRequest('/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employeeForm,
          DepartmentID: Number(employeeForm.DepartmentID),
        }),
      });
      const balances = await apiRequest('/hr/leave-balances');
      setDb((current) => ({
        ...current,
        employees: [...current.employees, created],
        leaveBalances: balances,
      }));
      setEmployeeForm({
        FirstName: '',
        LastName: '',
        Email: '',
        Position: '',
        DepartmentID: 1,
        Role: 'Employee',
        InitialPassword: '',
      });
      say('Employee added successfully.');
    } catch (error) {
      say(error.message);
    }
  }

  async function handleDeleteEmployee(employeeId) {
    if (employeeId === userId) {
      say('You cannot delete the currently signed-in employee.');
      return;
    }

    try {
      await apiRequest(`/hr/employees/${employeeId}/deactivate`, { method: 'PATCH' });
      setDb((current) => ({
        ...current,
        employees: current.employees.map((employee) =>
          employee.EmployeeID === employeeId
            ? { ...employee, EmploymentStatus: 'Inactive' }
            : employee,
        ),
      }));
      say('Employee account deactivated.');
    } catch (error) {
      say(error.message);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    try {
      const result = await apiRequest('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentUser(result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      say('Password changed. Other active sessions have been signed out.');
    } catch (error) {
      setPasswordError(error.message);
    }
  }

  async function resetEmployeePassword(employee) {
    if (!window.confirm(`Reset the password for ${employee.FirstName} ${employee.LastName}?`)) return;
    setTemporaryPassword('');
    try {
      const result = await apiRequest(
        `/hr/employees/${employee.EmployeeID}/password-reset`,
        { method: 'POST' },
      );
      setTemporaryPassword(`${employee.FirstName} ${employee.LastName}: ${result.temporaryPassword}`);
      say('Temporary password created. Copy it now and share it securely.');
    } catch (error) {
      say(error.message);
    }
  }

  async function submitLeave(formData) {
    const payload = {
      LeaveTypeID: Number(formData.LeaveTypeID),
      StartDate: formData.StartDate,
      EndDate: formData.EndDate,
      Reason: formData.Reason,
      DocumentURL: formData.file.trim() || null,
    };

    try {
      const created = await apiRequest('/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const [approvals, balances] = await Promise.all([
        apiRequest('/hr/approvals'),
        apiRequest('/hr/leave-balances'),
      ]);
      setDb((current) => ({
        ...current,
        leaveRequests: [created, ...current.leaveRequests],
        leaveApprovals: approvals,
        leaveBalances: balances,
      }));
      say('Leave request submitted.');
    } catch (error) {
      say(error.message);
    }
  }

  async function decide(approval, decision, remarks) {
    try {
      await apiRequest(`/hr/approvals/${approval.ApprovalID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, remarks }),
      });
      const [approvals, requests, balances] = await Promise.all([
        apiRequest('/hr/approvals'),
        apiRequest('/hr/leave-requests'),
        apiRequest('/hr/leave-balances'),
      ]);
      setDb((current) => ({
        ...current,
        leaveApprovals: approvals,
        leaveRequests: requests,
        leaveBalances: balances,
      }));
      say(`Request ${decision.toLowerCase()} successfully.`);
    } catch (error) {
      say(error.message);
    }
  }

  async function uploadDoc(event) {
    event.preventDefault();

    if (!docFile) {
      say('Choose a PDF, JPEG, or PNG file to upload.');
      return;
    }
    if (docFile.size > 5 * 1024 * 1024) {
      say('Choose a file smaller than 5 MB.');
      return;
    }

    try {
      const payload = new FormData();
      payload.append('DocumentType', docType);
      payload.append('file', docFile);
      const form = event.currentTarget;
      const created = await apiRequest('/hr/documents', {
        method: 'POST',
        body: payload,
      });
      setDb((current) => ({
        ...current,
        onboardingDocuments: [created, ...current.onboardingDocuments],
      }));
      setDocFile(null);
      form.reset();
      say('Document uploaded.');
    } catch (error) {
      say(error.message);
    }
  }

  async function verifyDoc(doc, status) {
    try {
      const updated = await apiRequest(`/hr/documents/${doc.DocumentID}/verification`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ VerificationStatus: status }),
        });
      setDb((current) => ({
        ...current,
        onboardingDocuments: current.onboardingDocuments.map((item) =>
          item.DocumentID === doc.DocumentID ? updated : item,
        ),
      }));
      say(`Document marked as ${status}.`);
    } catch (error) {
      say(error.message);
    }
  }

  const progress = (request) =>
    db.leaveApprovals
      .filter((approval) => approval.LeaveRequestID === request.LeaveRequestID)
      .map((approval) => `${approval.ApprovalLevel === 1 ? 'Dept Head' : 'HR'}: ${approval.Decision}`)
      .join(', ');

  const passwordForm = (
    <form className="form" onSubmit={handlePasswordChange}>
      <label className="f">
        {user?.MustChangePassword ? 'Temporary password' : 'Current password'}
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </label>
      <label className="f">
        New password
        <input
          type="password"
          autoComplete="new-password"
          minLength="12"
          maxLength="128"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
      </label>
      <label className="f">
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          minLength="12"
          maxLength="128"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </label>
      <p className="hint">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>
      {passwordError && <p className="err" role="alert">{passwordError}</p>}
      <button className="btn" type="submit">Change password</button>
    </form>
  );

  if (authLoading) {
    return (
      <div className="auth-shell" role="status">
        <div className="auth-card">Restoring your session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>HR Desk</h1>
          <p className="auth-subtitle">Secure employee portal</p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="f">
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                placeholder="name@company.ph"
              />
            </label>

            <label className="f">
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="Enter password"
              />
            </label>

            {loginError && <p className="err">{loginError}</p>}

            <button className="btn" type="submit">Login</button>
          </form>

          <div className="auth-help">
            <strong>Sign in with an account provisioned in this HR database.</strong>
            <div>Fresh local installations use demo accounts whose passwords are configured in the backend environment.</div>
            <div>Existing accounts keep their current passwords.</div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.MustChangePassword) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>Set a new password</h1>
          <p className="auth-subtitle">
            Your account needs a new password before you can access HR data.
          </p>
          {passwordForm}
          <button className="btn small danger" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside>
        <div>
          <h1>HR Desk</h1>
          <p className="sub">{user?.Role === 'HRManager' ? 'Admin panel' : 'Employee services'}</p>
        </div>

        <div className="sub">
          Signed in as <strong>{user?.FirstName} {user?.LastName}</strong>
          <br />
          {user?.Role}
        </div>

        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={view === key ? 'on' : ''} onClick={() => setView(key)}>
              <span>{label}</span>
              {key === 'approvals' && <b>{queue.length}</b>}
            </button>
          ))}
        </nav>

        <button className="btn small danger" onClick={handleLogout}>Logout</button>
      </aside>

      <main>
        {dataError && <p className="err" role="alert">{dataError}</p>}
        {dataLoading && <p className="hint" role="status">Loading HR data...</p>}

        {view === 'overview' && (
          <>
            <h2>{isAdmin ? 'HR dashboard' : 'My leave overview'}</h2>
            <p className="lead">{user?.FirstName} {user?.LastName} • {department?.DepartmentName}</p>

            {isAdmin && (
              <div className="stats-row">
                <div className="card stat">
                  <div className="small-label">Employees</div>
                  <div className="big">{db.employees.length}</div>
                </div>
                <div className="card stat">
                  <div className="small-label">Pending requests</div>
                  <div className="big">{db.leaveRequests.filter((request) => request.Status === 'Pending').length}</div>
                </div>
                <div className="card stat">
                  <div className="small-label">Docs awaiting review</div>
                  <div className="big">{db.onboardingDocuments.filter((doc) => doc.VerificationStatus === 'Pending').length}</div>
                </div>
              </div>
            )}

            <div className="grid">
              {myBalances.map((balance) => {
                const total = db.leaveTypes.find((type) => type.LeaveTypeID === balance.LeaveTypeID);
                const used = balance.UsedDays + (balance.ReservedDays || 0);
                const percent = Math.min(100, (used / Math.max(balance.TotalDays, 1)) * 100);

                return (
                  <div key={balance.LeaveBalanceID} className="card">
                    <div className="small-label">{total?.LeaveTypeName}</div>
                    <div className="big">{balance.TotalDays - used}</div>
                    <div className="hint">Available days</div>
                    <div className="bar">
                      <i style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <h3>Recent leave requests</h3>
            <div className="stack">
              {myRequests.length === 0 ? (
                <div className="card hint">No leave requests yet.</div>
              ) : (
                myRequests.map((request) => (
                  <div key={request.LeaveRequestID} className="card item">
                    <div className="between">
                      <strong>{typeName(request.LeaveTypeID)}</strong>
                      <Pill status={request.Status} />
                    </div>
                    <div>
                      {request.StartDate} to {request.EndDate} • {request.TotalDays} days
                    </div>
                    <div className="hint">Reason: {request.Reason}</div>
                    <div className="hint">Approval path: {progress(request)}</div>
                    {request.DocumentURL?.startsWith('/hr/documents/') && (
                      <a href={`${API_BASE}${request.DocumentURL}`} rel="noreferrer">
                        Download supporting document
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === 'request' && (
          <>
            <h2>Request leave</h2>
            <p className="lead">Submit a leave request and track approval progress.</p>
            <RequestForm
              types={db.leaveTypes}
              balances={myBalances}
              documents={myDocs}
              onSubmit={submitLeave}
            />
          </>
        )}

        {view === 'documents' && (
          <>
            <h2>My documents</h2>
            <p className="lead">Upload a private PDF, JPEG, or PNG document for HR review (maximum 5 MB).</p>

            <form className="form" onSubmit={uploadDoc}>
              <label className="f">
                Document type
                <select value={docType} onChange={(event) => setDocType(event.target.value)}>
                  {DOC_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="f">
                File
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
                  required
                />
              </label>

              <button className="btn" type="submit" disabled={!docFile}>
                Upload document
              </button>
            </form>

            <h3>Uploaded documents</h3>
            <div className="stack">
              {myDocs.map((doc) => (
                <div key={doc.DocumentID} className="card item">
                  <div className="between">
                    <strong>{doc.DocumentType}</strong>
                    <Pill status={doc.VerificationStatus} />
                  </div>
                  {doc.FileURL?.startsWith('/hr/documents/') ? (
                    <a href={`${API_BASE}${doc.FileURL}`} rel="noreferrer">
                      Download {doc.OriginalFilename || 'document'}
                    </a>
                  ) : <div className="hint">File reference: {doc.FileURL}</div>}
                  <div className="hint">Uploaded: {doc.UploadDate}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'approvals' && isApprover && (
          <>
            <h2>Approvals queue</h2>
            <p className="lead">Review pending leave requests assigned to you.</p>

            <div className="stack">
              {queue.length === 0 ? (
                <div className="card hint">There are no requests awaiting your approval.</div>
              ) : (
                queue.map((approval) => {
                  const request = db.leaveRequests.find((item) => item.LeaveRequestID === approval.LeaveRequestID);
                  const relevantBalance = db.leaveBalances.find(
                    (balance) =>
                      balance.EmployeeID === request?.EmployeeID &&
                      balance.LeaveTypeID === request?.LeaveTypeID,
                  );

                  return request ? (
                    <QueueItem
                      key={approval.ApprovalID}
                      approval={approval}
                      request={request}
                      who={request.EmployeeName || who(request.EmployeeID)}
                      type={typeName(request.LeaveTypeID)}
                      remaining={
                        relevantBalance
                          ? relevantBalance.TotalDays -
                            relevantBalance.UsedDays -
                            (relevantBalance.ReservedDays || 0) +
                            request.TotalDays
                          : null
                      }
                      onDecide={decide}
                    />
                  ) : null;
                })
              )}
            </div>
          </>
        )}

        {view === 'onboarding' && user?.Role === 'HRManager' && (
          <>
            <h2>Onboarding review</h2>
            <p className="lead">Check uploaded employee documents and confirm verification status.</p>

            <div className="stack">
              {db.onboardingDocuments.map((doc) => (
                <div key={doc.DocumentID} className="card item">
                  <div className="between">
                    <strong>{doc.DocumentType}</strong>
                    <Pill status={doc.VerificationStatus} />
                  </div>
                  <div className="hint">Employee: {who(doc.EmployeeID)}</div>
                  {doc.FileURL?.startsWith('/hr/documents/') ? (
                    <a href={`${API_BASE}${doc.FileURL}`} rel="noreferrer">
                      Download {doc.OriginalFilename || 'document'}
                    </a>
                  ) : <div className="hint">File reference: {doc.FileURL}</div>}
                  <div className="actions">
                    <button className="btn small" onClick={() => verifyDoc(doc, 'Verified')}>
                      Verify
                    </button>
                    <button className="btn small danger" onClick={() => verifyDoc(doc, 'Rejected')}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'employees' && isAdmin && (
          <>
            <h2>Employee management</h2>
            <p className="lead">Add or remove staff members from the HR system.</p>
            {temporaryPassword && (
              <div className="card" role="status">
                <strong>One-time temporary password</strong>
                <p>{temporaryPassword}</p>
                <p className="hint">Copy this now and share it with the employee using a secure channel.</p>
                <button className="btn small" onClick={() => setTemporaryPassword('')}>Dismiss</button>
              </div>
            )}

            <form className="form employee-form" onSubmit={handleEmployeeSubmit}>
              <div className="row2">
                <label className="f">
                  First name
                  <input value={employeeForm.FirstName} onChange={(event) => setEmployeeForm({ ...employeeForm, FirstName: event.target.value })} />
                </label>
                <label className="f">
                  Last name
                  <input value={employeeForm.LastName} onChange={(event) => setEmployeeForm({ ...employeeForm, LastName: event.target.value })} />
                </label>
              </div>

              <div className="row2">
                <label className="f">
                  Email
                  <input type="email" value={employeeForm.Email} onChange={(event) => setEmployeeForm({ ...employeeForm, Email: event.target.value })} />
                </label>
                <label className="f">
                  Position
                  <input value={employeeForm.Position} onChange={(event) => setEmployeeForm({ ...employeeForm, Position: event.target.value })} />
                </label>
              </div>

              <label className="f">
                Temporary password
                <input
                  type="password"
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                  value={employeeForm.InitialPassword}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, InitialPassword: event.target.value })}
                />
              </label>

              <div className="row2">
                <label className="f">
                  Department
                  <select value={employeeForm.DepartmentID} onChange={(event) => setEmployeeForm({ ...employeeForm, DepartmentID: Number(event.target.value) })}>
                    {db.departments.map((department) => (
                      <option key={department.DepartmentID} value={department.DepartmentID}>
                        {department.DepartmentName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="f">
                  Role
                  <select value={employeeForm.Role} onChange={(event) => setEmployeeForm({ ...employeeForm, Role: event.target.value })}>
                    <option value="Employee">Employee</option>
                    <option value="DepartmentHead">Department Head</option>
                    <option value="HRManager">HR Manager</option>
                  </select>
                </label>
              </div>

              <button className="btn" type="submit">Add employee</button>
            </form>

            <h3>Current employees</h3>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.employees.map((employee) => (
                    <tr key={employee.EmployeeID}>
                      <td>{employee.FirstName} {employee.LastName}</td>
                      <td>{employee.Role}</td>
                      <td>{db.departments.find((department) => department.DepartmentID === employee.DepartmentID)?.DepartmentName}</td>
                      <td><Pill status={employee.EmploymentStatus} /></td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn small"
                            disabled={employee.EmploymentStatus === 'Inactive'}
                            onClick={() => resetEmployeePassword(employee)}
                          >
                            Reset password
                          </button>
                          <button
                            className="btn small danger"
                            disabled={employee.EmploymentStatus === 'Inactive'}
                            onClick={() => handleDeleteEmployee(employee.EmployeeID)}
                          >
                            {employee.EmploymentStatus === 'Inactive' ? 'Inactive' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'security' && (
          <>
            <h2>Password &amp; security</h2>
            <p className="lead">Change your password to keep your HR account secure.</p>
            {passwordForm}
          </>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
