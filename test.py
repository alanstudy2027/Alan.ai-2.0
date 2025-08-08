from flask import Flask, Response, request
from flask_cors import CORS
from mlx_lm import load
from mlx_lm.generate import stream_generate

app = Flask(__name__)
CORS(app)

# Load model once
model, tokenizer = load("mlx-community/Qwen3-4B-Instruct-2507-4bit")

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get("message", "")

    # Apply chat template
    if tokenizer.chat_template is not None:
        messages = [{"role": "user", "content": user_input}]
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    else:
        prompt = user_input

    def generate_stream():
        generated_tokens = []
        previous_output = ""

        for response in stream_generate(model, tokenizer, prompt):
            generated_tokens.append(response.token)

            # Decode the full generated text so far
            full_output = tokenizer.decode(generated_tokens, skip_special_tokens=True)

            # Compute and yield only the newly added portion
            new_text = full_output[len(previous_output):]
            previous_output = full_output

            # Yield to frontend
            if new_text.strip() != "":
                yield f"data: {new_text}\n\n"

    return Response(generate_stream(), content_type='text/event-stream')

if __name__ == "__main__":
    app.run(debug=True)