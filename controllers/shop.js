const fs = require('fs');
const path = require('path');

const PDFkit = require('pdfkit');

const stripe = require('stripe')(process.env.STRIPE_KEY);


const Product = require('../models/product');
const Order = require('../models/order');
const session = require('express-session');

const ITEMS_PER_PAGE  = 1;

exports.getProducts = (req, res, next) => {
  let whichPage = req.query.page;
  if(!whichPage) whichPage = 1;
  
  let totalNumOfItems;
  Product.find()
         .countDocuments()
         .then(numOfProducts => {
            console.log('numOfProducts:', numOfProducts)
            totalNumOfItems = numOfProducts;
            return Product.find()
                  .skip((whichPage-1 ) * ITEMS_PER_PAGE)
                  .limit(ITEMS_PER_PAGE)
         })
         .then(products => {
                  totalNumOfItems = Math.floor((totalNumOfItems / ITEMS_PER_PAGE));
                  res.render('shop/index', {
                    prods: products,
                    pageTitle: 'All Products',
                    path: '/products',
                    totalNumOfPages: totalNumOfItems,
                    next: parseInt(whichPage)+1,
                    previous:parseInt(whichPage) -1 ,
                    
                  });
         })
         .catch(err => {
        const error =  new Error(err);
        error.httpStatusCode = 500;
        return next(error);
         });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        
      });
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  let whichPage = req.query.page;
  if(!whichPage) whichPage = 1;
  
  let totalNumOfItems;
  Product.find()
         .countDocuments()
         .then(numOfProducts => {
            console.log('numOfProducts:', numOfProducts)
            totalNumOfItems = numOfProducts;
            return Product.find()
                  .skip((whichPage-1 ) * ITEMS_PER_PAGE)
                  .limit(ITEMS_PER_PAGE)
         })
         .then(products => {
                  totalNumOfItems = Math.floor((totalNumOfItems / ITEMS_PER_PAGE));
                  res.render('shop/index', {
                    prods: products,
                    pageTitle: 'Shop',
                    path: '/',
                    totalNumOfPages: totalNumOfItems,
                    next: parseInt(whichPage)+1,
                    previous:parseInt(whichPage) -1 ,
                    csrfToken: req.csrfToken()
                  });
         })
         .catch(err => {
                  const error =  new Error(err);
                  error.httpStatusCode = 500;
                  return next(error);
         });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items;
        console.log('products from cart:', products)
        let totalPrice = 0 ;
        user.cart.items.forEach(element =>totalPrice+=parseFloat(element.productId.price * element.quantity));

        res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        totalPrice: totalPrice
        
      });
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
     
      res.redirect('/cart');
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/checkout');
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {

  return Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      let totalPrices =  [];
      orders.forEach((cur , index)  =>{
        totalPrices[index] =  {
          totalPriceOfOrder: 0,
          priceWithOutQty: [] ,
        } ;
        cur.products.forEach((element,i) => {
          totalPrices[index].totalPriceOfOrder+=parseFloat(element.product.price * element.quantity);
          totalPrices[index].priceWithOutQty.push(parseFloat(element.product.price));
         
        });



      });
      
        res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        totalPrices: totalPrices
        
      });
  
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice= (req, res, next) => {
  const orderId = req.params.orderId;
  console.log(orderId);
  const invoiceName = `invoice-${orderId}.pdf`;
  const invoicePath  = path.join(__dirname  , '..' , 'data' , 'invoices'  , invoiceName);
  
  return Order.findById(orderId)
        .then(order => {
          
          if(!order) return next(new Error('No order found :('));
          if(order.user.userId.toString() !== req.user._id.toString()) 
          return next(new Error('No Authorized'));
          
          const doc = new PDFkit();
          res.setHeader('Content-Disposition' ,`attachment; filename="${invoiceName}"`);
          res.setHeader('Contenty-Type' , 'application/pdf');
          
          doc.pipe(fs.createWriteStream(invoicePath));
          doc.pipe(res);
          doc.fontSize(26).text('Invoice' , {
            underline: true,
            align:'center'
          })
          doc.text('---------------------------' , {
            underline: true, 
            align: 'center'
          });
          console.log('order:', order)
          console.log('order.products[0]:', order.products[0])
          console.log('order.products[0].product:', order.products[0].product)
          let totalPrice = 0;
          order.products.forEach(element => {
            doc.fontSize(18).text(`${element.product.title} - ${element.quantity} x ${element.product.price}$`);
            doc.fontSize(11).text(`${element.product.description}`);
            doc.text('                           ');
            doc.text('                           ');
            doc.text('                           ');
            totalPrice+=element.quantity * element.product.price;
          });

          doc.fontSize(20).text(`Total price of order :${totalPrice}$`)
           doc.end();
  
        })
        .catch(err => next(err))

}

exports.getCheckOut = (req ,res , next) => {
  let  products;
  let totalPrice = 0 ;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        products = user.cart.items;
      
        products.forEach(element =>totalPrice+=parseFloat(element.productId.price * element.quantity));
      return stripe.checkout.sessions.create({
        payment_method_types:['card'],
        line_items:products.map(element => {
          return {
            name:element.productId.title,
            description: element.productId.description,
            amount: element.productId.price * 100,
            currency: 'usd',
            quantity:element.quantity

          };
        }),
        success_url: `${req.protocol}://${req.get('host')}/checkout/success` , //=> http://localhost:3000
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`
      });
    })
    .then(session => {
      console.log('products from shop controller:', products)
        res.render('shop/checkout', {
          products: products,
          pageTitle: 'Checkout',
          path: '/checkout',
          csrfToken: req.csrfToken(),
          totalPrice: totalPrice,
          sessionId: session.id
        });
    })
    .catch(err => {
      const error =  new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckOutSuccess = (req, res , next ) => {
    req.user
      .populate('cart.items.productId')
      .execPopulate()
      .then(user => {
        const products = user.cart.items.map(i => {
          return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
          user: {
            userId: req.user
          },
          products: products
        });
        return order.save();
      })
      .then(result => {
        return req.user.clearCart();
      })
      .then(() => {
        res.redirect('/checkout');
      })
      .catch(err => {
        const error =  new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
 

};