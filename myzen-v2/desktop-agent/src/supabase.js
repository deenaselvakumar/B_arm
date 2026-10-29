require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

let supabase = null

function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase initialized')
    return true
  } else {
    console.log('Supabase not configured - using local storage only')
    return false
  }
}

function getSupabase() {
  return supabase
}

function isSupabaseEnabled() {
  return supabase !== null
}

module.exports = {
  initSupabase,
  getSupabase,
  isSupabaseEnabled
}
