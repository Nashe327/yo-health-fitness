import { createClient } from "@supabase/supabase-js";
import { gyms, initialBookings, providers } from "./catalog.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const isDemoMode = !supabase;

const toProvider = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  goal: row.goal,
  location: row.location,
  budget: row.budget,
  rating: Number(row.rating || 0),
  price: row.price_aed,
  image: row.image_url,
  tags: row.tags || [],
  status: titleCase(row.status)
});

const toGym = (row) => ({
  id: row.id,
  name: row.name,
  area: row.area,
  price: row.monthly_price_aed ? `AED ${row.monthly_price_aed}/mo` : "Contact gym",
  rating: String(row.rating || 0),
  description: row.description,
  facilities: row.facilities || []
});

const toBooking = (row) => ({
  id: row.id,
  client: row.client_name || row.profiles?.full_name || row.profiles?.email || "Client",
  provider: row.provider_name || row.providers?.name || "Provider",
  providerId: row.provider_id,
  service: row.service,
  time: row.display_time || formatBookingTime(row.booking_time),
  status: titleCase(row.status),
  value: row.value_aed,
  paymentStatus: titleCase(row.payment_status || "unpaid")
});

const toPayment = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  provider: row.provider_name || row.bookings?.providers?.name || "Provider",
  client: row.client_name || row.bookings?.profiles?.full_name || row.bookings?.profiles?.email || "Client",
  amount: row.amount_aed,
  commission: row.platform_fee_aed,
  providerPayout: row.provider_payout_aed,
  method: row.method || "Hosted checkout",
  status: titleCase(row.status || "pending"),
  reference: row.reference || `yo-${String(row.id || "").slice(0, 8)}`,
  externalPaymentId: row.external_payment_id,
  externalProvider: row.external_provider,
  checkoutUrl: row.external_checkout_url,
  createdAt: row.created_at
});

const toProfile = (row) => row ? ({
  id: row.id,
  email: row.email,
  fullName: row.full_name || "",
  role: row.role || "client",
  phone: row.phone || "",
  location: row.location || "",
  goals: row.goals || []
}) : null;

const metricLabels = {
  weight: ["Weight", "kg"],
  bmi: ["BMI", "score"],
  body_fat: ["Body fat", "%"],
  lean_muscle_mass: ["Lean mass", "kg"],
  resting_heart_rate: ["Resting HR", "bpm"],
  sleep_quality: ["Sleep", "/100"],
  stress_level: ["Stress", "/100"],
  vo2_max: ["VO2 Max", "score"]
};

const toMetric = (row) => {
  const [label, fallbackUnit] = metricLabels[row.metric_key] || [titleCase(row.metric_key.replaceAll("_", " ")), row.metric_unit || ""];
  const unit = row.metric_unit || fallbackUnit;
  const suffix = unit === "percent" ? "%" : unit === "score" ? "" : unit;
  return [label, `${Number(row.metric_value).toLocaleString("en-AE")}${suffix ? ` ${suffix}` : ""}`, "Live metric"];
};

export async function signInWithEmail(email, password) {
  if (!supabase) return { demo: true, user: { email, role: email.includes("admin") ? "admin" : "client" } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await fetchProfile(data.user.id);
  return { ...data, profile };
}

export async function createBooking(payload) {
  if (!supabase) return { demo: true, booking: { ...payload, id: crypto.randomUUID(), status: "Requested", paymentStatus: "Unpaid" } };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Preview mode has no authenticated Supabase user");
    const insert = {
      client_id: userId,
      provider_id: payload.providerId,
      service: payload.service,
      booking_time: payload.bookingTime || null,
      location_type: payload.locationType || "Home visit",
      status: "requested",
      payment_status: "unpaid",
      value_aed: payload.value,
      notes: payload.notes || payload.time
    };
    const { data, error } = await supabase
      .from("bookings")
      .insert(insert)
      .select("*, providers(name), profiles(full_name, email)")
      .single();
    if (error) throw error;
    return toBooking(data);
  } catch (error) {
    console.warn("Using local booking because Supabase booking insert failed:", error.message);
    return { demo: true, booking: { ...payload, id: crypto.randomUUID(), status: "Requested", paymentStatus: "Unpaid" } };
  }
}

export async function fetchProviders() {
  if (!supabase) return providers;
  try {
    const { data, error } = await supabase.from("providers").select("*").order("rating", { ascending: false });
    if (error) throw error;
    return data.length ? data.map(toProvider) : providers;
  } catch (error) {
    console.warn("Using demo providers because Supabase providers failed:", error.message);
    return providers;
  }
}

export async function fetchGyms() {
  if (!supabase) return gyms;
  try {
    const { data, error } = await supabase.from("gyms").select("*").order("featured", { ascending: false });
    if (error) throw error;
    return data.length ? data.map(toGym) : gyms;
  } catch (error) {
    console.warn("Using demo gyms because Supabase gyms failed:", error.message);
    return gyms;
  }
}

export async function fetchBookings(role = "client") {
  if (!supabase) return initialBookings;
  try {
    const select = "*, providers(name), profiles(full_name, email)";
    const query = supabase.from("bookings").select(select).order("created_at", { ascending: false });
    const { data, error } = role === "admin" ? await query : await query.limit(20);
    if (error) throw error;
    return data.length ? data.map(toBooking) : initialBookings;
  } catch (error) {
    console.warn("Using demo bookings because Supabase bookings failed:", error.message);
    return initialBookings;
  }
}

export async function fetchPayments(role = "client") {
  if (!supabase) return [];
  try {
    const select = "*, bookings(service, providers(name), profiles(full_name, email))";
    const query = supabase.from("payments").select(select).order("created_at", { ascending: false });
    const { data, error } = role === "admin" ? await query : await query.limit(20);
    if (error) throw error;
    return data.map(toPayment);
  } catch (error) {
    console.warn("Using local payments because Supabase payments failed:", error.message);
    return [];
  }
}

export async function fetchProviderDocuments(role = "client") {
  if (!supabase || role !== "admin") return [];
  try {
    const { data, error } = await supabase
      .from("provider_documents")
      .select("*, providers(name)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return data.map(toProviderDocument);
  } catch (error) {
    console.warn("Using local provider documents because Supabase document fetch failed:", error.message);
    return [];
  }
}

export async function fetchProviderReviews(role = "client") {
  if (!supabase) return [];
  try {
    const query = supabase
      .from("provider_reviews")
      .select("*, providers(name)")
      .order("created_at", { ascending: false });
    const { data, error } = role === "admin" ? await query.limit(80) : await query.eq("status", "approved").limit(40);
    if (error) throw error;
    return data.map(toProviderReview);
  } catch (error) {
    console.warn("Using local provider reviews because Supabase review fetch failed:", error.message);
    return [];
  }
}

export async function fetchHealthMetrics() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("health_metrics")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return data.length ? data.map(toMetric) : null;
  } catch (error) {
    console.warn("Using demo health metrics because Supabase health metrics failed:", error.message);
    return null;
  }
}

export async function fetchProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export async function signUpWithEmail({ email, password, fullName, role = "client" }) {
  if (!supabase) return { demo: true, user: { email, role } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } }
  });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role
    });
    if (profileError) {
      console.warn("Profile upsert skipped after signup:", profileError.message);
    }
  }
  return data;
}

export async function updateProfile(payload) {
  const localProfile = {
    id: payload.id,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role || "client",
    phone: payload.phone || "",
    location: payload.location || "",
    goals: payload.goals || []
  };
  if (!supabase) return { demo: true, profile: localProfile };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user?.id) throw new Error("Preview mode has no authenticated Supabase user");
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.fullName,
        phone: payload.phone,
        location: payload.location,
        goals: payload.goals
      })
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return { profile: toProfile(data) };
  } catch (error) {
    console.warn("Using local profile because Supabase profile update failed:", error.message);
    return { demo: true, profile: localProfile };
  }
}

export async function recordConsent(payload) {
  const consent = {
    id: crypto.randomUUID(),
    userEmail: payload.userEmail,
    consentType: payload.consentType,
    version: payload.version || "2026-06-24",
    accepted: Boolean(payload.accepted),
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, consent };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const { data, error } = await supabase
      .from("consent_records")
      .insert({
        user_id: userId,
        user_email: payload.userEmail,
        consent_type: payload.consentType,
        version: payload.version || "2026-06-24",
        accepted: Boolean(payload.accepted)
      })
      .select("*")
      .single();
    if (error) throw error;
    return { consent: toConsentRecord(data) };
  } catch (error) {
    console.warn("Using local consent record because Supabase consent insert failed:", error.message);
    return { demo: true, consent };
  }
}

export async function requestAccountDeletion(payload) {
  const request = {
    id: crypto.randomUUID(),
    userEmail: payload.userEmail,
    reason: payload.reason,
    status: "Requested",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, request };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        user_email: payload.userEmail,
        reason: payload.reason,
        status: "requested"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { request: toDeletionRequest(data) };
  } catch (error) {
    console.warn("Using local deletion request because Supabase insert failed:", error.message);
    return { demo: true, request };
  }
}

export async function fetchTrustRecords(role = "client") {
  if (!supabase || role !== "admin") return { consents: [], deletionRequests: [] };
  try {
    const [consents, deletionRequests] = await Promise.all([
      supabase.from("consent_records").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("account_deletion_requests").select("*").order("created_at", { ascending: false }).limit(50)
    ]);
    if (consents.error) throw consents.error;
    if (deletionRequests.error) throw deletionRequests.error;
    return {
      consents: consents.data.map(toConsentRecord),
      deletionRequests: deletionRequests.data.map(toDeletionRequest)
    };
  } catch (error) {
    console.warn("Using local trust records because Supabase trust fetch failed:", error.message);
    return { consents: [], deletionRequests: [] };
  }
}

export async function fetchPilotValidation(role = "client") {
  if (!supabase || role !== "admin") return { kpis: [], leads: [] };
  try {
    const [kpis, leads] = await Promise.all([
      supabase.from("pilot_validation_kpis").select("*").order("sort_order", { ascending: true }),
      supabase.from("pilot_leads").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    if (kpis.error) throw kpis.error;
    if (leads.error) throw leads.error;
    return {
      kpis: kpis.data.map(toPilotKpi),
      leads: leads.data.map(toPilotLead)
    };
  } catch (error) {
    console.warn("Using local pilot validation data because Supabase pilot fetch failed:", error.message);
    return { kpis: [], leads: [] };
  }
}

export async function fetchWaitlistSignups(role = "client") {
  if (!supabase || role !== "admin") return [];
  try {
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) throw error;
    return data.map(toWaitlistSignup);
  } catch (error) {
    console.warn("Using local waitlist data because Supabase waitlist fetch failed:", error.message);
    return [];
  }
}

export async function createHealthMetric(payload) {
  const localRow = {
    metric_key: payload.metricKey,
    metric_value: Number(payload.metricValue),
    metric_unit: payload.metricUnit,
    recorded_at: new Date().toISOString()
  };
  if (!supabase) return { demo: true, metric: toMetric(localRow) };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Preview mode has no authenticated Supabase user");
    const { data, error } = await supabase
      .from("health_metrics")
      .insert({
        client_id: userId,
        metric_key: payload.metricKey,
        metric_value: Number(payload.metricValue),
        metric_unit: payload.metricUnit
      })
      .select("*")
      .single();
    if (error) throw error;
    return { metric: toMetric(data) };
  } catch (error) {
    console.warn("Using local health metric because Supabase metric insert failed:", error.message);
    return { demo: true, metric: toMetric(localRow) };
  }
}

export async function createPaymentRecord(payload) {
  const commission = Math.round(payload.amount * (payload.commissionRate || 0.15));
  const reference = `yo-${Date.now().toString(36)}`;
  const checkoutUrl = payload.checkoutUrl || buildDemoCheckoutUrl(payload.method, reference, payload.amount);
  const localPayment = {
    id: crypto.randomUUID(),
    bookingId: payload.bookingId,
    provider: payload.provider,
    client: payload.client || "Client",
    amount: payload.amount,
    commission,
    providerPayout: payload.amount - commission,
    method: payload.method || "Hosted checkout",
    status: payload.status || "Pending",
    reference,
    externalPaymentId: payload.externalPaymentId || `test_${reference}`,
    externalProvider: payload.method || "Hosted checkout",
    checkoutUrl,
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, payment: localPayment };
  try {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        booking_id: payload.bookingId,
        amount_aed: payload.amount,
        platform_fee_aed: commission,
        provider_payout_aed: payload.amount - commission,
        method: payload.method || "Hosted checkout",
        status: "pending",
        reference,
        external_payment_id: localPayment.externalPaymentId,
        external_provider: payload.method || "Hosted checkout",
        external_checkout_url: checkoutUrl
      })
      .select("*, bookings(service, providers(name), profiles(full_name, email))")
      .single();
    if (error) throw error;

    await supabase.from("bookings").update({ payment_status: "pending" }).eq("id", payload.bookingId);
    return { payment: toPayment(data) };
  } catch (error) {
    console.warn("Using local payment because Supabase payment insert failed:", error.message);
    return { demo: true, payment: localPayment };
  }
}

function buildDemoCheckoutUrl(method = "Hosted checkout", reference, amount) {
  const provider = method.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "checkout";
  const params = new URLSearchParams({
    reference,
    amount: String(amount),
    currency: "AED",
    mode: "test"
  });
  return `https://payments.yohealthfitness.example/${provider}?${params.toString()}`;
}

export async function updateProviderListing(payload) {
  const localProvider = {
    ...payload,
    price: Number(payload.price),
    tags: Array.isArray(payload.tags) ? payload.tags : String(payload.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean)
  };
  if (!supabase) return { demo: true, provider: localProvider };
  try {
    const { data, error } = await supabase
      .from("providers")
      .update({
        name: payload.name,
        role: payload.role,
        goal: payload.goal,
        location: payload.location,
        budget: payload.budget,
        price_aed: Number(payload.price),
        image_url: payload.image,
        tags: localProvider.tags
      })
      .eq("id", payload.id)
      .select("*")
      .single();
    if (error) throw error;
    return { provider: toProvider(data) };
  } catch (error) {
    console.warn("Using local provider profile because Supabase provider update failed:", error.message);
    return { demo: true, provider: localProvider };
  }
}

export async function createProviderAvailability(payload) {
  const localSlot = {
    id: crypto.randomUUID(),
    providerId: payload.providerId,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    locationType: payload.locationType,
    service: payload.service,
    status: "Open"
  };
  if (!supabase) return { demo: true, slot: localSlot };
  try {
    const { data, error } = await supabase
      .from("provider_availability")
      .insert({
        provider_id: payload.providerId,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        location_type: payload.locationType,
        service: payload.service,
        status: "open"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { slot: toAvailabilitySlot(data) };
  } catch (error) {
    console.warn("Using local provider slot because Supabase availability insert failed:", error.message);
    return { demo: true, slot: localSlot };
  }
}

export async function createProviderDocument(payload) {
  const document = {
    id: crypto.randomUUID(),
    providerId: payload.providerId,
    providerName: payload.providerName,
    documentType: payload.documentType,
    fileUrl: payload.fileUrl,
    status: "Pending",
    notes: payload.notes || "",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, document };
  try {
    const { data, error } = await supabase
      .from("provider_documents")
      .insert({
        provider_id: payload.providerId,
        document_type: payload.documentType,
        file_url: payload.fileUrl,
        status: "pending",
        notes: payload.notes || ""
      })
      .select("*, providers(name)")
      .single();
    if (error) throw error;
    return { document: toProviderDocument(data) };
  } catch (error) {
    console.warn("Using local provider document because Supabase document insert failed:", error.message);
    return { demo: true, document };
  }
}

export async function createProviderReview(payload) {
  const review = {
    id: crypto.randomUUID(),
    providerId: payload.providerId,
    providerName: payload.providerName,
    bookingId: payload.bookingId,
    clientName: payload.clientName || "Client",
    rating: Number(payload.rating || 5),
    comment: payload.comment,
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, review };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const clientId = sessionData.session?.user?.id || null;
    const { data, error } = await supabase
      .from("provider_reviews")
      .insert({
        provider_id: payload.providerId,
        booking_id: payload.bookingId,
        client_id: clientId,
        client_name: payload.clientName || "Client",
        rating: Number(payload.rating || 5),
        comment: payload.comment,
        status: "pending"
      })
      .select("*, providers(name)")
      .single();
    if (error) throw error;
    return { review: toProviderReview(data) };
  } catch (error) {
    console.warn("Using local provider review because Supabase review insert failed:", error.message);
    return { demo: true, review };
  }
}

export async function createCorporateEmployee(payload) {
  const employee = {
    id: crypto.randomUUID(),
    companyName: payload.companyName,
    fullName: payload.fullName,
    department: payload.department,
    wellnessScore: Number(payload.wellnessScore || 75),
    challengeStatus: payload.challengeStatus || "Invited"
  };
  if (!supabase) return { demo: true, employee };
  try {
    const { data, error } = await supabase
      .from("corporate_employees")
      .insert({
        company_name: payload.companyName,
        full_name: payload.fullName,
        department: payload.department,
        wellness_score: Number(payload.wellnessScore || 75),
        challenge_status: payload.challengeStatus || "invited"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { employee: toCorporateEmployee(data) };
  } catch (error) {
    console.warn("Using local corporate employee because Supabase insert failed:", error.message);
    return { demo: true, employee };
  }
}

export async function createCorporateChallenge(payload) {
  const challenge = {
    id: crypto.randomUUID(),
    name: payload.name,
    companyName: payload.companyName,
    startDate: payload.startDate,
    durationWeeks: Number(payload.durationWeeks || 6),
    target: payload.target,
    prize: payload.prize,
    status: "Scheduled"
  };
  if (!supabase) return { demo: true, challenge };
  try {
    const { data, error } = await supabase
      .from("corporate_challenges")
      .insert({
        company_name: payload.companyName,
        name: payload.name,
        start_date: payload.startDate,
        duration_weeks: Number(payload.durationWeeks || 6),
        target: payload.target,
        prize: payload.prize,
        status: "scheduled"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { challenge: toCorporateChallenge(data) };
  } catch (error) {
    console.warn("Using local corporate challenge because Supabase insert failed:", error.message);
    return { demo: true, challenge };
  }
}

export async function createCorporateScreening(payload) {
  const screening = {
    id: crypto.randomUUID(),
    companyName: payload.companyName,
    screeningType: payload.screeningType,
    date: payload.date,
    employees: Number(payload.employees || 25),
    status: "Requested"
  };
  if (!supabase) return { demo: true, screening };
  try {
    const { data, error } = await supabase
      .from("corporate_screenings")
      .insert({
        company_name: payload.companyName,
        screening_type: payload.screeningType,
        screening_date: payload.date,
        employees: Number(payload.employees || 25),
        status: "requested"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { screening: toCorporateScreening(data) };
  } catch (error) {
    console.warn("Using local corporate screening because Supabase insert failed:", error.message);
    return { demo: true, screening };
  }
}

export async function createProviderApplication(payload) {
  const pendingProvider = {
    ...payload,
    id: crypto.randomUUID(),
    status: "Pending",
    rating: 0
  };
  if (!supabase) return pendingProvider;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const ownerId = sessionData.session?.user?.id;
    const insert = {
      owner_id: ownerId,
      name: payload.name,
      role: payload.role,
      goal: payload.goal,
      location: payload.location,
      budget: payload.budget,
      price_aed: payload.price,
      image_url: payload.image,
      tags: payload.tags,
      status: "pending",
      rating: 0
    };
    const { data, error } = await supabase.from("providers").insert(insert).select("*").single();
    if (error) throw error;
    return toProvider(data);
  } catch (error) {
    console.warn("Using local provider application because Supabase insert failed:", error.message);
    return pendingProvider;
  }
}

export async function sendNotification(payload) {
  const notification = {
    id: crypto.randomUUID(),
    audience: payload.audience,
    title: payload.title,
    body: payload.body,
    status: "Sent",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, notification };
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        audience: payload.audience,
        title: payload.title,
        body: payload.body,
        status: "sent"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { notification: toNotification(data) };
  } catch (error) {
    console.warn("Using local notification because Supabase insert failed:", error.message);
    return { demo: true, notification };
  }
}

export async function createSupportTicket(payload) {
  const ticket = {
    id: crypto.randomUUID(),
    userEmail: payload.userEmail,
    category: payload.category,
    subject: payload.subject,
    message: payload.message,
    status: "Open",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, ticket };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        user_email: payload.userEmail,
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
        status: "open"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { ticket: toSupportTicket(data) };
  } catch (error) {
    console.warn("Using local support ticket because Supabase insert failed:", error.message);
    return { demo: true, ticket };
  }
}

export async function createWaitlistSignup(payload) {
  const signup = {
    id: crypto.randomUUID(),
    fullName: payload.fullName,
    email: payload.email || payload.userEmail,
    segment: payload.segment,
    city: payload.city,
    goal: payload.goal,
    budget: payload.budget,
    message: payload.message,
    status: "New",
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, signup };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const { data, error } = await supabase
      .from("waitlist_signups")
      .insert({
        user_id: userId,
        full_name: payload.fullName,
        email: payload.email || payload.userEmail,
        segment: payload.segment,
        city: payload.city,
        goal: payload.goal,
        budget: payload.budget,
        message: payload.message,
        status: "New"
      })
      .select("*")
      .single();
    if (error) throw error;
    return { signup: toWaitlistSignup(data) };
  } catch (error) {
    console.warn("Using local waitlist signup because Supabase insert failed:", error.message);
    return { demo: true, signup };
  }
}

export async function updateWaitlistStatus(id, status) {
  if (!supabase) return { signup: { id, status } };
  try {
    const { data, error } = await supabase
      .from("waitlist_signups")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return { signup: toWaitlistSignup(data) };
  } catch (error) {
    console.warn("Using local waitlist status because Supabase update failed:", error.message);
    return { signup: { id, status } };
  }
}

export async function updatePilotKpi(id, actual) {
  if (!supabase) return { kpi: { id, actual } };
  try {
    const { data, error } = await supabase
      .from("pilot_validation_kpis")
      .update({
        actual: Number(actual || 0),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return { kpi: toPilotKpi(data) };
  } catch (error) {
    console.warn("Using local pilot KPI update because Supabase update failed:", error.message);
    return { kpi: { id, actual } };
  }
}

export async function createPilotLead(payload) {
  const lead = {
    ...payload,
    id: crypto.randomUUID(),
    interest: Number(payload.interest || 3),
    createdAt: new Date().toISOString()
  };
  if (!supabase) return { demo: true, lead };
  try {
    const { data, error } = await supabase
      .from("pilot_leads")
      .insert({
        segment: payload.segment,
        name: payload.name,
        company: payload.company,
        area: payload.area,
        service: payload.service,
        stage: payload.stage || "New",
        next_action: payload.next,
        interest: Number(payload.interest || 3)
      })
      .select("*")
      .single();
    if (error) throw error;
    return { lead: toPilotLead(data) };
  } catch (error) {
    console.warn("Using local pilot lead because Supabase insert failed:", error.message);
    return { demo: true, lead };
  }
}

export async function updatePilotLead(id, changes) {
  if (!supabase) return { lead: { id, ...changes } };
  const columnMap = {
    segment: "segment",
    name: "name",
    company: "company",
    area: "area",
    service: "service",
    stage: "stage",
    next: "next_action",
    interest: "interest"
  };
  const update = Object.entries(changes).reduce((memo, [key, value]) => {
    const column = columnMap[key];
    if (column) memo[column] = key === "interest" ? Number(value) : value;
    return memo;
  }, { updated_at: new Date().toISOString() });

  try {
    const { data, error } = await supabase
      .from("pilot_leads")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return { lead: toPilotLead(data) };
  } catch (error) {
    console.warn("Using local pilot lead update because Supabase update failed:", error.message);
    return { lead: { id, ...changes } };
  }
}

function toAvailabilitySlot(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationType: row.location_type,
    service: row.service,
    status: titleCase(row.status || "open")
  };
}

function toPilotKpi(row) {
  return {
    id: row.id,
    group: row.kpi_group,
    label: row.label,
    target: Number(row.target || 0),
    actual: Number(row.actual || 0),
    note: row.note || ""
  };
}

function toPilotLead(row) {
  return {
    id: row.id,
    segment: row.segment,
    name: row.name || "",
    company: row.company || "",
    area: row.area || "",
    service: row.service || "",
    stage: row.stage || "New",
    next: row.next_action || "",
    interest: Number(row.interest || 3),
    createdAt: row.created_at
  };
}

function toWaitlistSignup(row) {
  return {
    id: row.id,
    fullName: row.full_name || "",
    email: row.email || "",
    segment: row.segment || "Client",
    city: row.city || "",
    goal: row.goal || "",
    budget: row.budget || "",
    message: row.message || "",
    status: row.status || "New",
    createdAt: row.created_at
  };
}

function toCorporateEmployee(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    fullName: row.full_name,
    department: row.department,
    wellnessScore: Number(row.wellness_score || 0),
    challengeStatus: titleCase(row.challenge_status || "invited")
  };
}

function toCorporateChallenge(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    name: row.name,
    startDate: row.start_date,
    durationWeeks: row.duration_weeks,
    target: row.target,
    prize: row.prize,
    status: titleCase(row.status || "scheduled")
  };
}

function toCorporateScreening(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    screeningType: row.screening_type,
    date: row.screening_date,
    employees: row.employees,
    status: titleCase(row.status || "requested")
  };
}

function toConsentRecord(row) {
  return {
    id: row.id,
    userEmail: row.user_email,
    consentType: row.consent_type,
    version: row.version,
    accepted: row.accepted,
    createdAt: row.created_at
  };
}

function toDeletionRequest(row) {
  return {
    id: row.id,
    userEmail: row.user_email,
    reason: row.reason,
    status: titleCase(row.status || "requested"),
    createdAt: row.created_at
  };
}

function toNotification(row) {
  return {
    id: row.id,
    audience: row.audience,
    title: row.title,
    body: row.body,
    status: titleCase(row.status || "sent"),
    createdAt: row.created_at
  };
}

function toSupportTicket(row) {
  return {
    id: row.id,
    userEmail: row.user_email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: titleCase(row.status || "open"),
    createdAt: row.created_at
  };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function updateBookingStatus(id, status) {
  if (!supabase) return { id, status: titleCase(status) };
  const { data, error } = await supabase.from("bookings").update({ status }).eq("id", id).select("*, providers(name), profiles(full_name, email)").single();
  if (error) throw error;
  return toBooking(data);
}

export async function updateProviderStatus(id, status) {
  if (!supabase) return { id, status: titleCase(status) };
  const { data, error } = await supabase.from("providers").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return toProvider(data);
}

export async function updateProviderDocumentStatus(id, status) {
  if (!supabase) return { document: { id, status: titleCase(status) } };
  try {
    const { data, error } = await supabase
      .from("provider_documents")
      .update({
        status,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*, providers(name)")
      .single();
    if (error) throw error;
    return { document: toProviderDocument(data) };
  } catch (error) {
    console.warn("Using local provider document status because Supabase update failed:", error.message);
    return { document: { id, status: titleCase(status) } };
  }
}

export async function updateProviderReviewStatus(id, status) {
  if (!supabase) return { review: { id, status: titleCase(status) } };
  try {
    const { data, error } = await supabase
      .from("provider_reviews")
      .update({
        status,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*, providers(name)")
      .single();
    if (error) throw error;
    return { review: toProviderReview(data) };
  } catch (error) {
    console.warn("Using local provider review status because Supabase update failed:", error.message);
    return { review: { id, status: titleCase(status) } };
  }
}

function toProviderDocument(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name || row.providers?.name || "Provider",
    documentType: row.document_type,
    fileUrl: row.file_url,
    status: titleCase(row.status || "pending"),
    notes: row.notes || "",
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at
  };
}

function toProviderReview(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name || row.providers?.name || "Provider",
    bookingId: row.booking_id,
    clientName: row.client_name || "Client",
    rating: Number(row.rating || 0),
    comment: row.comment,
    status: titleCase(row.status || "pending"),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at
  };
}

function titleCase(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBookingTime(value) {
  if (!value) return "Requested time";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
