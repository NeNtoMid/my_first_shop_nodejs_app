const fs = require('fs');
const path = require('path');
const { nextTick } = require('process');

const deleteProduct = (filePath) => {
    return fs.unlink(filePath , (err) => {
       if(err) throw (err);
        return;
        
    })
};

module.exports  = deleteProduct;

  
   
   
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

