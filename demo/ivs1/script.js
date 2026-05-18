// Global State variables
let currentFontFamily = 'BpmfHuninn';
let parsedTokens = [];
let selectedTokenIndex = null;
let currentCustomPhonetic = '';

// Variation selector base
const VS_BASE = 0xE01E0;

// Presets data
const PRESETS = {
    'preset-poyin': '這項技術能把攪和、暖和與和牌完美融合在和諧之中，銀行行員也非常在行！我們重溫音樂時感到了無比快樂，著手著陸時卻很著急。',
    'preset-textbook': '旅行者一號：各位都好吧？我們都很想念你們。有空就來玩。\n(請學生練習：寫出「旅行者一號」的正確注音。)',
    'preset-poem': '朝辭白帝彩雲間，千里江陵一日還。\n兩岸猿聲啼不住，輕舟已過萬重山。'
};

// Initialize application once document is ready
window.addEventListener('DOMContentLoaded', () => {
    // Register font face for default font on the fly immediately
    switchFont('BpmfHuninn', '../font/BpmfHuninn-Regular.ttf', '注音粉圓 (ButTaiwan)', '4.8 MB');
    
    // Set initial preset
    document.getElementById('text-input').value = PRESETS['preset-poyin'];
    
    // Wait for DB to load and then parse
    setTimeout(() => {
        handleLoadText();
    }, 500);
});

// Function to show a toast message
function showToast(message) {
    const toast = document.getElementById('alert-toast');
    document.getElementById('toast-message').innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// On-demand Font Loader using FontFace API
async function switchFont(fontName, fontUrl, displayName, size) {
    // Remove active classes
    document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
    
    // Highlight active button
    if (fontName === 'BpmfHuninn') document.getElementById('btn-huninn').classList.add('active');
    else if (fontName === 'BpmfIansui') document.getElementById('btn-iansui').classList.add('active');
    else if (fontName === 'BpmfZihiKaiStd') document.getElementById('btn-zihikai').classList.add('active');
    else if (fontName === 'System') document.getElementById('btn-system').classList.add('active');

    if (fontName === 'System') {
        document.getElementById('live-renderer').style.fontFamily = "'Noto Sans TC', sans-serif";
        document.getElementById('active-glyph').style.fontFamily = "'Noto Sans TC', sans-serif";
        currentFontFamily = 'System';
        showToast('已切換至系統預設字型');
        return;
    }

    // Show Loading screen
    const overlay = document.getElementById('font-loading-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubtitle = document.getElementById('overlay-subtitle');
    
    overlayTitle.innerText = `載入 ${displayName} 中...`;
    overlaySubtitle.innerText = `正在載入字型檔案 (${size}) 並重新渲染，此操作將在本地執行...`;
    overlay.classList.remove('fade-out');

    const startTime = performance.now();

    try {
        // Register font dynamically if not loaded
        if (!document.fonts.check(`1em ${fontName}`)) {
            const fontFace = new FontFace(fontName, `url(${fontUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);
        }
        
        // Update font family of containers
        document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        document.getElementById('active-glyph').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        currentFontFamily = fontName;

        const duration = Math.round(performance.now() - startTime);
        overlay.classList.add('fade-out');
        showToast(`字型載入成功！耗時 ${duration} ms`);
    } catch (err) {
        console.warn("Font loading programmatically failed, falling back to browser native CSS loader: ", err);
        
        // Still apply the font family so the browser can resolve it via static @font-face rules in style.css!
        document.getElementById('live-renderer').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        document.getElementById('active-glyph').style.fontFamily = `${fontName}, 'Noto Sans TC', sans-serif`;
        currentFontFamily = fontName;
        
        // Hide loading spinner after a short delay to let the browser download it natively
        setTimeout(() => {
            overlay.classList.add('fade-out');
            showToast(`已切換字型！正在背景載入渲染中...`);
        }, 800);
    }
}

// Load presets
function loadPreset(key) {
    if (PRESETS[key]) {
        document.getElementById('text-input').value = PRESETS[key];
        handleLoadText();
        deselectWord();
        showToast('已載入範例文字');
    }
}

// Helper to get String length including surrogate pairs
function getUnicodeCharacters(str) {
    return [...str];
}

// Robust Unicode IVS Tokenizer
function parseIVSText(rawText) {
    const chars = [...rawText];
    const tokens = [];
    
    for (let i = 0; i < chars.length; i++) {
        let char = chars[i];
        let token = char;
        
        // Check if followed by IVS Selector (U+E0100 - U+E01EF)
        if (i + 1 < chars.length) {
            let nextCode = chars[i + 1].codePointAt(0);
            if (nextCode >= 0xE0100 && nextCode <= 0xE01EF) {
                token += chars[i + 1];
                i++;
                
                // Check if U+E01E0 is followed by a PUA custom ruby character (U+F000 - U+F8FF)
                if (nextCode === 0xE01E0 && i + 1 < chars.length) {
                    let nextNextCode = chars[i + 1].codePointAt(0);
                    if (nextNextCode >= 0xF000 && nextNextCode <= 0xF8FF) {
                        token += chars[i + 1];
                        i++;
                    }
                }
            }
        }
        tokens.push(token);
    }
    return tokens;
}

// Load and parse text from textarea into editor tokens
function handleLoadText() {
    const rawText = document.getElementById('text-input').value;
    parsedTokens = parseIVSText(rawText);
    renderInteractiveTokens();
    renderInspector();
    deselectWord();
}

// De-select active word
function deselectWord() {
    selectedTokenIndex = null;
    document.querySelectorAll('.render-token').forEach(t => t.classList.remove('selected'));
    document.getElementById('sidebar-empty-state').style.display = 'flex';
    document.getElementById('sidebar-active-state').style.display = 'none';
    document.querySelectorAll('.inspector-card').forEach(c => c.classList.remove('active'));
}

// Re-construct raw text string from tokens list and sync textarea
function syncTextarea() {
    const rawText = parsedTokens.join('');
    document.getElementById('text-input').value = rawText;
    renderInspector();
}

// Helper to identify Token State and category
function getTokenInfo(token) {
    const parts = [...token];
    const baseChar = parts[0];
    const isChinese = /[\u4e00-\u9fff]|[\u3400-\u4dbf]/u.test(baseChar);
    
    let type = 'normal';
    let vsIndex = null;
    let puaChar = null;
    let bopomofoText = '';

    // Check db
    const dbEntry = window.data ? window.data[baseChar] : null;
    const hasPolyphonic = !!dbEntry;

    if (parts.length === 1) {
        if (hasPolyphonic) {
            type = 'polyphonic';
        }
    } else if (parts.length > 1) {
        const vsCode = parts[1].codePointAt(0);
        if (vsCode === 0xE01E0) {
            if (parts.length > 2) {
                const puaCode = parts[2].codePointAt(0);
                if (puaCode === 0xF000) {
                    type = 'brackets'; // Empty brackets fill-in
                } else {
                    type = 'custom'; // Custom bopomofo PUA
                    puaChar = parts[2];
                    // Search back in ruby db
                    if (window.ruby) {
                        for (let syllable in window.ruby) {
                            if (window.ruby[syllable] === puaCode) {
                                bopomofoText = syllable;
                                break;
                            }
                        }
                    }
                }
            } else {
                type = 'blank'; // No bopomofo
            }
        } else if (vsCode > 0xE01E0) {
            vsIndex = vsCode - VS_BASE;
            type = 'modified'; // Specific pronunciation chosen
        }
    }

    return {
        baseChar,
        isChinese,
        type,
        hasPolyphonic,
        dbEntry,
        vsIndex,
        puaChar,
        bopomofoText
    };
}

// Render visual spans in interactive workspace
function renderInteractiveTokens() {
    const renderer = document.getElementById('live-renderer');
    renderer.innerHTML = '';

    parsedTokens.forEach((token, index) => {
        const info = getTokenInfo(token);
        
        if (token === '\n') {
            renderer.appendChild(document.createElement('br'));
            return;
        }

        const span = document.createElement('span');
        span.innerText = token;
        span.className = 'render-token';
        span.setAttribute('data-index', index);
        
        // Add IVS styling classes
        if (info.isChinese) {
            span.classList.add(info.type);
        }

        // Click event to select word
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            selectWord(index);
        });

        renderer.appendChild(span);
    });
}

// Handle word selection and update the controller sidebar
function selectWord(index) {
    selectedTokenIndex = index;
    
    // Highlight selected token in editor
    document.querySelectorAll('.render-token').forEach(t => t.classList.remove('selected'));
    const selectedSpan = document.querySelector(`.render-token[data-index="${index}"]`);
    if (selectedSpan) selectedSpan.classList.add('selected');

    // Highlight inspector card
    document.querySelectorAll('.inspector-card').forEach(c => c.classList.remove('active'));
    const insCard = document.getElementById(`ins-card-${index}`);
    if (insCard) {
        insCard.classList.add('active');
        insCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const token = parsedTokens[index];
    const info = getTokenInfo(token);

    // Update UI sidebar
    document.getElementById('sidebar-empty-state').style.display = 'none';
    const sidebarActive = document.getElementById('sidebar-active-state');
    sidebarActive.style.display = 'grid';

    // Active glyph displays
    const activeGlyph = document.getElementById('active-glyph');
    activeGlyph.innerText = token;
    
    document.getElementById('active-char-name').innerText = `漢字 "${info.baseChar}"`;
    document.getElementById('active-unicode-badge').innerText = `U+${info.baseChar.codePointAt(0).toString(16).toUpperCase()}`;

    // State badge display
    const badge = document.getElementById('active-state-badge');
    badge.innerText = info.type.toUpperCase();
    if (info.type === 'polyphonic') {
        badge.style.background = 'var(--color-polyphonic)';
        badge.style.color = 'var(--color-poly-border)';
    } else if (info.type === 'modified') {
        badge.style.background = 'var(--color-modified)';
        badge.style.color = 'var(--color-mod-border)';
    } else if (info.type === 'blank') {
        badge.style.background = 'var(--color-blank)';
        badge.style.color = 'var(--color-blank-border)';
    } else if (info.type === 'brackets') {
        badge.style.background = 'var(--color-brackets)';
        badge.style.color = 'var(--color-brackets-border)';
    } else if (info.type === 'custom') {
        badge.style.background = 'var(--color-custom)';
        badge.style.color = 'var(--color-cust-border)';
        badge.innerText = `自訂: ${info.bopomofoText}`;
    } else {
        badge.style.background = 'rgba(255,255,255,0.05)';
        badge.style.color = 'var(--text-muted)';
        badge.innerText = '普通字元';
    }

    // Populate Polyphonic Readings
    const standardSection = document.getElementById('section-standard-readings');
    const genericSection = document.getElementById('section-generic-probe');
    const optionsContainer = document.getElementById('poyin-options-container');

    optionsContainer.innerHTML = '';
    
    if (info.hasPolyphonic && info.dbEntry.v) {
        standardSection.style.display = 'block';
        genericSection.style.display = 'none';

        // Display options
        info.dbEntry.v.forEach((readingRule, i) => {
            // Generate annotated display using temporary font token
            const vsChar = i > 0 ? String.fromCodePoint(VS_BASE + i) : '';
            const optionToken = info.baseChar + vsChar;

            const card = document.createElement('div');
            card.className = `poyin-option-card ${info.vsIndex === i || (i === 0 && info.vsIndex === null && info.type === 'polyphonic') ? 'active' : ''}`;
            
            // Simple description extraction from regex pattern
            let desc = readingRule.replace(/\*/g, info.baseChar).replace(/\//g, '、');
            if (!desc) desc = '基本音';

            card.innerHTML = `
                <div class="poyin-text">
                    <span class="poyin-index">VS${17 + i}</span>
                    <span class="poyin-annotated" style="font-family: ${currentFontFamily}, sans-serif">${optionToken}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted)">(${desc})</span>
                </div>
            `;

            card.addEventListener('click', () => {
                applyPronunciation(i);
            });

            optionsContainer.appendChild(card);
        });
    } else {
        // If character is not in MoE polyphonic database, show IVS generic probes
        standardSection.style.display = 'none';
        genericSection.style.display = 'block';

        const probeContainer = document.getElementById('probe-buttons-container');
        probeContainer.innerHTML = '';

        // Probing VS17 to VS26 (0 to 9 offset)
        for (let i = 0; i < 10; i++) {
            const vsChar = String.fromCodePoint(VS_BASE + i);
            const probeToken = info.baseChar + vsChar;

            const btn = document.createElement('button');
            btn.className = `btn-secondary ${info.vsIndex === i ? 'active' : ''}`;
            btn.style.padding = '6px';
            btn.style.fontSize = '1.1rem';
            btn.style.fontFamily = `${currentFontFamily}, sans-serif`;
            btn.innerText = probeToken;

            btn.addEventListener('click', () => {
                applyPronunciation(i);
            });

            probeContainer.appendChild(btn);
        }
    }

    // Reset custom bopomofo selector
    currentCustomPhonetic = '';
    document.getElementById('custom-phonetic-display').innerText = '---';
    document.getElementById('custom-pua-code').innerText = '無';
    document.getElementById('btn-apply-custom').disabled = true;
}

// Apply a specific standard pronunciation index to current selected token
function applyPronunciation(vsIdx) {
    if (selectedTokenIndex === null) return;
    
    const token = parsedTokens[selectedTokenIndex];
    const info = getTokenInfo(token);
    
    const vsChar = vsIdx > 0 ? String.fromCodePoint(VS_BASE + vsIdx) : '';
    parsedTokens[selectedTokenIndex] = info.baseChar + vsChar;

    syncTextarea();
    renderInteractiveTokens();
    selectWord(selectedTokenIndex);
    showToast(`已套用 VS${17 + vsIdx} 變體字形`);
}

// Apply special mode (blank or brackets)
function applySpecialMode(mode) {
    if (selectedTokenIndex === null) return;

    const token = parsedTokens[selectedTokenIndex];
    const info = getTokenInfo(token);

    if (mode === 'blank') {
        parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE);
        showToast('已套用注音留白 (E01E0)');
    } else if (mode === 'brackets') {
        parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE) + String.fromCodePoint(0xF000);
        showToast('已套用注音填空');
    }

    syncTextarea();
    renderInteractiveTokens();
    selectWord(selectedTokenIndex);
}

// Press dynamic key on virtual keyboard
function pressVKey(key) {
    if (key === 'CLR') {
        currentCustomPhonetic = '';
    } else {
        const testString = currentCustomPhonetic + key;
        // Regex validation of Bopomofo syllable structure
        if (testString.match(/^([ㄅ-ㄙ]?[ㄧㄨㄩ]?[ㄚ-ㄥ]?|ㄦ?)[ˊˇˋ˙]?$/)) {
            currentCustomPhonetic = testString;
        } else {
            currentCustomPhonetic = key; // Reset structure
        }
    }

    document.getElementById('custom-phonetic-display').innerText = currentCustomPhonetic || '---';

    // Verify mapping in ruby PUA database
    const btnApply = document.getElementById('btn-apply-custom');
    const puaCodeLabel = document.getElementById('custom-pua-code');

    if (window.ruby && window.ruby[currentCustomPhonetic]) {
        const decCode = window.ruby[currentCustomPhonetic];
        puaCodeLabel.innerText = `0x${decCode.toString(16).toUpperCase()}`;
        puaCodeLabel.style.color = 'var(--accent-cyan)';
        btnApply.disabled = false;
    } else {
        puaCodeLabel.innerText = currentCustomPhonetic ? '查無映射' : '無';
        puaCodeLabel.style.color = currentCustomPhonetic ? 'var(--accent-pink)' : 'var(--text-muted)';
        btnApply.disabled = true;
    }
}

// Apply custom assembled bopomofo PUA to character
function applyCustomPhonetic() {
    if (selectedTokenIndex === null) return;
    if (!currentCustomPhonetic || !window.ruby || !window.ruby[currentCustomPhonetic]) return;

    const token = parsedTokens[selectedTokenIndex];
    const info = getTokenInfo(token);

    const decCode = window.ruby[currentCustomPhonetic];
    parsedTokens[selectedTokenIndex] = info.baseChar + String.fromCodePoint(VS_BASE) + String.fromCodePoint(decCode);

    syncTextarea();
    renderInteractiveTokens();
    selectWord(selectedTokenIndex);
    showToast(`成功自訂注音「${currentCustomPhonetic}」`);
}

// Render Inspector list at the bottom
function renderInspector() {
    const container = document.getElementById('inspector-container');
    container.innerHTML = '';

    parsedTokens.forEach((token, index) => {
        if (token === '\n') return;

        const info = getTokenInfo(token);
        const card = document.createElement('div');
        card.className = `inspector-card ${selectedTokenIndex === index ? 'active' : ''}`;
        card.id = `ins-card-${index}`;

        // Label color mapping
        let badgeBg = 'rgba(255,255,255,0.05)';
        let badgeText = 'var(--text-muted)';
        
        if (info.type === 'polyphonic') {
            badgeBg = 'rgba(0, 210, 255, 0.1)';
            badgeText = 'var(--accent-blue)';
        } else if (info.type === 'modified') {
            badgeBg = 'rgba(0, 245, 212, 0.1)';
            badgeText = 'var(--accent-cyan)';
        } else if (info.type === 'blank') {
            badgeBg = 'rgba(148, 163, 184, 0.08)';
            badgeText = '#64748b';
        } else if (info.type === 'brackets') {
            badgeBg = 'rgba(157, 78, 221, 0.1)';
            badgeText = 'var(--accent-purple)';
        } else if (info.type === 'custom') {
            badgeBg = 'rgba(255, 0, 127, 0.1)';
            badgeText = 'var(--accent-pink)';
        }

        card.innerHTML = `
            <div class="inspector-glyph-row">
                <span class="inspector-char" style="font-family: ${currentFontFamily}, sans-serif">${token}</span>
                <span class="inspector-badge" style="background:${badgeBg}; color:${badgeText}">${info.type.toUpperCase()}</span>
            </div>
            <div class="inspector-hex-list">
                <!-- Populated below -->
            </div>
        `;

        const hexList = card.querySelector('.inspector-hex-list');
        const parts = [...token];
        
        // 1. Base character hex
        const baseUni = parts[0].codePointAt(0).toString(16).toUpperCase();
        hexList.innerHTML += `
            <div class="inspector-hex-item">
                <span class="hex-desc">字元:</span>
                <span class="hex-value">U+${baseUni}</span>
            </div>
        `;

        // 2. VS hex
        if (parts.length > 1) {
            const vsUni = parts[1].codePointAt(0).toString(16).toUpperCase();
            hexList.innerHTML += `
                <div class="inspector-hex-item">
                    <span class="hex-desc">IVS:</span>
                    <span class="hex-value" style="color: var(--accent-blue)">U+${vsUni}</span>
                </div>
            `;
        }

        // 3. PUA hex
        if (parts.length > 2) {
            const puaUni = parts[2].codePointAt(0).toString(16).toUpperCase();
            hexList.innerHTML += `
                <div class="inspector-hex-item">
                    <span class="hex-desc">PUA:</span>
                    <span class="hex-value" style="color: var(--accent-pink)">U+${puaUni}</span>
                </div>
            `;
        }

        card.addEventListener('click', () => {
            selectWord(index);
            // Scroll to word in editor
            const editorSpan = document.querySelector(`.render-token[data-index="${index}"]`);
            if (editorSpan) {
                editorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        container.appendChild(card);
    });
}

// Copy reconstructed IVS text stream directly to the clipboard
function copyIVSText() {
    const rawText = parsedTokens.join('');
    if (!rawText) {
        showToast('無任何文字可供複製！');
        return;
    }
    
    navigator.clipboard.writeText(rawText).then(() => {
        showToast('已複製 IVS 格式文字！可直接貼上至 Word 或 Illustrator 套用字型！');
    }).catch(err => {
        console.warn('Modern clipboard API failed, using fallback copy method: ', err);
        // Fallback for older browsers or sandboxed contexts
        const textarea = document.createElement('textarea');
        textarea.value = rawText;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '2em';
        textarea.style.height = '2em';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('已複製 IVS 格式文字！可直接貼上至 Word 或 Illustrator 套用字型！');
        } catch (copyErr) {
            console.error('Fallback copy failed: ', copyErr);
            showToast('複製失敗，請手動複製左側編輯器之文本。');
        }
        document.body.removeChild(textarea);
    });
}
