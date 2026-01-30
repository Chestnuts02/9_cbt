/**
 * 9급 공무원 CBT 웹사이트 - Main JavaScript
 * 메인 페이지 로직
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    subjects: {
        korean: { name: '국어', icon: '📖', folder: 'korean' },
        english: { name: '영어', icon: '🔤', folder: 'english' },
        history: { name: '한국사', icon: '🏛️', folder: 'history' },
        adminlaw: { name: '행정법', icon: '⚖️', folder: 'adminlaw' },
        education: { name: '교육학개론', icon: '🎓', folder: 'education' }
    },
    years: Array.from({ length: 14 }, (_, i) => 2025 - i), // 2025 to 2012
    examTypes: {
        national: '국가직',
        local: '지방직'
    },
    defaultQuestions: 20
};

// ============================================
// State Management
// ============================================
let state = {
    selectedSubject: null,
    selectedYear: null,
    selectedType: 'national',
    availableExams: {},
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

function formatSubjectName(subject) {
    return CONFIG.subjects[subject]?.name || subject;
}

function formatExamType(type) {
    return CONFIG.examTypes[type] || type;
}

// ============================================
// Theme Management
// ============================================
function initTheme() {
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode', state.darkMode);
    localStorage.setItem('darkMode', state.darkMode);
}

// ============================================
// Exam File Detection
// ============================================
async function checkExamExists(subject, year, type) {
    const pdfPath = `data/${subject}/${year}_${type}.pdf`;
    const answerPath = `data/${subject}/${year}_${type}_answers.json`;
    
    try {
        const [pdfResponse, answerResponse] = await Promise.all([
            fetch(pdfPath, { method: 'HEAD' }),
            fetch(answerPath, { method: 'HEAD' })
        ]);
        
        return {
            hasPdf: pdfResponse.ok,
            hasAnswers: answerResponse.ok,
            pdfPath,
            answerPath
        };
    } catch (error) {
        return {
            hasPdf: false,
            hasAnswers: false,
            pdfPath,
            answerPath
        };
    }
}

async function scanAvailableExams(subject) {
    const exams = {
        national: [],
        local: []
    };
    
    const checkPromises = [];
    
    for (const year of CONFIG.years) {
        for (const type of Object.keys(CONFIG.examTypes)) {
            checkPromises.push(
                checkExamExists(subject, year, type).then(result => ({
                    year,
                    type,
                    ...result
                }))
            );
        }
    }
    
    const results = await Promise.all(checkPromises);
    
    for (const result of results) {
        if (result.hasPdf || result.hasAnswers) {
            exams[result.type].push({
                year: result.year,
                hasPdf: result.hasPdf,
                hasAnswers: result.hasAnswers,
                pdfPath: result.pdfPath,
                answerPath: result.answerPath
            });
        }
    }
    
    // Sort by year descending
    exams.national.sort((a, b) => b.year - a.year);
    exams.local.sort((a, b) => b.year - a.year);
    
    return exams;
}

async function updateSubjectCounts() {
    for (const subject of Object.keys(CONFIG.subjects)) {
        const exams = await scanAvailableExams(subject);
        const totalCount = exams.national.length + exams.local.length;
        
        const countElement = document.getElementById(`${subject}-count`);
        if (countElement) {
            countElement.textContent = `${totalCount}개 시험`;
        }
        
        state.availableExams[subject] = exams;
    }
}

// ============================================
// Modal Management
// ============================================
function openModal(subject) {
    state.selectedSubject = subject;
    state.selectedYear = null;
    state.selectedType = 'national';
    
    const modal = document.getElementById('examModal');
    const title = document.getElementById('modalSubjectTitle');
    
    title.textContent = formatSubjectName(subject);
    
    // Reset tabs
    document.querySelectorAll('.exam-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === 'national');
    });
    
    // Update year grid
    updateYearGrid();
    
    // Update start button
    updateStartButton();
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('examModal');
    modal.classList.remove('active');
    state.selectedSubject = null;
    state.selectedYear = null;
}

function updateYearGrid() {
    const yearGrid = document.getElementById('yearGrid');
    const noExamMessage = document.getElementById('noExamMessage');
    const exams = state.availableExams[state.selectedSubject]?.[state.selectedType] || [];
    
    yearGrid.innerHTML = '';
    
    if (exams.length === 0) {
        yearGrid.style.display = 'none';
        noExamMessage.style.display = 'block';
        return;
    }
    
    yearGrid.style.display = 'grid';
    noExamMessage.style.display = 'none';
    
    // Show all years, marking available ones
    for (const year of CONFIG.years) {
        const exam = exams.find(e => e.year === year);
        const isAvailable = !!exam;
        
        const yearCard = document.createElement('div');
        yearCard.className = `card year-card ${!isAvailable ? 'disabled' : ''}`;
        yearCard.dataset.year = year;
        
        yearCard.innerHTML = `
            <div class="font-bold text-lg">${year}년</div>
            ${isAvailable ? `
                <div class="flex gap-xs justify-center mt-sm">
                    ${exam.hasPdf ? '<span class="badge badge-success text-xs">PDF</span>' : ''}
                    ${exam.hasAnswers ? '<span class="badge badge-primary text-xs">정답</span>' : ''}
                </div>
            ` : '<div class="text-muted text-sm mt-sm">파일 없음</div>'}
        `;
        
        if (isAvailable) {
            yearCard.addEventListener('click', () => selectYear(year));
        } else {
            yearCard.style.opacity = '0.5';
            yearCard.style.cursor = 'not-allowed';
        }
        
        yearGrid.appendChild(yearCard);
    }
}

function selectYear(year) {
    state.selectedYear = year;
    
    document.querySelectorAll('.year-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.year) === year);
    });
    
    updateStartButton();
}

function updateStartButton() {
    const startBtn = document.getElementById('startExamBtn');
    const exams = state.availableExams[state.selectedSubject]?.[state.selectedType] || [];
    const selectedExam = exams.find(e => e.year === state.selectedYear);
    
    startBtn.disabled = !selectedExam;
}

// ============================================
// Navigation
// ============================================
function startExam() {
    if (!state.selectedSubject || !state.selectedYear) {
        showToast('과목과 연도를 선택해주세요.', 'warning');
        return;
    }
    
    const examParams = new URLSearchParams({
        subject: state.selectedSubject,
        year: state.selectedYear,
        type: state.selectedType
    });
    
    window.location.href = `exam.html?${examParams.toString()}`;
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Subject cards
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', () => {
            const subject = card.dataset.subject;
            openModal(subject);
        });
    });
    
    // Modal close
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('examModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'examModal') closeModal();
    });
    
    // Exam type tabs
    document.querySelectorAll('.exam-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.selectedType = tab.dataset.type;
            state.selectedYear = null;
            
            document.querySelectorAll('.exam-tab').forEach(t => {
                t.classList.toggle('active', t === tab);
            });
            
            updateYearGrid();
            updateStartButton();
        });
    });
    
    // Start exam button
    document.getElementById('startExamBtn')?.addEventListener('click', startExam);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ============================================
// Initialization
// ============================================
async function init() {
    initTheme();
    initEventListeners();
    
    // Scan available exams (this may take a moment)
    await updateSubjectCounts();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
