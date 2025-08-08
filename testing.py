from flask import Flask, Response, request
from flask_cors import CORS
from time import sleep

app = Flask(__name__)
CORS(app)

def generate_streamed_response(prompt):
    # Simulating streaming from a model
    for word in ["Hello", " ", "this", " ", "is", " ", "streamed", " ", "text"]:
        yield f"data: {word}\n\n"
        sleep(0.01)

@app.route('/chat')
def chat():
    prompt = request.args.get('prompt', '')
    return Response(generate_streamed_response(prompt), mimetype='text/event-stream')

if __name__ == "__main__":
    app.run(debug=True, port=5001)
