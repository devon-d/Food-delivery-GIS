const morgan = require('morgan');
const express = require('express');
const passportAuth = require('./passport-auth');
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const path = require('path');
const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const projectRouter = require('./routes/project');
const gcsRouter = require('./routes/gcs');
const addressRouter = require('./routes/address');
const db = require('./db');

let app = express();

// set cors according in dev env
if (process.env.NODE_ENV === 'development') {
    let whitelist = [
        /\.ngrok\.io$/,
        'http://localhost:4200',
        'http://localhost:4040',
        'http://localhost.flytrex.com:4200',
        'http://localhost.flytrex.com:4040'
    ];
    let corsOptions = {
        origin: whitelist,
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
    };
    let cors = require('cors');
    app.use(cors(corsOptions));
}

const sequelizeSessionStore = new SequelizeStore({
    db: db.sequelize,
    modelKey: 'session',
    tableName: 'session',
    disableTouch: true,
    checkExpirationInterval: 12 * 60 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds. 12 hour
    expiration: 24 * 60 * 60 * 1000 // The maximum age (in milliseconds) of a valid session. 24 hour,
});

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: sequelizeSessionStore,
    resave: false,
    proxy: true, //process.env.NODE_ENV === 'production',
    saveUninitialized: false,
    cookie: {maxAge: 24 * 60 * 60 * 1000} // 24 hours
}));
app.use(passportAuth.initialize());
app.use(passportAuth.session());
app.use(morgan('tiny'));

// setup routers
app.use('/', indexRouter);
app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);
app.use('/api/gcs', gcsRouter);
app.use('/api/address', addressRouter);

// error handler
app.use(function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

module.exports = app;
