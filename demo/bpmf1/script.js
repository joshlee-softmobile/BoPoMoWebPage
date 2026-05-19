/* ==========================================================================
   Bopomofo & Pinyin Smart Typography Editor - Main Application Logic
   High-Accuracy Contextual Conversion, Serialization, & RWD Interactivity
   ========================================================================== */

// --- Global Application State ---
let parsedTokens = [];
let manualOverrides = {}; // Map of "char_occurrence" -> { zhuyin, pinyin, special }
let selectedTokenIndex = null;

// --- Global App Settings ---

let activeFont = 'BopomofoRuby';
let presentationMode = 'mode-zhu';
let correctionMode = true;

// Presets database
const PRESETS = {
    'preset-poyin': '我們在溫暖的陽光下散步，感覺非常暖和。小明和同學正在和牌，大家玩得十分和諧，銀行行員也非常在行！我們重溫音樂時感到了無比快樂，著手著陸時卻很著急。',
    'preset-poem': '《靜夜思》 李白\n床前明月光，疑是地上霜。\n舉頭望明月，低頭思故鄉。',
    'preset-tw': '火金姑，來食茶。\n茶燒燒，配香蕉。\n香蕉冷冷，配龍眼。\n龍眼糖糖，配麻糬。'
};

// Accented vowel mappings for tone extraction/placement
const TONE_MAP = {
    'ā': { char: 'a', tone: 1 }, 'á': { char: 'a', tone: 2 }, 'ǎ': { char: 'a', tone: 3 }, 'à': { char: 'a', tone: 4 },
    'ē': { char: 'e', tone: 1 }, 'é': { char: 'e', tone: 2 }, 'ě': { char: 'e', tone: 3 }, 'è': { char: 'e', tone: 4 },
    'ī': { char: 'i', tone: 1 }, 'í': { char: 'i', tone: 2 }, 'ǐ': { char: 'i', tone: 3 }, 'ì': { char: 'i', tone: 4 },
    'ō': { char: 'o', tone: 1 }, 'ó': { char: 'o', tone: 2 }, 'ǒ': { char: 'o', tone: 3 }, 'ò': { char: 'o', tone: 4 },
    'ū': { char: 'u', tone: 1 }, 'ú': { char: 'u', tone: 2 }, 'ǔ': { char: 'u', tone: 3 }, 'ù': { char: 'u', tone: 4 },
    'ǖ': { char: 'ü', tone: 1 }, 'ǘ': { char: 'ü', tone: 2 }, 'ǚ': { char: 'ü', tone: 3 }, 'ǜ': { char: 'ü', tone: 4 },
    'Ā': { char: 'a', tone: 1 }, 'Á': { char: 'a', tone: 2 }, 'Ǎ': { char: 'a', tone: 3 }, 'À': { char: 'a', tone: 4 },
    'Ē': { char: 'e', tone: 1 }, 'É': { char: 'e', tone: 2 }, 'Ě': { char: 'e', tone: 3 }, 'È': { char: 'e', tone: 4 },
    'Ī': { char: 'i', tone: 1 }, 'Í': { char: 'i', tone: 2 }, 'Ǐ': { char: 'i', tone: 3 }, 'Ì': { char: 'i', tone: 4 },
    'Ō': { char: 'o', tone: 1 }, 'Ó': { char: 'o', tone: 2 }, 'Ǒ': { char: 'o', tone: 3 }, 'Ò': { char: 'o', tone: 4 },
    'Ū': { char: 'u', tone: 1 }, 'Ú': { char: 'u', tone: 2 }, 'Ǔ': { char: 'u', tone: 3 }, 'Ù': { char: 'u', tone: 4 },
    'Ǖ': { char: 'ü', tone: 1 }, 'Ǘ': { char: 'ü', tone: 2 }, 'Ǚ': { char: 'ü', tone: 3 }, 'Ǜ': { char: 'ü', tone: 4 }
};

const ACCENTS = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
};

// Initial mappings for Pinyin-to-Zhuyin converter
const PINYIN_INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];

const INITIALS_MAP = {
    'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
    'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
    'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
    'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
    'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
    'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ'
};

const FINALS_MAP = {
    'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'i': 'ㄧ', 'u': 'ㄨ', 'ü': 'ㄩ',
    'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
    'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ', 'er': 'ㄦ',
    'ia': 'ㄧㄚ', 'ian': 'ㄧㄢ', 'iang': 'ㄧㄤ', 'iao': 'ㄧㄠ',
    'ie': 'ㄧㄝ', 'in': 'ㄧㄣ', 'ing': 'ㄧㄥ', 'iong': 'ㄩㄥ',
    'iu': 'ㄧㄡ', 'ong': 'ㄨㄥ', 'ua': 'ㄨㄚ', 'uai': 'ㄨㄞ',
    'uan': 'ㄨㄢ', 'uang': 'ㄨㄤ', 'ui': 'ㄨㄟ', 'un': 'ㄨㄣ',
    'uo': 'ㄨㄛ', 'üan': 'ㄩㄢ', 'üe': 'ㄩㄝ', 'ün': 'ㄩㄣ'
};

// Inverted mappings for Zhuyin-to-Pinyin converter
const ZHUYIN_INITIALS_MAP = {};
for (let key in INITIALS_MAP) ZHUYIN_INITIALS_MAP[INITIALS_MAP[key]] = key;

const ZHUYIN_FINALS_MAP = {};
for (let key in FINALS_MAP) ZHUYIN_FINALS_MAP[FINALS_MAP[key]] = key;
ZHUYIN_FINALS_MAP['ㄝ'] = 'ie';

window.TAIWAN_PHRASES = null;

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.getElementById('loader-title').innerText = '載入官方字典中...';
        document.getElementById('loader-subtitle').innerText = '正在即時解析教育部國語辭典簡編本';
    }

    // Load default preset into input
    document.getElementById('main-editor').value = PRESETS['preset-poyin'];

    // Poll to wait for XLSX to load from CDN
    let libCheckInterval = setInterval(() => {
        if (window.XLSX) {
            clearInterval(libCheckInterval);
            
            // Start fetching the raw Excel dictionary from assets
            fetch('../assets/dict_concised_2014_20260325.xlsx')
                .then(res => res.arrayBuffer())
                .then(buffer => {
                    // Parse binary Excel data on the fly
                    const workbook = window.XLSX.read(buffer, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const data = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    
                    window.TAIWAN_PHRASES = {};
                    window.TAIWAN_SINGLE_CHARS = {}; // Authentic local Taiwanese single-character dictionary database!
                    let count = 0;
                    let singleCharCount = 0;
                    for (let i = 1; i < data.length; i++) {
                        let word = data[i][0]; // Column 0: 字詞名
                        let zhuyinStr = data[i][6]; // Column 6: 注音一式
                        
                        if (typeof word === 'string' && typeof zhuyinStr === 'string') {
                            word = word.replace(/【.*?】/g, '').replace(/\[.*?\]/g, '').trim();
                            if (!/^[\u4E00-\u9FFF]+$/.test(word)) continue;
                            
                            zhuyinStr = zhuyinStr.replace(/\（.*?\）/g, '').replace(/\(.*?\)/g, '').trim();
                            let zTokens = zhuyinStr.split(/[\s　]+/).filter(z => z);
                            
                            // 1. Parse and record single-character MOE candidates
                            if (word.length === 1 && zTokens.length === 1) {
                                const char = word;
                                const zy = zTokens[0];
                                const py = zhuyinToPinyin(zy);
                                
                                if (!window.TAIWAN_SINGLE_CHARS[char]) {
                                    window.TAIWAN_SINGLE_CHARS[char] = [];
                                }
                                if (!window.TAIWAN_SINGLE_CHARS[char].some(c => c.zhuyin === zy)) {
                                    window.TAIWAN_SINGLE_CHARS[char].push({
                                        zhuyin: zy,
                                        pinyin: py
                                    });
                                    singleCharCount++;
                                }
                            }
                            
                            // 2. Parse and record compound phrases
                            if (word.length < 2) continue;
                            
                            if (word.length === zTokens.length) {
                                window.TAIWAN_PHRASES[word] = zTokens;
                                count++;
                            }
                        }
                    }
                    console.log(`Parsed ${count} MOE phrases and ${singleCharCount} unique MOE single-character candidate mappings!`);
                    
                    if (overlay) overlay.classList.add('fade-out');
                    handleEditorInput(); // Run first layout render with fully loaded memory dictionary
                })
                .catch(err => {
                    console.error('Failed to load or parse Excel dictionary:', err);
                    if (overlay) overlay.classList.add('fade-out');
                    handleEditorInput(); // Fallback to pinyin-pro only
                });
        }
    }, 50);

    // Global click listener for deselecting active characters & closing custom dropdowns
    document.addEventListener('click', (e) => {
        // Close preset dropdown if clicked outside
        const presetMenu = document.getElementById('preset-dropdown-menu');
        const presetTrigger = document.getElementById('preset-dropdown-trigger');
        if (presetMenu && presetMenu.classList.contains('show') && !e.target.closest('#preset-dropdown-container')) {
            presetMenu.classList.remove('show');
            presetTrigger.classList.remove('open');
        }

        // Deselect word focus in correction mode when clicking empty space
        if (correctionMode && selectedTokenIndex !== null) {
            // Safe guard: if the clicked element has been detached from the DOM during execution, do not deselect
            if (!e.target.isConnected) return;

            const clickedBpmf = e.target.closest('bpmf');
            const clickedCandidateBar = e.target.closest('#candidate-bar');
            const clickedCustomAssembler = e.target.closest('.custom-assembler-section');
            
            if (!clickedBpmf && !clickedCandidateBar && !clickedCustomAssembler) {
                deselectWord();
            }
        }
    });

    // Initialize split layout draggable resizer
    initLayoutResizer();
});

// --- Theme Management ---
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        showToast('已切換至深色主題 🌙');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        showToast('已切換至淺色主題 ☀️');
    }
}


// --- Text Utility & Preset Loader ---
function loadPreset(key) {
    if (PRESETS[key]) {
        stopTts();
        manualOverrides = {}; // Reset overrides cache
        document.getElementById('main-editor').value = PRESETS[key];
        handleEditorInput();
        deselectWord();
        showToast('已載入預設教材範例');
    }
}

function togglePresetDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    if (menu) {
        const isShown = menu.classList.contains('show');
        // Close all other dropdowns if any
        menu.classList.toggle('show', !isShown);
        trigger.classList.toggle('open', !isShown);
    }
}

function selectPreset(key) {
    loadPreset(key);
    const menu = document.getElementById('preset-dropdown-menu');
    const trigger = document.getElementById('preset-dropdown-trigger');
    if (menu) {
        menu.classList.remove('show');
        trigger.classList.remove('open');
    }
}

// Clear input
function clearEditor() {
    stopTts();
    manualOverrides = {}; // Reset overrides cache
    document.getElementById('main-editor').value = '';
    handleEditorInput();
    deselectWord();
    showToast('編輯器已清空');
}

// Toast System
function showToast(message) {
    const toast = document.getElementById('sys-toast');
    document.getElementById('sys-toast-text').innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// --- Phonetic Converter Engine (Pinyin <-> Zhuyin) ---
function pinyinSyllableToZhuyin(cleanPinyin) {
    let p = cleanPinyin;

    // Standalone special syllables
    const special = {
        'yi': 'ㄧ', 'ya': 'ㄧㄚ', 'yao': 'ㄧㄠ', 'ye': 'ㄧㄝ', 'you': 'ㄧㄡ',
        'yan': 'ㄧㄢ', 'yin': 'ㄧㄣ', 'yang': 'ㄧㄤ', 'ying': 'ㄧㄥ', 'yong': 'ㄩㄥ',
        'yu': 'ㄩ', 'yuan': 'ㄩㄢ', 'yue': 'ㄩㄝ', 'yun': 'ㄩㄣ',
        'wu': 'ㄨ', 'wa': 'ㄨㄚ', 'wo': 'ㄨㄛ', 'wai': 'ㄨㄞ', 'wei': 'ㄨㄟ',
        'wan': 'ㄨㄢ', 'wen': 'ㄨㄣ', 'wang': 'ㄨㄤ', 'weng': 'ㄨㄥ',
        'er': 'ㄦ', 'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ai': 'ㄞ', 'ei': 'ㄟ',
        'ao': 'ㄠ', 'ou': 'ㄡ', 'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ'
    };

    if (special[p]) return special[p];

    let initial = '';
    for (let init of PINYIN_INITIALS) {
        if (p.startsWith(init)) {
            initial = init;
            p = p.slice(init.length);
            break;
        }
    }

    let zhuInit = INITIALS_MAP[initial] || '';

    // Clean rules for finals under palatals
    if (initial === 'j' || initial === 'q' || initial === 'x') {
        if (p === 'u') p = 'ü';
        if (p === 'uan') p = 'üan';
        if (p === 'ue') p = 'üe';
        if (p === 'un') p = 'ün';
    }

    let zhuFinal = FINALS_MAP[p] || '';

    // Silent 'i' rule
    if (['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(initial) && p === 'i') {
        zhuFinal = '';
    }

    return zhuInit + zhuFinal;
}

function pinyinToZhuyin(pinyin) {
    if (!pinyin) return '';

    let tone = 1;
    let clean = '';

    // Extract tone marks and clean character
    for (let char of pinyin) {
        if (TONE_MAP[char]) {
            clean += TONE_MAP[char].char;
            tone = TONE_MAP[char].tone;
        } else {
            clean += char;
        }
    }

    clean = clean.toLowerCase().replace('v', 'ü');

    const numMatch = clean.match(/([1-5])$/);
    if (numMatch) {
        tone = parseInt(numMatch[1]);
        clean = clean.slice(0, -1);
    }

    let bopomofo = pinyinSyllableToZhuyin(clean);

    const TONE_MARKS = {
        1: '',
        2: 'ˊ',
        3: 'ˇ',
        4: 'ˋ',
        5: '˙'
    };

    if (tone === 5) {
        return '˙' + bopomofo; // neutral prepended
    } else {
        return bopomofo + TONE_MARKS[tone];
    }
}

function addToneMark(pinyin, tone) {
    if (!pinyin || tone < 1 || tone > 5) return pinyin;
    if (tone === 5) return pinyin;

    let chars = [...pinyin];
    let targetIdx = -1;

    if (pinyin.includes('a')) {
        targetIdx = pinyin.indexOf('a');
    } else if (pinyin.includes('e')) {
        targetIdx = pinyin.indexOf('e');
    } else if (pinyin.includes('o')) {
        targetIdx = pinyin.indexOf('o');
    } else if (pinyin.includes('ui')) {
        targetIdx = pinyin.indexOf('i');
    } else if (pinyin.includes('iu')) {
        targetIdx = pinyin.indexOf('u');
    } else {
        for (let i = 0; i < chars.length; i++) {
            if ('iouü'.includes(chars[i])) {
                targetIdx = i;
                break;
            }
        }
    }

    if (targetIdx !== -1) {
        let v = chars[targetIdx];
        if (ACCENTS[v]) {
            chars[targetIdx] = ACCENTS[v][tone - 1];
        }
    }

    return chars.join('');
}

function zhuyinToPinyin(zhuyin) {
    if (!zhuyin) return '';

    let tone = 1;
    let clean = zhuyin;

    if (clean.startsWith('˙')) {
        tone = 5;
        clean = clean.slice(1);
    } else if (clean.endsWith('ˊ')) {
        tone = 2;
        clean = clean.slice(0, -1);
    } else if (clean.endsWith('ˇ')) {
        tone = 3;
        clean = clean.slice(0, -1);
    } else if (clean.endsWith('ˋ')) {
        tone = 4;
        clean = clean.slice(0, -1);
    } else if (clean.endsWith('˙')) {
        tone = 5;
        clean = clean.slice(0, -1);
    }

    let initial = '';
    if (ZHUYIN_INITIALS_MAP[clean[0]]) {
        initial = clean[0];
        clean = clean.slice(1);
    }

    let pinyinInit = ZHUYIN_INITIALS_MAP[initial] || '';
    let pinyinFinal = ZHUYIN_FINALS_MAP[clean] || '';

    if (initial === '') {
        if (clean === 'ㄧ') pinyinFinal = 'yi';
        else if (clean === 'ㄨ') pinyinFinal = 'wu';
        else if (clean === 'ㄩ') pinyinFinal = 'yu';
        else if (clean.startsWith('ㄧ')) {
            const mapped = ZHUYIN_FINALS_MAP[clean];
            pinyinFinal = mapped ? 'y' + mapped.slice(1) : '';
        }
        else if (clean.startsWith('ㄨ')) {
            if (clean === 'ㄨㄣ') pinyinFinal = 'wen';
            else if (clean === 'ㄨㄥ') pinyinFinal = 'weng';
            else {
                const mapped = ZHUYIN_FINALS_MAP[clean];
                pinyinFinal = mapped ? 'w' + mapped.slice(1) : '';
            }
        }
        else if (clean.startsWith('ㄩ')) {
            const mapped = ZHUYIN_FINALS_MAP[clean];
            pinyinFinal = mapped ? 'yu' + mapped.slice(1) : '';
        }
    } else {
        if (initial === 'ㄐ' || initial === 'ㄑ' || initial === 'ㄒ') {
            if (pinyinFinal === 'ü') pinyinFinal = 'u';
            else if (pinyinFinal === 'üe') pinyinFinal = 'ue';
            else if (pinyinFinal === 'üan') pinyinFinal = 'uan';
            else if (pinyinFinal === 'ün') pinyinFinal = 'un';
        }
        if (['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ'].includes(initial) && clean === '') {
            pinyinFinal = 'i';
        }
    }

    let cleanPinyin = pinyinInit + pinyinFinal;
    return addToneMark(cleanPinyin, tone);
}

// --- Manual Overrides Occurrence Helper ---
function getOccurrenceKey(tokensList, targetIndex) {
    const char = tokensList[targetIndex].char;
    let occurrence = 0;
    for (let i = 0; i < targetIndex; i++) {
        if (tokensList[i].char === char) {
            occurrence++;
        }
    }
    return `${char}_${occurrence}`;
}

// --- Robust HTML/Text Tokenizer ---
// Parses a mix of standard text and custom <bpmf zhuyin="..." pinyin="...">字</bpmf> tags
function parseTextToTokens(rawText) {
    const tokens = [];
    // Extremely robust regex matching <bpmf ...>...</bpmf> tags with any attribute order
    const regex = /<bpmf\s+([^>]*?)>([^<]*?)<\/bpmf>/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawText)) !== null) {
        const matchIndex = match.index;
        const matchText = match[0];
        const attrStr = match[1];
        const baseChar = match[2];

        // Parse attributes dynamically from the attribute string
        const zhuyinMatch = attrStr.match(/zhuyin="([^"]*)"/);
        const pinyinMatch = attrStr.match(/pinyin="([^"]*)"/);
        
        const zhuyin = zhuyinMatch ? zhuyinMatch[1] : '';
        const pinyin = pinyinMatch ? pinyinMatch[1] : '';

        // Everything before this match is parsed as normal character tokens
        const beforeText = rawText.substring(lastIndex, matchIndex);
        if (beforeText) {
            for (const char of beforeText) {
                tokens.push({
                    type: 'plain',
                    char: char
                });
            }
        }

        // Add the custom pre-annotated token
        tokens.push({
            type: 'custom',
            char: baseChar,
            zhuyin: zhuyin,
            pinyin: pinyin,
            token: matchText
        });

        lastIndex = regex.lastIndex;
    }

    // Remaining trailing text
    const remainingText = rawText.substring(lastIndex);
    if (remainingText) {
        for (const char of remainingText) {
            tokens.push({
                type: 'plain',
                char: char
            });
        }
    }

    return tokens;
}

// --- Text Parsing & State Reconstruction ---
function handleEditorInput() {
    const rawText = document.getElementById('main-editor').value;

    // Stop TTS if user is actively editing text to prevent index mismatching
    if (typeof ttsState !== 'undefined' && ttsState !== 'stopped') {
        stopTts();
    }

    // Helper function to check if character is a Chinese character
    const isChineseChar = (char) => /[\u4e00-\u9fff]|[\u3400-\u4dbf]/u.test(char);

    const baseTokens = parseTextToTokens(rawText);
    parsedTokens = [];

    // Track dynamic character occurrences during text parsing to bind manual overrides
    let occurrenceCounts = {};

    baseTokens.forEach((token) => {
        if (token.type === 'custom') {
            const isChinese = isChineseChar(token.char);

            let special = null;
            if (token.zhuyin === '' && token.pinyin === '') special = 'blank';
            else if (token.zhuyin === ' ' && token.pinyin === ' ') special = 'brackets';

            // Cache imported custom tag into manual overrides mapping
            if (isChinese) {
                occurrenceCounts[token.char] = (occurrenceCounts[token.char] || 0) + 1;
                const key = `${token.char}_${occurrenceCounts[token.char] - 1}`;
                manualOverrides[key] = {
                    zhuyin: token.zhuyin,
                    pinyin: token.pinyin,
                    special: special
                };
            }

            parsedTokens.push({
                type: 'chinese',
                char: token.char,
                token: token.token,
                pinyin: token.pinyin,
                zhuyin: token.zhuyin,
                special: special,
                isCustom: true
            });
        } else {
            const baseChar = token.char;
            const isChinese = isChineseChar(baseChar);

            if (!isChinese) {
                parsedTokens.push({
                    type: 'other',
                    char: baseChar,
                    token: baseChar
                });
                return;
            }

            // Track occurrence index in the fresh plain-text stream
            occurrenceCounts[baseChar] = (occurrenceCounts[baseChar] || 0) + 1;
            const key = `${baseChar}_${occurrenceCounts[baseChar] - 1}`;

            // Resolve default phonetic by looking up our parsed TAIWAN_SINGLE_CHARS database!
            let defaultZhuyin = '';
            let defaultPinyin = '';

            if (window.TAIWAN_SINGLE_CHARS && window.TAIWAN_SINGLE_CHARS[baseChar] && window.TAIWAN_SINGLE_CHARS[baseChar].length > 0) {
                defaultZhuyin = window.TAIWAN_SINGLE_CHARS[baseChar][0].zhuyin;
                defaultPinyin = window.TAIWAN_SINGLE_CHARS[baseChar][0].pinyin;
            }

            let special = null;
            let isCustom = false;

            // Re-apply saved manual overrides from state memory!
            if (manualOverrides[key]) {
                defaultZhuyin = manualOverrides[key].zhuyin;
                defaultPinyin = manualOverrides[key].pinyin;
                special = manualOverrides[key].special;
                isCustom = true;
            }

            parsedTokens.push({
                type: 'chinese',
                char: baseChar,
                token: baseChar,
                pinyin: defaultPinyin,
                zhuyin: defaultZhuyin,
                special: special,
                isCustom: isCustom
            });
        }
    });

    // Apply Taiwanese Custom Polyphonic Interceptor (Overrides Mainland pinyin-pro defaults)
    if (window.TAIWAN_PHRASES) {
        const maxPhraseLen = 10; // Longest MOE phrase is generally <= 10 characters
        
        for (let i = 0; i < parsedTokens.length; i++) {
            let matchedLen = 0;
            let matchedZhuyins = null;
            
            // Look for the longest possible matching phrase starting at character i
            for (let len = maxPhraseLen; len >= 2; len--) {
                if (i + len <= parsedTokens.length) {
                    let phrase = "";
                    let isPureChinese = true;
                    
                    for (let j = 0; j < len; j++) {
                        if (parsedTokens[i+j].type !== 'chinese') {
                            isPureChinese = false;
                            break;
                        }
                        phrase += parsedTokens[i+j].char;
                    }
                    
                    if (isPureChinese && window.TAIWAN_PHRASES[phrase]) {
                        matchedLen = len;
                        matchedZhuyins = window.TAIWAN_PHRASES[phrase];
                        break; // Longest match found, exit length loop
                    }
                }
            }
            
            // If a phrase match was found in the official MOE dictionary
            if (matchedLen > 0) {
                for (let j = 0; j < matchedLen; j++) {
                    if (!parsedTokens[i+j].isCustom) {
                        parsedTokens[i+j].zhuyin = matchedZhuyins[j];
                        parsedTokens[i+j].pinyin = zhuyinToPinyin(matchedZhuyins[j]);
                    }
                }
                // Skip ahead to prevent overlapping phrase matches
                i += matchedLen - 1;
            }
        }
    }

    // Update character counters
    const totalChars = parsedTokens.filter(t => t.type === 'chinese').length;
    document.getElementById('char-counter').innerText = `共 ${totalChars} 字`;

    renderPreview();
}

// --- Preview Presentation Renderer ---
function renderPreview() {
    const previewContainer = document.getElementById('rendered-preview');
    previewContainer.innerHTML = '';

    previewContainer.className = `rendered-preview-container ${presentationMode} ${correctionMode ? 'correction-enabled' : ''}`;

    if (parsedTokens.length === 0) {
        previewContainer.innerHTML = `
            <div class="empty-preview-placeholder">
                <svg viewBox="0 0 24 24" class="placeholder-svg">
                    <path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 20h9M3 20h4M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                    <path stroke="currentColor" stroke-width="1.5" d="M12 8v4m0 4h.01"/>
                </svg>
                <p>請在左側輸入框輸入中文字，此處將以極致美感的國語日報排版樣式呈現。</p>
            </div>
        `;
        return;
    }

    parsedTokens.forEach((tokenObj, idx) => {
        if (tokenObj.type === 'other') {
            if (tokenObj.char === '\n') {
                previewContainer.appendChild(document.createElement('br'));
            } else {
                const textSpan = document.createElement('span');
                textSpan.innerText = tokenObj.char;
                textSpan.className = 'plain-text-token';
                previewContainer.appendChild(textSpan);
            }
            return;
        }

        // Generate <bpmf> custom typographic tag
        const bpmfSpan = document.createElement('bpmf');
        bpmfSpan.innerText = tokenObj.char;
        bpmfSpan.setAttribute('zhuyin', tokenObj.zhuyin || '');
        bpmfSpan.setAttribute('pinyin', tokenObj.pinyin || '');
        bpmfSpan.setAttribute('data-idx', idx); // 100% robust misalignment fix

        if (tokenObj.special) bpmfSpan.classList.add(tokenObj.special);
        else if (tokenObj.isCustom) bpmfSpan.classList.add('custom-modified');

        if (selectedTokenIndex === idx) bpmfSpan.classList.add('selected');

        // Click to edit
        bpmfSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (correctionMode) {
                selectWord(idx);
            }
        });

        previewContainer.appendChild(bpmfSpan);
    });
}

function setPresentationMode(mode) {
    presentationMode = mode;

    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        }
    });

    renderPreview();
    showToast(`切換顯示格式：${document.querySelector(`.segment-btn[data-mode="${mode}"]`).innerText}`);
}

function toggleCorrectionMode() {
    correctionMode = document.getElementById('correction-mode-toggle').checked;

    if (!correctionMode) {
        deselectWord();
    }

    renderPreview();
    showToast(correctionMode ? '開啟點擊校正模式 ✏️' : '純預覽排版模式 👁️');
}

function selectWord(idx) {
    selectedTokenIndex = idx;

    // Highlight elements using robust data-idx matching
    document.querySelectorAll('bpmf').forEach((b) => {
        const tokenIdx = parseInt(b.getAttribute('data-idx'));
        if (tokenIdx === idx) b.classList.add('selected');
        else b.classList.remove('selected');
    });

    const tokenObj = parsedTokens[idx];

    // Display active drawer
    document.getElementById('candidate-empty-state').style.display = 'none';
    document.getElementById('candidate-active-state').style.display = 'grid';
    document.getElementById('candidate-bar').classList.add('show-bottom-sheet');

    // Character profiles
    document.getElementById('selected-char').innerText = tokenObj.char;
    document.getElementById('selected-unicode').innerText = `U+${tokenObj.char.codePointAt(0).toString(16).toUpperCase()}`;

    const isPoly = getWordCandidates(tokenObj.char).length > 1;
    const typeBadge = document.getElementById('selected-type-badge');
    typeBadge.innerText = isPoly ? '多音字' : '常用字';
    typeBadge.className = isPoly ? 'profile-type-badge polyphonic' : 'profile-type-badge';

    populatePhoneticCandidates(tokenObj.char, tokenObj.zhuyin);

    document.getElementById('custom-zhuyin-input').value = tokenObj.zhuyin || '';
    document.getElementById('custom-pinyin-input').value = tokenObj.pinyin || '';

    validateCustomInput();
    
    // Always default to recommendations tab on mobile
    if (window.innerWidth <= 768) {
        switchCandidateTab('suggest');
    }
}

function deselectWord() {
    selectedTokenIndex = null;
    document.querySelectorAll('bpmf').forEach(b => b.classList.remove('selected'));

    document.getElementById('candidate-empty-state').style.display = 'flex';
    document.getElementById('candidate-active-state').style.display = 'none';
    document.getElementById('candidate-bar').classList.remove('show-bottom-sheet');
}

function getWordCandidates(char) {
    if (window.TAIWAN_SINGLE_CHARS && window.TAIWAN_SINGLE_CHARS[char]) {
        return window.TAIWAN_SINGLE_CHARS[char];
    }
    return [];
}

function populatePhoneticCandidates(char, activeZhuyin) {
    const container = document.getElementById('candidates-options-container');
    container.innerHTML = '';

    const candidates = getWordCandidates(char);

    candidates.forEach((cand) => {
        const btn = document.createElement('button');
        btn.className = 'candidate-option-btn';

        if (cand.zhuyin === activeZhuyin) {
            btn.classList.add('active');
        }

        btn.innerHTML = `
            <span class="cand-zhuyin">${cand.zhuyin}</span>
            <span class="cand-pinyin">${cand.pinyin}</span>
        `;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyPhoneticSelection(cand.zhuyin, cand.pinyin);
        });

        container.appendChild(btn);
    });
}

function applyPhoneticSelection(zhuyin, pinyin) {
    if (selectedTokenIndex === null) return;

    const tokenObj = parsedTokens[selectedTokenIndex];
    tokenObj.zhuyin = zhuyin;
    tokenObj.pinyin = pinyin;
    tokenObj.special = null;
    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: zhuyin,
        pinyin: pinyin,
        special: null
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(`成功更換讀音為 ${zhuyin} (${pinyin})`);
}

function applySpecialPresentation(mode) {
    if (selectedTokenIndex === null) return;

    const tokenObj = parsedTokens[selectedTokenIndex];

    if (mode === 'blank') {
        tokenObj.special = 'blank';
        tokenObj.zhuyin = '';
        tokenObj.pinyin = '';
    } else if (mode === 'brackets') {
        tokenObj.special = 'brackets';
        tokenObj.zhuyin = ' ';
        tokenObj.pinyin = ' ';
    }

    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: tokenObj.zhuyin,
        pinyin: tokenObj.pinyin,
        special: tokenObj.special
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(mode === 'blank' ? '已套用注音留白' : '已套用注音填空');
}

// --- Custom Manual Phonetic Assembly ---
function validateCustomInput() {
    const zVal = document.getElementById('custom-zhuyin-input').value.trim();
    const pVal = document.getElementById('custom-pinyin-input').value.trim();
    const btn = document.getElementById('btn-apply-custom');

    if (zVal.length > 0 && pVal.length > 0) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

function applyCustomPhonetic() {
    if (selectedTokenIndex === null) return;

    const zVal = document.getElementById('custom-zhuyin-input').value.trim();
    const pVal = document.getElementById('custom-pinyin-input').value.trim();

    const tokenObj = parsedTokens[selectedTokenIndex];
    tokenObj.zhuyin = zVal;
    tokenObj.pinyin = pVal;
    tokenObj.special = null;
    tokenObj.isCustom = true;

    // Save to global manualOverrides cache!
    const key = getOccurrenceKey(parsedTokens, selectedTokenIndex);
    manualOverrides[key] = {
        zhuyin: zVal,
        pinyin: pVal,
        special: null
    };

    serializeStateToTextarea();
    renderPreview();
    selectWord(selectedTokenIndex);
    showToast(`成功套用自訂音標：${zVal} (${pVal})`);
}


// --- Bidirectional Serialization (State to Textarea HTML Tags) ---
function serializeStateToTextarea() {
    const rawParts = [];

    parsedTokens.forEach((tokenObj) => {
        rawParts.push(tokenObj.char);
    });

    const editor = document.getElementById('main-editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    editor.value = rawParts.join('');

    editor.setSelectionRange(start, end);
}

// --- Export Codes Modal System ---
function openExportModal() {
    const modal = document.getElementById('export-modal');
    modal.style.display = 'flex';

    // 1. Generate HTML Code
    let htmlCode = `<div class="mode-zhu">\n`;
    parsedTokens.forEach((t) => {
        if (t.type === 'other') {
            if (t.char === '\n') htmlCode += `<br>\n`;
            else htmlCode += t.char;
        } else {
            htmlCode += `  <bpmf zhuyin="${t.zhuyin || ''}" pinyin="${t.pinyin || ''}">${t.char}</bpmf>\n`;
        }
    });
    htmlCode += `</div>`;
    document.getElementById('export-html-code').value = htmlCode;

    // 2. Generate CSS Code
    const cssCode = `/* Bopomofo & Pinyin CSS Typography Rules */
@font-face {
    font-family: 'BopomofoRuby';
    src: url('https://raw.githubusercontent.com/joshlee-softmobile/BoPoMoWebPage/main/demo/font/BopomofoRuby1909-v1-Regular.ttf') format('truetype');
}

.mode-zhu bpmf {
    position: relative;
    display: inline-block;
    padding-right: 0.45em;
    font-family: inherit;
}

.mode-zhu bpmf::after {
    content: attr(zhuyin);
    writing-mode: vertical-rl;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    right: -1.25em;
    left: 1.05em;
    top: 0;
    bottom: 0;
    font-family: 'BopomofoRuby', sans-serif;
    font-size: 0.31em;
    text-orientation: upright;
    line-height: 1.05;
    letter-spacing: -2px;
}

.mode-pin bpmf {
    position: relative;
    display: inline-block;
    padding-top: 0.45em;
}

.mode-pin bpmf::before {
    content: attr(pinyin);
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0.05em;
    right: 0;
    left: 0;
    font-family: sans-serif;
    font-size: 0.35em;
    font-weight: 600;
    line-height: 1;
}`;
    document.getElementById('export-css-code').value = cssCode;

    switchModalTab('tab-html');
}

function closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
}

function switchModalTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.outerHTML.includes(tabId)) btn.classList.add('active');
    });

    document.querySelectorAll('.tab-content').forEach(c => {
        c.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
}

function copyModalCode() {
    let textToCopy = '';

    if (document.getElementById('tab-html').style.display !== 'none') {
        textToCopy = document.getElementById('export-html-code').value;
    } else {
        textToCopy = document.getElementById('export-css-code').value;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        const ind = document.getElementById('copy-success-indicator');
        ind.classList.add('show');
        setTimeout(() => {
            ind.classList.remove('show');
        }, 1500);
    }).catch(err => {
        console.error('Copy failed: ', err);
        showToast('複製失敗，請手動全選複製。');
    });
}

// --- Text Speech Engine (TTS) ---
let ttsState = 'stopped'; // 'stopped', 'playing', 'paused'
let currentPronouncingTokenIdx = null;
let activeUtterance = null; // Global reference to prevent Chrome/Firefox garbage collection
let ttsTimer = null; // High-precision hybrid alignment timer
let ttsSimulatedCharIndex = 0; // Tracks simulated reading position

function setTtsState(state) {
    ttsState = state;
    const playBtn = document.getElementById('btn-tts-play');
    const stopBtn = document.getElementById('btn-tts-stop');
    const icon = document.getElementById('tts-play-icon');
    const previewContainer = document.getElementById('rendered-preview');
    
    if (state === 'playing') {
        if (previewContainer) previewContainer.classList.remove('tts-paused');
        // Pause icon (two vertical lines)
        icon.innerHTML = `
            <line x1="17" y1="4" x2="17" y2="20"></line>
            <line x1="7" y1="4" x2="7" y2="20"></line>
        `;
        playBtn.title = '暫停朗讀';
        stopBtn.disabled = false;
    } else if (state === 'paused') {
        if (previewContainer) previewContainer.classList.add('tts-paused');
        // Play icon (triangle)
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '繼續播放';
        stopBtn.disabled = false;
    } else { // stopped
        if (previewContainer) {
            previewContainer.classList.remove('tts-paused');
        }
        clearTtsHighlight();
        // Play icon (triangle)
        icon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
        playBtn.title = '播放朗讀';
        stopBtn.disabled = true;
    }
}

function highlightPronouncingToken(tokenIdx) {
    currentPronouncingTokenIdx = tokenIdx;
    
    // Clear previous TTS highlights
    document.querySelectorAll('bpmf').forEach((b) => {
        b.classList.remove('tts-pronouncing');
    });
    
    // Highlight the active token element
    const targetElement = document.querySelector(`bpmf[data-idx="${tokenIdx}"]`);
    if (targetElement) {
        targetElement.classList.add('tts-pronouncing');
        
        // Scroll the element into viewport smoothly if out of view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearTtsHighlight() {
    currentPronouncingTokenIdx = null;
    document.querySelectorAll('bpmf').forEach((b) => {
        b.classList.remove('tts-pronouncing');
    });
}

function toggleTts() {
    if (ttsState === 'stopped') {
        startTts();
    } else if (ttsState === 'playing') {
        window.speechSynthesis.pause();
        setTtsState('paused');
        showToast('語音播放已暫停 ⏸️');
    } else if (ttsState === 'paused') {
        window.speechSynthesis.resume();
        setTtsState('playing');
        showToast('語音繼續播放 🔊');
    }
}

function startTts() {
    window.speechSynthesis.cancel();
    
    if (ttsTimer) {
        clearInterval(ttsTimer);
        ttsTimer = null;
    }
    
    let plainText = '';
    const charToTokenIdx = []; // map plainText indices back to token indices
    
    parsedTokens.forEach((t, tokenIdx) => {
        const charStr = t.char;
        for (let i = 0; i < charStr.length; i++) {
            charToTokenIdx.push(tokenIdx);
        }
        plainText += charStr;
    });
    
    if (!plainText.trim()) {
        showToast('無任何文本可供朗讀！');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'zh-TW';
    
    const voices = window.speechSynthesis.getVoices();
    const twVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'zh-tw');
    if (twVoice) utterance.voice = twVoice;
    
    // Save to window level global reference to prevent garbage collection on Chrome/Firefox
    window.activeUtterance = utterance;
    
    ttsSimulatedCharIndex = 0;
    let punctuationPauseTicks = 0;
    
    // Real-time character boundary tracker (works natively on Safari & calibrates Chrome)
    utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'char') {
            const charIdx = event.charIndex;
            
            // Calibrate simulated index to the browser's exact boundary event
            ttsSimulatedCharIndex = charIdx;
            punctuationPauseTicks = 0; // reset pause ticks on calibration
            
            const tokenIdx = charToTokenIdx[charIdx];
            if (tokenIdx !== undefined) {
                highlightPronouncingToken(tokenIdx);
            }
        }
    };
    
    // Natural end callbacks
    utterance.onend = () => {
        if (ttsTimer) {
            clearInterval(ttsTimer);
            ttsTimer = null;
        }
        setTtsState('stopped');
    };
    
    utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.error('TTS error: ', e);
        }
        if (ttsTimer) {
            clearInterval(ttsTimer);
            ttsTimer = null;
        }
        setTtsState('stopped');
    };
    
    // Highlight first character immediately
    highlightPronouncingToken(charToTokenIdx[0]);
    
    window.speechSynthesis.speak(utterance);
    setTtsState('playing');
    showToast('開始語音朗讀 🔊');
    
    // High-precision hybrid fallback timer (runs seamlessly on Chrome, Firefox and Safari)
    const charDurationMs = 240 / (utterance.rate || 1.0);
    ttsTimer = setInterval(() => {
        if (ttsState !== 'playing') return;
        
        // Punctuation and breaks pauses detection
        const currentChar = plainText[ttsSimulatedCharIndex];
        const isPunct = /[，。！？；：「」『』、\s\n]/.test(currentChar);
        if (isPunct && punctuationPauseTicks < 2) {
            punctuationPauseTicks++;
            return; // pause highlight animation matching voice speech break
        }
        punctuationPauseTicks = 0;
        
        if (ttsSimulatedCharIndex < plainText.length - 1) {
            ttsSimulatedCharIndex++;
            const tokenIdx = charToTokenIdx[ttsSimulatedCharIndex];
            if (tokenIdx !== undefined) {
                highlightPronouncingToken(tokenIdx);
            }
        }
    }, charDurationMs);
}

function stopTts() {
    window.speechSynthesis.cancel();
    if (ttsTimer) {
        clearInterval(ttsTimer);
        ttsTimer = null;
    }
    setTtsState('stopped');
    showToast('語音朗讀已停止 ⏹️');
}

// --- Layout Drag-Resize Logic ---
function initLayoutResizer() {
    const resizer = document.getElementById('layout-resizer');
    const mainGrid = document.querySelector('.app-main-grid');
    
    if (!resizer || !mainGrid) return;
    
    let isDragging = false;
    
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const gridRect = mainGrid.getBoundingClientRect();
        const leftWidthPx = e.clientX - gridRect.left;
        let percentage = (leftWidthPx / gridRect.width) * 100;
        
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // Touch Support for Tablet Dragging!
    resizer.addEventListener('touchstart', (e) => {
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || !e.touches[0]) return;
        const touch = e.touches[0];
        const gridRect = mainGrid.getBoundingClientRect();
        const leftWidthPx = touch.clientX - gridRect.left;
        let percentage = (leftWidthPx / gridRect.width) * 100;
        
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        mainGrid.style.setProperty('--left-panel-width', `${percentage}%`);
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.userSelect = '';
        }
    });
}

// --- Preview Zoom Controller (Five Levels) ---
const ZOOM_LEVELS = [
    { text: '50%', size: '12px' },
    { text: '75%', size: '18px' },
    { text: '100%', size: '24px' }, // default
    { text: '125%', size: '30px' },
    { text: '150%', size: '36px' }
];
let currentZoomIdx = 2; // Default 100%

function adjustZoom(delta) {
    currentZoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIdx + delta));
    const activeZoom = ZOOM_LEVELS[currentZoomIdx];
    
    const previewContainer = document.getElementById('rendered-preview');
    if (previewContainer) {
        previewContainer.style.fontSize = activeZoom.size;
    }
    
    const indicator = document.getElementById('zoom-value');
    if (indicator) {
        indicator.innerText = activeZoom.text;
    }
}

if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

function switchCandidateTab(tabId) {
    document.querySelectorAll('.cand-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    const suggestTab = document.getElementById('cand-tab-suggest');
    const customTab = document.getElementById('cand-tab-custom');

    if (tabId === 'suggest') {
        suggestTab.style.display = 'block';
        customTab.style.display = 'none';
    } else {
        suggestTab.style.display = 'none';
        customTab.style.display = 'block';
    }
}
