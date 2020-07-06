const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');

const isAuth = require('../middleware/is-auth');

const { check  , body} = require('express-validator/check');


const router = express.Router();



// /admin/add-product => GET
router.get('/add-product', isAuth ,adminController.getAddProduct);

// /admin/products => GET
router.get('/products',  isAuth ,adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product',
    body('title' , 'Title is too short')
    .trim()
    .isString()
    .isLength({min:3}),
    body('price')
    .isNumeric()
    .custom((value , {req}) => {
        if(value <=0) return Promise.reject('The value should be positive')
        return true;
    }),
    body('description' , 'Description is too short')
    .trim()
    .isLength({min:10})
    ,isAuth , adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth ,adminController.getEditProduct);

router.post('/edit-product',
body('title' , 'Title is too short')
    .trim()
    .isString()
    .isLength({min:3}),
    body('price')
    .custom((value , {req}) => {
        if(value <=0) return Promise.reject('The value should be positive')
        return true;
    }),
    body('description' , 'Description is too short')
    .trim()
    .isLength({min:10})
    ,
isAuth ,adminController.postEditProduct);

router.delete('/product/:productId', isAuth ,adminController.deleteProduct);

module.exports = router;
