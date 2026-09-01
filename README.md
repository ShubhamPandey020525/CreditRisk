# AI Credit Risk Assessment System

## 📸 System Previews

### Landing Page
![Landing Page](proofs/1%20%20landing%20page.png)

### User Input UI
![User Input Base UI](proofs/2%20user%20inputbase%20%20ui.png)

### Test Case 1: Input & Output
![User Input Test Case 1](proofs/3%20user%20input%20test%20case%201.png)
![Output Test Case 1](proofs/4%20output%20test%20case%201.png)

### Test Case 2: Input & Output
![User Input Test Case 2](proofs/5%20user%20input%20test%20case%202.png)
![Output Test Case 2](proofs/6%20output%20test%20case%202.png)

---

An end-to-end, AI-powered credit risk evaluation platform designed for modern banks and financial institutions. This system uses a pre-trained XGBoost machine learning model to predict loan defaults and features a **Business-Driven SHAP Explainability Engine** to mathematically prove *why* an application was approved or rejected using a visual Risk Waterfall chart.

## 🚀 Key Features

*   **Real-time AI Inference:** Submits application data to a FastAPI backend running a strictly validated XGBoost pipeline.
*   **Business-Ready Explainability:** Translates raw SHAP log-odds into human-readable text (e.g., "EMI is taking 59% of salary") and scales them perfectly to probability percentages.
*   **Waterfall Risk Chart:** A fully custom CSS-based visual graph that dynamically builds the applicant's risk profile from the base average up to the final AI decision.
*   **Modern React UI:** Built with React, TypeScript, and Lucide Icons featuring a glassmorphism design aesthetic.

---

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Vite, Vanilla CSS
*   **Backend:** Python, FastAPI, Uvicorn, Pydantic v2
*   **AI/ML:** XGBoost, `scikit-learn` Pipelines, SHAP (TreeExplainer), Pandas

---

## 🧠 Detailed AI & ML Pipeline

The entire machine learning pipeline was built and documented in the `AI/Model.ipynb` Jupyter Notebook. Below is an exhaustive technical breakdown of the dataset, exploratory data analysis (EDA), model training, and the explainability engine.

### 1. The Dataset & Exploratory Data Analysis (EDA)
The model was trained on a historical credit risk dataset (`credit_risk_dataset.csv`) comprising **32,581 rows** and 12 features. 
- **Missing Values Imputation:** 
  - `person_emp_length` (Employment length) contained 895 missing values, which were imputed using the dataset's **median** to prevent skewing from outliers.
  - `loan_int_rate` (Interest rate) contained 3,116 missing values. These were imputed using the median interest rate dynamically grouped by the specific `loan_grade`, ensuring highly accurate interpolations based on the risk category.
- **Data Distribution:**
  - The target variable `loan_status` had a **21.8% default rate**, meaning the dataset was imbalanced but highly representative of real-world banking portfolios.
- **Categorical vs Numeric:** Features like `loan_intent` and `person_home_ownership` were isolated for One-Hot Encoding, while continuous variables like `person_income` (up to $6M) and `person_age` (up to 144) were flagged for standard scaling.

### 2. The `scikit-learn` ColumnTransformer Pipeline
To prevent **data leakage** and ensure that the backend API processes single-row JSON payloads exactly as the model was trained, the entire preprocessing step was wrapped inside a robust `scikit-learn` Pipeline:
- **Numeric Pipeline:** Applied `StandardScaler` to normalize distributions for features like `loan_amnt` and `person_income`.
- **Categorical Pipeline:** Applied `OneHotEncoder` (dropping the first category to avoid the dummy variable trap) to features like `person_home_ownership` and `loan_grade`.
- **Composition:** Both were combined using `ColumnTransformer`, ensuring seamless `preprocessor.transform(df)` execution in the FastAPI production server without manually keeping track of state.

### 3. Model Training & Evaluation (10-Fold Cross-Validation)
Three major classification algorithms were evaluated to find the best performing model. Since the dataset is imbalanced (21.8% defaults), we optimized primarily for **F1-Score** and **Precision** on the Default class to minimize costly false negatives (approving a bad loan).

#### Logistic Regression
*A linear baseline model.*
* **Accuracy:** 81.1%
* **Precision:** 54.7%
* **Recall:** 77.8%
* **F1-Score:** 64.2%
* **ROC-AUC:** 87.1%

#### Random Forest Classifier
*An ensemble bagging tree model.*
* **Accuracy:** 92.7%
* **Precision:** 90.6%
* **Recall:** 74.3%
* **F1-Score:** 81.6%
* **ROC-AUC:** 93.2%

#### XGBoost Classifier (🏆 Winner)
*An extreme gradient boosting tree model.* 
We selected **XGBoost** (`binary:logistic` objective) for its superior handling of non-linear financial interactions. 
* **Accuracy:** 93.6%
* **Precision:** 97.3%
* **Recall:** 72.9%
* **F1-Score:** 83.3%
* **ROC-AUC:** 94.7%

### 4. Final XGBoost Test Set Performance (Classification Report)
Evaluated on the 20% hold-out test set (6,484 unseen loans).

| Class | Precision | Recall | F1-Score | Support |
| :--- | :--- | :--- | :--- | :--- |
| **0 (Non-Default)** | 0.9306 | 0.9951 | 0.9617 | 5066 |
| **1 (Default)** | **0.9766** | **0.7348** | **0.8386** | 1418 |
| *Accuracy* | | | *0.9382* | *6484* |
| *Macro Avg* | 0.9536 | 0.8650 | 0.9002 | 6484 |

**Additional Final Metrics:**
* **ROC-AUC:** 0.9510
* **PR-AUC:** 0.9098

- **Serialization:** The fully fitted pipeline (Preprocessor + XGBoost) was serialized via `joblib` into `final_credit_risk_xgboost.pkl`.

---

## 🔍 SHAP (SHapley Additive exPlanations) & Mathematical Routing

The standout feature of this system is the deep integration of **SHAP** (`shap.TreeExplainer`) to provide *mathematically proven* explainability for every single AI decision. 

### What is SHAP?
In game theory, Shapley values determine how to fairly distribute a "payout" among players. In our model, the "players" are the applicant's financial features (e.g., Income, Loan Amount, Age), and the "payout" is the **final predicted default probability**. SHAP calculates the exact marginal contribution of each individual feature to the final risk score.

### The Technical Implementation in this Project
When an underwriter clicks "Analyse", the FastAPI backend doesn't just blindly return a score; it runs the following complex extraction algorithm inside `explainability.py`:

1. **Extracting Dense Features:** The single-row API payload is passed through the `ColumnTransformer`. The resulting sparse matrix is converted to a dense array (`X_dense`) so it can be fed directly into `shap.TreeExplainer`.
2. **Log-Odds Extraction:** XGBoost builds trees based on log-odds. `shap_values` returns the exact log-odds shift for every single feature concerning Class 1 (Default). 
3. **Sigmoid Conversion:** The explainer provides an `expected_value` (the base log-odds of the entire training dataset). We apply a safe numerical sigmoid function (`1 / (1 + exp(-x))`) to convert this base log-odds into a **Base Probability** (e.g., 22% average default rate).
4. **Proportional Probability Scaling:** SHAP values are strictly additive in the log-odds space, but **not** in the probability space. To render a beautiful Waterfall chart on the frontend that adds up mathematically to exactly 100%, we implemented a custom scaling algorithm:
   - We calculate the total log-odds shift: `total_shap_sum = np.sum(shap_values)`.
   - We calculate the total absolute probability shift: `total_prob_shift = final_probability - base_prob`.
   - Each feature's raw SHAP value is scaled linearly: `(feature_shap / total_shap_sum) * total_prob_shift`.
5. **Business Logic Translation:** Finally, the raw one-hot encoded variable names (e.g., `person_home_ownership_RENT`) and standardized numerical values are mapped back to their original human-readable inputs. The backend dynamically generates context strings like `"EMI is taking 59% of salary"` and tags the feature as `increases_risk` (Red) or `decreases_risk` (Green) based strictly on the mathematical sign of the scaled SHAP value.

This architecture ensures that the React frontend receives a perfectly calculated array of features that visually bridge the gap between the global average default rate and the specific applicant's AI decision—**making the "Black Box" completely transparent.**

---

## 💻 Setup & Installation Instructions

To run this project locally, you need to start both the Frontend development server and the Backend API server in two separate terminal windows.

### 1. Start the Backend (FastAPI)
Open a terminal, navigate to the `Backend` directory, install the Python dependencies, and run the server.

```bash
# Navigate to the Backend folder
cd Backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
*The backend will now be running on `http://localhost:8000`.*

### 2. Start the Frontend (React)
Open a **new** terminal window, navigate to the `Frontend` directory, install the Node modules, and start Vite.

```bash
# Navigate to the Frontend folder
cd Frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
*The frontend will typically run on `http://localhost:5173` (check your terminal output for the exact local URL).*
