export const providers = [
  {
    id: "maya-haddad",
    name: "Maya Haddad",
    role: "Personal Trainer",
    goal: "Weight loss",
    location: "Home visit",
    budget: "Premium",
    rating: 4.9,
    price: 380,
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=900&q=80",
    tags: ["Fat loss", "Strength", "Dubai Marina"],
    status: "Verified"
  },
  {
    id: "omar-khan",
    name: "Omar Khan",
    role: "Boxing Coach",
    goal: "Athletic performance",
    location: "Gym based",
    budget: "Mid-range",
    rating: 4.8,
    price: 260,
    image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=900&q=80",
    tags: ["Conditioning", "Boxing", "JLT"],
    status: "Verified"
  },
  {
    id: "lina-martins",
    name: "Lina Martins",
    role: "Pilates Instructor",
    goal: "Flexibility",
    location: "Online",
    budget: "Budget",
    rating: 4.7,
    price: 140,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
    tags: ["Mobility", "Core", "Online"],
    status: "Pending"
  },
  {
    id: "aisha-noor",
    name: "Dr. Aisha Noor",
    role: "Nutritionist",
    goal: "General health",
    location: "Home visit",
    budget: "VIP",
    rating: 5,
    price: 620,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80",
    tags: ["Blood sugar", "Meal plans", "VIP"],
    status: "Verified"
  },
  {
    id: "samir-patel",
    name: "Samir Patel",
    role: "Physiotherapist",
    goal: "Recovery",
    location: "Home visit",
    budget: "Premium",
    rating: 4.9,
    price: 420,
    image: "https://images.unsplash.com/photo-1571019613914-85f342c1d0bb?auto=format&fit=crop&w=900&q=80",
    tags: ["Recovery", "Mobility", "Sports injury"],
    status: "Verified"
  },
  {
    id: "nadine-rossi",
    name: "Nadine Rossi",
    role: "Yoga Instructor",
    goal: "Stress management",
    location: "Hotel",
    budget: "Premium",
    rating: 4.8,
    price: 340,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    tags: ["Breathwork", "Stress", "Private"],
    status: "Verified"
  }
];

export const gyms = [
  {
    id: "peak-marina",
    name: "Peak District Marina",
    area: "Dubai Marina",
    price: "AED 499/mo",
    rating: "4.8",
    facilities: ["Pool", "Sauna", "Valet", "Classes"],
    description: "Premium strength floor, recovery lounge, reformer Pilates, and HYROX classes."
  },
  {
    id: "downtown-performance",
    name: "Downtown Performance Lab",
    area: "Downtown",
    price: "AED 650/mo",
    rating: "4.9",
    facilities: ["VO2 Max", "Sports science", "Boxing", "PT"],
    description: "Athletic performance gym with VO2 testing, coaching pods, and nutrition support."
  },
  {
    id: "jumeirah-wellness",
    name: "Jumeirah Wellness Club",
    area: "Jumeirah",
    price: "AED 390/mo",
    rating: "4.6",
    facilities: ["Yoga", "Pool", "Kids area", "Cafe"],
    description: "Quiet wellness club with yoga, swimming, mobility, and family memberships."
  }
];

export const initialBookings = [
  { id: "bk-1001", client: "Panashe", provider: "Maya Haddad", service: "Strength assessment", time: "Today 6:00 PM", status: "Requested", value: 380 },
  { id: "bk-1002", client: "Corporate demo", provider: "Nadine Rossi", service: "Stress reset", time: "Fri 8:00 AM", status: "Confirmed", value: 340 }
];

export const healthMetrics = [
  ["Weight", "84.2 kg", "-1.8 kg"],
  ["Body fat", "24.1%", "-2.2%"],
  ["Lean mass", "60.9 kg", "Stable"],
  ["Sleep", "72/100", "Needs recovery"],
  ["Resting HR", "58 bpm", "Excellent"],
  ["VO2 Max", "43", "+3.1%"]
];
