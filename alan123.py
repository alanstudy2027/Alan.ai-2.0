from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from mlx_lm import load, stream_generate
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import time

app = Flask(__name__)
CORS(app)

# Load MLX model and tokenizer
model, tokenizer = load("mlx-community/Qwen3-4B-Instruct-2507-4bit")

# Initialize FAISS and embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
dimension = 384
faiss_index = faiss.IndexFlatL2(dimension)

# Single-user conversation history
conversation_embeddings = []
conversation_messages = []

# Function to get context
def get_relevant_context(user_input, k=3):
    if not conversation_embeddings:
        return []

    input_embedding = embedding_model.encode([user_input])[0].astype('float32')
    embeddings = np.array(conversation_embeddings).astype('float32')

    faiss_index.reset()
    faiss_index.add(embeddings)

    _, indices = faiss_index.search(np.array([input_embedding]), k)

    context = []
    for idx in indices[0]:
        if 0 <= idx < len(conversation_messages):
            context.append(conversation_messages[idx])
    return context

# Function to store new message and embedding
def store_message(role, content):
    embedding = embedding_model.encode([content])[0]
    conversation_embeddings.append(embedding)
    conversation_messages.append({
        'role': role,
        'content': content,
        'timestamp': time.time()
    })

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    data = request.get_json()
    user_input = data.get('message', '').strip()

    if not user_input:
        return jsonify({"error": "Empty input"}), 400

    context_messages = get_relevant_context(user_input)
    store_message('user', user_input)

    messages = context_messages + [{"role": "user", "content": user_input}]

    if tokenizer.chat_template:
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    else:
        prompt = user_input

    def stream_response():
        full_response = ""
        try:
            for chunk in stream_generate(model, tokenizer, prompt=prompt):
                token_id = chunk.token
                token_text = tokenizer.decode([token_id], skip_special_tokens=True)
                full_response += token_text

                # Ignore empty or whitespace-only tokens
                if token_text.strip():
                    yield f"data: {json.dumps({'token': {'text': token_text}})}\n\n"

            store_message('assistant', full_response)

        except GeneratorExit:
            if full_response:
                store_message('assistant', full_response)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(stream_response()), content_type='text/event-stream')

@app.route('/api/chat/history', methods=['GET'])
def get_conversation_history():
    return jsonify({
        'messages': conversation_messages
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
