import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    const ownerEmail = "kimdanny0603@gmail.com";
    const plainPassword = "Musung0603!";

    const club = await prisma.club.upsert({
        where: { slug: "ppchs-scioly" },
        update: {
            name: "PPCHS Science Olympiad",
            schoolName: "Pembroke Pines Charter High School",
            description: "Main club record",
        },
        create: {
            name: "PPCHS Science Olympiad",
            slug: "ppchs-scioly",
            schoolName: "Pembroke Pines Charter High School",
            description: "Main club record",
        },
    });

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const owner = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: {
            clubId: club.id,
            role: UserRole.WEBSITE_OWNER,
            firstName: "Danny",
            lastName: "Kim",
            displayName: "dantewins",
            passwordHash,
        },
        create: {
            clubId: club.id,
            email: ownerEmail,
            passwordHash,
            role: UserRole.WEBSITE_OWNER,
            firstName: "Danny",
            lastName: "Kim",
            displayName: "dantewins",
        },
    });

    console.log("Created/updated owner:");
    console.log({
        id: owner.id,
        email: owner.email,
        role: owner.role,
        clubId: owner.clubId,
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });