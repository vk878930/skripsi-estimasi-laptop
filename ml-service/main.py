from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
from sqlalchemy import create_engine
import os
import uvicorn

app = FastAPI(title="Laptop Price Estimator API")

# Database Connection (from backend .env mostly, but hardcoded here for simplicity or using env)
DB_URI = os.getenv("DB_URI", "postgresql://postgres:postgres@localhost:5432/skripsi_laptop")
engine = create_engine(DB_URI)

# Global variables for model
knn_model = None
scaler = None
model_columns = []

def train_model():
    global knn_model, scaler, model_columns
    print("Membaca data dari database untuk training KNN...")
    try:
        # Load from database
        df = pd.read_sql("SELECT merek, processor, ram, ssd, tahun, kondisi, harga_terjual as harga FROM item_penjualans", engine)
        
        if len(df) < 2:
            print("Data kurang untuk training, menggunakan data fallback sementara.")
            # Fallback dummy
            df = pd.DataFrame({
                "merek": ["Lenovo", "Asus", "Acer", "Lenovo", "Dell"],
                "processor": ["i5", "i7", "i3", "i5", "i5"],
                "ram": [8, 16, 4, 8, 8],
                "ssd": [256, 512, 256, 512, 256],
                "tahun": [2019, 2021, 2020, 2021, 2019],
                "kondisi": [4, 4, 3, 2, 4],
                "harga": [4500000, 12000000, 3000000, 3800000, 4200000]
            })

        # One-Hot Encoding untuk Merek dan Processor
        df_encoded = pd.get_dummies(df, columns=["merek", "processor"], drop_first=False)
        
        y = df_encoded["harga"]
        X = df_encoded.drop("harga", axis=1)

        # Simpan kolom yang digunakan untuk training
        model_columns = list(X.columns)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        n_neighbors = 2 if len(df) < 5 else 5
        knn_model = KNeighborsRegressor(n_neighbors=n_neighbors)
        knn_model.fit(X_scaled, y)
        print("Model berhasil di-training!")

    except Exception as e:
        print(f"Gagal koneksi atau training: {e}")

# Latih model saat startup
train_model()

# ==========================================
# 2. SCHEMA INPUT USER
# ==========================================
class SpesifikasiLaptop(BaseModel):
    merek: str
    processor: str
    ram: int
    ssd: int
    tahun: int
    kondisi: int

# ==========================================
# 3. ROUTING / ENDPOINT API
# ==========================================
@app.get("/")
def home():
    return {"message": "Service ML Aktif!", "model_ready": knn_model is not None}

@app.post("/predict")
def prediksi_harga(spek: SpesifikasiLaptop):
    if knn_model is None or scaler is None:
        return {"status": "error", "message": "Model belum siap atau data kosong"}

    # Bentuk dataframe dari input
    input_df = pd.DataFrame([{
        "merek": spek.merek,
        "processor": spek.processor,
        "ram": spek.ram,
        "ssd": spek.ssd,
        "tahun": spek.tahun,
        "kondisi": spek.kondisi
    }])

    # Lakukan One-Hot Encoding sesuai format input
    input_encoded = pd.get_dummies(input_df, columns=["merek", "processor"], drop_first=False)

    # Menyesuaikan kolom dengan data training
    # Tambahkan kolom yang hilang dengan nilai 0
    for col in model_columns:
        if col not in input_encoded.columns:
            input_encoded[col] = 0
            
    # Pastikan urutan kolom sesuai dengan saat training
    input_encoded = input_encoded[model_columns]

    input_scaled = scaler.transform(input_encoded)
    prediksi = knn_model.predict(input_scaled)
   
    return {
        "status": "success",
        "spesifikasi_input": spek.model_dump(),
        "estimasi_harga_rupiah": int(prediksi[0])
    }

@app.post("/retrain")
def retrain():
    train_model()
    return {"message": "Model berhasil dilatih ulang berdasarkan data database terbaru!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)