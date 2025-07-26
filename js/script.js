let currentFunction = '';
const homeScreen = document.getElementById('home');
const workspaceScreen = document.getElementById('workspace');

const functionSettings = {
    split: { title: '문장 넘버링', titlePlaceholder: 'ex) 3과 5번', bodyPlaceholder: '지문을 입력하세요.', canIncludeExplanations: true },
    sequence: { title: '순서 배열', titlePlaceholder: 'ex) 3과 5번', bodyPlaceholder: '지문을 입력하세요.', canIncludeExplanations: true },
    wordOrder: { title: '어순 배열', titlePlaceholder: '해설을 입력하세요 (문장 단위로 자동 분류)', bodyPlaceholder: '지문을 입력하세요.', canIncludeExplanations: true },
    chunkOrder: { title: '구문 배열', titlePlaceholder: '해설을 입력하세요 (문장 단위로 자동 분류)', bodyPlaceholder: "자동으로 구문을 나눌 영어 문장을 한 줄씩 입력하세요.", canIncludeExplanations: true }
};

function switchScreen(show, hide) {
    hide.classList.add('hidden');
    setTimeout(() => { show.classList.remove('hidden'); }, 50);
}

function showWorkspace(func) {
    currentFunction = func;
    const settings = functionSettings[func];
    switchScreen(workspaceScreen, homeScreen);
    document.getElementById('workspaceTitle').innerText = settings.title;
    const explanationWrapper = document.getElementById('includeExplanationsWrapper');
    explanationWrapper.classList.toggle('hidden', !settings.canIncludeExplanations);
    explanationWrapper.classList.toggle('flex', settings.canIncludeExplanations);

    if (settings.canIncludeExplanations) {
    const checkbox = document.getElementById('includeExplanations');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    document.getElementById('includeExplanationLabel').innerText =
        (func === 'split' || func === 'sequence') ? '제목 포함하기' : '해설 포함하기';
    }
    
    document.getElementById('passagesContainer').innerHTML = '';
    addPassage();
    document.getElementById('outputArea').innerText = '여기에 결과가 표시됩니다...';
}

function goToHome() {
    switchScreen(homeScreen, workspaceScreen);
    currentFunction = '';
}

function createPassageElement() {
    const settings = functionSettings[currentFunction] || {};
    const passageGroup = document.createElement('div');
    passageGroup.className = 'passage-group-card space-y-3 animate-fade-in';
    
    const explanationIsVisible = settings.canIncludeExplanations && document.getElementById('includeExplanations').checked;

    const titleInputHTML = `
        <textarea class="title-input w-full text-sm resize-y input-base ${settings.canIncludeExplanations && !explanationIsVisible ? 'hidden' : ''}" placeholder="${settings.titlePlaceholder}" rows="1"></textarea>
    `;
    const bodyInputHTML = `
        <textarea class="body-input w-full text-sm resize-y input-base" placeholder="${settings.bodyPlaceholder}" rows="7"></textarea>
    `;

    passageGroup.innerHTML = (settings.canIncludeExplanations ? titleInputHTML : '') + bodyInputHTML;
    return passageGroup;
}

function addPassage() {
    const container = document.getElementById('passagesContainer');
    const newPassage = createPassageElement();
    container.appendChild(newPassage);
    updatePassageCount();
    newPassage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removePassage() {
    const container = document.getElementById('passagesContainer');
    if (container.children.length > 1) {
        const lastChild = container.lastChild;
        lastChild.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            container.removeChild(lastChild);
            updatePassageCount();
        }, 300);
    }
}

function updatePassageCount() {
    document.getElementById('passageCount').innerText = document.querySelectorAll('.passage-group-card').length;
}

function getPassages() {
    return Array.from(document.querySelectorAll('.passage-group-card')).map(group => {
        const titleInput = group.querySelector('.title-input');
        const bodyInput = group.querySelector('.body-input');
        return {
            title: titleInput ? titleInput.value.trim() : '',
            body: bodyInput ? bodyInput.value.trim() : '',
        };
    }).filter(p => p.body);
}

function generateResult() {
    if (!currentFunction) return;
    switch(currentFunction) {
        case 'split': splitSentences(); break;
        case 'sequence': generateSequenceQuestion(); break;
        case 'wordOrder': generateWordOrderQuestion(); break;
        case 'chunkOrder': generateChunkOrderQuestion(); break;
    }
}

function extractSentences(text) {
const sentences = [];
let i = 0;
const len = text.length;

while (i < len) {
    let start = i;
    if (text[i] === '"') {
        i++; 
        while (i < len && text[i] !== '"') i++;
        if (i < len) i++; 
        while (i < len && /[ \w,’“,\"-]/.test(text[i])) i++;
        if (i < len && /[.!?]/.test(text[i])) i++;
        sentences.push(text.slice(start, i).trim());
    } else {
        while (i < len) {
            if (text[i] === '"') {
                i++;
                while (i < len && text[i] !== '"') i++;
                if (i < len) i++;
                continue;
            }
            if (/[.!?]/.test(text[i])) {
                i++;
                break;
            }
            i++;
        }
        const sentence = text.slice(start, i).trim();
        if (sentence) sentences.push(sentence);
    }
}
return sentences;
}


function getNumberingPrefix(format, num) {
    const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
    switch(format) {
        case "(1)": return `(${num}) `;
        case "1.": return `${num}. `;
        case "①": return (num > 0 && num <= 20 ? circles[num-1] : `(${num})`) + ' ';
        case "(A)": return `(${(String.fromCharCode(64 + num))}) `;
        default: return `(${num}) `;
    }
}

function getFormattedTitle(title, format) {
    if (!title) return '';
    const formats = { " ": title, "[ ]": `[${title}]`, "( )": `(${title})`, "< >": `<${title}>` };
    return (formats[format] || title) + '\n\n';
}

function splitSentences() {
    const format = document.getElementById('formatSelect').value;
    const titleFormat = document.getElementById('titleFormatSelect').value;
    const passages = getPassages();
    const result = passages.map(({ title, body }) => {
        const formattedTitle = getFormattedTitle(title, titleFormat);
        const sentences = extractSentences(body);
        const numbered = sentences.map((s, i) => `${getNumberingPrefix(format, i + 1)}${s.trim()}`).join('\n\n\n');
        return formattedTitle + numbered;
    }).join('\n\n🟪\n\n');
    document.getElementById('outputArea').innerText = result.trim() || '생성할 내용이 없습니다.';
}

function generateSequenceQuestion() {
    const titleFormat = document.getElementById('titleFormatSelect').value;
    const numberingFormat = document.getElementById('formatSelect').value;
    const passages = getPassages();
    const result = passages.map(({ title, body }) => {
        const formattedTitle = getFormattedTitle(title, titleFormat);
        const sentences = extractSentences(body).map(s => s.trim());
        if (sentences.length < 2) return `${formattedTitle}두 문장 이상 입력해야 합니다.`;
        
        const shuffled = [...sentences].sort(() => Math.random() - 0.5);
        const question = shuffled.map((s, i) => `${getNumberingPrefix(numberingFormat, i + 1)}${s}`).join('\n\n');
        const answerOrder = sentences.map(original => 
            getNumberingPrefix(numberingFormat, shuffled.indexOf(original) + 1).trim().replace(/[().\s]/g, '')
        );

        return `${formattedTitle}${question}\n\n정답: ${answerOrder.join(" → ")}`;
    }).join('\n\n🟪\n\n');
    document.getElementById('outputArea').innerText = result.trim() || '생성할 내용이 없습니다.';
}

function generateWordOrderQuestion() {
    const passages = getPassages();
    const numberingFormat = document.getElementById('formatSelect').value;
    const includeExplanations = document.getElementById('includeExplanations').checked;
    let questionCount = 1;

    const result = passages.map(({ title, body }) => {
        const sentences = extractSentences(body);
        let explanations = [];
        if (includeExplanations && title) {
            explanations = extractSentences(title);
        }

        if (includeExplanations && title && explanations.length !== sentences.length) {
            return `❗ 지문 오류: 해설(${explanations.length}개)과 영어 문장(${sentences.length}개)의 개수가 일치하지 않습니다.`;
        }

        return sentences.map((sentence, idx) => {
            const explanation = (includeExplanations && explanations[idx]) ? `${explanations[idx].trim()}\n` : '';
            let words = sentence.trim().replace(/[.,?!]$/, "").split(/\s+/).filter(Boolean);
            if (words.length > 0) { words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1); }
            const shuffled = [...words].sort(() => Math.random() - 0.5);
            const numbering = getNumberingPrefix(numberingFormat, questionCount++);
            return `${numbering}${explanation}[ ${shuffled.join(' / ')} ]\n\n→\n\n`;
        }).join('\n\n');
    }).join('\n\n🟪\n\n');
    document.getElementById('outputArea').innerText = result.trim() || '생성할 내용이 없습니다.';
}

function generateChunkOrderQuestion() {
    if (typeof nlp === 'undefined') {
        document.getElementById('outputArea').innerText = '오류: 구문 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.';
        return;
    }

    const passages = getPassages();
    const numberingFormat = document.getElementById('formatSelect').value;
    const includeExplanations = document.getElementById('includeExplanations').checked;
    let questionCount = 1;

    const result = passages.map(({ title, body }) => {
        const sentences = extractSentences(body);
        let explanations = [];
        if (includeExplanations && title) {
            explanations = extractSentences(title);
        }

        if (includeExplanations && title && explanations.length !== sentences.length) {
            return `❗ 지문 오류: 해설(${explanations.length}개)과 영어 문장(${sentences.length}개)의 개수가 일치하지 않습니다.`;
        }

        return sentences.map((sentence, idx) => {
            const explanation = (includeExplanations && explanations[idx]) ? `${explanations[idx].trim()}\n` : '';
            const originalSentence = sentence.trim();
            const doc = nlp(originalSentence);
            let chunks = doc.chunks().out('array');
            if (chunks.length <= 1) {
                chunks = originalSentence.replace(/[.,?!]$/, '').split(/\s+/);
            }
            const shuffled = [...chunks].sort(() => Math.random() - 0.5);
            const numbering = getNumberingPrefix(numberingFormat, questionCount++);

            return `${numbering}${explanation}[ ${shuffled.join(' / ')} ]\n\n→\n\n`;
        }).join('\n\n');
    }).join('\n\n🟪\n\n');
    document.getElementById('outputArea').innerText = result.trim() || '생성할 내용이 없습니다.';
}

function copyResult() {
    const output = document.getElementById('outputArea').innerText;
    if (output && output !== '여기에 결과가 표시됩니다...') {
        navigator.clipboard.writeText(output).then(() => {
            const message = document.getElementById('copyMessage');
            message.classList.remove('opacity-0', 'translate-y-4');
            message.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => {
                message.classList.remove('opacity-100', 'translate-y-0');
                message.classList.add('opacity-0', 'translate-y-4');
            }, 2000);
        });
    }
}

function switchTab(evt, tabName) {
    const tabcontent = document.querySelectorAll("#usage-guide .tab-content");
    tabcontent.forEach(tc => tc.classList.add("hidden"));
    const tablinks = document.querySelectorAll("#usage-guide .tab-button");
    tablinks.forEach(tl => tl.classList.remove("active"));
    document.getElementById(tabName).classList.remove("hidden");
    evt.currentTarget.classList.add("active");
}

const guideModal = document.getElementById('guide-modal');
function openGuideModal() {
    guideModal.classList.remove('hidden');
}
function closeGuideModal() {
    guideModal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
        workspaceScreen.classList.add('hidden');
        document.getElementById('includeExplanations').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.passage-group-card').forEach(card => {
                const titleInput = card.querySelector('.title-input');
                if (titleInput) {
                    titleInput.classList.toggle('hidden', !isChecked);
                }
            });
        });

    guideModal.addEventListener('click', (event) => {
        if (event.target === guideModal) {
            closeGuideModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !guideModal.classList.contains('hidden')) {
            closeGuideModal();
        }
    });
});