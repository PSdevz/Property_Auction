import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './AdminDashboard.css';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

// ══════════ SHARED COMPONENTS ══════════
const SearchBar = ({ value, onChange, onClear, placeholder }) => (
    <div style={{ position: 'relative', width: '300px' }}>
        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#8e8ea0', pointerEvents: 'none' }}
             fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                width: '100%', height: '44px', padding: '0 36px 0 38px',
                border: '2px solid #e0e0e8', borderRadius: '10px', fontSize: '0.88rem',
                fontWeight: 500, color: '#1e1e2d', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box', backgroundColor: 'white', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#1e1e2d'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e8'}
        />
        {value && (
            <button onClick={onClear} style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: '#e0e0e8', border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: '#555', padding: 0,
            }}
                    onMouseEnter={(e) => e.target.style.background = '#c0c0cc'}
                    onMouseLeave={(e) => e.target.style.background = '#e0e0e8'}
            >✕</button>
        )}
    </div>
);

const Pagination = ({ page, totalPages, onPrev, onNext }) => (
    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button disabled={page === 0} onClick={onPrev} className="action-btn">Prev</button>
        <span style={{ alignSelf: 'center', fontWeight: 600 }}>Page {page + 1} of {totalPages}</span>
        <button disabled={page >= totalPages - 1} onClick={onNext} className="action-btn">Next</button>
    </div>
);

const SectionHeader = ({ title, subtitle, searchValue, onSearchChange, onSearchClear, searchPlaceholder }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
            <h2 className="admin-section-title" style={{ margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: '#8e8ea0', fontWeight: 500 }}>{subtitle}</p>}
        </div>
        <SearchBar value={searchValue} onChange={onSearchChange} onClear={onSearchClear} placeholder={searchPlaceholder} />
    </div>
);

const EmptyState = ({ search, onClear, message = 'No records found.' }) => (
    <tr><td colSpan="99" className="td-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 0' }}>
            <svg width="32" height="32" fill="none" stroke="#c0c0cc" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <span style={{ color: '#8e8ea0', fontWeight: 600, fontSize: '0.9rem' }}>
                {search ? `No results for "${search}"` : message}
            </span>
            {search && (
                <button onClick={onClear} style={{
                    marginTop: '4px', background: 'none', border: '1px solid #e0e0e8',
                    borderRadius: '8px', padding: '6px 16px', fontSize: '0.82rem',
                    color: '#555', cursor: 'pointer', fontWeight: 600
                }}>Clear search</button>
            )}
        </div>
    </td></tr>
);

// ══════════ HOOK: Search + Pagination ══════════
const useTableFilter = (data, filterFn, perPage = 20) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    useEffect(() => { setPage(0); }, [search]);

    const filtered = data.filter(item => filterFn(item, search.toLowerCase()));
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

    const clearSearch = () => setSearch('');

    return { search, setSearch, clearSearch, page, setPage, totalPages, filtered, paginated };
};

// ══════════ MAIN COMPONENT ══════════
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [payments, setPayments] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [revealedEmails, setRevealedEmails] = useState({});
    const [activeSupportTab, setActiveSupportTab] = useState('pending');
    // Activity — server-side search/pagination
    const [activity, setActivity] = useState([]);
    const [activityPage, setActivityPage] = useState(0);
    const [activityTotalPages, setActivityTotalPages] = useState(0);
    const [activitySearch, setActivitySearch] = useState('');

    // Client-side search + pagination for each tab
    const userTable = useTableFilter(users, (u, s) =>
        u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)
    );

    const propertyTable = useTableFilter(properties, (p, s) =>
        p.title?.toLowerCase().includes(s) ||
        p.sellerUsername?.toLowerCase().includes(s) ||
        String(p.id).includes(s)
    );
    const paymentTable = useTableFilter(payments, (p, s) =>
        p.buyerUsername?.toLowerCase().includes(s) ||
        String(p.auctionId).includes(s) ||
        p.status?.toLowerCase().includes(s)
    );
    const ticketTable = useTableFilter(tickets, (t, s) => {
        const matchesTab = activeSupportTab === 'pending' ? t.status === 'PENDING' : t.status === 'RESOLVED';
        const matchesSearch = t.senderUsername?.toLowerCase().includes(s) ||
            t.subject?.toLowerCase().includes(s) ||
            String(t.propertyId).includes(s);
        return matchesTab && matchesSearch;
    });

// Reset page to 0 when switching support tabs
    useEffect(() => {
        ticketTable.setPage(0);
    }, [activeSupportTab]);

    useEffect(() => { fetchAllData(false); }, [activityPage]);

    useEffect(() => {
        const delay = setTimeout(() => fetchAllData(true), 500);
        return () => clearTimeout(delay);
    }, [activitySearch]);


    //REFRESHING EVERY 10 SECONDS
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAllData(true);
        }, 10000);//every 10 seconds fetch data
        return () => clearInterval(interval);
    }, [activeTab, activityPage, activitySearch]);

    const fetchAllData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const [statsRes, usersRes, propsRes, paymentsRes, activityRes, ticketsRes] = await Promise.all([
                fetch('http://localhost:8080/api/admin/stats'),
                fetch('http://localhost:8080/api/admin/users'),
                fetch('http://localhost:8080/api/admin/properties'),
                fetch('http://localhost:8080/api/admin/payments'),
                //provide search bar data to controller
                fetch(`http://localhost:8080/api/admin/activity?page=${activityPage}&size=20&search=${encodeURIComponent(activitySearch)}`),//change at every letter added
                fetch('http://localhost:8080/api/admin/tickets'),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (propsRes.ok) setProperties(await propsRes.json());
            if (paymentsRes.ok) setPayments(await paymentsRes.json());
            if (activityRes.ok) {
                const data = await activityRes.json();
                setActivity(data.content || []);
                setActivityTotalPages(data.totalPages || 1);
            }
            setTickets(ticketsRes?.ok ? await ticketsRes.json() : []);
        } catch (err) {
            if (!isBackground) showMessage('Failed to load dashboard data.', 'error');
        }
        if (!isBackground) setLoading(false);
    };

    const showMessage = (text, type = 'success') => {
        setMessage(text); setMessageType(type);
        setTimeout(() => setMessage(''), 4000);
    };

    const maskEmail = (email) => {
        //If the email is missing OR it simply doesn't contain an @ symbol, don't bother trying to mask it
        if (!email?.includes('@')) return '***@***.***';
        const [local, domain] = email.split('@');
        const [dName, ...dExt] = domain.split('.');
        return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local.length > 1 ? local.slice(-1) : ''}@${dName[0]}${'*'.repeat(Math.max(dName.length - 1, 1))}.${dExt.join('.')}`;
    };

    const toggleEmailReveal = (id) => setRevealedEmails(p => ({ ...p, [id]: !p[id] }));
    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
    const formatDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

    // API Handlers
    const apiAction = async (url, method, onSuccess, confirmMsg) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        try {
            const res = await fetch(url, { method });
            const text = await res.text();
            if (res.ok) { showMessage(onSuccess || text, 'success'); fetchAllData(true); }
            else showMessage(text || 'Action failed.', 'error');
        } catch { showMessage('Network error.', 'error'); }
    };

    // NEW HANDLERS
    const handleSuspendUser = (id) => apiAction(`http://localhost:8080/api/admin/users/${id}/suspend`, 'PUT', 'User suspended successfully.');
    const handleUnsuspendUser = (id) => apiAction(`http://localhost:8080/api/admin/users/${id}/unsuspend`, 'PUT', 'User unsuspended and placed on probation.');

    const handleDeleteUser = (id, name) => apiAction(`http://localhost:8080/api/admin/users/${id}`, 'DELETE', 'User deleted', `Permanently delete "${name}"?`);
    const handleDeleteProperty = (id) => apiAction(`http://localhost:8080/api/admin/properties/${id}`, 'DELETE', 'Property deleted', 'Delete this property and its auction data?');
    const handlePropertyStatus = (id, status) => apiAction(`http://localhost:8080/api/admin/properties/${id}/status?status=${status}`, 'PUT', `Status updated to ${status}`);
    const handleResolveTicket = (ticket) => apiAction(`http://localhost:8080/api/admin/tickets/${ticket.id}/resolve`, 'PUT', 'Ticket resolved!', `Have you deactivated listing #${ticket.propertyId}? Click OK to resolve.`);

    // Chart Data
    const userChartData = [
        { name: 'Active', value: users.filter(u => !u.suspended && u.role !== 'ADMIN').length, color: '#059669' },
        { name: 'Suspended', value: users.filter(u => u.suspended).length, color: '#f59e0b' },
        { name: 'Deleted', value: stats.deletedUsers || 0, color: '#dc2626' },
        { name: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, color: '#1e1e2d' },
    ].filter(d => d.value > 0);

    const propertyChartData = [
        { name: 'Active', value: properties.filter(p => p.listingStatus === 'ACTIVE').length, color: '#059669' },
        { name: 'Sold', value: properties.filter(p => p.listingStatus === 'SOLD' || (p.listingStatus === 'ENDED' && (p.auction?.currentHighestBid || 0) >= p.reservePrice)).length, color: '#1e1e2d' },
        { name: 'Reserve Not Met', value: properties.filter(p => p.listingStatus === 'ENDED' && (p.auction?.currentHighestBid || 0) < p.reservePrice).length, color: '#dc2626' },
        { name: 'Cancelled', value: properties.filter(p => p.listingStatus === 'DEACTIVATED').length, color: '#8e8ea0' },
    ].filter(d => d.value > 0);

    if (loading) return (
        <>
            <Navbar />
            <div className="admin-dashboard">
                <div className="admin-loading"><div className="admin-spinner" /><p>Loading Admin Dashboard...</p></div>
            </div>
        </>
    );

    return (
        <div className="admin-page-wrapper">
            <Navbar />
            <div className="admin-dashboard">
                <div className="admin-header">
                    <h1>Admin Control Panel</h1>
                    <p className="admin-subtitle">Platform Management and Monitoring</p>
                    <button className="admin-refresh-btn" onClick={() => fetchAllData(false)}>Refresh Data</button>
                </div>

                {message && <div className={`admin-toast ${messageType}`}>{message}</div>}

                <div className="admin-tabs">
                    {['overview', 'users', 'properties', 'payments', 'activity', 'support'].map(tab => (
                        <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === 'support' && tickets.some(t => t.status === 'PENDING') && <span className="notification-dot">●</span>}
                        </button>
                    ))}
                </div>

                {/* ══════════ OVERVIEW ══════════ */}
                {activeTab === 'overview' && (
                    <div className="admin-overview-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
                        <h2 className="admin-section-title" style={{ marginBottom: '24px' }}>Platform Overview</h2>
                        <div className="admin-stats-grid">
                            {[
                                { label: 'Total Users', value: stats.totalUsers || 0, color: '#3b82f6' },
                                { label: 'Total Properties', value: stats.totalProperties || 0, color: '#8b5cf6' },
                                { label: 'Active Listings', value: stats.activeListings || 0, color: '#10b981' },
                                { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: '#f59e0b' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="admin-stat-card" style={{ borderTop: `4px solid ${color}` }}>
                                    <div className="stat-info"><h3>{value}</h3><p>{label}</p></div>
                                </div>
                            ))}
                        </div>
                        <div className="admin-secondary-grid">
                            {[
                                { title: 'Users Status', data: userChartData },
                                { title: 'Properties Status', data: propertyChartData },
                            ].map(({ title, data }) => (
                                <div key={title} className="admin-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ marginBottom: '10px' }}>{title}</h3>
                                    <div style={{ flex: 1, minHeight: '260px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                                    {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontWeight: 600, fontSize: '0.85rem' }} />
                                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '0.8rem', fontWeight: 600, paddingTop: '10px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════ USERS ══════════ */}
                {activeTab === 'users' && (
                    <div className="admin-section">
                        <SectionHeader
                            title="User Management"
                            subtitle={`${userTable.filtered.length} of ${users.length} users`}
                            searchValue={userTable.search}
                            onSearchChange={userTable.setSearch}
                            onSearchClear={userTable.clearSearch}
                            searchPlaceholder="Search by username or email..."
                        />
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Strikes</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {userTable.paginated.length === 0
                                    ? <EmptyState search={userTable.search} onClear={userTable.clearSearch} message="No users found." />
                                    : userTable.paginated.map(user => (
                                        <tr key={user.id} className={user.suspended ? 'row-suspended' : ''}>
                                            <td data-label="USERNAME" className="td-username">{user.username}</td>
                                            <td data-label="EMAIL">
                                                <span className="email-cell">
                                                    <span className="email-text">{revealedEmails[user.id] ? user.email : maskEmail(user.email)}</span>
                                                    <button className="email-toggle-btn" onClick={() => toggleEmailReveal(user.id)}>
                                                        {revealedEmails[user.id] ? 'Hide' : 'Show'}
                                                    </button>
                                                </span>
                                            </td>
                                            <td data-label="ROLE">
                                                <span className={`role-badge ${user.role === 'ADMIN' ? 'role-admin' : ''}`}
                                                      style={user.role !== 'ADMIN' ? { background: '#f0f0f5', color: '#1e1e2d', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' } : {}}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td data-label="STRIKES" style={{ fontWeight: 700, color: user.unpaidStrikes >= 2 ? '#dc2626' : 'inherit' }}>
                                                {user.unpaidStrikes || 0}/3
                                            </td>
                                            <td data-label="STATUS">

                                                <span className={`status-badge ${user.suspended ? 'status-suspended' : 'status-active'}`}>
                                                    {user.suspended ? 'Suspended' : 'Active'}
                                                </span>
                                            </td>
                                            <td data-label="ACTIONS" className="actions-cell">
                                                {user.role !== 'ADMIN' && (
                                                    <>
                                                        {user.suspended ? (
                                                            <button className="action-btn btn-unsuspend" onClick={() => handleUnsuspendUser(user.id)} style={{background: '#059669', color: 'white'}}>Unsuspend</button>
                                                        ) : (
                                                            <button className="action-btn" onClick={() => handleSuspendUser(user.id)}>Suspend</button>
                                                        )}
                                                        <button className="action-btn btn-delete" onClick={() => handleDeleteUser(user.id, user.username)}>Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                            {userTable.filtered.length > 20 && (
                                <Pagination page={userTable.page} totalPages={userTable.totalPages} onPrev={() => userTable.setPage(p => p - 1)} onNext={() => userTable.setPage(p => p + 1)}/>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ PROPERTIES ══════════ */}
                {activeTab === 'properties' && (
                    <div className="admin-section">
                        <SectionHeader
                            title="Property Management"
                            subtitle={`${propertyTable.filtered.length} of ${properties.length} properties`}
                            searchValue={propertyTable.search}
                            onSearchChange={propertyTable.setSearch}
                            onSearchClear={propertyTable.clearSearch}
                            searchPlaceholder="Search by title, seller or ID..."
                        />
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead><tr><th>ID</th><th>Title</th><th>Seller</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                {propertyTable.paginated.length === 0
                                    ? <EmptyState search={propertyTable.search} onClear={propertyTable.clearSearch} message="No properties found."/>
                                    : propertyTable.paginated.map(prop => (
                                        <tr key={prop.id}>
                                            <td data-label="ID"><strong>#{prop.id}</strong></td>
                                            <td data-label="TITLE" className="td-title">{prop.title}</td>
                                            <td data-label="SELLER">{prop.sellerUsername}</td>
                                            <td data-label="PRICE">{formatCurrency(prop.auction?.currentHighestBid ?? prop.reservePrice)}</td>
                                            <td data-label="STATUS">
                                                <select className="status-select" value={prop.listingStatus} onChange={(e) => handlePropertyStatus(prop.id, e.target.value)}>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="DEACTIVATED">DEACTIVATED</option>
                                                    <option value="ENDED">ENDED</option>
                                                    <option value="SOLD">SOLD</option>
                                                </select>
                                            </td>
                                            <td data-label="ACTIONS" className="actions-cell">
                                                <button className="action-btn btn-delete" onClick={() => handleDeleteProperty(prop.id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                            {propertyTable.filtered.length > 20 && (
                                <Pagination page={propertyTable.page} totalPages={propertyTable.totalPages} onPrev={() => propertyTable.setPage(p => p - 1)} onNext={() => propertyTable.setPage(p => p + 1)} />
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ PAYMENTS ══════════ */}
                {activeTab === 'payments' && (
                    <div className="admin-section">
                        <SectionHeader
                            title="Payment Ledger"
                            subtitle={`${paymentTable.filtered.length} of ${payments.length} payments`}
                            searchValue={paymentTable.search}
                            onSearchChange={paymentTable.setSearch}
                            onSearchClear={paymentTable.clearSearch}
                            searchPlaceholder="Search by buyer, auction ID or status..."
                        />
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead><tr><th>Time</th><th>Auction ID</th><th>Buyer</th><th>Total Price</th><th>Deposit Paid</th><th>Status</th><th>Stripe ID</th></tr></thead>
                                <tbody>
                                {paymentTable.paginated.length === 0
                                    ? <EmptyState search={paymentTable.search} onClear={paymentTable.clearSearch} message="No payments recorded yet." />
                                    : paymentTable.paginated.map(payment => (
                                        <tr key={payment.id}>
                                            <td data-label="TIME" className="td-time">{formatDate(payment.createdAt)}</td>
                                            <td data-label="PROP ID"><strong>#{payment.auctionId}</strong></td>
                                            <td data-label="BUYER" className="td-username">{payment.buyerUsername}</td>
                                            <td data-label="TOTAL PRICE">{formatCurrency(payment.totalPrice)}</td>
                                            <td data-label="DEPOSIT PAID" className="td-amount">{formatCurrency(payment.depositAmount)}</td>
                                            <td data-label="STATUS">
                                                <span className={`status-badge ${payment.status === 'COMPLETED' ? 'status-completed' : payment.status === 'PENDING' ? 'status-pending' : 'status-failed'}`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td data-label="STRIPE ID" className="td-stripe">{payment.stripePaymentIntentId ? payment.stripePaymentIntentId.substring(0, 16) + '...' : 'N/A'}</td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                            {paymentTable.filtered.length > 20 && (
                                <Pagination page={paymentTable.page} totalPages={paymentTable.totalPages} onPrev={() => paymentTable.setPage(p => p - 1)} onNext={() => paymentTable.setPage(p => p + 1)} />
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ ACTIVITY ══════════ */}
                {activeTab === 'activity' && (
                    <div className="admin-section">
                        <SectionHeader
                            title="Platform Activity Log"
                            subtitle="Live bid activity across all auctions"
                            searchValue={activitySearch}
                            onSearchChange={(v) => { setActivitySearch(v); setActivityPage(0); }}
                            onSearchClear={() => { setActivitySearch(''); setActivityPage(0); }}
                            searchPlaceholder="Search by username or auction ID..."
                        />
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead><tr><th>Time</th><th>Event Type</th><th>User</th><th>Target ID</th><th>Amount</th></tr></thead>
                                <tbody>
                                {activity.length === 0
                                    ? <EmptyState search={activitySearch} onClear={() => { setActivitySearch(''); setActivityPage(0); }} message="No platform activity recorded yet." />
                                    : activity.map(log => (
                                        <tr key={log.id}>
                                            {/* ADDED MISSING LABELS HERE */}
                                            <td data-label="TIME" className="td-time">{formatDate(log.timestamp)}</td>
                                            <td data-label="EVENT TYPE"><span className="role-badge role-admin">BID PLACED</span></td>
                                            <td data-label="USER" className="td-username">{log.bidderUsername}</td>
                                            <td data-label="TARGET ID">Auction #{log.auctionId}</td>
                                            <td data-label="AMOUNT" className="td-amount">{formatCurrency(log.amount)}</td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                            <Pagination page={activityPage} totalPages={activityTotalPages}
                                        onPrev={() => setActivityPage(p => p - 1)}
                                        onNext={() => setActivityPage(p => p + 1)} />
                        </div>
                    </div>
                )}


                {/* ══════════ SUPPORT ══════════ */}
                {activeTab === 'support' && (
                    <div className="admin-section">
                        {/* SUB-TABS */}
                        <div style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setActiveSupportTab('pending')}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    background: activeSupportTab === 'pending' ? '#1e1e2d' : '#f0f0f5',
                                    color: activeSupportTab === 'pending' ? 'white' : '#555',
                                    fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                                }}
                            >
                                Pending ({tickets.filter(t => t.status === 'PENDING').length})
                            </button>
                            <button
                                onClick={() => setActiveSupportTab('resolved')}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    background: activeSupportTab === 'resolved' ? '#1e1e2d' : '#f0f0f5',
                                    color: activeSupportTab === 'resolved' ? 'white' : '#555',
                                    fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                                }}
                            >
                                Resolved ({tickets.filter(t => t.status === 'RESOLVED').length})
                            </button>
                        </div>

                        <SectionHeader
                            title={`Support Tickets - ${activeSupportTab === 'pending' ? 'Pending' : 'Resolved'}`}
                            subtitle={`${ticketTable.filtered.length} tickets found`}
                            searchValue={ticketTable.search}
                            onSearchChange={ticketTable.setSearch}
                            onSearchClear={ticketTable.clearSearch}
                            searchPlaceholder="Search by sender or prop ID..."
                        />
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Prop ID</th>
                                    <th>Sender</th>
                                    <th>Subject</th>
                                    <th>Message</th>
                                    {activeSupportTab === 'pending' ? <th>Actions</th> : <th>Status</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {ticketTable.paginated.length === 0
                                    ? <EmptyState search={ticketTable.search} onClear={ticketTable.clearSearch} message={`No ${activeSupportTab} tickets found.`} />
                                    : ticketTable.paginated.map(ticket => (
                                        <tr key={ticket.id} className={activeSupportTab === 'pending' ? 'row-highlight' : ''}>
                                            <td data-label="DATE" className="td-time">{formatDate(ticket.createdAt)}</td>
                                            <td data-label="PROP ID"><span style={{ background: '#1e1e2d', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem' }}>#{ticket.propertyId}</span></td>
                                            <td data-label="SENDER" className="td-username">{ticket.senderUsername}</td>
                                            <td data-label="SUBJECT" className="td-title"><strong>{ticket.subject}</strong></td>
                                            <td data-label="MESSAGE" style={{ maxWidth: '300px', whiteSpace: 'normal' }}><span style={{ fontSize: '0.85rem', color: '#555' }}>{ticket.message}</span></td>

                                            {activeSupportTab === 'pending' ? (
                                                <td data-label="ACTIONS" className="actions-cell">
                                                    <button className="action-btn btn-unsuspend" onClick={() => handleResolveTicket(ticket)} style={{background: '#059669', color: 'white'}}>Resolve</button>
                                                </td>
                                            ) : (
                                                <td data-label="STATUS"><span className="status-badge status-completed">RESOLVED</span></td>
                                            )}
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                            {ticketTable.filtered.length > 20 && (
                                <Pagination page={ticketTable.page} totalPages={ticketTable.totalPages}
                                            onPrev={() => ticketTable.setPage(p => p - 1)}
                                            onNext={() => ticketTable.setPage(p => p + 1)} />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default AdminDashboard;