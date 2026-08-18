"""
Flask web application for KNN Iris Classifier
"""
import os
import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

CORS(app)

# Get the directory where this script is located
APP_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(APP_DIR)

# Load model and metadata
MODEL_PATH = os.path.join(BASE_DIR, 'knn_model.joblib')
METADATA_PATH = os.path.join(BASE_DIR, 'model_metadata.joblib')

def load_model():
    """Load the trained KNN model"""
    if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
        model = joblib.load(MODEL_PATH)
        metadata = joblib.load(METADATA_PATH)
        return model, metadata
    return None, None

model, metadata = load_model()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    return jsonify({
        'features': metadata['feature_names'],
        'classes': metadata['target_names'],
        'description': 'KNN Classifier trained on Iris dataset'
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        print("=== PREDICTION REQUEST ===")

        if model is None:
            print("ERROR: Model not loaded")
            return jsonify({'error': 'Model not loaded'}), 500

        data = request.get_json()
        print("Received data:", data)

        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        # Extract features
        sepal_length = float(data.get('sepal_length'))
        sepal_width = float(data.get('sepal_width'))
        petal_length = float(data.get('petal_length'))
        petal_width = float(data.get('petal_width'))

        print(
            "Features:",
            sepal_length,
            sepal_width,
            petal_length,
            petal_width
        )

        features = np.array([[
            sepal_length,
            sepal_width,
            petal_length,
            petal_width
        ]])

        print("Making prediction...")

        prediction = model.predict(features)[0]
        probability = model.predict_proba(features)[0]

        print("Prediction:", prediction)
        print("Probability:", probability)

        return jsonify({
            'prediction': metadata['target_names'][int(prediction)],
            'prediction_idx': int(prediction),
            'probability': {
                metadata['target_names'][i]: float(probability[i])
                for i in range(len(metadata['target_names']))
            },
            'confidence': float(max(probability) * 100)
        })

    except Exception as e:
        print("PREDICTION ERROR:", repr(e))

        return jsonify({
            'error': str(e)
        }), 500
@app.route('/api/example-data', methods=['GET'])
def example_data():
    """Get example data for testing"""
    examples = {
        'Iris Setosa': [5.1, 3.5, 1.4, 0.2],
        'Iris Versicolor': [6.0, 2.7, 5.1, 1.6],
        'Iris Virginica': [7.1, 3.0, 5.9, 2.1]
    }
    return jsonify(examples)

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404


if __name__ == '__main__':
    if model is None:
        print("Warning: Model not found. Please run train_model.py first")
    
    print("\n" + "="*60)
    print("🍁 Flask App Running!")
    print("="*60)
    print(f"✅ Local:         http://127.0.0.1:5000")
    print(f"✅ Local Network: http://192.168.1.8:5000")
    print(f"🌐 Global Access: Use Cloudflare Tunnel (see README)")
    print("="*60 + "\n")
    
    # Start Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
