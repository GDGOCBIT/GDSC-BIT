const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { v2 } = require("cloudinary");
const { readdirSync } = require('fs');
const path = require('path');
const connectDatabase = require('./api/config/connectDatabase.js');

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET'
}));

app.use(passport.initialize());
app.use(passport.session());

v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Backend Routes
readdirSync("./api/routes").map((r) => app.use("/api/", require('./api/routes/' + r)));
app.get('/api', (req, res) => {
    res.status(201).json({
        success: true,
        msg: "Server Running",
    });
});

// Frontend Routes
app.use(express.static(path.resolve(__dirname, 'client', 'dist')))
app.get('*', (req, res) => {
    res.sendFile(
        path.resolve(__dirname, 'client', 'dist', 'index.html'),
        function (err) {
            if (err) {
                res.status(500).send(err)
            }
        }
    )
});

const PORT = process.env.PORT || 5000;
connectDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Connected to PORT => ${PORT}`);
    })
});