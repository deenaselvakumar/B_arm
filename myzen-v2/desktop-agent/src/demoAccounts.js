const { createHash } = require('crypto')

// Same ids as supabase/seed.sql (scripts/generate-seed.mjs), so demo-mode data lines up if you later connect Supabase.
const uid = (key) => {
  const h = createHash('sha1').update(`myzenv2:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const DEMO_ACCOUNTS = [
  ['chandru', 'Chandru P', 'chandru.p@barm.in', 'Engineering', 'Senior Developer'],
  ['deena', 'Deena Selvakumar', 'deena.s@barm.in', 'Engineering', 'Full Stack Developer'],
  ['arun', 'Arun Kumar', 'arun.k@barm.in', 'AI/ML', 'ML Engineer'],
  ['priya', 'Priya Sharma', 'priya.s@barm.in', 'Design', 'UI/UX Designer'],
  ['vikram', 'Vikram Singh', 'vikram.s@barm.in', 'Product', 'Product Manager'],
  ['meera', 'Meera Nair', 'meera.n@barm.in', 'AI/ML', 'Data Analyst'],
  ['riya', 'Riya Menon', 'riya.menon@barm.in', 'Engineering', 'Associate Engineer'],
].map(([key, name, email, department, role]) => ({ id: uid(key), name, email, department, role }))

module.exports = { DEMO_ACCOUNTS }
