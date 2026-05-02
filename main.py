from supabase import create_client
import pandas as pd

url = "https://xedxytlrgxrdsfcngsaw.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlZHh5dGxyZ3hyZHNmY25nc2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjI0MzIsImV4cCI6MjA5MjU5ODQzMn0.9-tYA3bg0CyEyFDfO3tPL95ATFJWuWMG-T3WhvdtMQ4"

supabase = create_client(url, key)

data = supabase.table("sales_data").select("*").execute()
df = pd.DataFrame(data.data)
print(df.head())