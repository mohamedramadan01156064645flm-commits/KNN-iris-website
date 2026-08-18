/**
 * Iris Classifier Web Application
 * Frontend JavaScript Logic
 */

// Optimize scroll performance with passive listeners
if (document.addEventListener) {
    document.addEventListener('touchmove', (e) => {
        // Passive event listener for better scroll performance
    }, { passive: true });
    
    document.addEventListener('wheel', (e) => {
        // Passive event listener for better scroll performance
    }, { passive: true });
}

const API_BASE_URL = `${window.location.origin}/api`;
let activePredictionRequest = 0;

// DOM Elements
const form = document.getElementById('predictionForm');
const resultCard = document.getElementById('resultCard');
const loadingCard = document.getElementById('loadingCard');
const welcomeCard = document.getElementById('welcomeCard');
const predictionBox = document.getElementById('predictionBox');
const predictionClass = document.getElementById('predictionClass');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceValue = document.getElementById('confidenceValue');
const probabilityBars = document.getElementById('probabilityBars');
const examplesContainer = document.getElementById('examplesContainer');

// Range input elements
const inputs = {
    sepal_length: document.getElementById('sepalLength'),
    sepal_width: document.getElementById('sepalWidth'),
    petal_length: document.getElementById('petalLength'),
    petal_width: document.getElementById('petalWidth')
};

const valueDisplays = {
    sepal_length: document.getElementById('sepalLengthValue'),
    sepal_width: document.getElementById('sepalWidthValue'),
    petal_length: document.getElementById('petalLengthValue'),
    petal_width: document.getElementById('petalWidthValue')
};

// Icons and image references for iris species
const speciesIcons = {
    'Iris-setosa': '🌼',
    'Iris-versicolor': '🌺',
    'Iris-virginica': '🌸'
};

const speciesImages = {
    'Iris-setosa': [
        'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80'
    ],
    'Iris-versicolor': [
        'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80'
    ],
    'Iris-virginica': [
        'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=1000&q=80'
    ]
};

const lastSpeciesImageIndex = {};

function getSpeciesImage(speciesName) {
    const imageOptions = speciesImages[speciesName] || speciesImages['Iris-virginica'];
    const previousIndex = lastSpeciesImageIndex[speciesName] ?? -1;
    let nextIndex = previousIndex;

    while (nextIndex === previousIndex) {
        nextIndex = Math.floor(Math.random() * imageOptions.length);
    }

    lastSpeciesImageIndex[speciesName] = nextIndex;
    return imageOptions[nextIndex];
}

/**
 * Initialize the application
 */
function init() {
    setupEventListeners();
    loadExamples();

    // Force the initial state so the loading screen is hidden on page load
    welcomeCard.style.display = 'flex';
    resultCard.style.display = 'none';
    loadingCard.style.display = 'none';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Range input listeners with passive option for better scroll performance
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', (e) => {
            valueDisplays[key].textContent = e.target.value;
            predictIris();
        }, { passive: true });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        predictIris();
    });

    // Form reset
    form.addEventListener('reset', () => {
        setTimeout(() => {
            Object.keys(inputs).forEach(key => {
                valueDisplays[key].textContent = inputs[key].value;
            });
            loadingCard.style.display = 'none';
            welcomeCard.style.display = 'flex';
            resultCard.style.display = 'none';
        }, 0);
    });
}

/**
 * Load example data and create buttons
 */
async function loadExamples() {
    try {
        const response = await fetch(`${API_BASE_URL}/example-data`);
        const examples = await response.json();

        examplesContainer.innerHTML = '';
        
        Object.entries(examples).forEach(([name, values]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'example-btn';
            button.textContent = `📌 ${name}`;
            
            button.addEventListener('click', () => {
                inputs.sepal_length.value = values[0];
                inputs.sepal_width.value = values[1];
                inputs.petal_length.value = values[2];
                inputs.petal_width.value = values[3];
                
                Object.keys(inputs).forEach(key => {
                    valueDisplays[key].textContent = inputs[key].value;
                });
                
                predictIris();
            });
            
            examplesContainer.appendChild(button);
        });
    } catch (error) {
        console.error('Error loading examples:', error);
    }
}

/**
 * Make prediction request to the API
 */
async function predictIris() {
    const requestId = ++activePredictionRequest;

    // Show loading state
    welcomeCard.style.display = 'none';
    resultCard.style.display = 'none';
    loadingCard.style.display = 'flex';

    const data = {
        sepal_length: parseFloat(inputs.sepal_length.value),
        sepal_width: parseFloat(inputs.sepal_width.value),
        petal_length: parseFloat(inputs.petal_length.value),
        petal_width: parseFloat(inputs.petal_width.value)
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        if (requestId !== activePredictionRequest) {
            return;
        }

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        displayPrediction(result);

    } catch (error) {
        if (requestId !== activePredictionRequest) {
            return;
        }

        console.error('Prediction error:', error);
        if (error.name === 'AbortError') {
            showError('Prediction timed out. Please try again.');
        } else {
            showError(error.message || 'Unable to classify the flower right now.');
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Display the prediction results
 */
function displayPrediction(result) {
    // Update prediction class
    const speciesName = result.prediction;
    const displayName = formatSpeciesName(speciesName);
    predictionClass.textContent = displayName;

    // Update flower image and caption
    const flowerImage = document.getElementById('flowerImage');
    const flowerCaption = document.getElementById('flowerCaption');
    flowerImage.src = getSpeciesImage(speciesName);
    flowerImage.alt = displayName + ' flower';
    flowerCaption.textContent = displayName;

    // Update icon
    const icon = speciesIcons[speciesName] || '🌸';
    document.getElementById('predictionIcon').textContent = icon;

    // Update confidence
    const confidence = result.confidence;
    confidenceFill.style.width = confidence + '%';
    confidenceValue.textContent = Math.round(confidence) + '%';

    // Update probability distribution
    updateProbabilityBars(result.probability);

    // Hide loading, show results
    loadingCard.style.display = 'none';
    welcomeCard.style.display = 'none';
    resultCard.style.display = 'block';
}

/**
 * Update probability bar display
 */
function updateProbabilityBars(probabilities) {
    probabilityBars.innerHTML = '';

    Object.entries(probabilities).forEach(([className, probability]) => {
        const probability_percent = probability * 100;
        
        const barHTML = `
            <div class="probability-bar">
                <div class="probability-class">${formatSpeciesName(className)}</div>
                <div class="probability-bar-container">
                    <div class="probability-bar-fill" style="width: ${probability_percent}%">
                        <span class="probability-value">${Math.round(probability_percent)}%</span>
                    </div>
                </div>
            </div>
        `;
        
        probabilityBars.innerHTML += barHTML;
    });
}

/**
 * Format species name for display
 */
function formatSpeciesName(name) {
    // Convert "Iris-setosa" to "Iris Setosa"
    return name.replace('-', ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Show error message
 */
function showError(message) {
    loadingCard.style.display = 'none';
    welcomeCard.style.display = 'none';
    
    // Create error card
    const errorHTML = `
        <div class="card result-card" style="border-left: 4px solid var(--danger-color);">
            <div class="card-header" style="background: rgba(239, 68, 68, 0.05);">
                <h2>Error</h2>
            </div>
            <div style="padding: 2rem; text-align: center;">
                <p style="color: var(--danger-color); font-weight: 600; margin-bottom: 1rem;">❌</p>
                <p style="color: var(--text-light);">${message}</p>
                <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="location.reload()">
                    Retry
                </button>
            </div>
        </div>
    `;
    
    resultCard.innerHTML = errorHTML;
    resultCard.style.display = 'block';
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', init);

/**
 * Smooth page scroll on navigation
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
