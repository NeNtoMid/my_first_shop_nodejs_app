const Product = require('../models/product');
const path = require('path');
const { validationResult } = require('express-validator/check');

const fileHelper = require('../util/file');

const mongoose = require('mongoose');

exports.getAddProduct = (req, res, next) => {
   return  res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMsg: undefined, 
      hasError: false,
      validationErrors: []
      
    });
 
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  console.log('errors:', errors)
  if(!image) {
    return res.status(422).render('admin/edit-product' , {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMsg: 'Attached file is not image',
      hasError: true, 
      product: {
        title:title,
        price: price,
        description: description
      },
      validationErrors: [{param:'image'}]
      
    
  })
  }
 
  if(!errors.isEmpty()){
    console.log(' title:',  title)
   return res.status(422).render('admin/edit-product' , {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        errorMsg: errors.array()[0].msg,
        hasError: true, 
        product: {
          title:title,
          price: price,
          description: description
        },
        validationErrors: errors.array()
        
      
    })
  } else {
    
    const imageUrl  = path.join(__dirname , '..' ,image.path);
    const product = new Product({
          title: title,
          price: price,
          description: description,
          imageUrl: imageUrl,
          userId: req.user
  });
  return  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
     return res.redirect('/admin/products');
    })
    .catch(err => {
      //console.log(err);
      console.log('I am logging an error in  63 admin con :)');
      const error =  new Error('Adding product failed');
      error.httpStatusCode = 500;
      return next(error);
    });
  }
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product ,
        errorMsg: undefined, 
         hasError: false,
          validationErrors: []
          
       
        
        
      });
    })
    .catch(err => {
      console.log(err)
      const error =  new Error('Editing product failed');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  
  if(!image){
      return res.status(422).render('admin/edit-product' , {
         pageTitle: 'Edit Product',
         path: '/admin/edit-product',
         editing: true,
         errorMsg: 'Attached file must be an image',
         product: {
           title:  updatedTitle,
            price: updatedPrice,
           description: updatedDesc,
           _id: prodId
         },
         validationErrors: errors.array()  
       })
   
  }

  return Product.findById(prodId)
  .then(product => {
      if(!errors.isEmpty()) {
         return res.status(422).render('admin/edit-product' , {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            errorMsg: errors.array()[0].msg,
            product: {
              title:  updatedTitle,
              imageUrl: image,
              price: updatedPrice,
              description: updatedDesc,
              _id: product._id
            },
            validationErrors: errors.array()  
          })
      } else {
      console.log('prodId.toString():', prodId.toString())
      console.log('req.user._id.toString():', req.user._id.toString())
      if(product.userId.toString() === req.session.user._id.toString()){
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image) {
        fileHelper(product.imageUrl);
        product.imageUrl = image.path ;
      }
      return product.save()
      .then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
      .catch(err => console.log(err));
      } else return res.redirect('/');
    }
  })
  .catch(err => {
    const error =  new Error('Uploading edited product failed');
    error.httpStatusCode = 500;
    return next(error);
  })
  
};

exports.getProducts = (req, res, next) => {
  Product.find({userId : req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {``
     products.forEach(cur=>console.log(cur.imageUrl));
      // console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        
      });
    })
    .catch(err => {
      const error =  new Error('Gettinm products failed');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
 return Product.findById(prodId)
        .then(product => {
          if(!product) return next(new Error('Product not found'));
          return fileHelper(product.imageUrl);
        })
        .then(() => {
          return Product.deleteOne({_id :prodId , userId :req.user._id})
        })
        .then(() => {
          console.log('DESTROYED PRODUCT');
          res.status(200).json({message:'Success!!'})
        })
        .catch(err => {
          res.status(500).json({message:'Deleting product failed!'})
        });

};
