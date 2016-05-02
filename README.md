# iframe-rpc

Provides the means to call functions within an `iframe` from the parent window, or vice-versa.

For example, setting up endpoint in iframe HTML:

```javascript
// Create endpoint named 'iFrame' - should correspond with id of <iframe>
let rpc = plemont.IframeRpc.create(this, 'iFrame');

// Call 'add' function in the parent window, and print result
rpc.execute('parent', 'add', [1, 2])
    .then(result => {
      console.log(result);
    })
    .catch(error => {
      console.log('Error:' + error);
    });
```
