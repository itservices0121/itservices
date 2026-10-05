import { PrismaClient, Role, AssetType, AssetStatus, AssetCondition, RequestType, RequestStatus, IssueType, TicketStatus, Priority } from "@prisma/client";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting database seed...");

    // Generate unique random passwords
    const generatePassword = () => Math.random().toString(36).slice(-10);
    const passwords = {
        dean: generatePassword(),
        admin: generatePassword(),
        cseHod: generatePassword(),
        eceHod: generatePassword(),
        labIncharge1: generatePassword(),
        labIncharge2: generatePassword(),
    };

    // 1. Create Users
    console.log("Creating users...");

    const dean = await prisma.user.upsert({
        where: { email: "dean@example.com" },
        update: {},
        create: {
            email: "dean@example.com",
            name: "Dr. Robert Dean",
            password: await hash(passwords.dean, 10),
            role: Role.DEAN,
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: {
            email: "admin@example.com",
            name: "System Administrator",
            password: await hash(passwords.admin, 10),
            role: Role.ADMIN,
        },
    });

    // 2. Create Departments
    console.log("Creating departments...");

    const cseDept = await prisma.department.upsert({
        where: { code: "CSE" },
        update: {},
        create: {
            name: "Computer Science & Engineering",
            code: "CSE",
            description: "Department of Computer Science and Engineering",
        },
    });

    const eceDept = await prisma.department.upsert({
        where: { code: "ECE" },
        update: {},
        create: {
            name: "Electronics & Communication Engineering",
            code: "ECE",
            description: "Department of Electronics and Communication Engineering",
        },
    });

    const mechDept = await prisma.department.upsert({
        where: { code: "MECH" },
        update: {},
        create: {
            name: "Mechanical Engineering",
            code: "MECH",
            description: "Department of Mechanical Engineering",
        },
    });

    // 3. Create HODs
    console.log("Creating HODs...");

    const cseHod = await prisma.user.upsert({
        where: { email: "hod@example.com" },
        update: {},
        create: {
            email: "hod@example.com",
            name: "Dr. Sarah Johnson",
            password: await hash(passwords.cseHod, 10),
            role: Role.HOD,
            departmentId: cseDept.id,
        },
    });

    const eceHod = await prisma.user.upsert({
        where: { email: "hod.ece@example.com" },
        update: {},
        create: {
            email: "hod.ece@example.com",
            name: "Dr. Michael Chen",
            password: await hash(passwords.eceHod, 10),
            role: Role.HOD,
            departmentId: eceDept.id,
        },
    });

    // Update departments with HODs
    await prisma.department.update({
        where: { id: cseDept.id },
        data: { hodId: cseHod.id },
    });

    await prisma.department.update({
        where: { id: eceDept.id },
        data: { hodId: eceHod.id },
    });

    // 4. Create Labs
    console.log("Creating labs...");

    const cseLab1 = await prisma.lab.upsert({
        where: { code: "CSE-LAB-301" },
        update: {},
        create: {
            name: "Programming Lab 1",
            code: "CSE-LAB-301",
            departmentId: cseDept.id,
            capacity: 60,
            location: "Block A, 3rd Floor",
        },
    });

    const cseLab2 = await prisma.lab.upsert({
        where: { code: "CSE-LAB-302" },
        update: {},
        create: {
            name: "Data Structures Lab",
            code: "CSE-LAB-302",
            departmentId: cseDept.id,
            capacity: 50,
            location: "Block A, 3rd Floor",
        },
    });

    const eceLab1 = await prisma.lab.upsert({
        where: { code: "ECE-LAB-201" },
        update: {},
        create: {
            name: "Digital Electronics Lab",
            code: "ECE-LAB-201",
            departmentId: eceDept.id,
            capacity: 40,
            location: "Block B, 2nd Floor",
        },
    });

    // 5. Create Lab Incharges
    console.log("Creating lab incharges...");

    const labIncharge1 = await prisma.user.upsert({
        where: { email: "lab@example.com" },
        update: {},
        create: {
            email: "lab@example.com",
            name: "John Lab Tech",
            password: await hash(passwords.labIncharge1, 10),
            role: Role.LAB_INCHARGE,
            departmentId: cseDept.id,
            labId: cseLab1.id,
        },
    });

    const labIncharge2 = await prisma.user.upsert({
        where: { email: "lab.cse2@example.com" },
        update: {},
        create: {
            email: "lab.cse2@example.com",
            name: "Jane Smith",
            password: await hash(passwords.labIncharge2, 10),
            role: Role.LAB_INCHARGE,
            departmentId: cseDept.id,
            labId: cseLab2.id,
        },
    });

    // Update labs with incharges
    await prisma.lab.update({
        where: { id: cseLab1.id },
        data: { inchargeId: labIncharge1.id },
    });

    await prisma.lab.update({
        where: { id: cseLab2.id },
        data: { inchargeId: labIncharge2.id },
    });

    // 6. Create Assets
    console.log("Creating assets...");

    const assets = [];

    // CSE Lab 1 - 45 Desktops
    for (let i = 1; i <= 45; i++) {
        assets.push({
            assetNumber: `CSE-LAB301-PC${String(i).padStart(2, "0")}`,
            name: `Desktop PC ${i}`,
            type: AssetType.DESKTOP,
            category: "Computer",
            brand: "Dell",
            model: "OptiPlex 7090",
            status: i <= 42 ? AssetStatus.ACTIVE : AssetStatus.UNDER_MAINTENANCE,
            condition: AssetCondition.GOOD,
            processor: "Intel Core i7-12700",
            ram: "16GB DDR4",
            hdd: "512GB NVMe SSD",
            departmentId: cseDept.id,
            labId: cseLab1.id,
            location: "CSE Lab 301",
        });
    }

    // CSE Lab 2 - 40 Desktops
    for (let i = 1; i <= 40; i++) {
        assets.push({
            assetNumber: `CSE-LAB302-PC${String(i).padStart(2, "0")}`,
            name: `Desktop PC ${i}`,
            type: AssetType.DESKTOP,
            category: "Computer",
            brand: "HP",
            model: "ProDesk 600",
            status: i <= 38 ? AssetStatus.ACTIVE : AssetStatus.DAMAGED,
            processor: "Intel Core i5-11500",
            ram: "8GB DDR4",
            hdd: "256GB SSD",
            condition: AssetCondition.GOOD,
            departmentId: cseDept.id,
            labId: cseLab2.id,
            location: "CSE Lab 302",
        });
    }

    // Servers
    for (let i = 1; i <= 5; i++) {
        assets.push({
            assetNumber: `CSE-SRV-${String(i).padStart(2, "0")}`,
            name: `Application Server ${i}`,
            type: AssetType.SERVER,
            category: "Server",
            brand: "Dell",
            model: "PowerEdge R740",
            status: AssetStatus.ACTIVE,
            condition: AssetCondition.EXCELLENT,
            departmentId: cseDept.id,
            location: "Server Room",
        });
    }

    // Network Devices
    for (let i = 1; i <= 10; i++) {
        assets.push({
            assetNumber: `NET-RTR-${String(i).padStart(2, "0")}`,
            name: `Network Router ${i}`,
            type: AssetType.ROUTER,
            category: "Networking",
            brand: "Cisco",
            model: "ISR 4000",
            status: AssetStatus.ACTIVE,
            condition: AssetCondition.GOOD,
            departmentId: cseDept.id,
            location: "Network Room",
        });
    }

    await prisma.asset.createMany({
        data: assets,
        skipDuplicates: true,
    });

    // 7. Create Requests
    console.log("Creating requests...");

    const request1 = await prisma.request.upsert({
        where: { requestNumber: "REQ-2026-0001" },
        update: {},
        create: {
            requestNumber: "REQ-2026-0001",
            title: "New System Allocation for Lab 303",
            description: "Request for 50 new desktop systems for the newly setup Programming Lab 303",
            type: RequestType.NEW_SYSTEM,
            priority: Priority.HIGH,
            status: RequestStatus.PENDING,
            departmentId: cseDept.id,
            createdById: cseHod.id,
        },
    });

    const request2 = await prisma.request.upsert({
        where: { requestNumber: "REQ-2026-0002" },
        update: {},
        create: {
            requestNumber: "REQ-2026-0002",
            title: "Hardware Repair - Projector",
            description: "Projector in Lab 302 needs repair. Display is flickering.",
            type: RequestType.HARDWARE_REPAIR,
            priority: Priority.NORMAL,
            status: RequestStatus.APPROVED,
            departmentId: cseDept.id,
            createdById: cseHod.id,
            approvedById: dean.id,
            approvedAt: new Date(),
        },
    });

    // 8. Create Tickets
    console.log("Creating tickets...");

    const ticket1 = await prisma.ticket.upsert({
        where: { ticketNumber: "TKT-2026-0001" },
        update: {},
        create: {
            ticketNumber: "TKT-2026-0001",
            title: "Monitor not working - PC12",
            description: "Monitor on PC12 is not displaying anything. Power LED is on but screen is black.",
            issueType: IssueType.HARDWARE,
            priority: Priority.HIGH,
            status: TicketStatus.SUBMITTED,
            assetId: (await prisma.asset.findFirst({ where: { assetNumber: "CSE-LAB301-PC12" } }))?.id,
            departmentId: cseDept.id,
            labId: cseLab1.id,
            createdById: labIncharge1.id,
        },
    });

    const ticket2 = await prisma.ticket.upsert({
        where: { ticketNumber: "TKT-2026-0002" },
        update: {},
        create: {
            ticketNumber: "TKT-2026-0002",
            title: "Software Installation - VS Code",
            description: "Need to install Visual Studio Code on all systems in Lab 302",
            issueType: IssueType.SOFTWARE,
            priority: Priority.NORMAL,
            status: TicketStatus.PROCESSING,
            departmentId: cseDept.id,
            labId: cseLab2.id,
            createdById: labIncharge2.id,
            assignedToId: admin.id,
        },
    });

    const ticket3 = await prisma.ticket.upsert({
        where: { ticketNumber: "TKT-2026-0003" },
        update: {},
        create: {
            ticketNumber: "TKT-2026-0003",
            title: "Network connectivity issue",
            description: "Systems in Lab 301 are unable to connect to the internet",
            issueType: IssueType.NETWORK,
            priority: Priority.CRITICAL,
            status: TicketStatus.QUEUED,
            departmentId: cseDept.id,
            labId: cseLab1.id,
            createdById: labIncharge1.id,
        },
    });

    console.log("✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Users: ${await prisma.user.count()}`);
    console.log(`- Departments: ${await prisma.department.count()}`);
    console.log(`- Labs: ${await prisma.lab.count()}`);
    console.log(`- Assets: ${await prisma.asset.count()}`);
    console.log(`- Requests: ${await prisma.request.count()}`);
    console.log(`- Tickets: ${await prisma.ticket.count()}`);
    
    console.log("\n🔐 Initial Passwords (Save these, they are randomly generated and not stored!):");
    console.log(`  Dean: ${passwords.dean}`);
    console.log(`  Admin: ${passwords.admin}`);
    console.log(`  CSE HOD: ${passwords.cseHod}`);
    console.log(`  ECE HOD: ${passwords.eceHod}`);
    console.log(`  Lab Incharge 1: ${passwords.labIncharge1}`);
    console.log(`  Lab Incharge 2: ${passwords.labIncharge2}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("❌ Error seeding database:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
