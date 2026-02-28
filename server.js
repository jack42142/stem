const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static('public'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(session({
    secret: 'giam-sat-pro-2026',
    resave: false,
    saveUninitialized: true
}));

// Quản lý danh sách bài thi (Trong thực tế nên dùng database)
let exams = []; 
let violations = []; 

const uploadDir = path.join(__dirname, 'public/violations');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const db = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const account = db.find(u => u.user === user && u.pass === pass);
    if (account) {
        req.session.user = account;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Sai tài khoản hoặc mật khẩu!' });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const user = req.session.user;
    if (user.role === 'TEA') {
        res.render('teacher-dashboard', { user, exams, violations });
    } else {
        res.render('student-dashboard', { user, exams });
    }
});

// API lấy vi phạm cho giáo viên (Auto-refresh)
app.get('/get-violations', (req, res) => res.json(violations));

// Giáo viên thêm bài thi mới
app.post('/publish-exam', (req, res) => {
    const { examName, examLink } = req.body;
    if (examLink.includes('docs.google.com/forms')) {
        exams.push({
            id: Date.now(),
            name: examName,
            link: examLink,
            status: 'open'
        });
        res.redirect('/dashboard');
    } else {
        res.send("<script>alert('Link không hợp lệ!'); window.location='/dashboard';</script>");
    }
});

app.post('/report-violation', (req, res) => {
    const { user, image, reason, examName } = req.body;
    const fileName = `vlt_${user}_${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadDir, fileName), image.replace(/^data:image\/png;base64,/, ""), 'base64');
    
    violations.push({
        user,
        exam: examName || "N/A",
        time: new Date().toLocaleTimeString(),
        reason,
        imagePath: `/violations/${fileName}`
    });
    res.json({ success: true });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(3000, () => console.log('Hệ thống chạy tại: http://localhost:3000'));