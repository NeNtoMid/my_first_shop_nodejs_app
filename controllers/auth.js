const User = require('../models/user');
const { response } = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGrid = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(sendGrid({
  auth: {
    api_key:'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'
  }
}))


exports.getLogin = (req, res, next) => {
  let message = req.flash('error')
  message.length > 0? message = message[0]
  : message = undefined
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMsg: message,
    oldInput : {
      email:'',
      password: ''
    },
    validationErrors: [ ]
  });
};

exports.getSignup = (req, res, next) => {
   let message = req.flash('error');
   message.length > 0? message = message[0]: message = null;

  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    oldInput: undefined,
    errorMsg: message,
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
 
      if(!errors.isEmpty()){
        return  res.status(422).render('auth/login' , {
            path: '/signup',
            pageTitle: 'Login',
            errorMsg: errors.array()[0].msg,
            oldInput : {
              email: req.body.email, 
              password : req.body.password,
              
            },
            validationErrors : errors.array()
        
        })
      } else {
          User.findOne({email : email})
          .then(user=>{

            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
            console.log(err);
            res.redirect('/');
            });
          })
          .catch(err => {
            const error =  new Error('Post login failed');
            error.httpStatusCode = 500;
            return next(error);
          })
        
     
        
      }
     
   
    
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  console.log('errors.array():', errors.array())
  // If there are errors //
  if(!errors.isEmpty()) {
    return  res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMsg: errors.array()[0].msg,
      oldInput : {
        email: email, 
        password : password,
        confirmPassword : req.body.confirmPassword
      },
      validationErrors : errors.array()
    });
  }
  // We need to create a user 
  return bcrypt.hash(password , 12)
         .then(hashedPassword=>{
                const user= new User({
                email: email,
                password : hashedPassword,
                cart: {items : []}
              });

            return user.save();
          })
         .then(user=>{
             res.redirect('/login')
             return  transporter.sendMail({
                to: user.email,
                from:'dominikus.pt@interia.pl',
                subject: 'Sing Up succeeded',
                html:'<h1 style="color:blue">You successfully signed up . Congrats !!!! </h1>'
              })
          })
         .catch(err=> {
          const error =  new Error('Post Signup failed');
          error.httpStatusCode = 500;
          return next(error);
         });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};


exports.getReset = (req,res,next) => {
  let message = req.flash('error')
  message.length > 0? message = message[0]
  : message = undefined
  res.render('auth/reset' , {
    pageTitle:'Reseting your password',
    path:'/reset',
    errorMsg: message
  })
};

exports.postReset = (req ,res, next) => {
  //Reseting password to reset123
  const email = req.body.email;
  crypto.randomBytes(32 , (err, buffer)=>{
    if(err){
      console.log(err);
      res.redirect('/reset');
    } else {
      const token  = buffer.toString('hex');
      User.findOne({email: email})
      .then(user=>{
        if(!user){
          req.flash('error' , 'There no such email!!');
          res.redirect('/reset');
        } else {
          user.resetToken = token;
          user.resetExpiryDate = Date.now() + 3600000;
         return user.save()
        }
      })
      .then(user=>{
    
        res.redirect('/');
         transporter.sendMail({
          to: email,
          from:'dominikus.pt@interia.pl',
          subject: 'Verify resetting your password',
          html:`
            <p>You requested changing the actual password</p>
            <p>Confirm this by clicking this <a href="http://localhost:3000/reset/${user.resetToken}" >link </a> </p>
          `
        })
      })
      .catch(err=> {
        const error =  new Error('Post reset failed');
        error.httpStatusCode = 500;
        return next(error);
      });
    }

  });
};

exports.getnewPassword = ( req ,res, next) => {
  const token = req.params.tokenId ; 
  // req.session.token = token;
  User.findOne({resetToken: token ,  resetExpiryDate : {$gt: Date.now()}})
  .then(user => {
    let message = req.flash('error');
    message.length > 0? message = message[0]: message = null;
    res.render('auth/new-password' , {
      pageTitle:'Resetting password',
      path:'/new-password',
      errorMsg: message,
      userId: user._id.toString(),
      token: token
  })
  })
  .catch(err=> {
    const error =  new Error('Get new Password failed');
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postnewPassword = (req, res,next) => {
  const userId = req.body.userId; 
  const password = req.body.password;
  const token = req.body.token;
  
  let newUser ;
  User.findOne({_id: userId , resetToken : token  , resetExpiryDate : {$gt : Date.now()}})
  .then(user => {
    newUser = user;
    return bcrypt.hash(password , 12)
  })
  .then(hashedPassword =>{
        newUser.password = hashedPassword;
        newUser.resetExpiryDate = undefined;
        newUser.resetToken = undefined;
        return newUser.save();
  })
  .then(()=>{
    res.redirect('/login');
  })
  .catch(err=> {
    const error =  new Error('Post new Password failed');
    error.httpStatusCode = 500;
     return next(error);
  });

}