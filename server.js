const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(session({
    secret: 'super-vip-security-2026',
    resave: false,
    saveUninitialized: true
}));

const EXAMS_FILE = 'exams.json';
const USERS_FILE = 'users.json';
const uploadDir = path.join(__dirname, 'public/violations');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const readData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

let violations = []; 

app.get('/', (req, res) => req.session.user ? res.redirect('/dashboard') : res.redirect('/login'));
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const users = readData(USERS_FILE);
    const account = users.find(u => u.user === user && u.pass === pass);
    if (account) {
        req.session.user = account;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Tài khoản không chính xác!' });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const exams = readData(EXAMS_FILE);
    if (req.session.user.role === 'TEA') {
        res.render('teacher-dashboard', { user: req.session.user, exams, violations });
    } else {
        res.render('student-dashboard', { user: req.session.user, exams });
    }
});

app.post('/publish-exam', (req, res) => {
    const { examName, examLink, useAI, useAntiTab, useVM } = req.body;
    const exams = readData(EXAMS_FILE);
    exams.push({
        id: Date.now(),
        name: examName,
        link: examLink,
        settings: { ai: useAI === 'on', antiTab: useAntiTab === 'on', vm: useVM === 'on' }
    });
    writeData(EXAMS_FILE, exams);
    res.redirect('/dashboard');
});

app.get('/get-violations', (req, res) => res.json(violations));

app.post('/report-violation', (req, res) => {
    const { user, image, reason, examName } = req.body;
    const fileName = `vlt_${user}_${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadDir, fileName), image.replace(/^data:image\/png;base64,/, ""), 'base64');
    violations.push({ user, exam: examName, time: new Date().toLocaleTimeString(), reason, imagePath: `/violations/${fileName}` });
    res.json({ success: true });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });
app.listen(3000, () => console.log('Server running at http://localhost:3000'));