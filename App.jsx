import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  CreditCard,
  Dumbbell,
  Hotel,
  LayoutDashboard,
  LogOut,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Save,
  Sparkles,
  UserPlus,
  UserRound
} from "lucide-react";
import {
  createCorporateChallenge,
  createCorporateEmployee,
  createCorporateScreening,
  createHealthMetric,
  createBooking,
  createPaymentRecord,
  createProviderDocument,
  createProviderReview,
  createProviderAvailability,
  createPilotLead,
  createProviderApplication,
  createSupportTicket,
  createWaitlistSignup,
  fetchBookings,
  fetchGyms,
  fetchHealthMetrics,
  fetchPayments,
  fetchPilotValidation,
  fetchProviderDocuments,
  fetchProviderReviews,
  fetchProviders,
  fetchTrustRecords,
  fetchWaitlistSignups,
  isDemoMode,
  sendNotification,
  recordConsent,
  requestAccountDeletion,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateProfile,
  updateBookingStatus,
  updateProviderDocumentStatus,
  updateProviderListing,
  updatePilotKpi,
  updatePilotLead,
  updateProviderReviewStatus,
  updateProviderStatus,
  updateWaitlistStatus
} from "./supabase.js";
import { healthMetrics } from "./catalog.js";

const enableDemoAccess = import.meta.env.VITE_ENABLE_DEMO_ACCESS !== "false";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

function bookingStatusClass(status = "") {
  const normalized = status.toLowerCase();
  if (["confirmed", "completed", "paid"].includes(normalized)) return "success";
  if (["cancelled", "rejected", "failed"].includes(normalized)) return "danger";
  if (["pending", "requested"].includes(normalized)) return "warning";
  return "neutral";
}

function summarizeBookings(bookings = []) {
  const totalValue = bookings.reduce((sum, booking) => sum + (Number(booking.value) || 0), 0);
  const requested = bookings.filter((booking) => booking.status?.toLowerCase() === "requested").length;
  const confirmed = bookings.filter((booking) => booking.status?.toLowerCase() === "confirmed").length;
  const paid = bookings.filter((booking) => ["paid", "pending"].includes(booking.paymentStatus?.toLowerCase())).length;
  return { totalValue, requested, confirmed, paid };
}

function providerHighlights(provider) {
  return [
    `${provider.budget} pricing`,
    `${provider.location} sessions`,
    `${provider.goal} focus`,
    provider.status === "Verified" ? "Verified profile" : "Pending verification"
  ];
}

const views = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["marketplace", "Book", Dumbbell],
  ["gyms", "Gyms", Building2],
  ["coach", "AI Coach", Sparkles],
  ["concierge", "Concierge", Hotel],
  ["corporate", "Corporate", BriefcaseBusiness],
  ["provider", "Provider", Clock],
  ["apply", "Apply", UserPlus],
  ["waitlist", "Waitlist", UserPlus],
  ["profile", "Profile", Settings],
  ["trust", "Trust", ShieldCheck],
  ["revenue", "Revenue", CreditCard],
  ["sales", "Sell", BriefcaseBusiness],
  ["buyers", "Buyers", BriefcaseBusiness],
  ["pilot", "Pilot", ClipboardCheck],
  ["launch", "Launch", Rocket],
  ["admin", "Admin", BarChart3]
];

const roleViews = {
  client: ["dashboard", "marketplace", "gyms", "coach", "concierge", "waitlist", "profile", "trust"],
  provider: ["provider", "marketplace", "apply", "waitlist", "profile", "trust"],
  corporate: ["corporate", "dashboard", "marketplace", "gyms", "waitlist", "profile", "trust"],
  admin: views.map(([id]) => id)
};

const roleHome = {
  client: "dashboard",
  provider: "provider",
  corporate: "corporate",
  admin: "dashboard"
};

const roleLabels = {
  client: "Client",
  provider: "Provider",
  corporate: "Corporate",
  admin: "Admin"
};

const buyerTargets = [
  { company: "Gymshark", type: "Global fitness brand", fit: "Strategic brand expansion into UAE wellness marketplace", status: "Research" },
  { company: "UAE gym chain", type: "Gym operator", fit: "Can plug marketplace into existing member base", status: "Priority" },
  { company: "Wellness clinic group", type: "Clinic", fit: "Physio, nutrition, diagnostics, and recovery marketplace", status: "Priority" },
  { company: "Corporate wellness provider", type: "B2B wellness", fit: "Can sell challenges and employee health dashboards", status: "Warm" },
  { company: "Luxury concierge company", type: "Premium services", fit: "Villa, hotel, executive training and recovery", status: "Research" }
];

const revenueStreams = [
  { label: "Booking commissions", monthly: 18400, take: "15% per booking", status: "MVP-ready" },
  { label: "Provider subscriptions", monthly: 9600, take: "AED 199/provider", status: "Next build" },
  { label: "Featured listings", monthly: 7200, take: "AED 500 placement", status: "Buyer pitch" },
  { label: "Premium AI memberships", monthly: 11850, take: "AED 79/user", status: "MVP-ready" },
  { label: "Corporate wellness", monthly: 45000, take: "AED 15k/company", status: "High value" },
  { label: "Luxury concierge", monthly: 26000, take: "AED 800+ sessions", status: "Dubai edge" }
];

const conciergeServices = [
  { name: "Home training", price: 450, detail: "Verified trainer sent to apartment, home, or community gym." },
  { name: "Villa transformation", price: 1200, detail: "Private coach, recovery, nutrition check-in, and weekly report." },
  { name: "Hotel guest training", price: 550, detail: "Short-notice trainer or yoga instructor for hotel guests." },
  { name: "Executive recovery", price: 800, detail: "Massage, mobility, breathwork, and stress reset for busy leaders." }
];

const corporatePrograms = [
  { name: "12-week fat loss challenge", employees: 240, price: 48000, status: "Ready to pitch" },
  { name: "Monthly health screenings", employees: 180, price: 36000, status: "Clinic partner needed" },
  { name: "Executive stress reset", employees: 24, price: 30000, status: "Premium package" },
  { name: "Dubai Marathon challenge", employees: 120, price: 42000, status: "Seasonal campaign" }
];

const initialCorporateEmployees = [
  { id: "emp-1", companyName: "Dubai Tech Group", fullName: "Amina Saleh", department: "Sales", wellnessScore: 84, challengeStatus: "Active" },
  { id: "emp-2", companyName: "Dubai Tech Group", fullName: "Ravi Menon", department: "Operations", wellnessScore: 71, challengeStatus: "Invited" },
  { id: "emp-3", companyName: "Dubai Tech Group", fullName: "Noura Khalid", department: "Leadership", wellnessScore: 89, challengeStatus: "Active" }
];

const initialCorporateChallenges = [
  { id: "ch-1", companyName: "Dubai Tech Group", name: "30-day steps challenge", startDate: "2026-07-01", durationWeeks: 4, target: "8,000 steps/day", prize: "Team recovery day", status: "Active" }
];

const initialCorporateScreenings = [
  { id: "sc-1", companyName: "Dubai Tech Group", screeningType: "Blood pressure and BMI", date: "2026-07-08", employees: 80, status: "Requested" }
];

const salesTargets = [
  { id: "lead-1", company: "UAE gym chain", buyer: "Growth / digital partnerships", angle: "Convert members into booking marketplace users", stage: "Priority", value: "Strategic acquisition" },
  { id: "lead-2", company: "Wellness clinic group", buyer: "CEO / clinic operations", angle: "Add physio, nutrition, screening, and corporate funnel", stage: "Warm", value: "Joint venture" },
  { id: "lead-3", company: "Corporate wellness provider", buyer: "Commercial director", angle: "Own B2B challenges and employee reporting", stage: "Priority", value: "License or acquisition" },
  { id: "lead-4", company: "Gymshark", buyer: "Ventures / innovation", angle: "UAE wellness ecosystem and community commerce", stage: "Research", value: "Strategic partnership" }
];

const handoffItems = [
  "React app source code and Android Capacitor project",
  "Supabase schema, repair script, and seed files",
  "Provider marketplace, bookings, payments, corporate portal, trust center",
  "Pitch outline, demo video script, store listing draft, legal drafts",
  "Native iOS instructions pending Xcode and CocoaPods setup"
];

const initialNotifications = [
  { id: "note-1", audience: "Clients", title: "Booking requested", body: "Your trainer will confirm the session shortly.", status: "Unread" },
  { id: "note-2", audience: "Providers", title: "New booking queue", body: "Review requested sessions before end of day.", status: "Sent" },
  { id: "note-3", audience: "Admins", title: "Provider verification due", body: "Two new provider applications need approval.", status: "Unread" }
];

const initialSupportTickets = [
  { id: "ticket-1", userEmail: "client@yohealthfitness.com", category: "Booking", subject: "Need to reschedule a trainer session", status: "Open" },
  { id: "ticket-2", userEmail: "coach@yohealthfitness.com", category: "Provider", subject: "Upload certification documents", status: "Waiting" }
];

const initialProviderDocuments = [
  { id: "doc-1", providerId: "p1", providerName: "Maya Haddad", documentType: "Professional certificate", fileUrl: "https://example.com/maya-certificate.pdf", status: "Approved", notes: "CPT certificate reviewed." },
  { id: "doc-2", providerId: "p2", providerName: "Omar Nasser", documentType: "Emirates ID / business ID", fileUrl: "https://example.com/omar-id.pdf", status: "Pending", notes: "Awaiting admin review." },
  { id: "doc-3", providerId: "p3", providerName: "Lina Torres", documentType: "Insurance / waiver", fileUrl: "https://example.com/lina-insurance.pdf", status: "Pending", notes: "Check expiry date before approval." }
];

const initialProviderReviews = [
  { id: "rev-1", providerId: "p1", providerName: "Maya Haddad", clientName: "Noura A.", rating: 5, comment: "Clear plan, strong accountability, and very professional home training setup.", status: "Approved" },
  { id: "rev-2", providerId: "p2", providerName: "Omar Nasser", clientName: "Khalid R.", rating: 5, comment: "Great boxing session and realistic conditioning targets.", status: "Approved" },
  { id: "rev-3", providerId: "p3", providerName: "Lina Torres", clientName: "Priya M.", rating: 4, comment: "Pilates assessment was thoughtful and helped my mobility.", status: "Pending" }
];

const launchChecks = [
  { label: "Supabase schema and seed data", status: "Ready", detail: "Live migration covers bookings, payments, support, notifications, and trust tables." },
  { label: "Android package", status: "Ready", detail: "Capacitor project can be opened in Android Studio after sync." },
  { label: "iOS package", status: "Needs Mac setup", detail: "Requires Xcode command line tools and CocoaPods before native sync." },
  { label: "Payments", status: "Demo-ready", detail: "Hosted checkout records are modeled; connect Stripe, Tap, or Checkout.com for launch." },
  { label: "Legal and privacy", status: "Drafted", detail: "Terms, privacy, medical disclaimer, consent, and deletion flow are included." },
  { label: "Buyer package", status: "Ready", detail: "Pitch, outreach scripts, handoff checklist, and valuation model are inside the app and docs." }
];

const businessLaunchSteps = [
  { area: "Company formation", owner: "Founder", status: "Not started", next: "Choose mainland or free zone license for software marketplace and wellness booking services." },
  { area: "Banking and accounting", owner: "Founder + accountant", status: "Not started", next: "Open business bank account, register bookkeeping process, and prepare corporate tax/VAT tracking." },
  { area: "Legal review", owner: "UAE lawyer", status: "Drafts ready", next: "Review terms, privacy policy, provider agreements, client waivers, and medical disclaimer." },
  { area: "Health compliance", owner: "Compliance advisor", status: "Needs review", next: "Confirm whether nutritionists, physiotherapists, screenings, or health advice require DHA/licensed-provider workflows." },
  { area: "Payments", owner: "Developer", status: "Demo-ready", next: "Connect Stripe, Tap, Checkout.com, Ziina, or Network International test checkout before charging users." },
  { area: "Supply", owner: "Founder", status: "Pipeline", next: "Sign 10 verified trainers, 3 clinics, 3 gyms, and 2 corporate wellness pilot partners." },
  { area: "App stores", owner: "Developer", status: "Android ready", next: "Finish iOS native setup, privacy URLs, screenshots, content ratings, and review notes." }
];

const initialValidationKpis = [
  { id: "provider-talks", group: "Supply", label: "Provider conversations", target: 20, actual: 6, note: "Trainers, instructors, coaches, wellness providers" },
  { id: "provider-list", group: "Supply", label: "Providers willing to list", target: 10, actual: 3, note: "Written confirmation preferred" },
  { id: "partner-talks", group: "Partners", label: "Gym or clinic conversations", target: 5, actual: 2, note: "Gyms, studios, clinics, recovery partners" },
  { id: "partner-proof", group: "Partners", label: "Partner interest confirmations", target: 3, actual: 1, note: "Email, LOI, or pilot request" },
  { id: "client-interviews", group: "Demand", label: "Client interviews", target: 10, actual: 4, note: "Budget, pain point, booking preference" },
  { id: "waitlist", group: "Demand", label: "Waitlist signups", target: 20, actual: 8, note: "Form, message, or spreadsheet entry" },
  { id: "booking-requests", group: "Demand", label: "Manual booking requests", target: 5, actual: 1, note: "Offline bookings still count as validation" },
  { id: "corporate-calls", group: "Corporate", label: "Corporate decision-maker calls", target: 3, actual: 1, note: "HR, founder, office manager, people ops" },
  { id: "buyer-demos", group: "Buyers", label: "Strategic buyer demo requests", target: 5, actual: 1, note: "Buyer asks to see the app" }
];

const initialPilotLeads = [
  { id: "pilot-1", segment: "Provider", name: "Maya Haddad", company: "Independent PT", area: "Dubai Marina", service: "Personal training", stage: "Verification", next: "Collect certificate and available slots", interest: 5 },
  { id: "pilot-2", segment: "Gym or Studio", name: "Studio Manager", company: "Boutique Pilates Studio", area: "Jumeirah", service: "Pilates classes", stage: "Demo booked", next: "Send pilot listing proposal", interest: 4 },
  { id: "pilot-3", segment: "Clinic", name: "Operations Lead", company: "Recovery clinic group", area: "Business Bay", service: "Physio and recovery", stage: "Interested", next: "Confirm compliance requirements", interest: 4 },
  { id: "pilot-4", segment: "Corporate", name: "People Ops", company: "Dubai Tech Group", area: "DIFC", service: "30-day wellness pilot", stage: "Proposal sent", next: "Follow up on pilot scope", interest: 3 },
  { id: "pilot-5", segment: "Strategic Buyer", name: "Partnerships", company: "UAE gym chain", area: "UAE", service: "Marketplace acquisition", stage: "Research", next: "Find digital growth contact", interest: 3 }
];

const initialWaitlistSignups = [
  { id: "wl-1", fullName: "Noura A.", email: "noura@example.com", segment: "Client", city: "Dubai Marina", goal: "Weight loss", budget: "Premium", message: "Interested in a verified home trainer.", status: "New", createdAt: "2026-07-01T09:00:00Z" },
  { id: "wl-2", fullName: "HR Team", email: "hr@example.com", segment: "Corporate", city: "DIFC", goal: "Employee wellness", budget: "Corporate", message: "Would like a 30-day steps challenge proposal.", status: "Contacted", createdAt: "2026-07-02T10:30:00Z" },
  { id: "wl-3", fullName: "Studio Partner", email: "studio@example.com", segment: "Gym or Studio", city: "Jumeirah", goal: "Featured listing", budget: "Partner", message: "Open to a pilot listing.", status: "Qualified", createdAt: "2026-07-03T12:00:00Z" }
];

const mobileReleaseTracks = [
  { platform: "Android", status: "Synced", owner: "Android Studio", next: "Create signed release build and upload to Google Play internal testing.", blocker: "Developer account and signing key" },
  { platform: "iOS", status: "Blocked", owner: "Xcode", next: "Install CocoaPods, generate ios/ project, configure signing, then submit to TestFlight.", blocker: "CocoaPods and Apple Developer setup" },
  { platform: "Store assets", status: "Drafted", owner: "Founder", next: "Capture phone screenshots, publish privacy/terms URLs, and prepare support email.", blocker: "Production website URLs" },
  { platform: "Compliance", status: "Needs review", owner: "Lawyer / advisor", next: "Review health disclaimer, data safety answers, provider verification, and medical-service boundaries.", blocker: "UAE legal and health compliance review" }
];

export function App() {
  const [publicPage, setPublicPage] = useState(() => window.location.pathname === "/pitch");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ role: "All", location: "All", budget: "All" });
  const [providersList, setProvidersList] = useState([]);
  const [gymsList, setGymsList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [providerSlots, setProviderSlots] = useState([]);
  const [providerDocuments, setProviderDocuments] = useState(initialProviderDocuments);
  const [providerReviews, setProviderReviews] = useState(initialProviderReviews);
  const [corporateEmployees, setCorporateEmployees] = useState(initialCorporateEmployees);
  const [corporateChallenges, setCorporateChallenges] = useState(initialCorporateChallenges);
  const [corporateScreenings, setCorporateScreenings] = useState(initialCorporateScreenings);
  const [consentRecords, setConsentRecords] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [supportTickets, setSupportTickets] = useState(initialSupportTickets);
  const [pilotKpis, setPilotKpis] = useState(initialValidationKpis);
  const [pilotLeads, setPilotLeads] = useState(initialPilotLeads);
  const [waitlistSignups, setWaitlistSignups] = useState(initialWaitlistSignups);
  const [dashboardMetrics, setDashboardMetrics] = useState(healthMetrics);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState("");

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setAppError("");
      try {
        const [providerRows, gymRows, bookingRows, metricRows, paymentRows, trustRows, documentRows, reviewRows, pilotRows, waitlistRows] = await Promise.all([
          fetchProviders(),
          fetchGyms(),
          fetchBookings(user.role),
          fetchHealthMetrics(),
          fetchPayments(user.role),
          fetchTrustRecords(user.role),
          fetchProviderDocuments(user.role),
          fetchProviderReviews(user.role),
          fetchPilotValidation(user.role),
          fetchWaitlistSignups(user.role)
        ]);
        if (!ignore) {
          setProvidersList(providerRows);
          setGymsList(gymRows);
          setBookings(bookingRows);
          setPayments(paymentRows);
          setConsentRecords(trustRows.consents);
          setDeletionRequests(trustRows.deletionRequests);
          setProviderDocuments(documentRows.length ? documentRows : initialProviderDocuments);
          setProviderReviews(reviewRows.length ? reviewRows : initialProviderReviews);
          setPilotKpis(pilotRows.kpis.length ? pilotRows.kpis : initialValidationKpis);
          setPilotLeads(pilotRows.leads.length ? pilotRows.leads : initialPilotLeads);
          setWaitlistSignups(waitlistRows.length ? waitlistRows : initialWaitlistSignups);
          setDashboardMetrics(metricRows || healthMetrics);
        }
      } catch (err) {
        if (!ignore) setAppError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [user]);

  const userRole = normalizeRole(user?.role);
  const availableViewIds = roleViews[userRole] || roleViews.client;
  const availableViews = views.filter(([id]) => availableViewIds.includes(id));
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setView("dashboard");
  };

  useEffect(() => {
    if (!user || view === "confirmation") return;
    if (!availableViewIds.includes(view)) {
      setView(roleHome[userRole] || "dashboard");
    }
  }, [availableViewIds, user, userRole, view]);

  if (publicPage) return <PublicPitchPage onOpenApp={() => {
    window.history.pushState({}, "", "/");
    setPublicPage(false);
  }} />;

  if (!user) return <AuthScreen onLogin={setUser} demoAccess={enableDemoAccess} onOpenPitch={() => {
    window.history.pushState({}, "", "/pitch");
    setPublicPage(true);
  }} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">YO</div>
          <div>
            <strong>YO Health & Fitness</strong>
            <span>Dubai wellness OS</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {availableViews.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="user-pill">
          <UserRound size={18} />
          <span><b>{roleLabels[userRole]}</b>{user.email}</span>
          <button aria-label="Log out" onClick={async () => { await signOut(); setUser(null); }}><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{roleLabels[userRole]} workspace · {isDemoMode ? "Demo mode" : "Live Supabase mode"}</p>
            <h1>{titleFor(view)}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers, gyms, goals" />
            </label>
            <button className="secondary-btn logout-btn" onClick={handleLogout}><LogOut size={17} /> Logout</button>
          </div>
        </header>

        {appError && <div className="error-banner">{appError}</div>}
        {loading && <div className="loading-banner">Loading marketplace data...</div>}
        {view === "dashboard" && <Dashboard bookings={bookings} metrics={dashboardMetrics} setView={setView} onMetricSubmit={async (metric) => {
          const result = await createHealthMetric(metric);
          setDashboardMetrics((current) => [result.metric, ...current.filter(([label]) => label !== result.metric[0])].slice(0, 8));
        }} />}
        {view === "confirmation" && confirmedBooking && <BookingConfirmation booking={confirmedBooking} onDashboard={() => setView("dashboard")} onMarketplace={() => setView("marketplace")} onReview={async (review) => {
          const result = await createProviderReview(review);
          setProviderReviews((current) => [result.review, ...current]);
        }} onPayment={async (paymentRequest) => {
          const result = await createPaymentRecord(paymentRequest);
          setPayments((current) => [result.payment, ...current]);
          setBookings((current) => current.map((booking) => booking.id === paymentRequest.bookingId ? { ...booking, paymentStatus: result.payment.status } : booking));
          setConfirmedBooking((current) => ({ ...current, paymentStatus: result.payment.status }));
          return result.payment;
        }} />}
        {view === "marketplace" && (
          <Marketplace
            providers={providersList}
            query={query}
            filters={filters}
            setFilters={setFilters}
            onBook={setSelectedProvider}
          />
        )}
        {view === "gyms" && <Gyms gyms={gymsList} query={query} />}
        {view === "coach" && <Coach />}
        {view === "concierge" && <Concierge />}
        {view === "corporate" && <CorporateWellness
          employees={corporateEmployees}
          challenges={corporateChallenges}
          screenings={corporateScreenings}
          onEmployeeCreate={async (employee) => {
            const result = await createCorporateEmployee(employee);
            setCorporateEmployees((current) => [result.employee, ...current]);
          }}
          onChallengeCreate={async (challenge) => {
            const result = await createCorporateChallenge(challenge);
            setCorporateChallenges((current) => [result.challenge, ...current]);
          }}
          onScreeningCreate={async (screening) => {
            const result = await createCorporateScreening(screening);
            setCorporateScreenings((current) => [result.screening, ...current]);
          }}
        />}
        {view === "provider" && <ProviderPortal
          providers={providersList}
          bookings={bookings}
          payments={payments}
          slots={providerSlots}
          documents={providerDocuments}
          onStatusChange={async (id, status) => {
            const updated = await updateBookingStatus(id, status);
            setBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
          }}
          onProviderSave={async (provider) => {
            const result = await updateProviderListing(provider);
            setProvidersList((current) => current.map((item) => item.id === provider.id ? result.provider : item));
          }}
          onSlotCreate={async (slot) => {
            const result = await createProviderAvailability(slot);
            setProviderSlots((current) => [result.slot, ...current]);
          }}
          onDocumentCreate={async (document) => {
            const result = await createProviderDocument(document);
            setProviderDocuments((current) => [result.document, ...current]);
          }}
        />}
        {view === "apply" && <ProviderApplication onSubmit={async (provider) => {
          const created = await createProviderApplication(provider);
          setProvidersList((current) => [created, ...current]);
          setView("admin");
        }} />}
        {view === "waitlist" && <WaitlistCenter
          user={user}
          entries={waitlistSignups}
          onCreate={async (signup) => {
            const result = await createWaitlistSignup({ ...signup, userEmail: user.email });
            setWaitlistSignups((current) => [result.signup, ...current]);
          }}
          onStatusChange={async (id, status) => {
            setWaitlistSignups((current) => current.map((signup) => signup.id === id ? { ...signup, status } : signup));
            await updateWaitlistStatus(id, status);
          }}
        />}
        {view === "profile" && <ProfileSettings user={user} onLogout={handleLogout} onSave={async (profile) => {
          const result = await updateProfile(profile);
          setUser((current) => ({
            ...current,
            email: result.profile.email || current.email,
            role: result.profile.role || current.role,
            profile: result.profile
          }));
        }} />}
        {view === "trust" && <TrustCenter
          user={user}
          consentRecords={consentRecords}
          deletionRequests={deletionRequests}
          onConsent={async (consent) => {
            const result = await recordConsent({ ...consent, userEmail: user.email });
            setConsentRecords((current) => [result.consent, ...current]);
          }}
          onDeletionRequest={async (request) => {
            const result = await requestAccountDeletion({ ...request, userEmail: user.email });
            setDeletionRequests((current) => [result.request, ...current]);
          }}
        />}
        {view === "revenue" && <RevenueModel bookings={bookings} payments={payments} />}
        {view === "sales" && <SalesPackage providers={providersList} bookings={bookings} payments={payments} />}
        {view === "buyers" && <BuyerPipeline />}
        {view === "pilot" && <PilotValidationDashboard
          kpis={pilotKpis}
          leads={pilotLeads}
          onKpiUpdate={async (id, actual) => {
            setPilotKpis((current) => current.map((item) => item.id === id ? { ...item, actual } : item));
            await updatePilotKpi(id, actual);
          }}
          onLeadUpdate={async (id, field, value) => {
            setPilotLeads((current) => current.map((lead) => lead.id === id ? { ...lead, [field]: field === "interest" ? Number(value) : value } : lead));
            await updatePilotLead(id, { [field]: field === "interest" ? Number(value) : value });
          }}
          onLeadCreate={async (lead) => {
            const result = await createPilotLead(lead);
            setPilotLeads((current) => [result.lead, ...current]);
          }}
        />}
        {view === "launch" && <LaunchCenter
          notifications={notifications}
          supportTickets={supportTickets}
          onNotify={async (notification) => {
            const result = await sendNotification(notification);
            setNotifications((current) => [result.notification, ...current]);
          }}
          onSupport={async (ticket) => {
            const result = await createSupportTicket({ ...ticket, userEmail: user.email });
            setSupportTickets((current) => [result.ticket, ...current]);
          }}
        />}
        {view === "admin" && <Admin bookings={bookings} payments={payments} providers={providersList} documents={providerDocuments} reviews={providerReviews} onStatusChange={async (id, status) => {
          const updated = await updateBookingStatus(id, status);
          setBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
        }} onProviderStatusChange={async (id, status) => {
          const updated = await updateProviderStatus(id, status);
          setProvidersList((current) => current.map((provider) => provider.id === id ? updated : provider));
        }} onDocumentStatusChange={async (id, status) => {
          const result = await updateProviderDocumentStatus(id, status);
          setProviderDocuments((current) => current.map((document) => document.id === id ? { ...document, ...result.document } : document));
        }} onReviewStatusChange={async (id, status) => {
          const result = await updateProviderReviewStatus(id, status);
          setProviderReviews((current) => current.map((review) => review.id === id ? { ...review, ...result.review } : review));
        }} />}
      </main>

      {selectedProvider && (
        <ProviderDetail
          provider={selectedProvider}
          reviews={providerReviews.filter((review) => review.providerId === selectedProvider.id || review.providerName === selectedProvider.name)}
          onClose={() => setSelectedProvider(null)}
          onCreate={async (booking) => {
            const result = await createBooking(booking);
            const createdBooking = result.booking || result;
            setBookings((current) => [createdBooking, ...current]);
            setConfirmedBooking(createdBooking);
            setSelectedProvider(null);
            setView("confirmation");
          }}
        />
      )}
    </div>
  );
}

function PublicPitchPage({ onOpenApp }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    segment: "Strategic Buyer",
    city: "Dubai",
    goal: "Partnership",
    budget: "Partner",
    message: ""
  });
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const proofPoints = [
    ["Marketplace", "Book trainers, yoga, Pilates, sports coaches, nutrition, recovery, massage, and wellness services."],
    ["Health OS", "Track body metrics, health signals, fitness progression, AI guidance, and wellness profile data."],
    ["B2B Engine", "Corporate wellness, employee challenges, screenings, concierge training, and partner reporting."],
    ["Sellable MVP", "React app, Supabase backend, Android packaging, legal drafts, store docs, and buyer materials."]
  ];

  async function submit(event) {
    event.preventDefault();
    setSaved("");
    setError("");
    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address, for example name@example.com.");
      return;
    }
    try {
      await createWaitlistSignup(form);
      setSaved("Saved. We will follow up with demo access and pilot details.");
      setForm((current) => ({ ...current, message: "" }));
    } catch (err) {
      setError(err.message || "Could not save interest.");
    }
  }

  return (
    <main className="pitch-page">
      <header className="pitch-nav">
        <div className="brand">
          <div className="brand-mark">YO</div>
          <div>
            <strong>YO Health & Fitness</strong>
            <span>UAE wellness marketplace</span>
          </div>
        </div>
        <button className="secondary-btn" onClick={onOpenApp}>Open app</button>
      </header>

      <section className="pitch-hero">
        <div>
          <p className="eyebrow">Dubai-ready health and fitness platform</p>
          <h1>One app for bookings, health dashboards, wellness services, gyms, AI coaching, and corporate wellness.</h1>
          <p>YO Health & Fitness gives a gym chain, clinic group, wellness operator, corporate wellness company, or fitness brand a working marketplace foundation instead of a blank page.</p>
          <div className="button-row">
            <a className="primary-btn" href="#early-access">Request demo</a>
            <button className="secondary-btn" onClick={onOpenApp}>View product</button>
          </div>
        </div>
        <div className="pitch-phone">
          <div><span>Bookings</span><strong>24</strong></div>
          <div><span>GMV demo</span><strong>AED 18.4k</strong></div>
          <div><span>Launch tracks</span><strong>Mobile + Supabase</strong></div>
        </div>
      </section>

      <section className="pitch-band">
        <div>
          <span>Designed for</span>
          <strong>Dubai gyms</strong>
        </div>
        <div>
          <span>Also fits</span>
          <strong>Clinics and recovery</strong>
        </div>
        <div>
          <span>B2B upside</span>
          <strong>Corporate wellness</strong>
        </div>
        <div>
          <span>Premium edge</span>
          <strong>Concierge training</strong>
        </div>
      </section>

      <section className="pitch-section">
        <div>
          <p className="eyebrow">Product modules</p>
          <h2>Built as an operating system, not a single-feature tracker.</h2>
        </div>
        <div className="pitch-grid">
          {proofPoints.map(([title, copy]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pitch-section two-col">
        <Panel title="Revenue routes" eyebrow="Business model">
          <div className="signal-list">
            <div><span>Booking commissions</span><strong>Trainer and wellness sessions</strong></div>
            <div><span>Partner listings</span><strong>Gyms, studios, clinics, and featured placement</strong></div>
            <div><span>Corporate wellness</span><strong>Challenges, screenings, reporting, and providers</strong></div>
            <div><span>Premium services</span><strong>Hotel, villa, executive, and concierge fitness</strong></div>
          </div>
        </Panel>
        <Panel title="Buyer handoff" eyebrow="What is included">
          <div className="checklist">
            {handoffItems.map((item) => <label key={item}><input type="checkbox" defaultChecked readOnly /> {item}</label>)}
          </div>
        </Panel>
      </section>

      <section id="early-access" className="pitch-section two-col">
        <div>
          <p className="eyebrow">Early access</p>
          <h2>Request demo access, partnership discussion, or pilot details.</h2>
          <p className="pitch-muted">Use this page for gyms, clinics, investors, wellness companies, corporate HR teams, and strategic buyers. Each submission is stored in the app waitlist pipeline.</p>
        </div>
        <form className="pitch-form" onSubmit={submit}>
          <label>Full name or company
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          <label>Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>Interest type
            <select value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })}>
              <option>Strategic Buyer</option>
              <option>Corporate</option>
              <option>Gym or Studio</option>
              <option>Clinic</option>
              <option>Provider</option>
              <option>Client</option>
            </select>
          </label>
          <label>Message
            <textarea rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us what you want to explore." />
          </label>
          {error && <p className="error">{error}</p>}
          {saved && <p className="success-note">{saved}</p>}
          <button className="primary-action">Submit interest</button>
        </form>
      </section>
    </main>
  );
}

function AuthScreen({ onLogin, demoAccess, onOpenPitch }) {
  const [email, setEmail] = useState("demo@yohealthfitness.com");
  const [password, setPassword] = useState("demo12345");
  const [mode, setMode] = useState("client");
  const [authAction, setAuthAction] = useState("login");
  const [fullName, setFullName] = useState("Demo Client");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const activeEmail = email.trim();
      const result = authAction === "signup"
        ? await signUpWithEmail({ email: activeEmail, password, fullName, role: mode })
        : await signInWithEmail(activeEmail, password);
      onLogin({
        id: result.user?.id,
        email: result.user?.email || activeEmail,
        role: result.profile?.role || result.user?.role || mode,
        defaultView: roleHome[mode] || "dashboard",
        profile: result.profile
      });
    } catch (err) {
      const message = err.message || "Authentication failed";
      const friendlyMessage = message.toLowerCase().includes("invalid login")
        ? "Login failed. Check your email/password, or use Sign up first if this account does not exist yet."
        : message;
      setError(friendlyMessage);
    }
  }

  function preview() {
    onLogin({ email: `preview-${mode}@yohealthfitness.com`, role: mode, defaultView: roleHome[mode] || "dashboard", preview: true });
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">UAE wellness marketplace</p>
        <h1>YO Health & Fitness</h1>
        <p>Book experts, track wellness, manage providers, and pitch a full health marketplace from one app.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="segmented role-segmented">
          <button type="button" className={mode === "client" ? "selected" : ""} onClick={() => setMode("client")}>Client</button>
          <button type="button" className={mode === "provider" ? "selected" : ""} onClick={() => setMode("provider")}>Provider</button>
          <button type="button" className={mode === "corporate" ? "selected" : ""} onClick={() => setMode("corporate")}>Corporate</button>
          {demoAccess && <button type="button" className={mode === "admin" ? "selected" : ""} onClick={() => setMode("admin")}>Admin</button>}
        </div>
        <div className="segmented">
          <button type="button" className={authAction === "login" ? "selected" : ""} onClick={() => setAuthAction("login")}>Log in</button>
          <button type="button" className={authAction === "signup" ? "selected" : ""} onClick={() => setAuthAction("signup")}>Sign up</button>
        </div>
        {authAction === "signup" && <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary-btn">{authAction === "signup" ? "Create account" : "Log in"}</button>
        {demoAccess && <button type="button" className="secondary-btn" onClick={preview}>Preview without login</button>}
        <button type="button" className="secondary-btn" onClick={onOpenPitch}>Open pitch page</button>
        <small>{demoAccess ? "Demo access is enabled. Pick a role to preview the matching workspace." : "Production access is enabled. Sign in with a real account."}</small>
      </form>
    </main>
  );
}

function Dashboard({ bookings, metrics, setView, onMetricSubmit }) {
  const bookingStats = summarizeBookings(bookings);
  return (
    <section className="stack">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Current goal</p>
          <h2>Lose 8 kg while protecting muscle mass</h2>
          <p>AI lowered high-intensity cardio this week because sleep and stress signals need recovery.</p>
          <div className="button-row">
            <button className="primary-btn" onClick={() => setView("coach")}>Review AI plan</button>
            <button className="secondary-btn" onClick={() => setView("marketplace")}>Book a session</button>
          </div>
        </div>
        <div className="progress-ring"><strong>64%</strong><span>goal progress</span></div>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value, note]) => <Metric key={label} label={label} value={value} note={note} />)}
      </div>
      <div className="booking-overview">
        <Metric label="Upcoming" value={bookings.length} note="Visible bookings" />
        <Metric label="Requested" value={bookingStats.requested} note="Needs confirmation" />
        <Metric label="Confirmed" value={bookingStats.confirmed} note="Ready to attend" />
        <Metric label="Booking GMV" value={`AED ${bookingStats.totalValue}`} note="Session value" />
      </div>
      <div className="two-col">
        <Panel title="Upcoming bookings" eyebrow="Bookings">
          <div className="list">
            {bookings.length ? bookings.map((booking) => (
              <div className="row" key={booking.id}>
                <CalendarCheck size={18} />
                <div><strong>{booking.provider}</strong><span>{booking.service} · {booking.time}</span></div>
                <div className="booking-tags">
                  <span className={`status-pill ${bookingStatusClass(booking.status)}`}>{booking.status}</span>
                  <span className={`status-pill ${bookingStatusClass(booking.paymentStatus || "unpaid")}`}>{booking.paymentStatus || "Unpaid"}</span>
                </div>
              </div>
            )) : <p>No upcoming bookings yet. Use Book a session to create the first request.</p>}
          </div>
          <button className="secondary-btn wide" onClick={() => setView("marketplace")}>Find another provider</button>
        </Panel>
        <Panel title="Health signals" eyebrow="Today">
          <div className="signal-list">
            <div><span>Blood pressure</span><strong>118/76</strong></div>
            <div><span>Blood sugar</span><strong>94 mg/dL</strong></div>
            <div><span>Stress</span><strong>Medium</strong></div>
            <div><span>Calories burned</span><strong>2,340</strong></div>
          </div>
        </Panel>
      </div>
      <HealthMetricLogger onSubmit={onMetricSubmit} />
    </section>
  );
}

function HealthMetricLogger({ onSubmit }) {
  const metricOptions = [
    ["weight", "Weight", "kg"],
    ["bmi", "BMI", "score"],
    ["body_fat", "Body fat", "%"],
    ["lean_muscle_mass", "Lean muscle mass", "kg"],
    ["visceral_fat", "Visceral fat", "score"],
    ["body_water", "Body water", "%"],
    ["resting_heart_rate", "Resting heart rate", "bpm"],
    ["blood_pressure", "Blood pressure systolic", "mmHg"],
    ["blood_sugar", "Blood sugar", "mg/dL"],
    ["sleep_quality", "Sleep quality", "/100"],
    ["stress_level", "Stress level", "/100"],
    ["vo2_max", "VO2 Max", "score"]
  ];
  const [form, setForm] = useState({ metricKey: "weight", metricValue: "84.2", metricUnit: "kg" });
  const [saved, setSaved] = useState("");

  const activeMetric = metricOptions.find(([key]) => key === form.metricKey) || metricOptions[0];

  function updateMetric(metricKey) {
    const metric = metricOptions.find(([key]) => key === metricKey) || metricOptions[0];
    setForm((current) => ({ ...current, metricKey, metricUnit: metric[2] }));
  }

  return (
    <Panel title="Log health metric" eyebrow="Client data">
      <form className="metric-form" onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(form);
        setSaved(`${activeMetric[1]} saved`);
      }}>
        <label>Metric
          <select value={form.metricKey} onChange={(event) => updateMetric(event.target.value)}>
            {metricOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>Value
          <input type="number" step="0.1" value={form.metricValue} onChange={(event) => setForm({ ...form, metricValue: event.target.value })} />
        </label>
        <label>Unit
          <input value={form.metricUnit} onChange={(event) => setForm({ ...form, metricUnit: event.target.value })} />
        </label>
        <button className="primary-btn"><Save size={17} /> Save metric</button>
      </form>
      {saved && <p className="success-note">{saved}. The dashboard now updates from user-entered health data.</p>}
    </Panel>
  );
}

function Marketplace({ providers, query, filters, setFilters, onBook }) {
  const roles = ["All", ...new Set(providers.map((provider) => provider.role))];
  const locations = ["All", ...new Set(providers.map((provider) => provider.location))];
  const budgets = ["All", ...new Set(providers.map((provider) => provider.budget))];
  const searchTerm = query.trim().toLowerCase();
  const filtered = useMemo(() => providers.filter((provider) => {
    const text = `${provider.name} ${provider.role} ${provider.goal} ${provider.location} ${provider.budget} ${provider.price} ${provider.tags.join(" ")}`.toLowerCase();
    return (!searchTerm || text.includes(searchTerm))
      && (filters.role === "All" || provider.role === filters.role)
      && (filters.location === "All" || provider.location === filters.location)
      && (filters.budget === "All" || provider.budget === filters.budget);
  }), [providers, searchTerm, filters]);

  return (
    <section className="stack">
      <div className="filter-bar">
        <Select value={filters.role} options={roles} onChange={(role) => setFilters({ ...filters, role })} />
        <Select value={filters.location} options={locations} onChange={(location) => setFilters({ ...filters, location })} />
        <Select value={filters.budget} options={budgets} onChange={(budget) => setFilters({ ...filters, budget })} />
      </div>
      <div className="result-summary">
        <strong>{filtered.length}</strong>
        <span>{filtered.length === 1 ? "provider found" : "providers found"}{searchTerm ? ` for "${query.trim()}"` : ""}</span>
      </div>
      <div className="provider-grid">
        {filtered.map((provider) => (
          <article className="provider-card" key={provider.id}>
            <img src={provider.image} alt={provider.name} />
            <div>
              <span className="status"><ShieldCheck size={14} /> {provider.status}</span>
              <h3>{provider.name}</h3>
              <p>{provider.role} · {provider.goal} · ★ {provider.rating}</p>
              <div className="tag-row">{provider.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <footer><strong>AED {provider.price}</strong><button className="primary-btn" onClick={() => onBook(provider)}>View profile</button></footer>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <strong>No matching providers yet</strong>
          <span>Try a broader search like trainer, yoga, Dubai, online, premium, weight loss, or recovery.</span>
        </div>
      )}
    </section>
  );
}

function ProviderDetail({ provider, reviews = [], onClose, onCreate }) {
  const availability = getAvailability(provider);
  const [slot, setSlot] = useState(availability[0].label);
  const [service, setService] = useState(provider.role);
  const [locationType, setLocationType] = useState(provider.location);
  const [bookingTime, setBookingTime] = useState(availability[0].value);
  const [notes, setNotes] = useState("I want to start with an assessment and a realistic plan.");
  const services = [
    provider.role,
    `${provider.goal} assessment`,
    "Transformation session",
    "Monthly coaching call"
  ];
  const approvedReviews = reviews.filter((review) => review.status === "Approved");
  const commission = Math.round(provider.price * 0.15);
  const payout = provider.price - commission;
  const highlights = providerHighlights(provider);
  return (
    <aside className="drawer provider-detail">
      <button className="close-btn" onClick={onClose}>×</button>
      <div className="provider-hero-card">
        <img className="detail-image" src={provider.image} alt={provider.name} />
        <div className="provider-hero-overlay">
          <span className={`status-pill ${bookingStatusClass(provider.status)}`}>{provider.status}</span>
          <h2>{provider.name}</h2>
          <p>{provider.role} · {provider.goal} · ★ {provider.rating}</p>
        </div>
      </div>
      <div className="provider-summary">
        <p>{provider.goal} specialist available for {provider.location.toLowerCase()} sessions. Ideal for clients who want structured progress, verified accountability, and a clear plan before paying.</p>
        <div className="tag-row">{provider.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
      <div className="detail-stats">
        <Metric label="Session" value={`AED ${provider.price}`} note={provider.budget} />
        <Metric label="Platform fee" value={`AED ${commission}`} note="15% commission" />
        <Metric label="Provider payout" value={`AED ${payout}`} note="Estimated after fee" />
        <Metric label="Rating" value={provider.rating} note="Marketplace trust" />
      </div>
      <div className="highlight-grid">
        {highlights.map((item) => <div key={item}><ShieldCheck size={16} /><span>{item}</span></div>)}
      </div>
      <div className="review-strip">
        {approvedReviews.length ? approvedReviews.slice(0, 2).map((review) => (
          <div key={review.id}>
            <strong>{review.clientName} · {"★".repeat(review.rating)}</strong>
            <p>{review.comment}</p>
          </div>
        )) : <div><strong>No reviews yet</strong><p>Book this provider and leave the first moderated review.</p></div>}
      </div>
      <label className="drawer-label">Service
        <select value={service} onChange={(event) => setService(event.target.value)}>
          {services.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="drawer-label">Location
        <select value={locationType} onChange={(event) => setLocationType(event.target.value)}>
          {["Home visit", "Gym based", "Online", "Hotel", "Villa"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <p className="eyebrow">Available slots</p>
      <div className="slot-grid">
        {availability.map((item) => <button key={item.value} className={slot === item.label ? "selected" : ""} onClick={() => { setSlot(item.label); setBookingTime(item.value); }}>{item.label}</button>)}
      </div>
      <label className="drawer-label">Exact date and time
        <input type="datetime-local" value={bookingTime} onChange={(event) => setBookingTime(event.target.value)} />
      </label>
      <label className="drawer-label">Client notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="checkout-note">
        <strong>Booking request first, payment second</strong>
        <span>The provider can confirm the session before checkout is prepared. This keeps the marketplace workflow clear for clients and operators.</span>
      </div>
      <button className="primary-btn full" onClick={() => onCreate({
        client: "Demo client",
        provider: provider.name,
        providerId: provider.id,
        service,
        time: bookingTime ? new Intl.DateTimeFormat("en-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(bookingTime)) : slot,
        bookingTime: bookingTime ? new Date(bookingTime).toISOString() : null,
        locationType,
        notes,
        value: provider.price,
        status: "Requested"
      })}>Request booking · AED {provider.price}</button>
    </aside>
  );
}

function BookingConfirmation({ booking, onDashboard, onMarketplace, onPayment, onReview }) {
  const commission = Math.round((booking.value || 0) * 0.15);
  const providerPayout = (booking.value || 0) - commission;
  return (
    <section className="stack">
      <div className="confirmation-panel">
        <div className="confirmation-header">
          <div>
            <p className="eyebrow">Booking requested</p>
            <h2>{booking.provider}</h2>
            <p>{booking.service} · {booking.time}</p>
          </div>
          <span className={`status-pill ${bookingStatusClass(booking.status)}`}>{booking.status}</span>
        </div>
        <div className="confirmation-grid">
          <Metric label="Client pays" value={`AED ${booking.value || 0}`} note="Booking value" />
          <Metric label="Platform earns" value={`AED ${commission}`} note="15% commission" />
          <Metric label="Provider payout" value={`AED ${providerPayout}`} note="After platform fee" />
          <Metric label="Payment" value={booking.paymentStatus || "Unpaid"} note="Checkout next" />
        </div>
        <div className="next-step-card">
          <strong>Next step</strong>
          <span>Confirm the booking in Admin, then create a hosted checkout record. This proves the marketplace can handle booking request, operator approval, payment preparation, and revenue tracking.</span>
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={onDashboard}>View dashboard</button>
          <button className="secondary-btn" onClick={onMarketplace}>Book another expert</button>
        </div>
      </div>
      <CheckoutPanel booking={booking} onPayment={onPayment} />
      <ReviewCapture booking={booking} onReview={onReview} />
      <Panel title="What this proves to a buyer" eyebrow="Marketplace flow">
        <p>The app now demonstrates a complete buyer journey: browse provider, inspect profile, select service, request a booking, prepare checkout, and calculate platform revenue.</p>
      </Panel>
    </section>
  );
}

function ReviewCapture({ booking, onReview }) {
  const [form, setForm] = useState({ rating: 5, comment: "Great first session. Clear plan and professional communication." });
  const [saved, setSaved] = useState("");

  async function submit(event) {
    event.preventDefault();
    await onReview({
      providerId: booking.providerId,
      providerName: booking.provider,
      bookingId: booking.id,
      clientName: booking.client || "Demo client",
      rating: Number(form.rating),
      comment: form.comment
    });
    setSaved("Review submitted for moderation");
  }

  return (
    <Panel title="Leave a moderated review" eyebrow="Marketplace trust">
      <form className="review-form" onSubmit={submit}>
        <label>Rating
          <select value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })}>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </label>
        <label>Review
          <textarea rows="3" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
        </label>
        <button className="primary-btn">Submit review</button>
      </form>
      {saved && <p className="success-note">{saved}. Admins can approve it before it appears on public provider profiles.</p>}
    </Panel>
  );
}

function CheckoutPanel({ booking, onPayment }) {
  const [paymentType, setPaymentType] = useState("deposit");
  const [method, setMethod] = useState("Stripe Checkout");
  const [environment, setEnvironment] = useState("Test mode");
  const [payment, setPayment] = useState(null);
  const amount = paymentType === "deposit" ? Math.max(50, Math.round((booking.value || 0) * 0.25)) : booking.value || 0;
  const commission = Math.round(amount * 0.15);
  const providerPayout = amount - commission;

  return (
    <Panel title="Checkout preparation" eyebrow="Payments">
      <div className="checkout-grid">
        <label>Payment type
          <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
            <option value="deposit">25% deposit</option>
            <option value="full">Full session payment</option>
          </select>
        </label>
        <label>Provider
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option>Stripe Checkout</option>
            <option>Tap Payments</option>
            <option>Checkout.com</option>
            <option>Ziina payment link</option>
          </select>
        </label>
        <label>Environment
          <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
            <option>Test mode</option>
            <option>Live mode pending</option>
          </select>
        </label>
        <Metric label="Charge now" value={`AED ${amount}`} note={paymentType === "deposit" ? "Deposit" : "Full payment"} />
        <Metric label="Platform fee" value={`AED ${commission}`} note="15% on collected amount" />
        <Metric label="Provider payout" value={`AED ${providerPayout}`} note="After platform fee" />
      </div>
      <div className="checkout-note">
        <strong>Hosted checkout only</strong>
        <span>{method} · AED currency · {environment}. No raw card data is stored in YO Health & Fitness.</span>
      </div>
      <button className="primary-btn" onClick={async () => {
        const result = await onPayment({
          bookingId: booking.id,
          provider: booking.provider,
          client: booking.client,
          amount,
          method,
          environment,
          status: "Pending",
          commissionRate: 0.15
        });
        setPayment(result);
      }}>Create hosted checkout record</button>
      {payment && (
        <div className="payment-receipt">
          <strong>{payment.reference}</strong>
          <span>{payment.method} · {payment.status} · AED {payment.amount}</span>
          {payment.externalPaymentId && <small>External payment ID: {payment.externalPaymentId}</small>}
          {payment.checkoutUrl && <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">Open hosted checkout link</a>}
          <small>Production step: replace the demo URL with a real hosted checkout URL returned by the selected payment provider.</small>
        </div>
      )}
    </Panel>
  );
}

function Gyms({ gyms, query }) {
  const searchTerm = query.trim().toLowerCase();
  const filtered = gyms.filter((gym) => `${gym.name} ${gym.area} ${gym.description} ${gym.price} ${gym.facilities.join(" ")}`.toLowerCase().includes(searchTerm));
  return (
    <section className="gym-layout">
      <div className="gym-image">
        <img src="https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=1400&q=80" alt="Modern gym" />
      </div>
      <div className="stack">
        <div className="result-summary">
          <strong>{filtered.length}</strong>
          <span>{filtered.length === 1 ? "gym found" : "gyms found"}{searchTerm ? ` for "${query.trim()}"` : ""}</span>
        </div>
        {filtered.map((gym) => (
          <Panel key={gym.id} title={gym.name} eyebrow={`${gym.area} · ★ ${gym.rating}`}>
            <p>{gym.description}</p>
            <strong>{gym.price}</strong>
            <div className="tag-row">{gym.facilities.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </Panel>
        ))}
        {!filtered.length && (
          <div className="empty-state">
            <strong>No matching gyms yet</strong>
            <span>Try searching by area, facility, class, or pricing.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Coach() {
  const [pace, setPace] = useState(3);
  const [intensity, setIntensity] = useState(4);
  const calories = 2350 - pace * 90;
  return (
    <section className="two-col">
      <Panel title="Weekly AI adjustment" eyebrow="AI transformation engine">
        <p>Your activity is strong, but recovery is under target. This week reduces high-intensity cardio and raises protein.</p>
        <div className="adjustments">
          <Metric label="Calories" value={`${calories}/day`} note="Protein target 170g" />
          <Metric label="Training" value={`${intensity + 1} sessions`} note="Strength, zone 2, Pilates" />
          <Metric label="Cardio" value="-18%" note="Lowered after sleep dip" />
          <Metric label="Recovery" value="+1 day" note="Mobility and massage window" />
        </div>
      </Panel>
      <Panel title="Coach settings" eyebrow="Plan controls">
        <label className="range-row">Fat loss pace<input type="range" min="1" max="5" value={pace} onChange={(event) => setPace(Number(event.target.value))} /></label>
        <label className="range-row">Training intensity<input type="range" min="1" max="5" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} /></label>
        <div className="coach-note">Recommended plan: {intensity + 1} training sessions, {calories} calories/day, one protected recovery day.</div>
      </Panel>
    </section>
  );
}

function Concierge() {
  const [selected, setSelected] = useState(conciergeServices[0]);
  return (
    <section className="stack">
      <div className="hero-strip concierge-hero">
        <div>
          <p className="eyebrow">Premium Dubai service</p>
          <h2>Luxury wellness concierge</h2>
          <p>Private home, villa, hotel, and executive wellness requests for high-value clients.</p>
        </div>
        <div className="progress-ring"><strong>AED</strong><span>premium service</span></div>
      </div>
      <div className="service-grid">
        {conciergeServices.map((service) => (
          <button className={selected.name === service.name ? "service-card selected" : "service-card"} key={service.name} onClick={() => setSelected(service)}>
            <strong>{service.name}</strong>
            <span>AED {service.price}+</span>
            <small>{service.detail}</small>
          </button>
        ))}
      </div>
      <div className="two-col">
        <Panel title="Concierge request" eyebrow="Booking ops">
          <div className="signal-list">
            <div><span>Selected service</span><strong>{selected.name}</strong></div>
            <div><span>Starting price</span><strong>AED {selected.price}</strong></div>
            <div><span>Recommended commission</span><strong>AED {Math.round(selected.price * 0.18)}</strong></div>
            <div><span>Target customer</span><strong>Executives, villas, hotels</strong></div>
          </div>
        </Panel>
        <Panel title="Why buyers care" eyebrow="Strategic value">
          <p>This creates a premium Dubai angle that basic fitness marketplaces do not have. It is attractive to hotels, concierge operators, luxury residential communities, and executive wellness buyers.</p>
        </Panel>
      </div>
    </section>
  );
}

function CorporateWellness({ employees, challenges, screenings, onEmployeeCreate, onChallengeCreate, onScreeningCreate }) {
  const totalPipeline = corporatePrograms.reduce((sum, program) => sum + program.price, 0);
  const programEmployees = corporatePrograms.reduce((sum, program) => sum + program.employees, 0);
  const averageScore = Math.round(employees.reduce((sum, employee) => sum + employee.wellnessScore, 0) / Math.max(employees.length, 1));
  const activeEmployees = employees.filter((employee) => employee.challengeStatus === "Active").length;
  return (
    <section className="stack">
      <div className="admin-grid">
        <Metric label="Pipeline value" value={`AED ${totalPipeline.toLocaleString("en-AE")}`} note="Demo corporate deals" />
        <Metric label="Employees covered" value={(programEmployees + employees.length).toLocaleString("en-AE")} note="Programs plus roster" />
        <Metric label="Wellness score" value={averageScore} note="Roster average" />
        <Metric label="Participation" value={`${Math.round((activeEmployees / Math.max(employees.length, 1)) * 100)}%`} note="Challenge engagement" />
      </div>
      <div className="corporate-command">
        <div>
          <p className="eyebrow">Corporate command center</p>
          <h2>Dubai Tech Group</h2>
          <p>Manage employee wellness, challenges, trainer bookings, health screenings, and executive reports from one B2B portal.</p>
        </div>
        <div className="report-card">
          <strong>{averageScore}</strong>
          <span>company wellness score</span>
        </div>
      </div>
      <div className="two-col">
        <CorporateEmployeeManager employees={employees} onCreate={onEmployeeCreate} />
        <CorporateChallengeManager challenges={challenges} onCreate={onChallengeCreate} />
      </div>
      <div className="two-col">
        <CorporateScreeningManager screenings={screenings} onCreate={onScreeningCreate} />
        <CorporateReports employees={employees} challenges={challenges} screenings={screenings} />
      </div>
      <div className="corporate-grid">
        {corporatePrograms.map((program) => (
          <article className="panel" key={program.name}>
            <p className="eyebrow">{program.status}</p>
            <h2>{program.name}</h2>
            <div className="signal-list">
              <div><span>Employees</span><strong>{program.employees}</strong></div>
              <div><span>Package value</span><strong>AED {program.price.toLocaleString("en-AE")}</strong></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CorporateEmployeeManager({ employees, onCreate }) {
  const [form, setForm] = useState({ companyName: "Dubai Tech Group", fullName: "New Employee", department: "Sales", wellnessScore: 76, challengeStatus: "Invited" });
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  return (
    <Panel title="Employee roster" eyebrow="People">
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        await onCreate(form);
        setSaved("Employee added");
      }}>
        <label>Full name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Department<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
        <label>Score<input type="number" value={form.wellnessScore} onChange={(event) => setForm({ ...form, wellnessScore: event.target.value })} /></label>
        <label>Status<select value={form.challengeStatus} onChange={(event) => setForm({ ...form, challengeStatus: event.target.value })}><option>Invited</option><option>Active</option><option>Completed</option></select></label>
        <button className="primary-btn wide"><UserPlus size={17} /> Add employee</button>
      </form>
      {saved && <p className="success-note">{saved}. Corporate reports update from the employee roster.</p>}
      <div className="list compact-list">
        {employees.map((employee) => (
          <div className="row" key={employee.id}><UserRound size={18} /><div><strong>{employee.fullName}</strong><span>{employee.department} · score {employee.wellnessScore}</span></div><b>{employee.challengeStatus}</b></div>
        ))}
      </div>
    </Panel>
  );
}

function CorporateChallengeManager({ challenges, onCreate }) {
  const [form, setForm] = useState({ companyName: "Dubai Tech Group", name: "Summer Shred Challenge", startDate: "2026-07-15", durationWeeks: 6, target: "3 workouts/week", prize: "AED 5,000 wellness voucher" });
  const [saved, setSaved] = useState("");
  return (
    <Panel title="Challenge builder" eyebrow="Motivation">
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        await onCreate(form);
        setSaved("Challenge scheduled");
      }}>
        <label className="wide">Challenge name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
        <label>Weeks<input type="number" value={form.durationWeeks} onChange={(event) => setForm({ ...form, durationWeeks: event.target.value })} /></label>
        <label>Target<input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} /></label>
        <label>Prize<input value={form.prize} onChange={(event) => setForm({ ...form, prize: event.target.value })} /></label>
        <button className="primary-btn wide"><Activity size={17} /> Launch challenge</button>
      </form>
      {saved && <p className="success-note">{saved}. This is ready for corporate engagement demos.</p>}
      <div className="slot-list">
        {challenges.map((challenge) => <div key={challenge.id}><strong>{challenge.name}</strong><span>{challenge.target} · {challenge.durationWeeks} weeks · {challenge.status}</span></div>)}
      </div>
    </Panel>
  );
}

function CorporateScreeningManager({ screenings, onCreate }) {
  const [form, setForm] = useState({ companyName: "Dubai Tech Group", screeningType: "Blood pressure, BMI, glucose", date: "2026-07-20", employees: 60 });
  const [saved, setSaved] = useState("");
  return (
    <Panel title="Health screenings" eyebrow="Clinics">
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        await onCreate(form);
        setSaved("Screening requested");
      }}>
        <label className="wide">Screening type<input value={form.screeningType} onChange={(event) => setForm({ ...form, screeningType: event.target.value })} /></label>
        <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Employees<input type="number" value={form.employees} onChange={(event) => setForm({ ...form, employees: event.target.value })} /></label>
        <button className="primary-btn wide"><CalendarCheck size={17} /> Request screening</button>
      </form>
      {saved && <p className="success-note">{saved}. This creates the clinic partnership workflow.</p>}
      <div className="slot-list">
        {screenings.map((screening) => <div key={screening.id}><strong>{screening.screeningType}</strong><span>{screening.date} · {screening.employees} employees · {screening.status}</span></div>)}
      </div>
    </Panel>
  );
}

function CorporateReports({ employees, challenges, screenings }) {
  const departments = [...new Set(employees.map((employee) => employee.department))];
  return (
    <Panel title="Executive report" eyebrow="Analytics">
      <div className="signal-list">
        <div><span>Departments active</span><strong>{departments.length}</strong></div>
        <div><span>Challenges running</span><strong>{challenges.length}</strong></div>
        <div><span>Screenings requested</span><strong>{screenings.length}</strong></div>
        <div><span>Top department</span><strong>{departments[0] || "Sales"}</strong></div>
      </div>
      <div className="report-bars">
        {departments.map((department, index) => <div key={department}><span>{department}</span><strong style={{ width: `${Math.max(38, 92 - index * 14)}%` }} /></div>)}
      </div>
    </Panel>
  );
}

function ProviderPortal({ providers, bookings, payments, slots, documents, onStatusChange, onProviderSave, onSlotCreate, onDocumentCreate }) {
  const activeProvider = providers.find((provider) => provider.status === "Verified") || providers[0];
  const providerBookings = bookings.filter((booking) => !activeProvider || booking.provider === activeProvider.name || booking.providerId === activeProvider.id);
  const providerPayments = payments.filter((payment) => !activeProvider || payment.provider === activeProvider.name);
  const providerPayout = providerPayments.reduce((sum, payment) => sum + payment.providerPayout, 0);
  const upcomingSlots = slots.filter((slot) => !activeProvider || slot.providerId === activeProvider.id);
  const providerDocuments = documents.filter((document) => !activeProvider || document.providerId === activeProvider.id || document.providerName === activeProvider.name);
  const approvedDocuments = providerDocuments.filter((document) => document.status === "Approved").length;

  if (!activeProvider) {
    return (
      <section className="stack">
        <Panel title="No provider listing yet" eyebrow="Provider portal">
          <p>Create or approve a provider listing first, then this portal will show bookings, availability, and payouts.</p>
        </Panel>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="provider-hero">
        <img src={activeProvider.image} alt={activeProvider.name} />
        <div>
          <p className="eyebrow">Provider workspace</p>
          <h2>{activeProvider.name}</h2>
          <p>{activeProvider.role} · {activeProvider.goal} · {activeProvider.location}</p>
          <div className="tag-row">{activeProvider.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
      </div>
      <div className="admin-grid">
        <Metric label="Listing status" value={activeProvider.status} note={activeProvider.budget} />
        <Metric label="Booking requests" value={providerBookings.length} note="Provider queue" />
        <Metric label="Provider payout" value={`AED ${providerPayout}`} note="From payments" />
        <Metric label="Verification docs" value={`${approvedDocuments}/${Math.max(providerDocuments.length, 3)}`} note="Approved evidence" />
      </div>
      <div className="two-col">
        <ProviderListingEditor provider={activeProvider} onSave={onProviderSave} />
        <AvailabilityManager provider={activeProvider} slots={upcomingSlots} onSlotCreate={onSlotCreate} />
      </div>
      <ProviderVerification provider={activeProvider} documents={providerDocuments} onDocumentCreate={onDocumentCreate} />
      <div className="two-col">
        <Panel title="Booking requests" eyebrow="Provider ops">
          <div className="list">
            {providerBookings.length ? providerBookings.map((booking) => (
              <div className="row" key={booking.id}>
                <CalendarCheck size={18} />
                <div><strong>{booking.client}</strong><span>{booking.service} · {booking.time} · AED {booking.value}</span></div>
                <select value={booking.status.toLowerCase()} onChange={(event) => onStatusChange(booking.id, event.target.value)}>
                  <option value="requested">Requested</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )) : <p>No booking requests for this provider yet.</p>}
          </div>
        </Panel>
        <Panel title="Payout ledger" eyebrow="Payments">
          <div className="list">
            {providerPayments.length ? providerPayments.map((payment) => (
              <div className="row" key={payment.id}>
                <CreditCard size={18} />
                <div><strong>{payment.reference}</strong><span>AED {payment.providerPayout} payout · AED {payment.commission} platform fee</span></div>
                <b>{payment.status}</b>
              </div>
            )) : <p>No payout records yet. Create checkout records from booking confirmation.</p>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function ProviderVerification({ provider, documents, onDocumentCreate }) {
  const [form, setForm] = useState({
    documentType: "Professional certificate",
    fileUrl: "https://example.com/provider-document.pdf",
    notes: ""
  });
  const [saved, setSaved] = useState("");

  async function submit(event) {
    event.preventDefault();
    await onDocumentCreate({
      providerId: provider.id,
      providerName: provider.name,
      documentType: form.documentType,
      fileUrl: form.fileUrl,
      notes: form.notes
    });
    setSaved("Document submitted for admin review");
    setForm({ documentType: "Professional certificate", fileUrl: "", notes: "" });
  }

  return (
    <Panel title="Verification documents" eyebrow="Trust and safety">
      <div className="two-col compact">
        <form className="form-grid" onSubmit={submit}>
          <label>Document type
            <select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
              <option>Professional certificate</option>
              <option>Emirates ID / business ID</option>
              <option>Insurance / waiver</option>
              <option>First aid certificate</option>
              <option>Clinic or DHA license</option>
            </select>
          </label>
          <label className="wide">Document URL
            <input value={form.fileUrl} onChange={(event) => setForm({ ...form, fileUrl: event.target.value })} placeholder="Paste secure file link" />
          </label>
          <label className="wide">Notes
            <textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Expiry date, license number, certifying body" />
          </label>
          <button className="primary-btn wide">Submit document</button>
        </form>
        <div className="document-grid">
          {documents.length ? documents.map((document) => (
            <div key={document.id}>
              <strong>{document.documentType}</strong>
              <span>{document.status}</span>
              <p>{document.notes || "No notes added."}</p>
              <a href={document.fileUrl} target="_blank" rel="noreferrer">Open file</a>
            </div>
          )) : <p>No verification documents submitted yet.</p>}
        </div>
      </div>
      {saved && <p className="success-note">{saved}. A marketplace admin can approve or reject it from the Admin dashboard.</p>}
    </Panel>
  );
}

function ProviderListingEditor({ provider, onSave }) {
  const [form, setForm] = useState({
    ...provider,
    tags: provider.tags.join(", ")
  });
  const [saved, setSaved] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Panel title="Listing editor" eyebrow="Provider profile">
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        await onSave({
          ...form,
          price: Number(form.price),
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        });
        setSaved("Listing saved");
      }}>
        <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Role<input value={form.role} onChange={(event) => update("role", event.target.value)} /></label>
        <label>Goal<input value={form.goal} onChange={(event) => update("goal", event.target.value)} /></label>
        <label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} /></label>
        <label>Budget<select value={form.budget} onChange={(event) => update("budget", event.target.value)}><option>Budget</option><option>Mid-range</option><option>Premium</option><option>VIP</option></select></label>
        <label>Price AED<input type="number" value={form.price} onChange={(event) => update("price", event.target.value)} /></label>
        <label className="wide">Tags<input value={form.tags} onChange={(event) => update("tags", event.target.value)} /></label>
        <button className="primary-btn wide"><Save size={17} /> Save listing</button>
      </form>
      {saved && <p className="success-note">{saved}. The marketplace card and provider dashboard now use the updated listing.</p>}
    </Panel>
  );
}

function AvailabilityManager({ provider, slots, onSlotCreate }) {
  const defaults = getAvailability(provider);
  const [form, setForm] = useState({
    startsAt: defaults[0].value,
    duration: 60,
    service: provider.role,
    locationType: provider.location
  });
  const [saved, setSaved] = useState("");

  async function submit(event) {
    event.preventDefault();
    const start = new Date(form.startsAt);
    const end = new Date(start.getTime() + Number(form.duration) * 60 * 1000);
    await onSlotCreate({
      providerId: provider.id,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      locationType: form.locationType,
      service: form.service
    });
    setSaved("Slot published");
  }

  return (
    <Panel title="Availability manager" eyebrow="Calendar">
      <form className="form-grid" onSubmit={submit}>
        <label className="wide">Start time<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
        <label>Duration<select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })}><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label>
        <label>Location<select value={form.locationType} onChange={(event) => setForm({ ...form, locationType: event.target.value })}><option>Home visit</option><option>Gym based</option><option>Online</option><option>Hotel</option><option>Villa</option></select></label>
        <label className="wide">Service<input value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} /></label>
        <button className="primary-btn wide"><Clock size={17} /> Publish slot</button>
      </form>
      {saved && <p className="success-note">{saved}. Clients can use this as the basis for bookable provider availability.</p>}
      <div className="slot-list">
        {slots.map((slot) => (
          <div key={slot.id}><strong>{formatShortDate(slot.startsAt)}</strong><span>{slot.service} · {slot.locationType} · {slot.status}</span></div>
        ))}
      </div>
    </Panel>
  );
}

function Admin({ bookings, payments, providers, documents, reviews, onStatusChange, onProviderStatusChange, onDocumentStatusChange, onReviewStatusChange }) {
  const revenue = bookings.reduce((sum, booking) => sum + booking.value, 0);
  const paymentRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingProviders = providers.filter((provider) => provider.status === "Pending").length;
  const pendingDocuments = documents.filter((document) => document.status === "Pending").length;
  const pendingReviews = reviews.filter((review) => review.status === "Pending").length;
  const bookingStats = summarizeBookings(bookings);
  return (
    <section className="stack">
      <div className="admin-grid">
        <Metric label="Bookings" value={bookings.length} note={isDemoMode ? "Demo data" : "Live data"} />
        <Metric label="Booking GMV" value={`AED ${bookingStats.totalValue}`} note="Session pipeline" />
        <Metric label="Payments" value={`AED ${paymentRevenue}`} note="Checkout records" />
        <Metric label="Pending approvals" value={pendingProviders} note="Provider pipeline" />
        <Metric label="Trust queue" value={pendingDocuments + pendingReviews} note="Docs and reviews" />
      </div>
      <div className="two-col">
        <Panel title="Provider approvals" eyebrow="Admin">
          <div className="list">{providers.map((provider) => <div className="row" key={provider.id}><Apple size={18} /><div><strong>{provider.name}</strong><span>{provider.role} · AED {provider.price || 0}</span></div><select value={provider.status.toLowerCase()} onChange={(event) => onProviderStatusChange(provider.id, event.target.value)}><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></div>)}</div>
        </Panel>
        <Panel title="Booking operations" eyebrow="Revenue">
          <div className="booking-pipeline">
            <div><span>Requested</span><strong>{bookingStats.requested}</strong></div>
            <div><span>Confirmed</span><strong>{bookingStats.confirmed}</strong></div>
            <div><span>Paid/Pending</span><strong>{bookingStats.paid}</strong></div>
          </div>
          <div className="list">{bookings.length ? bookings.map((booking) => <div className="row" key={booking.id}><Activity size={18} /><div><strong>{booking.provider}</strong><span>{booking.client} · {booking.time} · AED {booking.value || 0}</span><span>{booking.paymentStatus || "Unpaid"} payment</span></div><select value={booking.status.toLowerCase()} onChange={(event) => onStatusChange(booking.id, event.target.value)}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>) : <p>No booking requests yet.</p>}</div>
        </Panel>
      </div>
      <Panel title="Document verification queue" eyebrow="Trust operations">
        <div className="document-grid admin-documents">
          {documents.map((document) => (
            <div key={document.id}>
              <strong>{document.providerName}</strong>
              <span>{document.documentType}</span>
              <p>{document.notes || "No notes added."}</p>
              <a href={document.fileUrl} target="_blank" rel="noreferrer">Open file</a>
              <select value={document.status.toLowerCase()} onChange={(event) => onDocumentStatusChange(document.id, event.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Review moderation queue" eyebrow="Marketplace quality">
        <div className="review-moderation">
          {reviews.map((review) => (
            <div key={review.id}>
              <strong>{review.providerName}</strong>
              <span>{review.clientName} · {"★".repeat(review.rating)}</span>
              <p>{review.comment}</p>
              <select value={review.status.toLowerCase()} onChange={(event) => onReviewStatusChange(review.id, event.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Payment operations" eyebrow="Commerce">
        <div className="list">
          {payments.length ? payments.map((payment) => (
            <div className="row" key={payment.id}>
              <CreditCard size={18} />
              <div><strong>{payment.reference}</strong><span>{payment.provider} · {payment.externalProvider || payment.method} · AED {payment.amount} · fee AED {payment.commission} · payout AED {payment.providerPayout}</span>{payment.externalPaymentId && <small>{payment.externalPaymentId}</small>}</div>
              <b>{payment.status}</b>
            </div>
          )) : <p>No payment records yet. Create one from a booking confirmation.</p>}
        </div>
      </Panel>
    </section>
  );
}

function ProviderApplication({ onSubmit }) {
  const [form, setForm] = useState({
    name: "New Dubai Coach",
    role: "Personal Trainer",
    goal: "Muscle gain",
    location: "Home visit",
    budget: "Premium",
    price: 350,
    image: "https://images.unsplash.com/photo-1571019613914-85f342c1d0bb?auto=format&fit=crop&w=900&q=80",
    tags: "Strength, Transformation, Dubai"
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="two-col">
      <Panel title="Provider application" eyebrow="Onboarding">
        <form className="form-grid" onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            ...form,
            price: Number(form.price),
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          });
        }}>
          <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Provider type<input value={form.role} onChange={(event) => update("role", event.target.value)} /></label>
          <label>Main goal<input value={form.goal} onChange={(event) => update("goal", event.target.value)} /></label>
          <label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} /></label>
          <label>Budget tier<input value={form.budget} onChange={(event) => update("budget", event.target.value)} /></label>
          <label>Session price AED<input type="number" value={form.price} onChange={(event) => update("price", event.target.value)} /></label>
          <label className="wide">Image URL<input value={form.image} onChange={(event) => update("image", event.target.value)} /></label>
          <label className="wide">Tags<input value={form.tags} onChange={(event) => update("tags", event.target.value)} /></label>
          <button className="primary-btn wide">Submit provider application</button>
        </form>
      </Panel>
      <Panel title="Verification checklist" eyebrow="Trust and safety">
        <div className="signal-list">
          <div><span>Professional certificate</span><strong>Required</strong></div>
          <div><span>Emirates ID / business ID</span><strong>Required</strong></div>
          <div><span>Insurance / waiver</span><strong>Recommended</strong></div>
          <div><span>Medical disclaimer</span><strong>Required</strong></div>
          <div><span>Admin review</span><strong>Before visible listing</strong></div>
        </div>
      </Panel>
    </section>
  );
}

function BuyerPipeline() {
  return (
    <section className="stack">
      <div className="hero-strip business-hero">
        <div>
          <p className="eyebrow">Sell or partner</p>
          <h2>Track strategic buyers and launch partners</h2>
          <p>Use this screen to organize gyms, clinics, investors, fitness brands, and corporate wellness companies before pitching YO Health & Fitness.</p>
        </div>
        <div className="progress-ring"><strong>5</strong><span>target groups</span></div>
      </div>
      <div className="pipeline-grid">
        {buyerTargets.map((target) => (
          <article className="panel" key={target.company}>
            <p className="eyebrow">{target.type}</p>
            <h2>{target.company}</h2>
            <p>{target.fit}</p>
            <div className="tag-row"><span>{target.status}</span><span>Pitch deck</span><span>Demo video</span></div>
          </article>
        ))}
      </div>
      <Panel title="Next outreach action" eyebrow="Sales motion">
        <p>Prepare a 90-second demo video, a one-page pitch, and a short LinkedIn/email message. Do not send source code until there is an NDA or written offer.</p>
      </Panel>
    </section>
  );
}

function ProfileSettings({ user, onSave, onLogout }) {
  const profile = user.profile || {};
  const [form, setForm] = useState({
    fullName: profile.fullName || "Demo Client",
    phone: profile.phone || "+971 50 000 0000",
    location: profile.location || "Dubai Marina",
    goals: (profile.goals || ["Weight loss", "Strength", "General health"]).join(", "),
    consent: true
  });
  const [saved, setSaved] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="two-col">
      <Panel title="Client profile" eyebrow="Account">
        <div className="profile-card">
          <div className="profile-avatar">YO</div>
          <div>
            <h3>{form.fullName}</h3>
            <p>{user.email}</p>
            <p>{user.role === "admin" ? "Admin / founder demo" : "Client account"}</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={async (event) => {
          event.preventDefault();
          const nextProfile = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: form.fullName,
            phone: form.phone,
            location: form.location,
            goals: form.goals.split(",").map((goal) => goal.trim()).filter(Boolean)
          };
          await onSave(nextProfile);
          setSaved("Profile saved");
        }}>
          <label>Full name<input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} /></label>
          <label>Phone<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
          <label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} /></label>
          <label>Goals<input value={form.goals} onChange={(event) => update("goals", event.target.value)} /></label>
          <label className="check-row wide"><input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} /> I understand YO Health provides wellness guidance and is not a medical diagnosis tool.</label>
          <button className="primary-btn wide"><Save size={17} /> Save profile</button>
          <button type="button" className="secondary-btn wide" onClick={onLogout}><LogOut size={17} /> Logout</button>
        </form>
        {saved && <p className="success-note">{saved}. This data is ready for personalization, bookings, and AI coaching.</p>}
      </Panel>
      <Panel title="Privacy and safety" eyebrow="Compliance">
        <div className="signal-list">
          <div><span>Health data consent</span><strong>{form.consent ? "Accepted" : "Required"}</strong></div>
          <div><span>AI advice disclaimer</span><strong>Wellness guidance only</strong></div>
          <div><span>Provider verification</span><strong>Certificates and ID</strong></div>
          <div><span>Payment records</span><strong>Admin only</strong></div>
        </div>
      </Panel>
    </section>
  );
}

function TrustCenter({ user, consentRecords, deletionRequests, onConsent, onDeletionRequest }) {
  const [selectedDoc, setSelectedDoc] = useState("Health disclaimer");
  const [accepted, setAccepted] = useState({ health: false, privacy: false, terms: false });
  const [reason, setReason] = useState("I want my account and health data deleted.");
  const [saved, setSaved] = useState("");
  const docs = {
    "Health disclaimer": [
      "YO Health & Fitness provides wellness, booking, and coaching support only.",
      "It is not a medical device and does not replace professional medical advice, diagnosis, or treatment.",
      "Users should consult qualified healthcare professionals before making medical or major lifestyle decisions.",
      "AI coaching recommendations must be treated as general wellness guidance."
    ],
    "Privacy policy": [
      "The app may store profile data, bookings, health metrics, payment records, and consent records.",
      "Health and wellness information should be protected with strong access controls and role-based permissions.",
      "Corporate reporting should use aggregate insights unless an employee has clearly agreed to individual sharing.",
      "A production launch needs a public privacy policy URL and data retention schedule."
    ],
    "Terms of service": [
      "Providers are independent professionals responsible for their services, credentials, safety, and insurance.",
      "Bookings, cancellations, refunds, and payouts should be governed by marketplace terms.",
      "Users must provide accurate information and should not misuse emergency or medical workflows.",
      "The platform should reserve the right to remove unsafe, misleading, or unverified listings."
    ]
  };

  async function acceptAll() {
    const records = [
      ["health", "Health disclaimer"],
      ["privacy", "Privacy policy"],
      ["terms", "Terms of service"]
    ];
    for (const [key, label] of records) {
      await onConsent({ consentType: label, version: "2026-06-24", accepted: true });
      setAccepted((current) => ({ ...current, [key]: true }));
    }
    setSaved("Consent records saved");
  }

  return (
    <section className="stack">
      <div className="trust-hero">
        <div>
          <p className="eyebrow">Launch readiness</p>
          <h2>Trust, privacy, and health safety</h2>
          <p>App stores, investors, gyms, clinics, and corporate buyers will all ask how YO Health protects users, explains AI limits, and handles deletion requests.</p>
        </div>
        <div className="report-card"><strong>{consentRecords.length + deletionRequests.length}</strong><span>trust records</span></div>
      </div>
      <div className="admin-grid">
        <Metric label="Health disclaimer" value={accepted.health ? "Accepted" : "Needed"} note="Wellness only" />
        <Metric label="Privacy policy" value={accepted.privacy ? "Accepted" : "Needed"} note="Health data handling" />
        <Metric label="Terms" value={accepted.terms ? "Accepted" : "Needed"} note="Marketplace rules" />
        <Metric label="Deletion requests" value={deletionRequests.length} note="Account rights" />
      </div>
      <div className="two-col">
        <Panel title="Legal documents" eyebrow="Review">
          <div className="doc-tabs">
            {Object.keys(docs).map((doc) => <button key={doc} className={selectedDoc === doc ? "selected" : ""} onClick={() => setSelectedDoc(doc)}>{doc}</button>)}
          </div>
          <div className="legal-copy">
            {docs[selectedDoc].map((line) => <p key={line}>{line}</p>)}
          </div>
          <button className="primary-btn" onClick={acceptAll}><ShieldCheck size={17} /> Accept all consent records</button>
          {saved && <p className="success-note">{saved}. Admins can audit these before launch.</p>}
        </Panel>
        <Panel title="Account deletion request" eyebrow="User rights">
          <p>Production apps need an account deletion path for app-store review and user trust. This creates a request record for admin processing.</p>
          <form className="form-grid" onSubmit={async (event) => {
            event.preventDefault();
            await onDeletionRequest({ reason });
            setSaved("Deletion request submitted");
          }}>
            <label className="wide">Account email<input value={user.email} readOnly /></label>
            <label className="wide">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <button className="secondary-btn wide">Submit deletion request</button>
          </form>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Consent audit log" eyebrow="Compliance">
          <div className="list">
            {consentRecords.length ? consentRecords.map((record) => <div className="row" key={record.id}><ShieldCheck size={18} /><div><strong>{record.consentType}</strong><span>{record.userEmail} · version {record.version}</span></div><b>{record.accepted ? "Accepted" : "Declined"}</b></div>) : <p>No consent records yet.</p>}
          </div>
        </Panel>
        <Panel title="Deletion queue" eyebrow="Admin ops">
          <div className="list">
            {deletionRequests.length ? deletionRequests.map((request) => <div className="row" key={request.id}><UserRound size={18} /><div><strong>{request.userEmail}</strong><span>{request.reason}</span></div><b>{request.status}</b></div>) : <p>No deletion requests yet.</p>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function RevenueModel({ bookings, payments }) {
  const grossBookings = bookings.reduce((sum, booking) => sum + booking.value, 0);
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const platformFees = payments.reduce((sum, payment) => sum + payment.commission, 0);
  const payouts = payments.reduce((sum, payment) => sum + payment.providerPayout, 0);
  const simulatedMonthly = revenueStreams.reduce((sum, stream) => sum + stream.monthly, 0);
  return (
    <section className="stack">
      <div className="admin-grid">
        <Metric label="Booking GMV" value={`AED ${grossBookings}`} note="Current visible bookings" />
        <Metric label="Collected" value={`AED ${collected}`} note="Payment records" />
        <Metric label="Platform fees" value={`AED ${platformFees || Math.round(grossBookings * 0.15)}`} note="15% model" />
        <Metric label="Provider payouts" value={`AED ${payouts}`} note="Net payable" />
      </div>
      <div className="admin-grid">
        <Metric label="Sim. monthly revenue" value={`AED ${simulatedMonthly.toLocaleString("en-AE")}`} note="Pitch model" />
        <Metric label="Annualized" value={`AED ${(simulatedMonthly * 12).toLocaleString("en-AE")}`} note="Investor scenario" />
        <Metric label="Active payment providers" value="4" note="Stripe, Tap, Checkout.com, Ziina" />
        <Metric label="Checkout mode" value="Hosted" note="No card data stored" />
      </div>
      <div className="revenue-grid">
        {revenueStreams.map((stream) => (
          <article className="panel" key={stream.label}>
            <p className="eyebrow">{stream.status}</p>
            <h2>{stream.label}</h2>
            <strong>AED {stream.monthly.toLocaleString("en-AE")}/mo</strong>
            <p>{stream.take}</p>
          </article>
        ))}
      </div>
      <Panel title="Payment integration plan" eyebrow="Commerce">
        <p>For a UAE launch, connect Stripe first for demo readiness, then evaluate Tap, Checkout.com, Ziina, or Network International for local payment acceptance. Keep card processing outside the app through hosted checkout.</p>
      </Panel>
    </section>
  );
}

function SalesPackage({ providers, bookings, payments }) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(85000);
  const [multiple, setMultiple] = useState(2.5);
  const [leads, setLeads] = useState(salesTargets);
  const annualRevenue = monthlyRevenue * 12;
  const valuation = Math.round(annualRevenue * multiple);
  const bookingValue = bookings.reduce((sum, booking) => sum + booking.value, 0);
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);

  function moveLead(id, stage) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, stage } : lead));
  }

  return (
    <section className="stack">
      <div className="sales-hero">
        <div>
          <p className="eyebrow">Buyer deal room</p>
          <h2>Sell YO Health & Fitness as a working UAE marketplace MVP</h2>
          <p>Use this workspace to explain the product, show proof points, model the opportunity, and track conversations with gyms, clinics, corporate wellness companies, investors, and fitness brands.</p>
        </div>
        <div className="report-card"><strong>AED</strong><span>deal-ready package</span></div>
      </div>
      <div className="admin-grid">
        <Metric label="Providers" value={providers.length} note="Marketplace supply" />
        <Metric label="Booking GMV" value={`AED ${bookingValue}`} note="Visible pipeline" />
        <Metric label="Collected" value={`AED ${collected}`} note="Payment records" />
        <Metric label="Indicative value" value={`AED ${valuation.toLocaleString("en-AE")}`} note={`${multiple}x annual revenue`} />
      </div>
      <div className="two-col">
        <Panel title="Valuation scenario" eyebrow="Commercial model">
          <form className="valuation-form">
            <label>Monthly revenue target
              <input type="number" value={monthlyRevenue} onChange={(event) => setMonthlyRevenue(Number(event.target.value))} />
            </label>
            <label>Revenue multiple
              <input type="number" step="0.1" value={multiple} onChange={(event) => setMultiple(Number(event.target.value))} />
            </label>
          </form>
          <div className="signal-list">
            <div><span>Annual revenue scenario</span><strong>AED {annualRevenue.toLocaleString("en-AE")}</strong></div>
            <div><span>Indicative acquisition range</span><strong>AED {valuation.toLocaleString("en-AE")}</strong></div>
            <div><span>Positioning</span><strong>Working MVP plus UAE market thesis</strong></div>
          </div>
        </Panel>
        <Panel title="Acquisition pitch" eyebrow="Narrative">
          <div className="pitch-copy">
            <p>YO Health & Fitness combines provider bookings, gyms, health dashboards, AI wellness guidance, corporate wellness, luxury concierge services, payments, trust workflows, and mobile packaging in one UAE-ready ecosystem.</p>
            <p>The best buyer is a gym chain, clinic group, corporate wellness company, luxury concierge operator, or fitness brand that already has customers and can turn this MVP into distribution.</p>
            <p>The offer is not just an idea: it includes a working React app, Supabase backend schema, Android shell, store-readiness docs, pitch assets, and a clear roadmap to launch.</p>
          </div>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Demo run-of-show" eyebrow="90 seconds">
          <div className="timeline-list">
            <div><strong>0:00</strong><span>Open dashboard and explain health command center.</span></div>
            <div><strong>0:15</strong><span>Book a provider, choose availability, create checkout record.</span></div>
            <div><strong>0:35</strong><span>Show provider portal, payouts, and availability manager.</span></div>
            <div><strong>0:55</strong><span>Show corporate portal and executive report.</span></div>
            <div><strong>1:15</strong><span>Show trust center, legal drafts, and mobile readiness.</span></div>
          </div>
        </Panel>
        <Panel title="Handoff checklist" eyebrow="Buyer package">
          <div className="checklist">
            {handoffItems.map((item) => <label key={item}><input type="checkbox" defaultChecked /> {item}</label>)}
          </div>
        </Panel>
      </div>
      <Panel title="Outreach CRM" eyebrow="Sales pipeline">
        <div className="pipeline-grid">
          {leads.map((lead) => (
            <article className="panel mini-panel" key={lead.id}>
              <p className="eyebrow">{lead.value}</p>
              <h2>{lead.company}</h2>
              <p>{lead.buyer}</p>
              <p>{lead.angle}</p>
              <select value={lead.stage} onChange={(event) => moveLead(lead.id, event.target.value)}>
                <option>Research</option>
                <option>Warm</option>
                <option>Priority</option>
                <option>Contacted</option>
                <option>NDA</option>
                <option>Offer</option>
              </select>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function PilotValidationDashboard({ kpis, leads, onKpiUpdate, onLeadUpdate, onLeadCreate }) {
  const [leadForm, setLeadForm] = useState({ segment: "Provider", name: "", company: "", area: "Dubai", service: "", stage: "New", next: "", interest: 3 });
  const totalTarget = kpis.reduce((sum, item) => sum + item.target, 0);
  const totalActual = kpis.reduce((sum, item) => sum + item.actual, 0);
  const validationScore = Math.min(100, Math.round((totalActual / Math.max(totalTarget, 1)) * 100));
  const proofCount = leads.filter((lead) => ["Verification", "Demo booked", "Proposal sent", "LOI", "Offer"].includes(lead.stage)).length;
  const hotLeads = leads.filter((lead) => lead.interest >= 4).length;
  const groupedKpis = kpis.reduce((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item];
    return groups;
  }, {});

  async function updateKpi(id, value) {
    const actual = Math.max(0, Number(value) || 0);
    await onKpiUpdate(id, actual);
  }

  async function updateLead(id, field, value) {
    await onLeadUpdate(id, field, value);
  }

  async function addLead(event) {
    event.preventDefault();
    if (!leadForm.company.trim() && !leadForm.name.trim()) return;
    await onLeadCreate(leadForm);
    setLeadForm({ segment: "Provider", name: "", company: "", area: "Dubai", service: "", stage: "New", next: "", interest: 3 });
  }

  return (
    <section className="stack">
      <div className="pilot-hero">
        <div>
          <p className="eyebrow">30-day validation sprint</p>
          <h2>Prove demand before spending big money</h2>
          <p>Track the proof a buyer, investor, gym chain, clinic group, or corporate wellness partner will care about: real conversations, provider supply, pilot interest, and buyer demos.</p>
        </div>
        <div className="report-card"><strong>{validationScore}%</strong><span>validation score</span></div>
      </div>

      <div className="admin-grid">
        <Metric label="Total progress" value={`${totalActual}/${totalTarget}`} note="30-day KPI targets" />
        <Metric label="Pilot leads" value={leads.length} note="Providers, partners, buyers" />
        <Metric label="Proof points" value={proofCount} note="Demo, proposal, verification, LOI" />
        <Metric label="Hot leads" value={hotLeads} note="Interest score 4 or 5" />
      </div>

      <div className="two-col">
        <Panel title="KPI scorecard" eyebrow="Validation metrics">
          <div className="validation-groups">
            {Object.entries(groupedKpis).map(([group, items]) => (
              <div className="validation-group" key={group}>
                <h3>{group}</h3>
                {items.map((item) => (
                  <label className="kpi-row" key={item.id}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </span>
                    <input type="number" min="0" value={item.actual} onChange={(event) => updateKpi(item.id, event.target.value)} />
                    <em>/ {item.target}</em>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Add outreach lead" eyebrow="Pipeline input">
          <form className="ops-form" onSubmit={addLead}>
            <label>Segment
              <select value={leadForm.segment} onChange={(event) => setLeadForm({ ...leadForm, segment: event.target.value })}>
                <option>Provider</option>
                <option>Gym or Studio</option>
                <option>Clinic</option>
                <option>Corporate</option>
                <option>Strategic Buyer</option>
              </select>
            </label>
            <label>Name
              <input value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} placeholder="Contact name" />
            </label>
            <label>Company
              <input value={leadForm.company} onChange={(event) => setLeadForm({ ...leadForm, company: event.target.value })} placeholder="Gym, clinic, company, buyer" />
            </label>
            <label>Service or angle
              <input value={leadForm.service} onChange={(event) => setLeadForm({ ...leadForm, service: event.target.value })} placeholder="Personal training, pilot, acquisition" />
            </label>
            <label>Next action
              <input value={leadForm.next} onChange={(event) => setLeadForm({ ...leadForm, next: event.target.value })} placeholder="Send demo, collect docs, follow up" />
            </label>
            <button type="submit" className="primary-action">Add lead</button>
          </form>
        </Panel>
      </div>

      <Panel title="Validation pipeline" eyebrow="Live outreach board">
        <div className="validation-table">
          {leads.map((lead) => (
            <div key={lead.id}>
              <strong>{lead.company || lead.name}</strong>
              <span>{lead.segment}</span>
              <p>{lead.service}</p>
              <select value={lead.stage} onChange={(event) => updateLead(lead.id, "stage", event.target.value)}>
                <option>New</option>
                <option>Research</option>
                <option>Contacted</option>
                <option>Interested</option>
                <option>Demo booked</option>
                <option>Verification</option>
                <option>Proposal sent</option>
                <option>LOI</option>
                <option>Offer</option>
              </select>
              <select value={lead.interest} onChange={(event) => updateLead(lead.id, "interest", event.target.value)}>
                <option value="1">1 - Cold</option>
                <option value="2">2 - Low</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Strong</option>
                <option value="5">5 - Hot</option>
              </select>
              <em>{lead.next}</em>
            </div>
          ))}
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="What to show buyers" eyebrow="Evidence package">
          <div className="timeline-list">
            <div><strong>1</strong><span>Provider list with pricing, area, availability, and verification status.</span></div>
            <div><strong>2</strong><span>Gym, clinic, and corporate replies proving partner interest.</span></div>
            <div><strong>3</strong><span>Client waitlist and manual booking requests proving demand.</span></div>
            <div><strong>4</strong><span>Demo video plus this validation dashboard showing a launch process.</span></div>
          </div>
        </Panel>
        <Panel title="Day-30 decision" eyebrow="Sell, partner, or launch">
          <div className="signal-list">
            <div><span>Sell the asset</span><strong>Best if buyer demos and strategic leads are active</strong></div>
            <div><span>Find launch partner</span><strong>Best if gyms, clinics, or corporate pilots respond</strong></div>
            <div><span>Launch lean</span><strong>Best if bookings and provider supply are both moving</strong></div>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function WaitlistCenter({ user, entries, onCreate, onStatusChange }) {
  const [form, setForm] = useState({
    fullName: user.profile?.fullName || "",
    email: user.email || "",
    segment: user.role === "corporate" ? "Corporate" : user.role === "provider" ? "Provider" : "Client",
    city: "Dubai",
    goal: "Weight loss",
    budget: "Mid-range",
    message: ""
  });
  const [saved, setSaved] = useState("");
  const isAdmin = normalizeRole(user.role) === "admin";
  const total = entries.length;
  const qualified = entries.filter((entry) => ["Qualified", "Pilot", "Contacted"].includes(entry.status)).length;
  const corporate = entries.filter((entry) => entry.segment === "Corporate").length;
  const providers = entries.filter((entry) => entry.segment === "Provider").length;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaved("");
    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address, for example name@example.com.");
      return;
    }
    await onCreate(form);
    setSaved("Interest saved");
    setForm((current) => ({ ...current, message: "" }));
  }

  return (
    <section className="stack">
      <div className="waitlist-hero">
        <div>
          <p className="eyebrow">Early access</p>
          <h2>Capture real demand before launch</h2>
          <p>Collect client, provider, gym, clinic, corporate, and buyer interest in one place, then use the pipeline as proof when pitching YO Health & Fitness.</p>
        </div>
        <div className="report-card"><strong>{total}</strong><span>waitlist records</span></div>
      </div>

      <div className="admin-grid">
        <Metric label="Total interest" value={total} note="All waitlist entries" />
        <Metric label="Qualified" value={qualified} note="Contacted, pilot, or qualified" />
        <Metric label="Corporate" value={corporate} note="B2B demand" />
        <Metric label="Providers" value={providers} note="Supply-side interest" />
      </div>

      <div className="two-col">
        <Panel title="Join the waitlist" eyebrow="Lead capture">
          <form className="ops-form" onSubmit={submit}>
            <label>Full name
              <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Your name or team" />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
            </label>
            <label>Segment
              <select value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })}>
                <option>Client</option>
                <option>Provider</option>
                <option>Gym or Studio</option>
                <option>Clinic</option>
                <option>Corporate</option>
                <option>Strategic Buyer</option>
              </select>
            </label>
            <label>City or area
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>Goal
              <select value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })}>
                <option>Weight loss</option>
                <option>Muscle gain</option>
                <option>General health</option>
                <option>Recovery</option>
                <option>Flexibility</option>
                <option>Athletic performance</option>
                <option>Stress management</option>
                <option>Employee wellness</option>
                <option>Partnership</option>
              </select>
            </label>
            <label>Budget
              <select value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })}>
                <option>Budget</option>
                <option>Mid-range</option>
                <option>Premium</option>
                <option>VIP</option>
                <option>Corporate</option>
                <option>Partner</option>
              </select>
            </label>
            <label>Message
              <textarea rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="What do you want from YO Health & Fitness?" />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary-action">Save interest</button>
          </form>
          {saved && <p className="success-note">{saved}. This can now be used as launch validation.</p>}
        </Panel>

        <Panel title="Why this matters" eyebrow="Validation">
          <div className="signal-list">
            <div><span>Client demand</span><strong>Shows real users want bookings before paid ads</strong></div>
            <div><span>Provider supply</span><strong>Shows coaches and wellness pros are willing to join</strong></div>
            <div><span>Corporate interest</span><strong>Supports the highest-value revenue stream</strong></div>
            <div><span>Buyer evidence</span><strong>Makes the pitch stronger than code alone</strong></div>
          </div>
        </Panel>
      </div>

      {isAdmin && (
        <Panel title="Waitlist review" eyebrow="Admin pipeline">
          <div className="waitlist-table">
            {entries.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.fullName || entry.email}</strong>
                <span>{entry.segment}</span>
                <p>{entry.goal}</p>
                <p>{entry.city}</p>
                <em>{entry.message || entry.budget}</em>
                <select value={entry.status} onChange={(event) => onStatusChange(entry.id, event.target.value)}>
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Qualified</option>
                  <option>Pilot</option>
                  <option>Closed</option>
                </select>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

function LaunchCenter({ notifications, supportTickets, onNotify, onSupport }) {
  const [notification, setNotification] = useState({ audience: "Clients", title: "Session reminder", body: "Your YO Health & Fitness booking starts soon." });
  const [ticket, setTicket] = useState({ category: "Booking", subject: "", message: "" });
  const readyCount = launchChecks.filter((item) => item.status === "Ready").length;
  const unreadCount = notifications.filter((item) => item.status === "Unread").length;

  async function submitNotification(event) {
    event.preventDefault();
    if (!notification.title.trim()) return;
    await onNotify(notification);
    setNotification({ audience: "Clients", title: "", body: "" });
  }

  async function submitTicket(event) {
    event.preventDefault();
    if (!ticket.subject.trim()) return;
    await onSupport(ticket);
    setTicket({ category: "Booking", subject: "", message: "" });
  }

  return (
    <section className="stack">
      <div className="launch-hero">
        <div>
          <p className="eyebrow">Launch control</p>
          <h2>Operate the MVP like a real wellness marketplace</h2>
          <p>Track readiness, send user updates, capture support issues, and show buyers the systems needed to run YO Health & Fitness after acquisition.</p>
        </div>
        <div className="report-card"><strong>{readyCount}/{launchChecks.length}</strong><span>launch checks ready</span></div>
      </div>
      <div className="admin-grid">
        <Metric label="Launch readiness" value={`${Math.round((readyCount / launchChecks.length) * 100)}%`} note="Core MVP checklist" />
        <Metric label="Notifications" value={notifications.length} note={`${unreadCount} unread`} />
        <Metric label="Support tickets" value={supportTickets.length} note="Client and provider ops" />
        <Metric label="Next gate" value="Payments" note="Connect live UAE checkout" />
      </div>
      <Panel title="iOS and Android release board" eyebrow="Mobile packaging">
        <div className="release-board">
          {mobileReleaseTracks.map((track) => (
            <div key={track.platform}>
              <strong>{track.platform}</strong>
              <span>{track.status}</span>
              <p>{track.next}</p>
              <small>{track.blocker}</small>
            </div>
          ))}
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Send notification" eyebrow="User comms">
          <form className="ops-form" onSubmit={submitNotification}>
            <label>Audience
              <select value={notification.audience} onChange={(event) => setNotification({ ...notification, audience: event.target.value })}>
                <option>Clients</option>
                <option>Providers</option>
                <option>Corporate admins</option>
                <option>Admins</option>
              </select>
            </label>
            <label>Title
              <input value={notification.title} onChange={(event) => setNotification({ ...notification, title: event.target.value })} />
            </label>
            <label>Message
              <textarea rows="4" value={notification.body} onChange={(event) => setNotification({ ...notification, body: event.target.value })} />
            </label>
            <button type="submit" className="primary-action">Queue notification</button>
          </form>
        </Panel>
        <Panel title="Create support ticket" eyebrow="Operations">
          <form className="ops-form" onSubmit={submitTicket}>
            <label>Category
              <select value={ticket.category} onChange={(event) => setTicket({ ...ticket, category: event.target.value })}>
                <option>Booking</option>
                <option>Payment</option>
                <option>Provider</option>
                <option>Corporate</option>
                <option>Technical</option>
              </select>
            </label>
            <label>Subject
              <input value={ticket.subject} onChange={(event) => setTicket({ ...ticket, subject: event.target.value })} placeholder="What needs help?" />
            </label>
            <label>Message
              <textarea rows="4" value={ticket.message} onChange={(event) => setTicket({ ...ticket, message: event.target.value })} />
            </label>
            <button type="submit" className="primary-action">Open ticket</button>
          </form>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Readiness checklist" eyebrow="Go-live">
          <div className="launch-list">
            {launchChecks.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.status}</span>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Operations feed" eyebrow="Live workflow">
          <div className="ops-feed">
            {notifications.slice(0, 4).map((item) => (
              <div key={item.id}>
                <span>{item.audience}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
            {supportTickets.slice(0, 4).map((item) => (
              <div key={item.id}>
                <span>{item.category} support</span>
                <strong>{item.subject}</strong>
                <p>{item.status} · {item.userEmail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Business launch tracker" eyebrow="Dubai go-to-market">
        <div className="business-table">
          {businessLaunchSteps.map((step) => (
            <div key={step.area}>
              <strong>{step.area}</strong>
              <span>{step.owner}</span>
              <em>{step.status}</em>
              <p>{step.next}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, eyebrow, children }) {
  return <section className="panel"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</section>;
}

function Metric({ label, value, note }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Select({ value, options, onChange }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>;
}

function normalizeRole(role = "client") {
  return roleViews[role] ? role : "client";
}

function getAvailability(provider) {
  const base = new Date();
  const hourOffset = provider.budget === "VIP" ? 18 : provider.location === "Online" ? 9 : 7;
  return [1, 2, 4, 6].map((day, index) => {
    const slot = new Date(base);
    slot.setDate(base.getDate() + day);
    slot.setHours(hourOffset + index, index % 2 ? 30 : 0, 0, 0);
    return {
      label: new Intl.DateTimeFormat("en-AE", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(slot),
      value: toDatetimeLocalValue(slot)
    };
  });
}

function toDatetimeLocalValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-AE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function titleFor(view) {
  return {
    dashboard: "Client wellness dashboard",
    confirmation: "Booking confirmation",
    marketplace: "Provider marketplace",
    gyms: "Gym discovery",
    coach: "AI transformation engine",
    concierge: "Luxury concierge",
    corporate: "Corporate wellness",
    provider: "Provider portal",
    apply: "Provider onboarding",
    waitlist: "Waitlist and early access",
    profile: "Profile and settings",
    trust: "Trust and compliance",
    revenue: "Revenue model",
    sales: "Sales package",
    buyers: "Buyer pipeline",
    pilot: "Pilot validation",
    launch: "Launch readiness",
    admin: "Admin dashboard"
  }[view];
}
