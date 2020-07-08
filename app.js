const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');


const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI =
`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@database-ns317.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;






const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
}); 

const app = express();

const csrfProtection = csrf();



const bucketName = process.env.BUCKET_NAME;
console.log('bucketName:', bucketName);

const multerS3 = require('multer-s3');

const AWS = require('aws-sdk');
console.log('process.env.ACCESS_KEY_ID:', process.env.ACCESS_KEY_ID);

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
});


const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
});





app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


const accessLogStream = fs.createWriteStream(path.join(__dirname  , 'access.log') , {
  flags: 'a'
})

app.use(helmet());
app.use(compression());
app.use(morgan('combined',{stream: accessLogStream}));

app.use(multer().single('image'));
app.use(bodyParser.urlencoded({ extended: false }));




app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));



app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
  );
  
  app.use(csrfProtection);
  
  
  
  app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
  });
  
  app.use((req, res, next) => {
    if (!req.session.user) {
      return next();
  }
  User.findById(req.session.user._id)
  .then(user => {
    if(!user) return next();
    req.user = user;
    next();
  })
  .catch(err =>{
    return next(new Error(err));
  });
});

app.use(flash());

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500',errorController.get500);

app.use(errorController.get404);

app.use((error , req, res , next) =>{
      if(error){
        return res.status(500).render('500' , {
            pageTitle: 'Server problem' , 
            path: '/500',
            errorMsg: error,
            status: error.httpStatusCode,
            isAuthenticated:  false
          })
          } else {
              res.status(500).redirect('/500');
    }
})

mongoose
.connect(MONGODB_URI)
.then(result => {
  app.listen(process.env.PORT || 3000);
})
.catch(err => {
  console.log(err);
});

// const fileStorage = multer.diskStorage({
//   destination: (req, file , cb) => {
//       cb(null  , `images`)
//   },
//   filename: (req, file , cb) => {
    
//     cb(null  , `${Date.now()}-${file.originalname}`)
//   }
// });

// const fileFilter = (req,file,cb) => {
//   const typeOfFile = file.mimetype.split('/')[1];
//   typeOfFile === 'jpeg' || typeOfFile === 'png' || typeOfFile === 'jpg'?  cb(null , true) : cb(null , false);

// };
