import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Users ---------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@regalia.test" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@regalia.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@regalia.test" },
    update: {},
    create: {
      name: "Sales Rep",
      email: "sales@regalia.test",
      passwordHash,
      role: "SALES",
    },
  });

  // --- Products ------------------------------------------------------------
  const products = await Promise.all(
    [
      {
        sku: "RG-100",
        name: "Regalia Pump Model X100",
        model: "X100",
        figure: "Fig. 1-A",
        category: "Pumps",
        description: "High-efficiency centrifugal pump.",
        unitPrice: new Prisma.Decimal(1250.0),
        unitCost: new Prisma.Decimal(780.0),
        specs: { flowRate: "120 L/min", head: "45 m", power: "2.2 kW" },
      },
      {
        sku: "RG-200",
        name: "Regalia Valve V200",
        model: "V200",
        figure: "Fig. 2-C",
        category: "Valves",
        description: "Stainless steel control valve.",
        unitPrice: new Prisma.Decimal(340.0),
        unitCost: new Prisma.Decimal(190.0),
        specs: { size: "DN50", pressure: "16 bar", material: "SS316" },
      },
      {
        sku: "RG-300",
        name: "Regalia Controller C300",
        model: "C300",
        figure: "Fig. 5-B",
        category: "Controllers",
        description: "Programmable process controller.",
        unitPrice: new Prisma.Decimal(890.0),
        unitCost: new Prisma.Decimal(420.0),
        specs: { inputs: 8, outputs: 4, protocol: "Modbus RTU" },
      },
    ].map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: p,
      }),
    ),
  );

  // --- Customers -----------------------------------------------------------
  const acme = await prisma.customer.upsert({
    where: { id: "seed-acme" },
    update: {},
    create: {
      id: "seed-acme",
      name: "John Carter",
      company: "Acme Industrial",
      email: "john@acme.test",
      phone: "+1 555 0100",
      status: "ACTIVE",
      ownerId: sales.id,
      tags: ["manufacturing", "priority"],
      contacts: {
        create: [
          {
            name: "John Carter",
            title: "Procurement Manager",
            email: "john@acme.test",
            isPrimary: true,
          },
        ],
      },
      notes: {
        create: [
          { body: "Interested in bulk pump order.", authorId: sales.id },
        ],
      },
    },
  });

  await prisma.customer.upsert({
    where: { id: "seed-globex" },
    update: {},
    create: {
      id: "seed-globex",
      name: "Maria Lopez",
      company: "Globex Corp",
      email: "maria@globex.test",
      phone: "+1 555 0200",
      status: "LEAD",
      ownerId: sales.id,
      tags: ["new"],
    },
  });

  // --- Quotation -----------------------------------------------------------
  const existingQuote = await prisma.quotation.findUnique({
    where: { number: "Q-1001" },
  });

  if (!existingQuote) {
    const p1 = products[0];
    const p2 = products[1];
    const qty1 = new Prisma.Decimal(4);
    const qty2 = new Prisma.Decimal(10);
    const line1 = p1.unitPrice.mul(qty1);
    const line2 = p2.unitPrice.mul(qty2);
    const subtotal = line1.add(line2);
    const discountRate = new Prisma.Decimal(5);
    const taxRate = new Prisma.Decimal(8);
    const discountTotal = subtotal.mul(discountRate).div(100);
    const taxable = subtotal.sub(discountTotal);
    const taxTotal = taxable.mul(taxRate).div(100);
    const total = taxable.add(taxTotal);

    await prisma.quotation.create({
      data: {
        number: "Q-1001",
        customerId: acme.id,
        creatorId: sales.id,
        status: "SENT",
        taxRate,
        discountRate,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        notes: "Volume pricing applied.",
        issuedAt: new Date(),
        items: {
          create: [
            {
              productId: p1.id,
              description: p1.name,
              quantity: qty1,
              unitPrice: p1.unitPrice,
              lineTotal: line1,
              position: 0,
            },
            {
              productId: p2.id,
              description: p2.name,
              quantity: qty2,
              unitPrice: p2.unitPrice,
              lineTotal: line2,
              position: 1,
            },
          ],
        },
      },
    });
  }

  // --- Email Logs ---------------------------------------------------------
  await prisma.emailLog.create({
    data: {
      toEmail: "john@acme.test",
      subject: "Quotation Q-1001 - Pump Order",
      body: "Dear John,\n\nPlease find attached quotation Q-1001 for your recent inquiry.\n\nBest regards,\nSales Team",
      status: "SENT",
      sentAt: new Date(2026, 5, 15, 10, 30),
      customerId: acme.id,
      quotationId: existingQuote?.id,
      senderId: sales.id,
    },
  });

  await prisma.emailLog.create({
    data: {
      toEmail: "maria@globex.test",
      subject: "Welcome to Regalia",
      body: "Dear Maria,\n\nThank you for your interest in Regalia products.\n\nBest regards",
      status: "DRAFT",
      customerId: "seed-globex",
      senderId: sales.id,
    },
  });

  await prisma.emailLog.create({
    data: {
      toEmail: "invalid@nonexistent.test",
      subject: "Follow-up on inquiry",
      body: "This email failed to send due to invalid address.",
      status: "FAILED",
      customerId: acme.id,
      senderId: sales.id,
    },
  });

  // --- Follow-ups ----------------------------------------------------------
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(14, 0, 0, 0);

  await prisma.followUp.create({
    data: {
      caseSubject: "Check on Q-1001 acceptance",
      emailSubject: "Following up on your quotation",
      customerId: acme.id,
      scheduledAt: tomorrow,
      status: "SCHEDULED",
      useAi: true,
      emailBody: null,
      creatorId: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      caseSubject: "Introduce new valve models",
      emailSubject: "New Product Introduction - Valve Lineup",
      customerId: "seed-globex",
      scheduledAt: yesterday,
      status: "SCHEDULED", // Overdue!
      useAi: false,
      emailBody: "Hi Maria,\n\nI wanted to introduce our new valve lineup...",
      creatorId: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      caseSubject: "Post-delivery check-in",
      emailSubject: "How is everything going?",
      customerId: acme.id,
      scheduledAt: new Date(2026, 5, 10, 9, 0),
      status: "SENT",
      sentAt: new Date(2026, 5, 10, 9, 15),
      useAi: true,
      emailBody: "Hi John,\n\nJust following up on the recent delivery...",
      creatorId: sales.id,
    },
  });

  console.log("Seed complete.");
  console.log("Login: admin@regalia.test / password123  (ADMIN)");
  console.log("Login: sales@regalia.test / password123  (SALES)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
