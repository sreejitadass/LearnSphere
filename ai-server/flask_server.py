# flask_server.py
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

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

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
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text
        except Exception as e:
            logger.error(f"PDF error: {e}")
    return text

def get_text_chunks(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    return splitter.split_text(text)

def get_vector_store(chunks):
    vector_store = FAISS.from_texts(chunks, embedding=embeddings_model)
    vector_store.save_local("faiss_index")

def get_chats():
    prompt_template = """
    Answer from context only.

    Context:\n{context}\n
    Question:\n{question}\n
    Answer:
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    return load_qa_chain(chat_model, chain_type="stuff", prompt=prompt)

def query_vector_store(query):
    if not os.path.exists("faiss_index/index.faiss"):
        raise Exception("No document uploaded")
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
        text = get_pdf([file])
        if not text.strip():
            return jsonify({"error": "Empty PDF"}), 400
        chunks = get_text_chunks(text)
        get_vector_store(chunks)
        return jsonify({"message": "Uploaded"}), 200
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/notes", methods=["POST"])
def notes():
    try:
        filename = request.form.get("filename", "AI Notes")
        clerk_user_id = request.headers.get("clerkUserId") or request.form.get("clerkUserId")
        user_name = request.form.get("userName", "Anonymous")

        notes = query_vector_store("""
        Convert the document into clean, structured study notes.
        Use headings, bullet points, bold key terms.
        Make it perfect for revision.
        """)

        # AUTO-SAVE TO NODE API
        try:
            token = request.headers.get("Authorization")
            payload = {
                "title": f"{filename.replace('.pdf', '')} - AI Notes",
                "content": notes,
                "userName": user_name,
                "clerkUserId": clerk_user_id or None
            }
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = token

            requests.post(
                f"{NODE_API_URL}/api/notes",
                json=payload,
                headers=headers,
                timeout=10
            )
            logger.info("AI notes saved to MongoDB")
        except Exception as e:
            logger.warning(f"Auto-save failed: {e}")

        return jsonify({"notes": notes})
    except Exception as e:
        logger.error(f"Notes error: {e}")
        return jsonify({"notes": "Error generating notes."}), 500

if __name__ == "__main__":
    os.makedirs("faiss_index", exist_ok=True)
    app.run(host="0.0.0.0", port=5001, debug=True)