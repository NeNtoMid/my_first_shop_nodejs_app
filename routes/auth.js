const express = require('express');

const authController = require('../controllers/auth');

const { check  , body} = require('express-validator/check');

const User = require('../models/user');

const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.get('/reset' , authController.getReset);


router.post('/login',
  body('email')
  .isEmail()
  .withMessage('This email is not correct')
  .custom((value , {req}) =>{
    return User.findOne({email: value})
        .then(user => {
          if(user) return Promise.resolve(true);
          else return Promise.reject('This Email is not correct');
        });
  })
  .normalizeEmail(),
  body('password' , 'This password is not correct because its too short')
  .isLength({min:5})
  .custom((value  , {req}) => {
   return  User.findOne({email: req.body.email})
    .then(user => {
      return bcrypt.compare(value , user.password)
            .then(isTheSame=>{
              if(!isTheSame) return Promise.reject('This password is not correct :(')
            });
    })
  })
  .trim()
  ,authController.postLogin);

router.post('/signup', 
    check('email')
    .isEmail()
    .withMessage('Please enter valid email!')
    .custom((value , {req})=>{
       return  User.findOne({email : value})
        .then(user=>{
          if(user){
            req.foundUser = user;
                // User exists already in Database
                return Promise.reject('Email already belongs to some user');
          }  else return Promise.resolve(true);
        });
    
    })
    .normalizeEmail()  ,

    body('password' , 'Please write password with at least 5 characters using normal text and numbers!')
    .isLength({min: 5 })
    .isAlphanumeric()
    .trim() ,

    body('confirmPassword')
    .trim() 
    .custom((value , {req})=>{
        if(value === req.body.password) return true;
        else throw new Error('Passwords have to match!!')
    }),
    
     authController.postSignup);

router.post('/logout', authController.postLogout);

router.post('/reset' , authController.postReset);

router.get('/reset/:tokenId' , authController.getnewPassword);

router.post('/new-password' ,  authController.postnewPassword);


module.exports = router;