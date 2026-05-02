import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt



st.set_page_config(page_title="Sales Forecast Dashboard", layout="wide")

st.title("📊 Sales Forecast Dashboard")

# Load CSV
df = pd.read_csv("forecast_output.csv")

# Convert date
df['ds'] = pd.to_datetime(df['ds'])

# Rename columns
df = df.rename(columns={
    "ds": "Date",
    "yhat": "Predicted Orders",
    "yhat_lower": "Min Orders",
    "yhat_upper": "Max Orders"
})

# Sidebar filters
st.sidebar.header("🔍 Filters")
date_range = st.sidebar.date_input(
    "Select Date Range",
    [df['Date'].min(), df['Date'].max()]
)

df = df[(df['Date'] >= pd.to_datetime(date_range[0])) &
        (df['Date'] <= pd.to_datetime(date_range[1]))]

# 📊 KPIs
col1, col2, col3 = st.columns(3)

weekly = df['Predicted Orders'].tail(7).sum()
monthly = df['Predicted Orders'].tail(30).sum()

stock = st.sidebar.number_input("Enter Current Stock", value=100)
rfq = monthly - stock

col1.metric("📅 Weekly Demand", int(weekly))
col2.metric("📆 Monthly Demand", int(monthly))
col3.metric("📦 RFQ", int(rfq))

# 📈 Forecast Chart
st.subheader("📈 Forecast Trend")

fig, ax = plt.subplots()

ax.plot(df['Date'], df['Predicted Orders'], label="Prediction", linewidth=2)

# Confidence interval
ax.fill_between(
    df['Date'],
    df['Min Orders'],
    df['Max Orders'],
    alpha=0.2,
    label="Confidence Range"
)

ax.set_xlabel("Date")
ax.set_ylabel("Orders")
ax.legend()

plt.xticks(rotation=45)
st.pyplot(fig)

# 📊 Data Table
st.subheader("📋 Forecast Data")
st.dataframe(df.tail(30))

# 📦 Stock Insight
st.subheader("📦 Inventory Insight")

if rfq > 0:
    st.error(f"⚠️ You need to restock {int(rfq)} units")
else:
    st.success("✅ Stock is sufficient")

# 📊 Trend Insight
st.subheader("📊 Trend Analysis")

if weekly > (monthly / 4):
    st.success("📈 Demand is increasing")
else:
    st.warning("📉 Demand is stable or decreasing")