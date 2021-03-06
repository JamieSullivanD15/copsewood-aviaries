import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import expressValidator from 'express-validator';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import http from "http";
import nodemailer from "nodemailer";

import { EMAIL_ADDRESS, EMAIL_PASSWORD } from './config/email';

// Ping Heroku app to keep from sleeping
// setInterval(() => {
//   http.get("http://copsewood-aviaries.herokuapp.com/");
// }, 600000); // every 10 minutes (600000)

// Initialise
const app = express();
const port = process.env.PORT || 3000;

// View engine
const ejs = require("ejs").__express;
app.engine('.ejs', ejs);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set path for static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Bodyparser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cookie parser middleware
app.use(cookieParser());

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
app.use(flash());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Express validator middleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.'),
    root = namespace.shift(),
    formParam = root;

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }

    return {
      param: formParam,
      msg: msg,
      value: value
    };
  }
}));

// Middleware to remove any trailing / on routes
app.use(function(req, res, next) {
  if (req.path.substr(-1) == '/' && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

// Passport config
require('./config/passport')(passport);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Set Global User Variable
app.get('*', (req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// DB Config
const db = process.env.MONGO_URI || require('./config/keys').MONGO_URI;

// Connect to Database
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log(err));

// Routes
const pages = require('./routes/pages');
app.use('/', pages);

const birds = require('./routes/api/birds');
app.use('/api/birds', birds);

const products = require('./routes/api/products');
app.use('/api/products', products);

const admins = require('./routes/api/admins');
app.use('/api/admins', admins);

// Send Email
app.post('/send', (req, res) => {
  const output = `
    <p>You have a new inquiry</p>
    <h3>Contact Details</h3>
    <p><b>Name:</b> ${req.body.name}</p>
    <p><b>Email:</b> ${req.body.email}</p>
    <p><b>Phone:</b> ${req.body.phone}</p>
    <h3>Message</h3>
    <p>${req.body.message}</p>
  `;

  let transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: EMAIL_ADDRESS,
      pass: EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  let mailOptions = {
    from: `<${EMAIL_ADDRESS}>`,
    to: 'jamiesullivan523@gmail.com',
    subject: 'New Bird Inquiry',
    text: '',
    html: output,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      req.flash('alert alert-success', `Problem Sending The Email`);
      res.redirect('/contact');
    }

    req.flash('alert alert-success', `Email Was Sent Successfully`);
    res.redirect('/contact');
  });

});

// Start Server
app.listen(port, () => {
  console.log(`Server Started on ${port}`);
});
