from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler

app = FastAPI(title="Laptop Price Estimator API")

# ==========================================
# 1. SETUP DATA DUMMY & TRAINING MODEL KNN
# ==========================================
data = {
    "RAM": [8, 8, 16, 4, 8],
    "SSD": [256, 512, 512, 256, 512],
    "Tahun": [2019, 2021, 2022, 2020, 2021],
    "Kondisi": [4, 3, 4, 2, 1], # 4=Mulus, 3=Lecet, 2=Minor, 1=Mayor
    "Harga": [4500000, 3800000, 12000000, 2100000, 3500000]
}
df = pd.DataFrame(data)

X = df[["RAM", "SSD", "Tahun", "Kondisi"]]
y = df["Harga"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

knn_model = KNeighborsRegressor(n_neighbors=2)
knn_model.fit(X_scaled, y)

# ==========================================
# 2. SCHEMA INPUT USER
# ==========================================
class SpesifikasiLaptop(BaseModel):
    ram: int
    ssd: int
    tahun: int
    kondisi: int

# ==========================================
# 3. ROUTING / ENDPOINT API
# ==========================================
@app.get("/")
def home():
    return {"message": "Service ML Aktif!"}

@app.post("/predict")
def prediksi_harga(spek: SpesifikasiLaptop):
    input_df = pd.DataFrame([[spek.ram, spek.ssd, spek.tahun, spek.kondisi]],
    columns=["RAM", "SSD", "Tahun", "Kondisi"])
   
    input_scaled = scaler.transform(input_df)
    prediksi = knn_model.predict(input_scaled)
   
    return {
        "status": "success",
        "spesifikasi_input": spek.model_dump(),
        "estimasi_harga_rupiah": int(prediksi[0])
    }