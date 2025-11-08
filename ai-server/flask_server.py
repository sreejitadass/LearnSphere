from flask import Flask, request, jsonify
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from flask_cors import CORS
import os
import logging
import requests
import numpy as np

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])  # Step 1: Fix CORS for React

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
embeddings_model = OllamaEmbeddings(model="llama3.2")
chat_model = ChatOllama(model="llama3.2", temperature=0.3)

NODE_API_URL = "http://localhost:3000"

def get_pdf(pdfs):
    text = ""
    for pdf in pdfs:
        try:
            reader = PdfReader(pdf)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                if not page_text.strip():
                    logger.warning(f"Page {i} of {pdf.filename} has no text")
                text += page_text
        except Exception as e:
            logger.error(f"PDF read error {pdf.filename}: {e}")
    return text

def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    chunks = splitter.split_text(text)
    logger.info(f"Split into {len(chunks)} chunks")
    return chunks

def get_vector_store(chunks):
    try:
        vector_store = FAISS.from_texts(chunks, embedding=embeddings_model)
        vector_store.save_local("faiss_index")
        if not os.path.exists("faiss_index/index.faiss"):
            raise Exception("FAISS index not created")
        logger.info("FAISS saved")
    except Exception as e:
        logger.error(f"FAISS error: {e}")
        raise

def get_chats():
    prompt_template = """
    Answer from context only. If not in context, say "not available".

    Context:\n{context}\n
    Question:\n{question}\n

    Answer:
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    return load_qa_chain(chat_model, chain_type="stuff", prompt=prompt)

def query_vector_store(query):
    if not os.path.exists("faiss_index/index.faiss"):
        raise Exception("No document uploaded yet")
    db = FAISS.load_local("faiss_index", embeddings_model, allow_dangerous_deserialization=True)
    docs = db.similarity_search(query)
    chain = get_chats()
    response = chain({"input_documents": docs, "question": query}, return_only_outputs=True)
    return response["output_text"]

@app.route("/upload", methods=["POST"])
def upload():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file"}), 400

        file = request.files["file"]
        clerk_user_id = request.form.get("clerkUserId")
        user_name = request.form.get("userName", "Anonymous")
        folder = request.form.get("folder", "Uncategorized")

        text = get_pdf([file])
        if not text.strip():
            return jsonify({"error": "No text in PDF"}), 400

        # Generate embedding
        logger.info(f"Embedding for {file.filename} (text length: {len(text)})")
        embedding = embeddings_model.embed_query(text)
        embedding_list = np.array(embedding).tolist()
        logger.info(f"Embedding OK – length {len(embedding_list)}")

        # Send to Node.js to save in MongoDB
        payload = {
            "title": file.filename,
            "folder": folder,
            "size": request.content_length or len(text) or 0,
            "type": file.mimetype or "text/plain",
            "content": text,
            "embedding": embedding_list,
            "processed": len(embedding_list) > 0,
            "userName": user_name,
            "clerkUserId": clerk_user_id,
        }

        logger.info(f"Sending to Node.js: {file.filename}")
        node_res = requests.post(
            f"{NODE_API_URL}/api/uploads/with-content",
            json=payload,
            timeout=30
        )

        if not node_res.ok:
            logger.error(f"Node.js failed: {node_res.status_code} {node_res.text}")
            return jsonify({"error": "Save failed"}), 500

        saved_doc = node_res.json()
        logger.info("Saved to MongoDB SUCCESS")

        # Step 2: Process chunks & vector store (your original)
        chunks = get_text_chunks(text)
        get_vector_store(chunks)

        # Return the saved doc to frontend
        return jsonify({
            "message": "Uploaded and processed",
            "savedDoc": saved_doc
        }), 200

    except Exception as e:
        logger.exception("Upload failed")
        return jsonify({"error": str(e)}), 500

@app.route("/ask", methods=["POST"])
def ask():
    q = request.json.get("question")
    if not q: return jsonify({"error": "No question"}), 400
    try:
        ans = query_vector_store(q)
        return jsonify({"response": ans})
    except Exception as e:
        return jsonify({"error": "Query failed"}), 500

@app.route("/summary", methods=["POST"])
def summary():
    try:
        s = query_vector_store("Summarize the entire document with key points.")
        return jsonify({"summary": s})
    except Exception as e:
        return jsonify({"error": "Summary failed"}), 500

@app.route("/flashcards", methods=["POST"])
def flashcards():
    try:
        f = query_vector_store("""
Extract key concepts and generate flashcards:
Flashcard [N]:
Question: [clear question]
Answer: [concise answer]
        """.strip())
        return jsonify({"flashcards": f})
    except Exception as e:
        return jsonify({"error": "Flashcards failed"}), 500

if __name__ == "__main__":
    os.makedirs("faiss_index", exist_ok=True)
    app.run(host="0.0.0.0", port=5001, debug=True)