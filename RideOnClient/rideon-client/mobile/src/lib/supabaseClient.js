import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://sxplumrexbolpwqacpiz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cGx1bXJleGJvbHB3cWFjcGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTE5MDAsImV4cCI6MjA5MDg4NzkwMH0.AoSGyKoTxhrIifboZtcr_5KRvD81x7Iw36MKswUq8X0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
