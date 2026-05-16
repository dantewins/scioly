require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const p = new PrismaClient({ adapter })
const arg = process.argv[2] || ''
;(async () => {
  if (arg === 'token') {
    const t = await p.passwordSetupToken.findMany({ where: { userId: 'cmp8y4jiz0000e1ronked205f' } })
    console.log('TOKENS:', JSON.stringify(t, null, 2))
  } else if (arg === 'cats') {
    const cs = await p.hourCategory.findMany({ where: { season: { isActive: true } } })
    console.log(JSON.stringify(cs, null, 2))
  } else if (arg === 'assess') {
    const a = await p.assessment.findMany({ include: { prompts: { take: 10 } }, take: 3 })
    console.log(JSON.stringify(a, null, 2))
  } else if (arg === 'rosters') {
    const rs = await p.competitionRoster.findMany({ include: { assignments: { take: 3, include: { results: true } }, event: { select: { name: true } } } })
    console.log(JSON.stringify(rs, null, 2))
  } else if (arg === 'patch_prompt') {
    const id = process.argv[3]
    const r = await p.assessmentPrompt.update({
      where: { id },
      data: {
        responseType: 'MULTIPLE_CHOICE',
        choiceOptions: ['Iron', 'Copper', 'Gold', 'Silver'],
        correctChoiceIndex: 2,
      },
    })
    console.log(JSON.stringify(r, null, 2))
  } else if (arg === 'attempt') {
    const id = process.argv[3]
    const a = await p.assessmentAttempt.findUnique({ where: { id }, include: { responses: true } })
    console.log(JSON.stringify(a, null, 2))
  } else if (arg === 'announcement') {
    const id = process.argv[3]
    const a = await p.announcement.findUnique({ where: { id } })
    console.log(JSON.stringify(a, null, 2))
  } else if (arg === 'hour') {
    const id = process.argv[3]
    const h = await p.hourEntry.findUnique({ where: { id } })
    console.log(JSON.stringify(h, null, 2))
  }
  await p.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
