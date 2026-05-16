require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const p = new PrismaClient({ adapter })
const arg = process.argv[2] || ''
;(async () => {
  if (arg === 'cats') {
    const cs = await p.hourCategory.findMany({ where: { season: { isActive: true } } })
    console.log(JSON.stringify(cs, null, 2))
  } else if (arg === 'rosters') {
    const rs = await p.competitionRoster.findMany({ include: { assignments: { take: 5 }, competition: { select: { name: true } } } })
    console.log(JSON.stringify(rs, null, 2))
  } else if (arg === 'comps') {
    const c = await p.competition.findMany()
    console.log(JSON.stringify(c, null, 2))
  } else if (arg === 'patch_prompt') {
    const id = process.argv[3]
    const r = await p.assessmentPrompt.update({
      where: { id },
      data: { responseType: 'MULTIPLE_CHOICE', choiceOptions: ['Iron','Copper','Gold','Silver'], correctChoiceIndex: 2 },
    })
    console.log(JSON.stringify(r, null, 2))
  } else if (arg === 'announcement') {
    const id = process.argv[3]
    const a = await p.announcement.findUnique({ where: { id } })
    console.log(JSON.stringify(a, null, 2))
  } else if (arg === 'assigns') {
    const id = process.argv[3]
    const a = await p.competitionEventAssignment.findUnique({ where: { id } })
    console.log(JSON.stringify(a, null, 2))
  } else if (arg === 'forgotemail') {
    const r = await p.passwordResetToken?.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
    console.log(JSON.stringify(r, null, 2))
  } else if (arg === 'clubs') {
    const c = await p.club.findMany()
    console.log(JSON.stringify(c, null, 2))
  }
  await p.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
