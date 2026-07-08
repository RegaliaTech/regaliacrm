import type { CustomerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { mockCustomers } from "@/lib/mock";

export type CustomerView = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: CustomerStatus;
  tags: string[];
  ownerId: string | null;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaCustomerRow = Awaited<ReturnType<typeof fetchCustomerRows>>[number];

function fetchCustomerRows() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function normalize(row: PrismaCustomerRow): CustomerView {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    status: row.status,
    tags: row.tags ?? [],
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCustomers(): Promise<CustomerView[]> {
  const res = await safeQuery(
    async () => (await fetchCustomerRows()).map(normalize),
    mockCustomers,
  );
  return res.data;
}
