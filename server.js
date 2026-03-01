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
    secret: 'giam-sat-white-2026',
    resave: false,
    saveUninitialized: true
}));

const DATA_FILE = 'data.json';
const USERS_FILE = 'users.json';

const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) return { exams: [] };
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e) { return { exams: [] }; }
};
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

app.get('/', (req, res) => req.session.user ? res.redirect('/dashboard') : res.redirect('/login'));
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const db = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const account = db.find(u => u.user === user && u.pass === pass);
    if (account) {
        req.session.user = account;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Tài khoản không chính xác!' });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const data = loadData();
    const user = req.session.user;
    user.role === 'TEA' ? res.render('teacher-dashboard', { user, exams: data.exams }) : res.render('student-dashboard', { user, exams: data.exams });
});

app.post('/publish-exam', (req, res) => {
    const data = loadData();
    data.exams.push({ 
        id: Date.now().toString(), 
        name: req.body.examName, 
        link: req.body.examLink,
        createdAt: new Date().toLocaleString(),
        policy: { antiTab: req.body.antiTab === 'on', enableAI: req.body.enableAI === 'on' },
        logs: [] 
    });
    saveData(data);
    res.redirect('/dashboard');
});

app.post('/report-violation', (req, res) => {
    const { user, image, reason, examId } = req.body;
    const data = loadData();
    const exam = data.exams.find(e => e.id === examId);
    if (exam) {
        const fileName = `vlt_${user}_${Date.now()}.png`;
        const uploadDir = path.join(__dirname, 'public/violations');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), image.replace(/^data:image\/png;base64,/, ""), 'base64');
        exam.logs.push({ student: user, time: new Date().toLocaleTimeString(), reason, imagePath: `/violations/${fileName}` });
        saveData(data);
    }
    res.json({ success: true });
});

app.post('/delete-exam', (req, res) => {
    let data = loadData();
    data.exams = data.exams.filter(e => e.id !== req.body.id);
    saveData(data);
    res.json({ success: true });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });
app.listen(3000, () => console.log('Server chạy tại: http://localhost:3000'));