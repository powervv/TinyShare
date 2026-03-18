const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const token = req.params.token;
        const uploadDir = path.join(__dirname, 'data', token, 'files');
        // Ensure directory exists
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Encode origin name to safely store on filesystem
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, encodeURIComponent(file.originalname));
    }
});
const upload = multer({ storage });

// Helper: Ensure the data directory exists for a given token
const getTokenDataPath = (token) => {
    const dirPath = path.join(__dirname, 'data', token);
    const jsonPath = path.join(dirPath, 'texts.json');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    if (!fs.existsSync(jsonPath)) {
        fs.writeFileSync(jsonPath, JSON.stringify([]));
    }
    return dirPath;
};

// API: Get current session data (texts and file list)
app.get('/api/:token/data', (req, res) => {
    const token = req.params.token;
    const dirPath = getTokenDataPath(token);
    const jsonPath = path.join(dirPath, 'texts.json');
    const filesDirPath = path.join(dirPath, 'files');

    let texts = [];
    try {
        texts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch(e) {
        console.error("Error reading texts", e);
    }

    let files = [];
    if (fs.existsSync(filesDirPath)) {
        const fileNames = fs.readdirSync(filesDirPath);
        files = fileNames.map(f => {
            const stats = fs.statSync(path.join(filesDirPath, f));
            return {
                name: decodeURIComponent(f),
                size: stats.size,
                rawName: f
            };
        });
    }

    res.json({ texts, files });
});

// API: Submit a new text message
app.post('/api/:token/text', (req, res) => {
    const token = req.params.token;
    const dirPath = getTokenDataPath(token);
    const jsonPath = path.join(dirPath, 'texts.json');
    
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'No content provided' });

    const texts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const newText = {
        id: Date.now().toString(),
        content: content,
        timestamp: new Date().toISOString()
    };
    texts.push(newText);
    fs.writeFileSync(jsonPath, JSON.stringify(texts));
    
    res.json(newText);
});

// API: Upload files
app.post('/api/:token/upload', upload.array('files'), (req, res) => {
    res.json({ success: true, count: req.files.length });
});

// API: Download a specific file
app.get('/api/:token/download/:filename', (req, res) => {
    const token = req.params.token;
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'data', token, 'files', filename);
    
    if (fs.existsSync(filePath)) {
        const decodedName = decodeURIComponent(filename);
        res.download(filePath, decodedName);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.get('/', (req, res) => {
    // Redirect root to a random room
    const randomToken = Math.random().toString(36).substring(2, 10);
    res.redirect(`/${randomToken}`);
});

// Catch-all route to serve the SPA frontend mapping the `/:token` path
app.get('/:token', (req, res, next) => {
    if (req.params.token === 'api') return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`TinyShare Server is up and running on http://localhost:${PORT}`);
});
