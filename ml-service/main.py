from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import re
import threading
import logging
from contextlib import asynccontextmanager
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine
import os
import uvicorn

# ==========================================
# LOGGING
# ==========================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURATION
# ==========================================
DB_URI = os.getenv("DB_URI", "postgresql://postgres:postgres@localhost:5432/skripsi_laptop")
# #10 — Protect /retrain with a secret key
RETRAIN_SECRET = os.getenv("RETRAIN_SECRET", "rahasia-retrain-key")

# Numeric features that should be standardized (Z-score scaling).
# One-hot encoded columns (merek_*, proc_family_*) are NOT scaled
# because they are already 0/1 — scaling them distorts KNN distances.
NUMERIC_FEATURES = ["ram", "ssd", "tahun", "kondisi", "proc_gen"]

# Minimum standard deviation for price range calculation (in IDR).
# Ensures the displayed range is never unrealistically narrow.
MIN_PRICE_STD_DEV = 100_000

# OPTIMIZATION: Connection Pooling
engine = create_engine(DB_URI, pool_size=10, max_overflow=20)

# ==========================================
# #13 — Thread-safe global model state
# ==========================================
_model_lock = threading.Lock()
knn_model = None
scaler = None
model_columns = []
numeric_col_indices = []  # indices of numeric columns within model_columns
df_original = None
current_k = None
X_scaled_global = None


def clean_merek(merek_str):
    if not merek_str:
        return "Other"
    m_str = str(merek_str).strip().title()
    if "Macbook" in m_str or "Apple" in m_str:
        return "Apple"
    if m_str.upper() == "HP":
        return "HP"
    return m_str


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


def _prepare_features(df):
    """Shared feature engineering pipeline used by both training and evaluation.

    Takes a DataFrame with columns [merek, processor, ram, ssd, tahun, kondisi, harga]
    and returns (X DataFrame, y Series, column list).
    """
    df_copy = df.copy()
    parsed_procs = df_copy['processor'].apply(parse_processor).tolist()
    df_copy[['proc_family', 'proc_gen']] = pd.DataFrame(parsed_procs, index=df_copy.index)
    df_copy = df_copy.drop(columns=['processor'])

    df_encoded = pd.get_dummies(df_copy, columns=["merek", "proc_family"], drop_first=False)

    y = df_encoded["harga"]
    X = df_encoded.drop("harga", axis=1)
    return X, y, list(X.columns)


def _partial_scale(X_df, cols, fit=True, existing_scaler=None):
    """Scale ONLY numeric features, leaving one-hot columns (0/1) untouched.

    This is critical for KNN because StandardScaler on one-hot columns
    distorts their 0/1 values into arbitrary floats, making them dominate
    or be dwarfed in Euclidean distance calculations.

    Args:
        X_df: Feature DataFrame
        cols: All column names
        fit: If True, fit a new scaler. If False, use existing_scaler.
        existing_scaler: Pre-fitted scaler (required when fit=False).

    Returns:
        (X_scaled numpy array, fitted StandardScaler, list of numeric column indices)
    """
    X_array = X_df.values.copy().astype(float)
    num_indices = [i for i, c in enumerate(cols) if c in NUMERIC_FEATURES]

    if fit:
        sc = StandardScaler()
        X_array[:, num_indices] = sc.fit_transform(X_array[:, num_indices])
    else:
        sc = existing_scaler
        X_array[:, num_indices] = sc.transform(X_array[:, num_indices])

    return X_array, sc, num_indices


def train_model():
    """Train/retrain the KNN model. Thread-safe via _model_lock."""
    global knn_model, scaler, model_columns, numeric_col_indices
    global df_original, current_k, X_scaled_global

    logger.info("Membaca data dari database untuk training KNN...")
    try:
        df = pd.read_sql(
            "SELECT merek, processor, ram, ssd, tahun, kondisi, harga_terjual as harga FROM item_penjualans",
            engine
        )

        if len(df) < 2:
            logger.warning("Data kurang untuk training, menggunakan data fallback sementara.")
            df = pd.DataFrame({
                "merek": ["Lenovo", "Asus", "Acer", "Lenovo", "Dell"],
                "processor": ["i5-8250U", "i7-10750H", "i3-1005G1", "Ryzen 5 3500U", "i5-1135G7"],
                "ram": [8, 16, 4, 8, 8],
                "ssd": [256, 512, 256, 512, 256],
                "tahun": [2019, 2021, 2020, 2021, 2019],
                "kondisi": [4, 4, 3, 2, 4],
                "harga": [4500000, 12000000, 3000000, 3800000, 4200000]
            })

        # Standarisasi / pembersihan nama merek agar konsisten (Macbook -> Apple, case-insensitive)
        df["merek"] = df["merek"].apply(clean_merek)

        # DEDUPLICATION: Group identical specs and average their prices.
        # This prevents duplicate records from flooding KNN neighbor selection.
        feature_cols = ["merek", "processor", "ram", "ssd", "tahun", "kondisi"]
        rows_before = len(df)
        df = df.groupby(feature_cols, as_index=False).agg(
            harga=("harga", "mean")
        )
        # Round harga to nearest integer after averaging
        df["harga"] = df["harga"].round().astype(int)
        rows_after = len(df)
        logger.info(f"Deduplikasi: {rows_before} baris → {rows_after} baris unik (dihapus {rows_before - rows_after} duplikat)")

        X, y, cols = _prepare_features(df)

        # Scale ONLY numeric features, leave one-hot columns as 0/1
        X_scaled, new_scaler, num_indices = _partial_scale(X, cols, fit=True)

        with _model_lock:
            k = current_k if (current_k is not None and current_k > 0) else (2 if len(df) < 5 else 5)
            if k >= len(df):
                k = max(1, len(df) - 1)

            new_model = KNeighborsRegressor(n_neighbors=k)
            new_model.fit(X_scaled, y)

            # Atomic swap of global state
            knn_model = new_model
            scaler = new_scaler
            model_columns = cols
            numeric_col_indices = num_indices
            df_original = df.copy()  # keep original with processor column
            X_scaled_global = X_scaled

        logger.info(f"Model berhasil di-training! (K={k}, data={len(df)} baris, fitur={len(cols)}, numerik={len(num_indices)})")

    except Exception as e:
        logger.error(f"Gagal koneksi atau training: {e}", exc_info=True)
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
    merek: str = Field(min_length=1, max_length=100, description="Brand name")
    processor: str = Field(min_length=1, max_length=100, description="Processor model")
    ram: int = Field(gt=0, description="RAM in GB")
    ssd: int = Field(gt=0, description="SSD in GB")
    tahun: int = Field(ge=2005, le=2030, description="Release year")
    kondisi: int = Field(ge=1, le=5, description="Condition rating 1-5")


class EvaluateRequest(BaseModel):
    k: int = Field(ge=1, description="Number of neighbors")


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
        cols = list(model_columns)  # copy the list to avoid mutation
        num_indices = list(numeric_col_indices)
        df_orig = df_original
        X_scaled = X_scaled_global

    if model is None or sc is None:
        raise HTTPException(status_code=503, detail="Model belum siap atau data kosong. Coba lagi dalam beberapa detik.")

    input_df = pd.DataFrame([{
        "merek": clean_merek(spek.merek),
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

    # Handle columns that exist in input but NOT in training data (unseen brand/family).
    # These extra one-hot columns would cause a shape mismatch, so we drop them.
    extra_cols = [c for c in input_encoded.columns if c not in cols]
    if extra_cols:
        logger.warning(f"Input memiliki fitur yang tidak ada di training data (akan diabaikan): {extra_cols}")
        input_encoded = input_encoded.drop(columns=extra_cols)

    for col in cols:
        if col not in input_encoded.columns:
            input_encoded[col] = 0
    input_encoded = input_encoded[cols]

    # Scale ONLY numeric features (same as training)
    input_scaled, _, _ = _partial_scale(input_encoded, cols, fit=False, existing_scaler=sc)

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
        if std_dev < MIN_PRICE_STD_DEV:
            std_dev = MIN_PRICE_STD_DEV
        harga_bawah = max(0, int(prediksi[0] - std_dev))
        harga_atas = int(prediksi[0] + std_dev)

    # Build scaler stats for XAI display (only numeric features are scaled)
    scaler_stats = {}
    if sc is not None:
        for local_idx, global_idx in enumerate(num_indices):
            col_name = cols[global_idx]
            scaler_stats[col_name] = {
                "mean": round(float(sc.mean_[local_idx]), 4),
                "scale": round(float(sc.scale_[local_idx]), 4)
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
        raise HTTPException(status_code=400, detail="Data tidak cukup untuk evaluasi. Butuh minimal 5 data.")

    try:
        X, y, eval_cols = _prepare_features(df_orig)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Scale only numeric features for evaluation too
        X_train_scaled, eval_scaler, _ = _partial_scale(X_train, eval_cols, fit=True)
        X_test_scaled, _, _ = _partial_scale(X_test, eval_cols, fit=False, existing_scaler=eval_scaler)

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
        logger.error(f"Evaluasi gagal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update_k")
def update_k(req: EvaluateRequest, x_retrain_secret: str = Header(default=None)):
    global current_k
    if x_retrain_secret != RETRAIN_SECRET:
        raise HTTPException(status_code=403, detail="Akses ditolak: secret key salah atau tidak ada.")

    with _model_lock:
        current_k = req.k

    threading.Thread(target=train_model, daemon=True).start()
    return {"status": "success", "message": f"Global K diubah menjadi {req.k}. Model sedang dilatih ulang di background."}


# #10 — Protect /retrain with secret key
@app.post("/retrain")
def retrain(x_retrain_secret: str = Header(default=None)):
    if x_retrain_secret != RETRAIN_SECRET:
        raise HTTPException(status_code=403, detail="Akses ditolak: secret key salah atau tidak ada.")
    threading.Thread(target=train_model, daemon=True).start()
    return {"message": "Retrain dimulai di background berdasarkan data database terbaru!"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)