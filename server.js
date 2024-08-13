const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');
const { authenticateToken, hashPassword, comparePassword } = require('./utils');


const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'data/files/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Register Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const users = await fs.readJson('data/users.json').catch(() => ({ users: [] }));
    if (users.users.some(user => user.username === username)) return res.status(400).json({ error: 'User already exists.' });

    const hashedPassword = await hashPassword(password);
    users.users.push({ username, password: hashedPassword });
    await fs.writeJson('data/users.json', users);

    res.status(201).json({ message: 'User registered successfully.' });
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const users = await fs.readJson('data/users.json').catch(() => ({ users: [] }));
    const user = users.users.find(user => user.username === username);
    if (!user || !(await comparePassword(password, user.password))) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
});

// Middleware to authenticate JWT token
app.use(authenticateToken);

// Upload File Route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = path.join('data/files', req.file.filename);
    const fileType = path.extname(req.file.filename).toLowerCase();

    res.json({
        message: 'File uploaded successfully.',
        file: {
            path: filePath,
            type: fileType,
            viewUrl: fileType === '.mp4' ? `http://localhost:${port}/view-video?file=${encodeURIComponent(req.file.filename)}` : null
        }
    });
});

// Delete File/Folder Route
app.delete('/delete', async (req, res) => {
    const { pathToDelete } = req.body;
    if (!pathToDelete) return res.status(400).json({ error: 'Path to delete is required.' });

    const fullPath = path.join(__dirname, 'data/files', pathToDelete);
    try {
        await fs.remove(fullPath);
        res.json({ message: 'File/Folder deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting file/folder.' });
    }
});

// List Files Route
app.get('/files', async (req, res) => {
    try {
        const files = await fs.readdir('data/files');
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: 'Error listing files.' });
    }
});

// View Video Route (requires authentication)
app.get('/view-video', authenticateToken, (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ error: 'File parameter is required.' });

    const filePath = path.resolve('data/files', file); // Use path.resolve to get the absolute path
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });

    res.sendFile(filePath);
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
