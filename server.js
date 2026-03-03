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
    secret: 'secure-mobile-auth-2026',
    resave: false,
    saveUninitialized: true
}));

const EXAMS_FILE = 'exams.json';
const USERS_FILE = 'users.json';
const uploadDir = path.join(__dirname, 'public/violations');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const readData = (file) => {
    try {
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    } catch (e) { return []; }
};
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

let violations = []; 

app.get('/', (req, res) => req.session.user ? res.redirect('/dashboard') : res.redirect('/login'));

app.get('/register', (req, res) => res.render('register', { error: null, success: null }));
app.post('/register', (req, res) => {
    const { user, pass, role } = req.body;
    let users = readData(USERS_FILE);
    if (users.find(u => u.user === user)) {
        return res.render('register', { error: 'Tài khoản đã tồn tại!', success: null });
    }
    users.push({ user, pass, role: role || 'STU' });
    writeData(USERS_FILE, users);
    res.render('register', { error: null, success: 'Đăng ký thành công! Hãy đăng nhập.' });
});

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
        res.render('teacher-dashboard', { user: req.session.user, exams });
    } else {
        res.render('student-dashboard', { user: req.session.user, exams });
    }
});

app.post('/publish-exam', (req, res) => {
    const { examName, examLink, useAI, useAntiTab, useAntiVM } = req.body;
    const exams = readData(EXAMS_FILE);
    exams.push({
        id: Date.now().toString(),
        name: examName,
        link: examLink,
        settings: { 
            ai: useAI === 'on', 
            antiTab: useAntiTab === 'on',
            antiVM: useAntiVM === 'on' 
        }
    });
    writeData(EXAMS_FILE, exams);
    res.redirect('/dashboard');
});

app.post('/delete-exam', (req, res) => {
    const { examId } = req.body;
    let exams = readData(EXAMS_FILE);
    const newExams = exams.filter(e => String(e.id) !== String(examId));
    writeData(EXAMS_FILE, newExams);
    res.json({ success: true });
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
app.listen(3000, () => console.log('Hệ thống chạy tại http://localhost:3000'));