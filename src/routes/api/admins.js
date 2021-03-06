const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const adminModel = require('../../models/Admin');
const Admin = mongoose.model('Admin', adminModel);
const JWT_KEY = process.env.JWT_KEY || require('../../config/jwt').JWT_KEY;
const verifyToken = require('../../config/jwt').verifyToken;

// Login Admin Process
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      req.flash('alert alert-danger', 'There was a problem logging in');
      return next(err);
    }

    if (!user) {
      req.flash('alert alert-danger', info.message);
      return res.redirect('/login');
    }

    req.logIn(user, (err) => {
      if (err) {
        req.flash('alert alert-danger', 'There was a problem logging in');
        return next(err);
      }

      const user = { username: req.user.username };

      jwt.sign(user, JWT_KEY, { expiresIn: '6h' }, (err, token) => {
        if (err) {
          return res.json({
            success: false,
            message: 'Failed to create token'
          });
        } else {
          res.cookie('jwt', token);
          return res.redirect('/admin-panel');
        }
      });
    });
  })(req, res);
});

// logout
router.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  req.logout();
  req.flash('alert alert-success', 'You are now logged out');
  res.redirect('/login');
});

// Register Admin Process
router.post('/register', verifyToken, (req, res) => {
  req.checkBody('username', 'Name is Required').notEmpty();
  req.checkBody('password', 'Password is Required').notEmpty();
  req.checkBody('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    errors.forEach(error => {
      req.flash('alert alert-danger', error.msg);
    });
    res.status(404).redirect('/admin-panel');
  } else {
    let newAdmin = new Admin({
      username: req.body.username,
      password: req.body.password,
      addedBy: req.user.username
    });

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newAdmin.password, salt, (err, hash) => {
        if (err) {
          console.log(err);
        } else {
          newAdmin.password = hash;
          newAdmin.save()
            .then(admin => {
              req.flash('alert alert-success', 'New Admin was Registered Successfully');
              res.status(200).redirect('/admin-panel');
            })
            .catch(err => {
              console.log(err);
              res.status(404).json({success: false})
            });
        }
      });
    });
  }
});

// Update Admin Process
router.post('/register/:id', verifyToken, (req, res) => {
  req.checkBody('username', 'Name is Required').notEmpty();
  req.checkBody('password', 'Password is Required').notEmpty();
  req.checkBody('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    errors.forEach(error => {
      req.flash('alert alert-danger', error.msg);
    });
    res.status(404).redirect('back');
  } else {
    const updatedAdmin = {
      username: req.body.username,
      password: req.body.password,
      updatedBy: req.user.username
    };

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(updatedAdmin.password, salt, (err, hash) => {
        if (err) {
          console.log(err);
        } else {
          updatedAdmin.password = hash;
          Admin.findByIdAndUpdate(req.params.id, updatedAdmin)
            .then(admin => {
              req.flash('alert alert-success', 'Admin was Updated Successfully');
              res.status(200).redirect('/admin-panel');
            })
            .catch(err => {
              console.log(err);
              res.status(404);
            });
        }
      });
    });
  }
});

// @router        GET api/admins
// @description   Get all admins
router.get('/', verifyToken, (req, res) => {
  Admin.find()
    .sort({name: 1})
    .then(admins => res.status(200).json(admins))
    .catch(err => res.status(404));
});

// @router        GET api/admins/:id
// @description   Get a single admin
router.get('/:id', verifyToken, (req, res) => {
  Admin.findById(req.params.id)
    .then(admin => res.status(200).json(admin))
    .catch(err => res.status(404).json({success: false}));
});

// @router        DELETE api/admins/:id
// @description   Delete an admin
router.delete('/:id', verifyToken, (req, res) => {
  Admin.findById(req.params.id)
    .then(admin => admin.remove().then(() => res.status(200).json({success: true})))
    .catch(err => res.status(404).json({success: false}));
});

module.exports = router;
