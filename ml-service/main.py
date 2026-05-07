from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import re
import threading
from contextlib import asynccontextmanager
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine
import os
import uvicorn

# ==========================================
# CONFIGURATION
# ==========================================
DB_URI = os.getenv("DB_URI", "postgresql://postgres:postgres@localhost:5432/skripsi_laptop")
# #10 — Protect /retrain with a secret key
RETRAIN_SECRET = os.getenv("RETRAIN_SECRET", "rahasia-retrain-key")

# OPTIMIZATION: Connection Pooling
engine = create_engine(DB_URI, pool_size=10, max_overflow=20)

# ==========================================
# #13 — Thread-safe global model state
# ==========================================
_model_lock = threading.Lock()
knn_model = None
scaler = None
model_columns = []
df_original = None
current_k = None
X_scaled_global = None


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
    # #15 — Apple Silicon: use chip generation number as gen
    elif "m1" in proc_str: family = "apple m"; gen = 1
    elif "m2" in proc_str: family = "apple m"; gen = 2
    elif "m3" in proc_str: family = "apple m"; gen = 3

    # Extract Generation for Intel
    if gen == 0:
        if "gen" in proc_str:
            match = re.search(r'gen\s*(\d+)', proc_str)
            if match: gen = int(match.group(1))
        elif family in ["i3", "i5", "i7", "i9"]:
            match = re.search(r'i\d[- ]?(\d+)\d\d\d', proc_str)
            if match:
                gen = int(match.group(1))
            else:
                match = re.search(r'i\d[- ]?(\d{1,2})(?!\d)', proc_str)
                if match: gen = int(match.group(1))
        elif "ryzen" in family:
            match = re.search(r'ryzen\s*\d\s*[- ]?(\d)\d\d\d', proc_str)
            if match:
                gen = int(match.group(1))
            else:
                match = re.search(r'ryzen\s*\d\s*[- ]?(\d{1})(?!\d)', proc_str)
                if match: gen = int(match.group(1))

    return family, gen


def train_model():
    """Train/retrain the KNN model. Thread-safe via _model_lock."""
    global knn_model, scaler, model_columns, df_original, current_k, X_scaled_global

    print("Membaca data dari database untuk training KNN...")
    try:
        df = pd.read_sql(
            "SELECT merek, processor, ram, ssd, tahun, kondisi, harga_terjual as harga FROM item_penjualans",
            engine
        )

        if len(df) < 2:
            print("Data kurang untuk training, menggunakan data fallback sementara.")
            df = pd.DataFrame({
                "merek": ["Lenovo", "Asus", "Acer", "Lenovo", "Dell"],
                "processor": ["i5-8250U", "i7-10750H", "i3-1005G1", "Ryzen 5 3500U", "i5-1135G7"],
                "ram": [8, 16, 4, 8, 8],
                "ssd": [256, 512, 256, 512, 256],
                "tahun": [2019, 2021, 2020, 2021, 2019],
                "kondisi": [4, 4, 3, 2, 4],
                "harga": [4500000, 12000000, 3000000, 3800000, 4200000]
            })

        df_copy = df.copy()

        parsed_procs = df_copy['processor'].apply(parse_processor).tolist()
        df_copy[['proc_family', 'proc_gen']] = pd.DataFrame(parsed_procs, index=df_copy.index)
        df_copy = df_copy.drop(columns=['processor'])

        df_encoded = pd.get_dummies(df_copy, columns=["merek", "proc_family"], drop_first=False)

        y = df_encoded["harga"]
        X = df_encoded.drop("harga", axis=1)

        cols = list(X.columns)

        new_scaler = StandardScaler()
        X_scaled = new_scaler.fit_transform(X)

        with _model_lock:
            k = current_k if (current_k is not None and current_k > 0) else (2 if len(df_copy) < 5 else 5)
            if k > len(df_copy):
                k = len(df_copy)

            new_model = KNeighborsRegressor(n_neighbors=k)
            new_model.fit(X_scaled, y)

            # Atomic swap of global state
            knn_model = new_model
            scaler = new_scaler
            model_columns = cols
            df_original = df.copy()  # keep original with processor column
            X_scaled_global = X_scaled

        print("Model berhasil di-training!")

    except Exception as e:
        print(f"Gagal koneksi atau training: {e}")
        with _model_lock:
            knn_model = None


# ==========================================
# #3 — Non-blocking startup via lifespan
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Train in background thread so server starts immediately
    t = threading.Thread(target=train_model, daemon=True)
    t.start()
    yield


app = FastAPI(title="Laptop Price Estimator API", lifespan=lifespan)


# ==========================================
# SCHEMA
# ==========================================
class SpesifikasiLaptop(BaseModel):
    merek: str
    processor: str
    ram: int
    ssd: int
    tahun: int
    kondisi: int


class EvaluateRequest(BaseModel):
    k: int


# ==========================================
# ENDPOINTS
# ==========================================
@app.get("/")
def home():
    with _model_lock:
        ready = knn_model is not None
    return {"message": "Service ML Aktif!", "model_ready": ready}


@app.post("/predict")
def prediksi_harga(spek: SpesifikasiLaptop):
    with _model_lock:
        model = knn_model
        sc = scaler
        cols = model_columns
        df_orig = df_original
        X_scaled = X_scaled_global

    if model is None or sc is None:
        return {"status": "error", "message": "Model belum siap atau data kosong"}

    input_df = pd.DataFrame([{
        "merek": spek.merek,
        "processor": spek.processor,
        "ram": spek.ram,
        "ssd": spek.ssd,
        "tahun": spek.tahun,
        "kondisi": spek.kondisi
    }])

    parsed_input = input_df['processor'].apply(parse_processor).tolist()
    input_df[['proc_family', 'proc_gen']] = pd.DataFrame(parsed_input, index=input_df.index)
    input_df = input_df.drop(columns=['processor'])

    input_encoded = pd.get_dummies(input_df, columns=["merek", "proc_family"], drop_first=False)
    for col in cols:
        if col not in input_encoded.columns:
            input_encoded[col] = 0
    input_encoded = input_encoded[cols]

    input_scaled = sc.transform(input_encoded)
    prediksi = model.predict(input_scaled)

    distances, indices = model.kneighbors(input_scaled)
    nearest_indices = indices[0]
    nearest_distances = distances[0]

    neighbors_list = []
    if df_orig is not None:
        for i, idx in enumerate(nearest_indices):
            if idx < len(df_orig):
                row = df_orig.iloc[idx]

                perhitungan = []
                for j, col in enumerate(cols):
                    inp_val = float(input_scaled[0][j])
                    nb_val = float(X_scaled[idx][j])
                    sq_diff = (inp_val - nb_val) ** 2
                    if sq_diff > 0.001:
                        perhitungan.append({
                            "fitur": col,
                            "input": round(inp_val, 4),
                            "neighbor": round(nb_val, 4),
                            "squared_diff": round(sq_diff, 4)
                        })

                neighbors_list.append({
                    "merek": str(row["merek"]),
                    "processor": str(row["processor"]),
                    "ram": int(row["ram"]),
                    "ssd": int(row["ssd"]),
                    "tahun": int(row["tahun"]),
                    "harga": int(row["harga"]),
                    "jarak": float(nearest_distances[i]),
                    "perhitungan_jarak": perhitungan
                })

    harga_bawah = int(prediksi[0])
    harga_atas = int(prediksi[0])

    if len(neighbors_list) > 0:
        prices = [nb["harga"] for nb in neighbors_list]
        std_dev = np.std(prices)
        if std_dev < 100000:
            std_dev = 100000
        harga_bawah = max(0, int(prediksi[0] - std_dev))
        harga_atas = int(prediksi[0] + std_dev)

    scaler_stats = {}
    if sc is not None and len(sc.mean_) == len(cols):
        for j, col in enumerate(cols):
            if col in ["ram", "ssd", "tahun", "kondisi"]:
                scaler_stats[col] = {
                    "mean": round(float(sc.mean_[j]), 4),
                    "scale": round(float(sc.scale_[j]), 4)
                }

    return {
        "status": "success",
        "spesifikasi_input": spek.model_dump(),
        "estimasi_harga_rupiah": int(prediksi[0]),
        "harga_bawah": harga_bawah,
        "harga_atas": harga_atas,
        "nearest_neighbors": neighbors_list,
        "scaler_stats": scaler_stats
    }


@app.post("/evaluate")
def evaluate_model(req: EvaluateRequest):
    with _model_lock:
        df_orig = df_original

    if df_orig is None or len(df_orig) < 5:
        return {"status": "error", "message": "Data tidak cukup untuk evaluasi. Butuh minimal 5 data."}

    try:
        df = df_orig.copy()
        parsed_eval = df['processor'].apply(parse_processor).tolist()
        df[['proc_family', 'proc_gen']] = pd.DataFrame(parsed_eval, index=df.index)
        df = df.drop(columns=['processor'])
        df_encoded = pd.get_dummies(df, columns=["merek", "proc_family"], drop_first=False)

        y = df_encoded["harga"]
        X = df_encoded.drop("harga", axis=1)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        eval_scaler = StandardScaler()
        X_train_scaled = eval_scaler.fit_transform(X_train)
        X_test_scaled = eval_scaler.transform(X_test)

        eval_k = max(1, min(req.k, len(X_train)))
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
    if req.k < 1:
        return {"status": "error", "message": "Nilai K minimal harus 1."}

    with _model_lock:
        current_k = req.k

    train_model()

    with _model_lock:
        ready = knn_model is not None

    if not ready:
        return {"status": "error", "message": "Gagal melatih ulang model dengan K tersebut."}

    return {"status": "success", "message": f"Global K berhasil diubah menjadi {req.k} dan model dilatih ulang."}


# #10 — Protect /retrain with secret key
@app.post("/retrain")
def retrain(x_retrain_secret: str = Header(default=None)):
    if x_retrain_secret != RETRAIN_SECRET:
        raise HTTPException(status_code=403, detail="Akses ditolak: secret key salah atau tidak ada.")
    threading.Thread(target=train_model, daemon=True).start()
    return {"message": "Retrain dimulai di background berdasarkan data database terbaru!"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)