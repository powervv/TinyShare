const token = window.location.pathname.substring(1);
// Redirect from root or /api to a random auto-generated room
if (!token || token === 'api') {
    window.location.href = '/' + Math.random().toString(36).substring(2, 10);
}

document.getElementById('token-display').textContent = token;

const messagesList = document.getElementById('messages-list');
const filesList = document.getElementById('files-list');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

let lastDataStr = '';
let isFirstLoad = true;

// Utility: HTML Encoder
function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// Utility: Format Filesize
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Fetch Content
async function fetchData() {
    try {
        const res = await fetch(`/api/${token}/data`);
        const data = await res.json();
        
        const dataStr = JSON.stringify(data);
        if (dataStr !== lastDataStr) {
            lastDataStr = dataStr;
            renderMessages(data.texts);
            renderFiles(data.files);
        }
    } catch (e) {
        console.error('Fetch data failed', e);
    }
}

function renderMessages(texts) {
    if (!texts || texts.length === 0) {
        messagesList.innerHTML = '<div style="color:var(--text-secondary); text-align:center; margin-top: 3rem; font-size: 0.95rem;">暂无消息，来发第一条吧！</div>';
        return;
    }
    
    // Check if we are near the bottom to auto-scroll smoothly later
    const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 100;
    
    messagesList.innerHTML = texts.map(tx => `
        <div class="message-item">
            <div class="message-content">${escapeHTML(tx.content)}</div>
            <div class="message-time">${new Date(tx.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
    
    if (isFirstLoad || isAtBottom) {
        messagesList.scrollTop = messagesList.scrollHeight;
        isFirstLoad = false;
    }
}

function renderFiles(files) {
    if (!files || files.length === 0) {
        filesList.innerHTML = '<div style="color:var(--text-secondary); text-align:center; margin-top: 3rem; font-size: 0.95rem;">暂无文件，拖拽文件到上方上传区！</div>';
        return;
    }
    filesList.innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-info">
                <span class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</span>
                <span class="file-size">${formatBytes(file.size)}</span>
            </div>
            <a href="/api/${token}/download/${file.rawName}" class="btn-download" download>下载文件</a>
        </div>
    `).join('');
}

// Sending Messages
async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    try {
        await fetch(`/api/${token}/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        messageInput.value = '';
        await fetchData();
        messagesList.scrollTop = messagesList.scrollHeight;
    } catch (e) {
        alert('发送失败，请检查网络');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送消息';
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// File Upload Interactions
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
['dragleave', 'dragend'].forEach(type => {
    dropZone.addEventListener(type, () => dropZone.classList.remove('dragover'));
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        uploadFiles(e.dataTransfer.files);
    }
});
fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        uploadFiles(fileInput.files);
    }
});

async function uploadFiles(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    // UI Feedback
    const prompt = dropZone.querySelector('.upload-prompt p');
    const originalText = prompt.innerHTML;
    prompt.innerHTML = '<strong style="color:var(--accent);">🚀 正在极速上传中...</strong>';
    dropZone.style.pointerEvents = 'none';
    
    try {
        await fetch(`/api/${token}/upload`, {
            method: 'POST',
            body: formData
        });
        await fetchData();
    } catch (e) {
        alert('文件上传失败');
    } finally {
        prompt.innerHTML = originalText;
        fileInput.value = '';
        dropZone.style.pointerEvents = 'auto';
    }
}

// Copy sharing link
document.getElementById('copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('copy-link');
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = '📋'; }, 2000);
    });
});

// Initialization
setInterval(fetchData, 2000);
fetchData();
