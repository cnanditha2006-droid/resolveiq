import 'dotenv/config'
import crypto from 'node:crypto'

// Developer tool: fills an empty database with realistic demo data through the real API,
// so duplicate detection, rate limits and the audit log behave exactly as in normal use.
// The server must be running. Start from a clean database: npm run reset:data -- --yes

const base = `http://localhost:${process.env.PORT || 5001}/api`
// A fresh random password for the demo accounts, shown once at the end.
const password = crypto.randomBytes(12).toString('hex')

async function call(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    // some responses have no body
  }
  return { status: res.status, data }
}

// Throws a readable error if a step did not work.
function expectStatus(res, status, label) {
  if (res.status !== status) {
    throw new Error(`${label} failed (HTTP ${res.status}): ${res.data.message || 'no message'}`)
  }
  return res.data
}

const PEOPLE = {
  priya: { name: 'Priya Nair', email: 'priya.nair@example.com' },
  rahul: { name: 'Rahul Mehta', email: 'rahul.mehta@example.com' },
  meera: { name: 'Meera Pillai', email: 'meera.pillai@example.com' },
  sana: { name: 'Sana Khan', email: 'sana.khan@example.com' },
  vikram: { name: 'Vikram Das', email: 'vikram.das@example.com' },
}

const TICKETS = [
  ['priya', 'p1', {
    title: 'Laptop battery drains within an hour',
    description: 'Since the latest update my laptop battery drains from full to empty in about an hour, even when idle.',
    category: 'Hardware', priority: 'High',
  }],
  ['priya', 'p2', {
    title: 'VPN disconnects every few minutes',
    description: 'The company VPN drops my connection every few minutes, so remote downloads keep failing.',
    category: 'Network', priority: 'Medium',
  }],
  // Nearly the same wording as p1, so it is flagged as a possible duplicate.
  ['priya', 'p3', {
    title: 'Laptop battery drains within an hour',
    description: 'Since the latest update my laptop battery drains from full to empty in about an hour, even when idle. Please help.',
    category: 'Hardware', priority: 'High',
  }],
  ['rahul', 'r1', {
    title: 'Shared drive is read only',
    description: 'I cannot save changes to files on the shared finance drive. Every save shows a read only error.',
    category: 'Software', priority: 'Medium',
  }],
  ['rahul', 'r2', {
    title: 'Request for a second monitor',
    description: 'Please arrange a second monitor for my desk to help with spreadsheet work.',
    category: 'Hardware', priority: 'Low',
  }],
  ['rahul', 'r3', {
    title: 'Email signature missing on mobile',
    description: 'Emails sent from my phone lose the standard company signature block.',
    category: 'Software', priority: 'Low',
  }],
  // The fourth ticket within two minutes triggers the rapid-submission flag.
  ['rahul', 'r4', {
    title: 'Conference room display will not connect',
    description: 'The projector in room B stays blank when I plug in my laptop before the weekly meeting.',
    category: 'Hardware', priority: 'Critical',
  }],
  ['meera', 'm1', {
    title: 'Printer on floor two jams constantly',
    description: 'The floor two printer jams on every second page of a large print job.',
    category: 'Hardware', priority: 'High',
  }],
  ['meera', 'm2', {
    title: 'Cannot log in to the HR portal',
    description: 'The HR portal says my account is locked after I changed my password yesterday.',
    category: 'Technical', priority: 'Critical',
  }],
  ['meera', 'm3', {
    title: 'Slow wifi in the east wing',
    description: 'Wifi speed drops below one megabit in the east wing during the afternoon.',
    category: 'Network', priority: 'Medium',
  }],
]

async function main() {
  const accounts = {}
  for (const [key, person] of Object.entries(PEOPLE)) {
    const res = await call('POST', '/auth/register', null, { ...person, password })
    if (res.status === 409) {
      throw new Error('Demo accounts already exist. Run: npm run reset:data -- --yes')
    }
    const data = expectStatus(res, 201, `Register ${person.name}`)
    accounts[key] = { ...person, id: data.user.id, token: data.token }
  }

  const adminLogin = await call('POST', '/auth/login', null, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })
  const admin = expectStatus(adminLogin, 200, 'Admin login').token

  // Promote two accounts to support agents, then log them in again.
  for (const key of ['sana', 'vikram']) {
    expectStatus(
      await call('PATCH', `/users/${accounts[key].id}/role`, admin, { role: 'agent' }),
      200,
      `Promote ${accounts[key].name}`,
    )
    const login = await call('POST', '/auth/login', null, { email: accounts[key].email, password })
    accounts[key].token = expectStatus(login, 200, `Log in ${accounts[key].name}`).token
  }

  const ids = {}
  for (const [owner, key, ticket] of TICKETS) {
    const res = await call('POST', '/tickets', accounts[owner].token, ticket)
    ids[key] = expectStatus(res, 201, `Create ticket ${key}`).ticket._id
  }

  const assign = async (key, agent) =>
    expectStatus(
      await call('PATCH', `/tickets/${ids[key]}/assign`, admin, { agentId: accounts[agent].id }),
      200,
      `Assign ${key}`,
    )
  const move = async (key, who, status, note) =>
    expectStatus(
      await call('PATCH', `/tickets/${ids[key]}/status`, who === 'admin' ? admin : accounts[who].token, { status, note }),
      200,
      `Move ${key} to ${status}`,
    )

  await assign('p1', 'sana')
  await assign('r1', 'sana')
  await assign('m2', 'sana')
  await assign('p2', 'vikram')
  await assign('m1', 'vikram')

  await move('p1', 'sana', 'In Progress')
  await move('m2', 'sana', 'In Progress')
  await move('r1', 'sana', 'In Progress')
  await move('r1', 'sana', 'Resolved', 'Shared drive permissions corrected for the finance group.')
  await move('r1', 'admin', 'Closed')
  await move('p2', 'vikram', 'In Progress')
  await move('p2', 'vikram', 'Resolved', 'Replaced the VPN profile and updated the client to the latest version.')
  await move('m1', 'vikram', 'In Progress')

  const stats = expectStatus(await call('GET', '/admin/stats', admin), 200, 'Stats')
  console.log(`Created ${stats.totals.tickets} tickets (expect 10) and ${stats.totals.pendingFlags} pending flags (expect 2).`)
  console.log('')
  console.log('Demo accounts (all use the same password, shown once):')
  for (const person of Object.values(PEOPLE)) console.log(`  ${person.email}`)
  console.log(`Password: ${password}`)
  console.log('Priya, Rahul and Meera are users. Sana and Vikram are support agents.')
}

try {
  await main()
} catch (err) {
  console.error('Seed failed:', err.message)
  process.exitCode = 1
}