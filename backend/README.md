# 🏥 APOS - Autonomous Pharmacy Operating System

**🤖 AI-Powered Multi-Agent System for Intelligent Pharmacy Management**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange.svg)](https://openai.com)
[![Langfuse](https://img.shields.io/badge/Observability-Langfuse-purple.svg)](https://langfuse.com)

---

## 🧠 AI Architecture

### 🎯 Multi-Agent System (5 Specialized AI Agents)

┌─────────────────────────────────────────────────────────────┐
│ 🧠 ORCHESTRATOR AGENT │
│ (GPT-4o-mini powered brain) │
│ - Intent Classification - Entity Extraction │
│ - Symptom Understanding - Conversation Memory │
└─────────────┬───────────────────────────────┬───────────────┘
│ │
┌─────────▼─────────┐ ┌─────────▼─────────┐
│ 💊 MEDICINE AGENT │ │ 🛡️ SAFETY AGENT │
│ - Semantic Search │ │ - Allergy Check │
│ - AI Embeddings │ │ - Interactions │
│ - Alternatives │ │ - Rx Verification │
└─────────┬─────────┘ └─────────┬─────────┘
│ │
┌─────────▼─────────┐ ┌─────────▼─────────┐
│ 🎯 RECOMMENDATION │ │ 📊 ANALYTICS │
│ AGENT │ │ AGENT │
│ - Personalized │ │ - Demand Forecast │
│ - Refill Predict │ │ - Anomaly Detect │
│ - Cross-sell │ │ - Optimization │
└───────────────────┘ └───────────────────┘

text


---

## ✨ AI Features

### 🩺 Symptom-Based Medicine Recommendation

User: "I have a headache and fever"
AI: Analyzes symptoms → Recommends Paracetamol → Checks allergies → Shows price


### 🛡️ Intelligent Safety Checks
- ✅ Allergy detection with cross-reactivity analysis
- ✅ Drug interaction warnings
- ✅ Prescription verification using GPT-4
- ✅ Contraindication alerts

### 🎯 Personalized Recommendations
- ✅ Based on purchase history
- ✅ Health profile analysis
- ✅ Refill predictions
- ✅ "Frequently bought together"

### 📊 AI-Powered Analytics
- ✅ Demand forecasting with trend analysis
- ✅ Anomaly detection in sales
- ✅ Inventory optimization suggestions
- ✅ Revenue prediction

### 🔭 Full Observability (Langfuse)
- ✅ All LLM calls traced
- ✅ Latency monitoring
- ✅ Token usage & cost tracking
- ✅ Multi-agent workflow visualization

---

<!-- ## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd apos-backend
pip install -r requirements.txt -->