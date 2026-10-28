import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addHours, subHours, addDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Northfield University CampusShare database...");

  // 1. Seed Users
  const alicePass = await bcrypt.hash("Alice2024!", 10);
  const bobPass = await bcrypt.hash("Bob2024!", 10);
  const carolPass = await bcrypt.hash("Carol2024!", 10);
  const davePass = await bcrypt.hash("Dave2024!", 10);
  const evePass = await bcrypt.hash("Eve2024!", 10);
  const frankPass = await bcrypt.hash("Frank2024!", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@northfield.edu" },
    update: {},
    create: {
      email: "alice@northfield.edu",
      name: "Alice Johnson",
      password: alicePass,
      role: "STUDENT",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 150,
      strikes: 0,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@northfield.edu" },
    update: {},
    create: {
      email: "bob@northfield.edu",
      name: "Bob Martinez",
      password: bobPass,
      role: "STUDENT",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 75,
      strikes: 1,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@northfield.edu" },
    update: {},
    create: {
      email: "carol@northfield.edu",
      name: "Dr. Carol Zhang",
      password: carolPass,
      role: "RESEARCHER",
      department: "Biology",
      verified: true,
      emailVerified: true,
      credits: 350,
      strikes: 0,
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: "dave@northfield.edu" },
    update: {},
    create: {
      email: "dave@northfield.edu",
      name: "Prof. Dave Miller",
      password: davePass,
      role: "OWNER",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 500,
      strikes: 0,
    },
  });

  const eve = await prisma.user.upsert({
    where: { email: "eve@northfield.edu" },
    update: {},
    create: {
      email: "eve@northfield.edu",
      name: "Eve Sinclair",
      password: evePass,
      role: "MANAGER",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 500,
      strikes: 0,
    },
  });

  const frank = await prisma.user.upsert({
    where: { email: "frank@northfield.edu" },
    update: {},
    create: {
      email: "frank@northfield.edu",
      name: "Frank Reynolds (Dean of Facilities)",
      password: frankPass,
      role: "ADMIN",
      department: "Campus",
      verified: true,
      emailVerified: true,
      credits: 1000,
      strikes: 0,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Seed Trainings
  const laserTraining = await prisma.training.upsert({
    where: { code: "ENG-TR-01" },
    update: {},
    create: {
      name: "Epilog Laser Cutter Safety & Operation",
      code: "ENG-TR-01",
      description: "Covers laser optics safety, exhaust ventilation checks, vector cutting settings, and fire mitigation protocols.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const printingTraining = await prisma.training.upsert({
    where: { code: "ENG-TR-02" },
    update: {},
    create: {
      name: "Additive Manufacturing & 3D Printing Certification",
      code: "ENG-TR-02",
      description: "Covers FDM/SLA slicer setup, bed leveling, heated nozzle handling, and resin wash/cure protocols.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const bsl2Training = await prisma.training.upsert({
    where: { code: "BIO-TR-01" },
    update: {},
    create: {
      name: "Biosafety Level 2 (BSL-2) Protocol & Waste Disposal",
      code: "BIO-TR-01",
      description: "Mandatory certification for handling human cell lines, viral vectors, autoclave sterilization, and biohazard containment.",
      department: "Biology",
      validDurationDays: 365,
    },
  });

  const hpcTraining = await prisma.training.upsert({
    where: { code: "CS-TR-01" },
    update: {},
    create: {
      name: "HPC Cluster & Slurm Workload Manager",
      code: "CS-TR-01",
      description: "Covers batch job scheduling, multi-GPU allocation, shared scratch filesystem etiquette, and CUDA environment modules.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const mediaTraining = await prisma.training.upsert({
    where: { code: "MED-TR-01" },
    update: {},
    create: {
      name: "Cinema Cameras & Studio Audio Systems",
      code: "MED-TR-01",
      description: "Covers cinema sensor care, XLR phantom power routing, studio acoustic isolation, and equipment inventory checkouts.",
      department: "Media",
      validDurationDays: 365,
    },
  });

  console.log("Trainings seeded.");

  // 3. Seed Certifications
  // Alice has: Laser + 3D Printing
  await prisma.userCertification.upsert({
    where: { id: "cert-alice-laser" },
    update: {},
    create: {
      id: "cert-alice-laser",
      userId: alice.id,
      trainingId: laserTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 300),
      documentNote: "Completed hands-on workshop with Lab Tech Jenkins on 2024-09-15.",
      verifiedById: frank.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-alice-3d" },
    update: {},
    create: {
      id: "cert-alice-3d",
      userId: alice.id,
      trainingId: printingTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 280),
      documentNote: "Completed Makerspace intro and test print evaluation.",
      verifiedById: frank.id,
    },
  });

  // Bob has: 3D printing (verified), and Laser is PENDING with document submitted!
  await prisma.userCertification.upsert({
    where: { id: "cert-bob-3d" },
    update: {},
    create: {
      id: "cert-bob-3d",
      userId: bob.id,
      trainingId: printingTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 180),
      documentNote: "Online tutorial completed. Tested on Prusa MK3.",
      verifiedById: eve.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-bob-laser-pending" },
    update: {},
    create: {
      id: "cert-bob-laser-pending",
      userId: bob.id,
      trainingId: laserTraining.id,
      status: "PENDING",
      expiresAt: null,
      documentNote: "Attended safety lecture #102 on Monday. Certificate of completion issued by Northfield Safety Board #NF-9821.",
      verifiedById: null,
    },
  });

  // Carol has: BSL-2 + HPC
  await prisma.userCertification.upsert({
    where: { id: "cert-carol-bsl2" },
    update: {},
    create: {
      id: "cert-carol-bsl2",
      userId: carol.id,
      trainingId: bsl2Training.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 350),
      documentNote: "NIH Biosafety Compliance verification on record.",
      verifiedById: frank.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-carol-hpc" },
    update: {},
    create: {
      id: "cert-carol-hpc",
      userId: carol.id,
      trainingId: hpcTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 360),
      documentNote: "PI cluster access grant approval.",
      verifiedById: frank.id,
    },
  });

  console.log("Certifications seeded.");

  // 4. Seed Resources (12 realistic campus resources)
  const defaultAvailability = JSON.stringify([
    { dayOfWeek: 1, start: "08:00", end: "21:00" },
    { dayOfWeek: 2, start: "08:00", end: "21:00" },
    { dayOfWeek: 3, start: "08:00", end: "21:00" },
    { dayOfWeek: 4, start: "08:00", end: "21:00" },
    { dayOfWeek: 5, start: "08:00", end: "21:00" },
    { dayOfWeek: 6, start: "10:00", end: "18:00" },
  ]);

  const resourcesData = [
    {
      id: "res-laser-cutter",
      name: "Epilog Fusion Pro 48 Laser Cutter",
      type: "EQUIPMENT",
      category: "Digital Fabrication",
      location: "Engineering Building, Workshop B-12",
      description: "High-precision 80W CO2 laser cutter and engraver. Ideal for acrylic, MDF, Delrin, and cardboard architectural models. 1200 DPI resolution.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      rules: "Strictly NO PVC or vinyl cutting. Fume extraction must be turned on prior to laser firing. Never leave unattended while operating.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 20,
      creditCostPerHour: 10,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: laserTraining.id,
    },
    {
      id: "res-ultimaker-3d",
      name: "UltiMaker S5 Dual Extruder 3D Printer",
      type: "EQUIPMENT",
      category: "Rapid Prototyping",
      location: "Engineering Makerspace, Room 102",
      description: "Industrial-grade dual extrusion 3D printer supporting PLA, Tough PLA, ABS, and soluble PVA supports for complex engineering geometries.",
      image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
      rules: "Clean build plate with isopropyl alcohol before and after each print. Use only certified filament reels.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 8,
      maxBookingsPerWeek: 4,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: printingTraining.id,
    },
    {
      id: "res-formlabs-sla",
      name: "Formlabs Form 3+ SLA Resin 3D Printer",
      type: "EQUIPMENT",
      category: "Precision Prototyping",
      location: "Engineering Makerspace, Room 104",
      description: "High-accuracy stereolithography (SLA) resin printer. 25-micron resolution ideal for miniature microfluidics and jewelry prototypes.",
      image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
      rules: "Nitrile gloves and UV safety glasses required at all times. Wash and cure parts in designated Form Wash station only.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: true,
      depositCredits: 15,
      creditCostPerHour: 8,
      maxHoursPerBooking: 6,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: printingTraining.id,
    },
    {
      id: "res-keysight-oscilloscope",
      name: "Keysight Infiniium 4-Channel Mixed Signal Oscilloscope",
      type: "TOOL",
      category: "Electronics & Diagnostics",
      location: "Electrical Engineering Lab, Station 4",
      description: "1 GHz bandwidth, 5 GSa/s real-time sample rate with protocol decoding (I2C, SPI, CAN, UART). Includes active differential probes.",
      image: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80",
      rules: "Return all probes to protective cases. Do not exceed max input voltage ratings (+/- 30V peak).",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 4,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 5,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-dgx-compute",
      name: "NVIDIA DGX A100 AI Compute Node (4x A100 80GB)",
      type: "COMPUTE",
      category: "AI & Machine Learning",
      location: "Northfield Data Center, Rack 14",
      description: "Dedicated node with 4x NVIDIA A100 Tensor Core GPUs, 1.2TB system memory, NVLink, and direct PyTorch / JAX multi-GPU cluster support.",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
      rules: "Slurm jobs only. Long jobs (>6h) must run overnight during non-peak hours. Store checkpoints in persistent scratch.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 30,
      creditCostPerHour: 15,
      maxHoursPerBooking: 12,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: hpcTraining.id,
      requiredRole: "RESEARCHER",
    },
    {
      id: "res-sony-fx6",
      name: "Sony FX6 Cinema 4K Camera Production Kit",
      type: "EQUIPMENT",
      category: "Audiovisual Production",
      location: "Media Arts Center, Checkout Cage",
      description: "Full-frame 4K camera kit with 24-70mm GM f/2.8 zoom lens, wireless lavalier mics, Pelican case, and 2x 160GB CFexpress Type A cards.",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      rules: "Campus use only unless off-campus travel waiver signed by Department Head. Inspect lens coating prior to checkout.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 35,
      creditCostPerHour: 10,
      maxHoursPerBooking: 8,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: mediaTraining.id,
    },
    {
      id: "res-podcast-studio",
      name: "Soundproof Podcast & Broadcast Studio",
      type: "SPACE",
      category: "Audio Production",
      location: "Media Arts Building, Room 210",
      description: "Acoustically isolated room equipped with 4x Shure SM7B dynamic microphones, Rodecaster Pro II mixer, headphones, and multi-track DAWs.",
      image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
      rules: "No food or sugary beverages allowed inside sound booth. Leave audio cables neatly coiled on wall hangers.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 3,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-eppendorf-hood",
      name: "Eppendorf BSL-2 Cell Culture Biosafety Cabinet",
      type: "SPACE",
      category: "Biotechnology & Wet Lab",
      location: "Life Sciences Complex, Lab 310",
      description: "Class II Type A2 laminar flow biosafety cabinet with HEPA filtration, integrated UV decontamination lamp, and gas connection.",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
      rules: "30-minute UV sterilization mandatory post-session. Dispose of biological sharps in rigid red biohazard bins only.",
      ownerId: carol.id,
      department: "Biology",
      requiresSupervision: true,
      depositCredits: 20,
      creditCostPerHour: 8,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: bsl2Training.id,
    },
    {
      id: "res-zeiss-microscope",
      name: "Zeiss Axio Observer Inverted Fluorescence Microscope",
      type: "EQUIPMENT",
      category: "Microscopy & Imaging",
      location: "Bio-Imaging Center, Suite 105",
      description: "Inverted motorized research microscope for live-cell imaging with DAPI, GFP, RFP filter cubes, and incubation chamber.",
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
      rules: "Never touch objective lenses with fingers. Clean immersion oil with lens tissue and ether/alcohol only.",
      ownerId: carol.id,
      department: "Biology",
      requiresSupervision: true,
      depositCredits: 25,
      creditCostPerHour: 12,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: bsl2Training.id,
    },
    {
      id: "res-seminar-room",
      name: "Collaborative Innovation & Design Thinking Lab",
      type: "SPACE",
      category: "Presentation & Workshops",
      location: "Main Library, 2nd Floor, Room 204",
      description: "Modular space with 4x mobile rolling whiteboards, 85-inch 4K touchscreen monitor with wireless AirPlay/Miracast, and seating for 24.",
      image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80",
      rules: "Wipe down whiteboards at the conclusion of session. Rearrange tables and chairs back to standard workshop configuration.",
      ownerId: frank.id,
      department: "Library",
      requiresSupervision: false,
      depositCredits: 0,
      creditCostPerHour: 0,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 4,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-vr-sandbox",
      name: "Spatial Computing & VR Development Sandbox",
      type: "SPACE",
      category: "Virtual & Augmented Reality",
      location: "Innovation Commons, Room 14",
      description: "5m x 5m tracked playspace with Meta Quest Pro, Apple Vision Pro developer kit, and high-performance RTX 4090 simulation rig.",
      image: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80",
      rules: "Sanitize VR headstraps and face cushions with alcohol wipes after each user. Clear play boundary of trip hazards.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 3,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-haas-cnc",
      name: "Haas Mini Mill 3-Axis CNC Machining Center",
      type: "EQUIPMENT",
      category: "Subtractive Machining",
      location: "Machine Shop Bay 1",
      description: "High-precision 3-axis CNC vertical milling machine with 10-tool automatic changer for aluminum, brass, and plastics.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      rules: "Eye and ear protection mandatory. Machine shop technician must review G-code simulation before cycle start.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: true,
      depositCredits: 30,
      creditCostPerHour: 15,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 2,
      status: "MAINTENANCE", // Currently undergoing scheduled spindle service
      availabilityWindows: defaultAvailability,
      trainingRequiredId: laserTraining.id,
    },
  ];

  for (const r of resourcesData) {
    const { trainingRequiredId, requiredRole, ...resourceFields } = r;

    const resource = await prisma.resource.upsert({
      where: { id: resourceFields.id },
      update: resourceFields,
      create: resourceFields,
    });

    // Create requirements if specified
    if (trainingRequiredId || requiredRole) {
      await prisma.resourceRequirement.deleteMany({
        where: { resourceId: resource.id },
      });

      await prisma.resourceRequirement.create({
        data: {
          resourceId: resource.id,
          trainingId: trainingRequiredId || null,
          requiredRole: requiredRole || null,
        },
      });
    }
  }

  console.log("12 Resources seeded.");

  // 5. Seed Realistic Bookings demonstrating full lifecycle:
  // Clean old demo bookings to prevent primary key / unique collisions
  await prisma.auditLog.deleteMany({});
  await prisma.conditionReport.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.booking.deleteMany({});

  const now = new Date();

  // Booking A: OVERDUE booking (Bob Martinez borrowed oscilloscope 4 hours ago, was supposed to return 1 hour ago)
  const overdueStart = subHours(now, 4);
  const overdueEnd = subHours(now, 1);
  const bookingOverdue = await prisma.booking.create({
    data: {
      id: "booking-demo-overdue",
      userId: bob.id,
      resourceId: "res-keysight-oscilloscope",
      start: overdueStart,
      end: overdueEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Senior capstone power supply transient ripple measurement",
      status: "OVERDUE",
      priorityScore: 95.0,
      priorityBreakdown: JSON.stringify({
        baseScore: 100,
        recentHours30d: 4,
        recentUsagePenalty: 10,
        waitlistAgeBonus: 0,
        purposeBonus: 20,
        strikesPenalty: 25,
        roleBonus: 10,
        finalScore: 95.0,
      }),
      depositHeld: 10,
    },
  });

  // Add check-in condition report for Bob's overdue booking
  await prisma.conditionReport.create({
    data: {
      bookingId: bookingOverdue.id,
      phase: "CHECK_IN",
      rating: 4,
      checklist: JSON.stringify(["Equipment powered on", "Probes calibrated", "No physical casing cracks"]),
      notes: "Cables slightly tangled upon pickup but device functions properly.",
      recordedById: bob.id,
      createdAt: overdueStart,
    },
  });

  // Add DELAY Incident for the overdue booking
  const delayIncident = await prisma.incident.create({
    data: {
      id: "incident-demo-delay",
      bookingId: bookingOverdue.id,
      resourceId: "res-keysight-oscilloscope",
      reporterId: dave.id,
      type: "DELAY",
      severity: "HIGH",
      description: "Equipment was due back 1 hour ago at Station 4. Another lab team is waiting to calibrate their circuits.",
      aiSummary: "Delay incident on Keysight Oscilloscope. Borrower Bob Martinez has exceeded the return window by over an hour. Immediate return required.",
      status: "OPEN",
    },
  });

  // Booking B: Active session checked-in right now (Alice with 3D printer)
  const activeStart = subHours(now, 1);
  const activeEnd = addHours(now, 3);
  const bookingActive = await prisma.booking.create({
    data: {
      id: "booking-demo-active",
      userId: alice.id,
      resourceId: "res-ultimaker-3d",
      start: activeStart,
      end: activeEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Robotics arm gear mechanism prototype print",
      status: "CHECKED_IN",
      priorityScore: 120.0,
      decisionReason: "Approved for senior robotics capstone project.",
      reviewerId: dave.id,
      depositHeld: 10,
    },
  });

  await prisma.conditionReport.create({
    data: {
      bookingId: bookingActive.id,
      phase: "CHECK_IN",
      rating: 5,
      checklist: JSON.stringify(["Build plate clean and leveled", "Filament loaded smoothly", "No nozzle residue"]),
      notes: "Machine is in pristine condition. Extruder temperature stable at 210C.",
      recordedById: alice.id,
      createdAt: activeStart,
    },
  });

  // Booking C & D: WAITLIST COMPETITION!
  // Same slot tomorrow 14:00 - 16:00 on the Epilog Laser Cutter
  const tomorrow2PM = new Date(now);
  tomorrow2PM.setDate(tomorrow2PM.getDate() + 1);
  tomorrow2PM.setHours(14, 0, 0, 0);
  const tomorrow4PM = new Date(tomorrow2PM);
  tomorrow4PM.setHours(16, 0, 0, 0);

  // Booking C: Carol Zhang has APPROVED slot (High priority: 135)
  const bookingApprovedCarol = await prisma.booking.create({
    data: {
      id: "booking-demo-carol-approved",
      userId: carol.id,
      resourceId: "res-laser-cutter",
      start: tomorrow2PM,
      end: tomorrow4PM,
      purpose: "RESEARCH",
      purposeDetails: "Microfluidic chip PMMA substrate etching for NSF grant assay",
      status: "APPROVED",
      priorityScore: 135.0,
      decisionReason: "Approved: high-impact biology research priority.",
      reviewerId: dave.id,
      depositHeld: 20,
    },
  });

  // Booking D: Alice is WAITLISTED for the same slot (priority: 110, position #1)
  const bookingWaitlistedAlice = await prisma.booking.create({
    data: {
      id: "booking-demo-alice-waitlist",
      userId: alice.id,
      resourceId: "res-laser-cutter",
      start: tomorrow2PM,
      end: tomorrow4PM,
      purpose: "COURSEWORK",
      purposeDetails: "Aerospace wing rib section cutting for drone chassis",
      status: "WAITLISTED",
      waitlistPosition: 1,
      priorityScore: 110.0,
      depositHeld: 20,
    },
  });

  // Booking E: Pending review for Manager/Owner review queue
  const dayAfterTomorrow = addDays(now, 2);
  dayAfterTomorrow.setHours(10, 0, 0, 0);
  const dayAfterEnd = new Date(dayAfterTomorrow);
  dayAfterEnd.setHours(12, 0, 0, 0);

  await prisma.booking.create({
    data: {
      id: "booking-demo-pending-review",
      userId: alice.id,
      resourceId: "res-podcast-studio",
      start: dayAfterTomorrow,
      end: dayAfterEnd,
      purpose: "CLUB",
      purposeDetails: "Campus engineering podcast episode 12 recording",
      status: "PENDING",
      priorityScore: 105.0,
      depositHeld: 10,
    },
  });

  // Booking F: Completed return with DAMAGE incident draft
  const yesterdayStart = subHours(now, 26);
  const yesterdayEnd = subHours(now, 22);

  const returnedBooking = await prisma.booking.create({
    data: {
      id: "booking-demo-damaged-return",
      userId: bob.id,
      resourceId: "res-sony-fx6",
      start: yesterdayStart,
      end: yesterdayEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Campus documentary short film shoot",
      status: "RETURNED",
      priorityScore: 85.0,
      depositHeld: 35,
    },
  });

  await prisma.conditionReport.create({
    data: {
      bookingId: returnedBooking.id,
      phase: "CHECK_IN",
      rating: 5,
      checklist: JSON.stringify(["Camera powers on", "Lens front glass clean", "CFexpress cards formatted"]),
      notes: "All equipment received in mint condition from cage.",
      recordedById: bob.id,
      createdAt: yesterdayStart,
    },
  });

  await prisma.conditionReport.create({
    data: {
      bookingId: returnedBooking.id,
      phase: "CHECK_OUT",
      rating: 3,
      checklist: JSON.stringify(["Camera powers on", "CFexpress cards returned"]),
      notes: "Front UV filter has a visible scratch and lens hood mount is loose.",
      recordedById: bob.id,
      createdAt: yesterdayEnd,
    },
  });

  const damageIncident = await prisma.incident.create({
    data: {
      id: "incident-demo-damage",
      bookingId: returnedBooking.id,
      resourceId: "res-sony-fx6",
      reporterId: eve.id,
      type: "DAMAGE",
      severity: "MEDIUM",
      description: "Condition rating dropped from 5/5 at check-in to 3/5 at return. Scratch observed on 24-70mm lens UV protection filter.",
      aiSummary: "Damage reported on Sony FX6 Kit. Front filter scratched during student shoot. Hardware functional but replacement filter ($65) recommended. Manager review required.",
      status: "UNDER_REVIEW",
    },
  });

  // Seed sample Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: bob.id,
        type: "OVERDUE",
        message: "ALERT: Your booking for 'Keysight Infiniium Oscilloscope' is overdue. Please return immediately.",
        link: `/bookings/${bookingOverdue.id}`,
      },
      {
        userId: alice.id,
        type: "WAITLIST_PLACED",
        message: "You are #1 on the waitlist for 'Epilog Fusion Pro 48 Laser Cutter' for tomorrow 14:00 - 16:00.",
        link: `/bookings/${bookingWaitlistedAlice.id}`,
      },
      {
        userId: dave.id,
        type: "BOOKING_REVIEW_REQUIRED",
        message: "New booking request from Alice Johnson for Podcast Studio awaits your review.",
        link: "/manage",
      },
      {
        userId: eve.id,
        type: "INCIDENT_ALERT",
        message: "Damage incident on Sony FX6 Camera Kit requires your manager review and penalty assessment.",
        link: `/incidents/${damageIncident.id}`,
      },
    ],
  });

  // Seed sample Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: frank.id,
        action: "CERTIFICATION_VERIFIED",
        entityType: "UserCertification",
        entityId: "cert-alice-laser",
        reason: "Completed hands-on safety session with lab tech.",
      },
      {
        actorId: dave.id,
        action: "BOOKING_APPROVED",
        entityType: "Booking",
        entityId: bookingApprovedCarol.id,
        reason: "Approved: high-impact biology research priority.",
      },
      {
        actorId: alice.id,
        action: "BOOKING_CHECKED_IN",
        entityType: "Booking",
        entityId: bookingActive.id,
        reason: "User recorded check-in condition report (Rating: 5/5).",
      },
      {
        actorId: null,
        action: "BOOKING_MARKED_OVERDUE",
        entityType: "Booking",
        entityId: bookingOverdue.id,
        reason: "Automated sweep: scheduled return time elapsed.",
      },
    ],
  });

  console.log("Full seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
