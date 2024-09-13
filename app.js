const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// 提供静态文件
app.use(express.static('public'));

// 连接到 SQLite 数据库
const db = new sqlite3.Database('./my_game.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
        
        // 初始化用户表（如果不存在）
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            }
        });
    }
});

// 中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// 设置模板引擎和视图文件夹
app.set('view engine', 'ejs');
app.set('views', 'views');

// 根路径路由：重定向到登录页面
app.get('/', (req, res) => {
    res.redirect('/login'); // 根路径重定向到登录页面
});

// 渲染登录页面
app.get('/login', (req, res) => {
    res.render('login');
});

// 渲染注册页面
app.get('/register', (req, res) => {
    res.render('register');
});

// 处理注册请求
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // 加密密码
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // 插入新用户到数据库
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                res.render('register', { error: 'Username already exists' });
            } else {
                console.error('Error inserting user:', err);
                res.render('register', { error: 'Internal error' });
            }
        } else {
            res.redirect('/login');
        }
    });
});

// 处理登录请求
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 查询数据库中的用户
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            res.render('login', { error: 'Internal error' });
        } else if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = { id: user.id, username: user.username };
            res.redirect('/dashboard'); // 登录成功后重定向到用户仪表板或游戏主页
        } else {
            res.render('login', { error: 'Invalid username or password' });
        }
    });
});

// 用户仪表板或游戏主页
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // 未登录重定向到登录页面
    }

    res.render('dashboard', { user: req.session.user });
});

// 注销用户
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
