/**
 * 9급 공무원 CBT 웹사이트 - Exam JavaScript
 * 시험 진행 페이지 로직
 */

// ============================================
// PDF.js Configuration
// ============================================
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ============================================
// Configuration
// ============================================
const CONFIG = {
    subjects: {
        korean: { name: '국어', icon: '📖' },
        english: { name: '영어', icon: '🔤' },
        history: { name: '한국사', icon: '🏛️' },
        adminlaw: { name: '행정법', icon: '⚖️' },
        education: { name: '교육학개론', icon: '🎓' }
    },
    examTypes: {
        national: '국가직',
        local: '지방직'
    },
    defaultQuestions: 20,
    zoomLevels: [1, 1.25, 1.5, 1.75, 2, 2.5, 3],
    defaultZoom: 1
};

// ============================================
// State Management
// ============================================
let state = {
    // Exam info
    subject: null,
    year: null,
    type: null,
    totalQuestions: CONFIG.defaultQuestions,

    // Answers
    answers: {},
    correctAnswers: [],

    // PDF
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    zoom: CONFIG.defaultZoom,

    // Timer
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,

    // UI
    darkMode: localStorage.getItem('darkMode') === 'true'
};

// ============================================
// Utility Functions
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getSubjectName(subject) {
    return CONFIG.subjects[subject]?.name || subject;
}

function getExamTypeName(type) {
    return CONFIG.examTypes[type] || type;
}

// ============================================
// URL Parameters
// ============================================
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    state.subject = params.get('subject');
    state.year = parseInt(params.get('year'));
    state.type = params.get('type') || 'national';

    if (!state.subject || !state.year) {
        showToast('잘못된 접근입니다. 메인 페이지로 이동합니다.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }

    return true;
}

// ============================================
// Theme Management
// ============================================
function initTheme() {
    // Default to dark mode if no preference is stored
    if (localStorage.getItem('darkMode') === null) {
        state.darkMode = true;
        localStorage.setItem('darkMode', 'true');
    }

    if (state.darkMode) {
        document.body.classList.add('dark-mode');
    }

    updateThemeButton();

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode', state.darkMode);
    localStorage.setItem('darkMode', state.darkMode);
    updateThemeButton();
}

function updateThemeButton() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;

    const themeIcon = themeBtn.querySelector('.theme-icon');
    const themeText = themeBtn.querySelector('.theme-text');

    if (themeIcon && themeText) {
        if (state.darkMode) {
            themeIcon.textContent = '☀️';
            themeText.textContent = '라이트모드';
        } else {
            themeIcon.textContent = '🌙';
            themeText.textContent = '다크모드';
        }
    }
}

// ============================================
// Timer Management
// ============================================
function startTimer() {
    state.startTime = Date.now();
    state.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(state.elapsedSeconds);
    }
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// ============================================
// PDF Rendering
// ============================================
async function loadPdf() {
    const pdfPath = `data/${state.subject}/${state.year}_${state.type}.pdf`;
    const canvas = document.getElementById('pdfCanvas');
    const noPdfState = document.getElementById('noPdfState');
    const expectedPath = document.getElementById('expectedPath');

    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        state.pdfDoc = await loadingTask.promise;
        state.totalPages = state.pdfDoc.numPages;

        document.getElementById('totalPages').textContent = state.totalPages;

        canvas.style.display = 'block';
        noPdfState.style.display = 'none';

        await renderPage(1);

        showToast('PDF 로드 완료', 'success');
    } catch (error) {
        console.error('PDF 로드 실패:', error);

        canvas.style.display = 'none';
        noPdfState.style.display = 'flex';
        expectedPath.textContent = pdfPath;

        showToast('PDF 파일을 찾을 수 없습니다.', 'warning');
    }
}

async function renderPage(pageNum) {
    if (!state.pdfDoc) return;

    const page = await state.pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');

    // Get the base viewport at scale 1
    const baseViewport = page.getViewport({ scale: 1 });

    // Calculate display size based on zoom level
    const displayWidth = baseViewport.width * state.zoom;
    const displayHeight = baseViewport.height * state.zoom;

    // Use device pixel ratio for sharp rendering
    const pixelRatio = window.devicePixelRatio || 1;

    // Set canvas internal resolution (for sharpness)
    canvas.width = displayWidth * pixelRatio;
    canvas.height = displayHeight * pixelRatio;

    // Set canvas CSS display size (actual visible size)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Scale context for high DPI displays
    ctx.scale(pixelRatio, pixelRatio);

    // Create viewport for rendering
    const renderViewport = page.getViewport({ scale: state.zoom });

    const renderContext = {
        canvasContext: ctx,
        viewport: renderViewport
    };

    await page.render(renderContext).promise;

    state.currentPage = pageNum;
    document.getElementById('currentPage').textContent = pageNum;

    // Update button states
    document.getElementById('prevPage').disabled = pageNum <= 1;
    document.getElementById('nextPage').disabled = pageNum >= state.totalPages;
}

function prevPage() {
    if (state.currentPage > 1) {
        renderPage(state.currentPage - 1);
    }
}

function nextPage() {
    if (state.currentPage < state.totalPages) {
        renderPage(state.currentPage + 1);
    }
}

function findClosestZoomIndex(zoom) {
    // Find the closest zoom level index
    let closestIndex = 0;
    let minDiff = Math.abs(CONFIG.zoomLevels[0] - zoom);

    for (let i = 1; i < CONFIG.zoomLevels.length; i++) {
        const diff = Math.abs(CONFIG.zoomLevels[i] - zoom);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    }

    return closestIndex;
}

function zoomIn() {
    const currentIndex = findClosestZoomIndex(state.zoom);

    if (currentIndex < CONFIG.zoomLevels.length - 1) {
        state.zoom = CONFIG.zoomLevels[currentIndex + 1];
        updateZoom();
    }
}

function zoomOut() {
    const currentIndex = findClosestZoomIndex(state.zoom);

    if (currentIndex > 0) {
        state.zoom = CONFIG.zoomLevels[currentIndex - 1];
        updateZoom();
    }
}

function zoomReset() {
    state.zoom = 1;
    updateZoom();
}

function updateZoom() {
    const zoomLevelEl = document.getElementById('zoomLevel');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    // Update zoom buttons state
    const currentIndex = findClosestZoomIndex(state.zoom);
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomInBtn = document.getElementById('zoomIn');

    if (zoomOutBtn) zoomOutBtn.disabled = currentIndex <= 0;
    if (zoomInBtn) zoomInBtn.disabled = currentIndex >= CONFIG.zoomLevels.length - 1;

    if (state.pdfDoc) {
        renderPage(state.currentPage);
    }
}

// ============================================
// Answer Management
// ============================================
async function loadAnswers() {
    const answerPath = `data/${state.subject}/${state.year}_${state.type}_answers.json`;

    try {
        const response = await fetch(answerPath);
        if (!response.ok) throw new Error('Answer file not found');

        const data = await response.json();

        state.correctAnswers = data.answers || [];
        state.totalQuestions = data.examInfo?.totalQuestions || data.answers?.length || CONFIG.defaultQuestions;

        // Update UI
        document.getElementById('totalQuestions').textContent = state.totalQuestions;

        // Generate answer grid
        generateAnswerGrid();

        showToast('정답 데이터 로드 완료', 'success');
    } catch (error) {
        console.warn('정답 파일 로드 실패:', error);

        // Use default questions count and generate grid
        state.totalQuestions = CONFIG.defaultQuestions;
        document.getElementById('totalQuestions').textContent = state.totalQuestions;
        generateAnswerGrid();

        showToast('정답 파일이 없습니다. 기본 20문항으로 설정됩니다.', 'warning');
    }
}

function generateAnswerGrid() {
    const answerGrid = document.getElementById('answerGrid');
    answerGrid.innerHTML = '';

    for (let i = 1; i <= state.totalQuestions; i++) {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.id = `question-${i}`;

        questionItem.innerHTML = `
            <div class="question-header">
                <span class="question-number">${i}번</span>
                <span class="question-status"></span>
            </div>
            <div class="option-buttons">
                ${[1, 2, 3, 4].map(opt => `
                    <button class="option-btn" data-question="${i}" data-option="${opt}">${opt}</button>
                `).join('')}
            </div>
        `;

        answerGrid.appendChild(questionItem);
    }

    // Add click handlers
    answerGrid.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const question = parseInt(btn.dataset.question);
            const option = parseInt(btn.dataset.option);
            selectAnswer(question, option);
        });
    });
}

function selectAnswer(question, option) {
    // If same option is selected, deselect
    if (state.answers[question] === option) {
        delete state.answers[question];
    } else {
        state.answers[question] = option;
    }

    updateAnswerUI(question);
    updateProgress();
    saveProgress();
}

function updateAnswerUI(question) {
    const questionItem = document.getElementById(`question-${question}`);
    if (!questionItem) return;

    const selectedOption = state.answers[question];

    // Update question item class
    questionItem.classList.toggle('answered', selectedOption !== undefined);

    // Update option buttons
    questionItem.querySelectorAll('.option-btn').forEach(btn => {
        const opt = parseInt(btn.dataset.option);
        btn.classList.toggle('selected', opt === selectedOption);
    });
}

function updateProgress() {
    const answeredCount = Object.keys(state.answers).length;
    const percentage = (answeredCount / state.totalQuestions) * 100;

    document.getElementById('answeredCount').textContent = answeredCount;
    document.getElementById('progressFill').style.width = `${percentage}%`;
}

function resetAnswers() {
    if (!confirm('모든 답안을 초기화하시겠습니까?')) return;

    state.answers = {};

    for (let i = 1; i <= state.totalQuestions; i++) {
        updateAnswerUI(i);
    }

    updateProgress();
    saveProgress();

    showToast('답안이 초기화되었습니다.', 'info');
}

// ============================================
// Progress Persistence
// ============================================
function getProgressKey() {
    return `exam_progress_${state.subject}_${state.year}_${state.type}`;
}

function saveProgress() {
    const progressData = {
        answers: state.answers,
        elapsedSeconds: state.elapsedSeconds,
        timestamp: Date.now()
    };

    localStorage.setItem(getProgressKey(), JSON.stringify(progressData));
}

function loadProgress() {
    try {
        const saved = localStorage.getItem(getProgressKey());
        if (!saved) return;

        const data = JSON.parse(saved);

        // Check if progress is recent (within 24 hours)
        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(getProgressKey());
            return;
        }

        // Ask user if they want to restore progress
        if (Object.keys(data.answers).length > 0) {
            if (confirm('이전에 풀던 답안이 있습니다. 복원하시겠습니까?')) {
                state.answers = data.answers;

                // Adjust start time based on previous elapsed time
                if (data.elapsedSeconds) {
                    state.startTime = Date.now() - (data.elapsedSeconds * 1000);
                }

                // Update UI
                for (const question of Object.keys(state.answers)) {
                    updateAnswerUI(parseInt(question));
                }
                updateProgress();

                showToast('이전 답안을 복원했습니다.', 'success');
            } else {
                localStorage.removeItem(getProgressKey());
            }
        }
    } catch (error) {
        console.error('Progress load failed:', error);
    }
}

function clearProgress() {
    localStorage.removeItem(getProgressKey());
}

// ============================================
// Submit Management
// ============================================
function showSubmitModal() {
    const answeredCount = Object.keys(state.answers).length;
    const unansweredCount = state.totalQuestions - answeredCount;

    document.getElementById('submitAnsweredCount').textContent = state.totalQuestions;
    document.getElementById('submitUnansweredCount').textContent = unansweredCount;

    document.getElementById('submitModal').classList.add('active');
}

function hideSubmitModal() {
    document.getElementById('submitModal').classList.remove('active');
}

function submitExam() {
    stopTimer();
    clearProgress();

    // Prepare result data
    const resultData = {
        subject: state.subject,
        year: state.year,
        type: state.type,
        totalQuestions: state.totalQuestions,
        answers: state.answers,
        correctAnswers: state.correctAnswers,
        elapsedSeconds: state.elapsedSeconds,
        submittedAt: new Date().toISOString()
    };

    // Save to sessionStorage for result page
    sessionStorage.setItem('examResult', JSON.stringify(resultData));

    // Navigate to result page
    window.location.href = 'result.html';
}

// ============================================
// UI Updates
// ============================================
function updateExamInfo() {
    const examBadge = document.getElementById('examBadge');
    if (examBadge) {
        examBadge.textContent = `${state.year}년 ${getExamTypeName(state.type)} ${getSubjectName(state.subject)}`;
    }

    // Update page title
    document.title = `${state.year}년 ${getExamTypeName(state.type)} ${getSubjectName(state.subject)} | 9급 공무원 CBT`;
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // PDF controls
    document.getElementById('prevPage')?.addEventListener('click', prevPage);
    document.getElementById('nextPage')?.addEventListener('click', nextPage);
    document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
    document.getElementById('zoomFit')?.addEventListener('click', zoomReset);

    // Answer controls
    document.getElementById('resetBtn')?.addEventListener('click', resetAnswers);
    document.getElementById('submitBtn')?.addEventListener('click', showSubmitModal);

    // Submit modal
    document.getElementById('submitModalClose')?.addEventListener('click', hideSubmitModal);
    document.getElementById('submitCancelBtn')?.addEventListener('click', hideSubmitModal);
    document.getElementById('confirmSubmitBtn')?.addEventListener('click', submitExam);
    document.getElementById('submitModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'submitModal') hideSubmitModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSubmitModal();
        }
        if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
            prevPage();
        }
        if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
            nextPage();
        }
    });

    // Warn before leaving
    window.addEventListener('beforeunload', (e) => {
        if (Object.keys(state.answers).length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ============================================
// Initialization
// ============================================
async function init() {
    // Parse URL parameters
    if (!parseUrlParams()) return;

    // Initialize theme
    initTheme();

    // Update exam info
    updateExamInfo();

    // Initialize event listeners
    initEventListeners();

    // Load answers first (to get question count)
    await loadAnswers();

    // Load progress if exists
    loadProgress();

    // Load PDF
    await loadPdf();

    // Start timer
    startTimer();

    // Update zoom display
    document.getElementById('zoomLevel').textContent = `${Math.round(state.zoom * 100)}%`;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
