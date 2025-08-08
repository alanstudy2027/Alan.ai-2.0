
# 📄 Qwen 3 4B (MLX) + FAISS + PDF RAG Chatbot

A Retrieval-Augmented Generation (RAG) application that allows you to **chat with the contents of a PDF** using the **Qwen 3 4B** model in the **MLX architecture** for Apple Silicon.
The project uses **FAISS** as the vector database for fast semantic search.

---

## 🚀 Features

* **Local LLM** — Uses Qwen 3 4B in MLX for optimized performance on Apple Silicon.
* **RAG Pipeline** — Retrieval-Augmented Generation for more accurate and context-aware responses.
* **FAISS Vector Store** — Efficient semantic search for PDF content.
* **PDF Support** — Extracts text from PDF files using PyMuPDF (`fitz`).
* **No Internet Required** — Fully offline inference.

---

## 🛠️ Tech Stack

* **LLM:** [Qwen 3 4B (MLX)](https://huggingface.co/Qwen)
* **Vector Database:** [FAISS](https://faiss.ai/)
* **PDF Processing:** [PyMuPDF](https://pymupdf.readthedocs.io/)
* **Embeddings:** [Sentence Transformers](https://www.sbert.net/)
* **Language:** Python

---

## 📂 Project Structure

```
📦 qwen-pdf-rag
├── main.py           # Main script for RAG-based chatbot
├── requirements.txt  # Python dependencies
├── README.md         # Project documentation
└── sample.pdf        # Example PDF file for testing
```

---

## ⚡ Installation

1️⃣ **Clone the repository**

```bash
git clone https://github.com/your-username/qwen-pdf-rag.git
cd qwen-pdf-rag
```

2️⃣ **Create a virtual environment**

```bash
python -m venv .venv
source .venv/bin/activate
```

3️⃣ **Install dependencies**

```bash
pip install -r requirements.txt
```

---

## ▶️ Usage

1️⃣ **Place your PDF file** in the project folder.
2️⃣ **Run the chatbot**

```bash
python main.py
```

3️⃣ **Ask questions** about your PDF content in natural language.

---

## 🧠 How It Works

1. **Extract Text** — The PDF is read using `fitz` (PyMuPDF).
2. **Chunking** — The text is split into smaller, manageable chunks.
3. **Embedding** — Sentence Transformers encode chunks into embeddings.
4. **Indexing** — FAISS stores and indexes embeddings for semantic search.
5. **Querying** — Your question is embedded and searched against FAISS.
6. **LLM Response** — Qwen 3 4B (MLX) uses retrieved chunks to generate a contextual answer.

---

## 📸 Demo

*(Add a screenshot or GIF of your chatbot running here)*

---

## 💡 Future Improvements

* Web UI with **Streamlit** or **Gradio**
* Support for multiple PDFs
* Advanced chunking with metadata
* Caching for faster retrieval

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue to discuss your ideas.

---

## 📜 License

This project is licensed under the MIT License.

---

If you want, I can also make you a **LinkedIn post version** of this README so you can directly share it with a catchy tone. That way, it’s GitHub + LinkedIn ready.
Do you want me to prepare that next?
