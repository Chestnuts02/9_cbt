/**
 * 9급 공무원 CBT 웹사이트 - Result JavaScript
 * 결과 페이지 로직
 */

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
    grades: [
        { min: 90, label: '우수', class: 'grade-excellent' },
        { min: 70, label: '합격 예상', class: 'grade-good' },
        { min: 50, label: '노력 필요', class: 'grade-average' },
        { min: 0, label: '재도전', class: 'grade-poor' }
    ]
};

// ============================================
// State Management
// ============================================
let state = {
    resultData: null,
    filter: 'all',
    currentDetailIndex: 0,
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

    if (h > 0) {
        return `${h}시간 ${m}분 ${s}초`;
    } else if (m > 0) {
        return `${m}분 ${s}초`;
    }
    return `${s}초`;
}

function formatTimeShort(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getSubjectName(subject) {
    return CONFIG.subjects[subject]?.name || subject;
}

function getExamTypeName(type) {
    return CONFIG.examTypes[type] || type;
}

function getGrade(score) {
    for (const grade of CONFIG.grades) {
        if (score >= grade.min) {
            return grade;
        }
    }
    return CONFIG.grades[CONFIG.grades.length - 1];
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
// Result Calculation
// ============================================
function calculateResults() {
    const data = state.resultData;
    if (!data) return null;

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const questionResults = [];

    for (let i = 1; i <= data.totalQuestions; i++) {
        const userAnswer = data.answers[i];
        const correctAnswer = data.correctAnswers[i - 1]; // 0-indexed

        let status;

        if (userAnswer === undefined) {
            unanswered++;
            status = 'unanswered';
        } else if (userAnswer === correctAnswer) {
            correct++;
            status = 'correct';
        } else {
            incorrect++;
            status = 'incorrect';
        }

        questionResults.push({
            number: i,
            userAnswer,
            correctAnswer,
            status
        });
    }

    const score = Math.round((correct / data.totalQuestions) * 100);

    return {
        correct,
        incorrect,
        unanswered,
        score,
        grade: getGrade(score),
        questionResults,
        elapsedSeconds: data.elapsedSeconds,
        totalQuestions: data.totalQuestions
    };
}

// ============================================
// UI Rendering
// ============================================
function renderResults() {
    const results = calculateResults();
    if (!results) {
        showToast('결과 데이터를 찾을 수 없습니다.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    const data = state.resultData;

    // Update breadcrumb
    document.getElementById('breadcrumbSubject').textContent = getSubjectName(data.subject);

    // Update exam title
    document.getElementById('examTitle').textContent =
        `${data.year}년 ${getExamTypeName(data.type)} ${getSubjectName(data.subject)}`;

    // Update exam time
    if (data.submittedAt) {
        const date = new Date(data.submittedAt);
        document.getElementById('examTime').textContent = date.toLocaleString('ko-KR');
    }

    // Animate score ring
    const scoreRing = document.getElementById('scoreRing');
    const circumference = 2 * Math.PI * 44; // r = 44
    const offset = circumference - (results.score / 100) * circumference;

    setTimeout(() => {
        scoreRing.style.strokeDashoffset = offset;
    }, 100);

    // Animate score value
    animateNumber('scoreValue', results.score, 1000);

    // Update grade
    const gradeElement = document.getElementById('resultGrade');
    gradeElement.textContent = results.grade.label;
    gradeElement.className = `result-grade ${results.grade.class}`;

    // Update stats
    document.getElementById('totalStat').textContent = results.totalQuestions;
    document.getElementById('correctStat').textContent = results.correct;
    document.getElementById('incorrectStat').textContent = results.incorrect;
    document.getElementById('timeStat').textContent = formatTimeShort(results.elapsedSeconds);

    // Render review grid
    renderReviewGrid(results.questionResults);

    // Store results for detail modal
    state.questionResults = results.questionResults;
}

function animateNumber(elementId, target, duration) {
    const element = document.getElementById(elementId);
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const current = Math.round(start + (target - start) * easeProgress);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function renderReviewGrid(questionResults) {
    const reviewGrid = document.getElementById('reviewGrid');
    reviewGrid.innerHTML = '';

    const filteredResults = state.filter === 'all'
        ? questionResults
        : questionResults.filter(q => q.status === state.filter);

    if (filteredResults.length === 0) {
        reviewGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: var(--spacing-xl); color: var(--light-text-secondary);">
                해당하는 문항이 없습니다.
            </div>
        `;
        return;
    }

    for (const question of filteredResults) {
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${question.status}`;
        reviewItem.dataset.number = question.number;

        let answerDisplay = '-';
        if (question.status === 'correct') {
            answerDisplay = `✓ ${question.userAnswer}`;
        } else if (question.status === 'incorrect') {
            answerDisplay = `✗ ${question.userAnswer}`;
        }

        reviewItem.innerHTML = `
            <span class="review-item-number">${question.number}번</span>
            <span class="review-item-answer">${answerDisplay}</span>
        `;

        reviewItem.addEventListener('click', () => {
            showDetailModal(question.number);
        });

        reviewGrid.appendChild(reviewItem);
    }
}

// ============================================
// Detail Modal
// ============================================
function showDetailModal(questionNumber) {
    state.currentDetailIndex = state.questionResults.findIndex(q => q.number === questionNumber);

    updateDetailModal();

    document.getElementById('detailModal').classList.add('active');
}

function hideDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function updateDetailModal() {
    const question = state.questionResults[state.currentDetailIndex];
    if (!question) return;

    document.getElementById('detailNumber').textContent = question.number;

    // Update status badge
    const statusElement = document.getElementById('detailStatus');
    if (question.status === 'correct') {
        statusElement.textContent = '정답';
        statusElement.className = 'badge badge-success';
    } else if (question.status === 'incorrect') {
        statusElement.textContent = '오답';
        statusElement.className = 'badge badge-error';
    } else {
        statusElement.textContent = '미응답';
        statusElement.className = 'badge';
    }

    // Render options
    const optionsContainer = document.getElementById('detailOptions');
    optionsContainer.innerHTML = '';

    for (let i = 1; i <= 4; i++) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'detail-option';

        const isCorrect = question.correctAnswer === i;
        const isUserAnswer = question.userAnswer === i;
        const isWrong = isUserAnswer && !isCorrect;

        if (isCorrect) {
            optionDiv.classList.add('correct');
        }
        if (isWrong) {
            optionDiv.classList.add('wrong');
        }
        if (isUserAnswer && !isWrong) {
            optionDiv.classList.add('user-answer');
        }

        let markerClass = '';
        let markerContent = i;

        if (isCorrect) {
            markerClass = 'correct';
            markerContent = '✓';
        } else if (isWrong) {
            markerClass = 'wrong';
            markerContent = '✗';
        }

        optionDiv.innerHTML = `
            <span class="option-marker ${markerClass}">${markerContent}</span>
            <span>
                ${i}번 선택지
                ${isCorrect ? ' (정답)' : ''}
                ${isUserAnswer ? ' ← 내 답' : ''}
            </span>
        `;

        optionsContainer.appendChild(optionDiv);
    }

    // Update navigation buttons
    document.getElementById('detailPrevBtn').disabled = state.currentDetailIndex <= 0;
    document.getElementById('detailNextBtn').disabled = state.currentDetailIndex >= state.questionResults.length - 1;
}

function prevDetail() {
    if (state.currentDetailIndex > 0) {
        state.currentDetailIndex--;
        updateDetailModal();
    }
}

function nextDetail() {
    if (state.currentDetailIndex < state.questionResults.length - 1) {
        state.currentDetailIndex++;
        updateDetailModal();
    }
}

// ============================================
// Filter Management
// ============================================
function setFilter(filter) {
    state.filter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderReviewGrid(state.questionResults);
}

// ============================================
// Retry Exam
// ============================================
function retryExam() {
    if (!state.resultData) return;

    const examParams = new URLSearchParams({
        subject: state.resultData.subject,
        year: state.resultData.year,
        type: state.resultData.type
    });

    // Clear previous progress
    const progressKey = `exam_progress_${state.resultData.subject}_${state.resultData.year}_${state.resultData.type}`;
    localStorage.removeItem(progressKey);

    window.location.href = `exam.html?${examParams.toString()}`;
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setFilter(btn.dataset.filter);
        });
    });

    // Detail modal
    document.getElementById('detailModalClose')?.addEventListener('click', hideDetailModal);
    document.getElementById('detailPrevBtn')?.addEventListener('click', prevDetail);
    document.getElementById('detailNextBtn')?.addEventListener('click', nextDetail);
    document.getElementById('detailModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') hideDetailModal();
    });

    // Retry button
    document.getElementById('retryBtn')?.addEventListener('click', retryExam);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideDetailModal();
        }
        if (document.getElementById('detailModal').classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                prevDetail();
            }
            if (e.key === 'ArrowRight') {
                nextDetail();
            }
        }
    });
}

// ============================================
// Initialization
// ============================================
function init() {
    // Load result data from sessionStorage
    const resultJson = sessionStorage.getItem('examResult');

    if (!resultJson) {
        showToast('결과 데이터가 없습니다. 메인 페이지로 이동합니다.', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    try {
        state.resultData = JSON.parse(resultJson);
    } catch (error) {
        console.error('Failed to parse result data:', error);
        showToast('결과 데이터를 불러올 수 없습니다.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Initialize theme
    initTheme();

    // Initialize event listeners
    initEventListeners();

    // Render results
    renderResults();

    // Update page title
    document.title = `시험 결과 - ${state.resultData.year}년 ${getExamTypeName(state.resultData.type)} ${getSubjectName(state.resultData.subject)} | 9급 공무원 CBT`;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
