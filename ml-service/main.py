from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
import re
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
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
df_original = None
current_k = None

def parse_processor(proc_str):
    proc_str = str(proc_str).lower()
    family = "other"
    gen = 0
    
    # Extract Family
    if "celeron" in proc_str: family = "celeron"
    elif "i3" in proc_str: family = "i3"
    elif "i5" in proc_str: family = "i5"
    elif "i7" in proc_str: family = "i7"
    elif "i9" in proc_str: family = "i9"
    elif "ryzen 3" in proc_str or "r3" in proc_str: family = "ryzen 3"
    elif "ryzen 5" in proc_str or "r5" in proc_str: family = "ryzen 5"
    elif "ryzen 7" in proc_str or "r7" in proc_str: family = "ryzen 7"
    elif "ryzen 9" in proc_str or "r9" in proc_str: family = "ryzen 9"
    elif "m1" in proc_str: family = "m1"
    elif "m2" in proc_str: family = "m2"
    elif "m3" in proc_str: family = "m3"
    
    # Extract Generation
    if "gen" in proc_str:
        match = re.search(r'gen\s*(\d+)', proc_str)
        if match: gen = int(match.group(1))
    elif family in ["i3", "i5", "i7", "i9"]:
        # Matches formats like i5-8350U -> gen 8, i7-10750H -> gen 10
        match = re.search(r'i\d[- ]?(\d+)\d\d\d', proc_str)
        if match: 
            gen = int(match.group(1))
        else:
            # Matches format like i5-8 or i5 8
            match = re.search(r'i\d[- ]?(\d{1,2})(?!\d)', proc_str)
            if match: gen = int(match.group(1))
    elif "ryzen" in family:
        # Matches format like Ryzen 5 3500U -> gen 3
        match = re.search(r'ryzen\s*\d\s*[- ]?(\d)\d\d\d', proc_str)
        if match: 
            gen = int(match.group(1))
        else:
            # Matches format like Ryzen 5 3
            match = re.search(r'ryzen\s*\d\s*[- ]?(\d{1})(?!\d)', proc_str)
            if match: gen = int(match.group(1))
            
    return pd.Series([family, gen])

def train_model():
    global knn_model, scaler, model_columns, df_original, current_k
    print("Membaca data dari database untuk training KNN...")
    try:
        # Load from database
        df = pd.read_sql("SELECT merek, processor, ram, ssd, tahun, kondisi, harga_terjual as harga FROM item_penjualans", engine)
        
        if len(df) < 2:
            print("Data kurang untuk training, menggunakan data fallback sementara.")
            # Fallback dummy
            df = pd.DataFrame({
                "merek": ["Lenovo", "Asus", "Acer", "Lenovo", "Dell"],
                "processor": ["i5-8250U", "i7-10750H", "i3-1005G1", "Ryzen 5 3500U", "i5-1135G7"],
                "ram": [8, 16, 4, 8, 8],
                "ssd": [256, 512, 256, 512, 256],
                "tahun": [2019, 2021, 2020, 2021, 2019],
                "kondisi": [4, 4, 3, 2, 4],
                "harga": [4500000, 12000000, 3000000, 3800000, 4200000]
            })

        df_original = df.copy()

        # Parse Processor into Family and Gen
        df[['proc_family', 'proc_gen']] = df['processor'].apply(parse_processor)
        df = df.drop(columns=['processor'])

        # One-Hot Encoding untuk Merek dan Processor
        df_encoded = pd.get_dummies(df, columns=["merek", "proc_family"], drop_first=False)
        
        y = df_encoded["harga"]
        X = df_encoded.drop("harga", axis=1)

        # Simpan kolom yang digunakan untuk training
        model_columns = list(X.columns)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        if current_k is not None:
            n_neighbors = current_k
        else:
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

    # Parse Processor into Family and Gen
    input_df[['proc_family', 'proc_gen']] = input_df['processor'].apply(parse_processor)
    input_df = input_df.drop(columns=['processor'])

    # Lakukan One-Hot Encoding sesuai format input
    input_encoded = pd.get_dummies(input_df, columns=["merek", "proc_family"], drop_first=False)

    # Menyesuaikan kolom dengan data training
    # Tambahkan kolom yang hilang dengan nilai 0
    for col in model_columns:
        if col not in input_encoded.columns:
            input_encoded[col] = 0
            
    # Pastikan urutan kolom sesuai dengan saat training
    input_encoded = input_encoded[model_columns]

    input_scaled = scaler.transform(input_encoded)
    prediksi = knn_model.predict(input_scaled)
   
    # Explainability (XAI): Get nearest neighbors
    distances, indices = knn_model.kneighbors(input_scaled)
    nearest_indices = indices[0]
    
    neighbors_list = []
    if df_original is not None:
        for idx in nearest_indices:
            if idx < len(df_original):
                row = df_original.iloc[idx]
                neighbors_list.append({
                    "merek": str(row["merek"]),
                    "processor": str(row["processor"]),
                    "ram": int(row["ram"]),
                    "ssd": int(row["ssd"]),
                    "tahun": int(row["tahun"]),
                    "harga": int(row["harga"])
                })

    harga_bawah = int(prediksi[0])
    harga_atas = int(prediksi[0])
    
    if len(neighbors_list) > 0:
        prices = [nb["harga"] for nb in neighbors_list]
        std_dev = np.std(prices)
        # Avoid zero range if all neighbors have same price
        if std_dev < 100000:
            std_dev = 100000
            
        harga_bawah = max(0, int(prediksi[0] - std_dev))
        harga_atas = int(prediksi[0] + std_dev)

    return {
        "status": "success",
        "spesifikasi_input": spek.model_dump(),
        "estimasi_harga_rupiah": int(prediksi[0]),
        "harga_bawah": harga_bawah,
        "harga_atas": harga_atas,
        "nearest_neighbors": neighbors_list
    }

class EvaluateRequest(BaseModel):
    k: int

@app.post("/evaluate")
def evaluate_model(req: EvaluateRequest):
    global df_original
    if df_original is None or len(df_original) < 5:
        return {"status": "error", "message": "Data tidak cukup untuk evaluasi. Butuh minimal 5 data."}
        
    try:
        df = df_original.copy()
        df[['proc_family', 'proc_gen']] = df['processor'].apply(parse_processor)
        df = df.drop(columns=['processor'])
        df_encoded = pd.get_dummies(df, columns=["merek", "proc_family"], drop_first=False)
        
        y = df_encoded["harga"]
        X = df_encoded.drop("harga", axis=1)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        eval_scaler = StandardScaler()
        X_train_scaled = eval_scaler.fit_transform(X_train)
        X_test_scaled = eval_scaler.transform(X_test)
        
        # Train temp model
        eval_k = req.k
        # Ensure k is not larger than train size
        if eval_k > len(X_train):
            eval_k = len(X_train)
            
        temp_model = KNeighborsRegressor(n_neighbors=eval_k)
        temp_model.fit(X_train_scaled, y_train)
        
        preds = temp_model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        
        return {
            "status": "success",
            "k": eval_k,
            "mae": int(mae),
            "rmse": int(rmse),
            "test_size": len(y_test)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/update_k")
def update_k(req: EvaluateRequest):
    global current_k
    current_k = req.k
    train_model()
    return {"status": "success", "message": f"Global K berhasil diubah menjadi {req.k} dan model dilatih ulang."}

@app.post("/retrain")
def retrain():
    train_model()
    return {"message": "Model berhasil dilatih ulang berdasarkan data database terbaru!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)