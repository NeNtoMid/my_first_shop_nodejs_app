 const deleteProduct = (btn) => {
    
  const productId = btn.parentNode.querySelector('[name=productId]').value;
  const csrfToken = btn.parentNode.querySelector('[name=_csrf]').value;

  const productElement = btn.closest('article');
    
    fetch(`/admin/product/${productId}`, {
        method:'DELETE',
        headers: {
            'csrf-token': csrfToken
        }
    })
    .then(responseObject => {
        console.log('responseObject:', responseObject)
        return responseObject.json()
    })
    .then(data => {
    console.log('data:', data)
        productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
        console.log('err:', err)
       
    })
};

