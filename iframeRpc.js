var plemont = plemont || {};

plemont.IframeRpc = class {
  /**
   * Creates a new IframeRpc object. This can be used to execute a function
   * contained within a separate component of the window. For example, an iframe
   * contained within this window, or the parent window of a given iframe.
   *
   * @param {Object} functionContext The object that contains functions to
   *     expose via RPC. To permit no execution at this end, set this to null.
   * @param {string=} opt_id The id of this end. Leave blank to represent the
   *     parent window, otherwise the id should correspond to the id of the
   *     iframe element.
   */
  constructor(functionContext, opt_id) {
    this.sourceId_ = opt_id || 'parent';
    this.nextRequestId_ = 0;
    this.context_ = functionContext;
    this.timeout_ = 10000;

    window.addEventListener('message', event => this.messageHandler(event));
  }

  static create(functionContext, opt_id) {
    return new plemont.IframeRpc(functionContext, opt_id);
  }

  /**
   * Executes a function within an iFrame or parent window.
   *
   * @param {string} targetId The id of the iframe to execute the function in,
   *     or 'parent' if the execution should occur in the parent window.
   * @param {string} functionName The name of the remote function to execute.
   * @param {Array.<*>=} opt_argumentList Argument list for the remote function.
   * @return {Promise} A promise which will either resolve with the return value
   *     of the function call, or reject with any error from the function.
   */
  execute(targetId, functionName, opt_argumentList) {
    let message = {
      type: 'request',
      sourceId: this.sourceId_,
      targetId: targetId,
      functionName: functionName,
      argumentList: opt_argumentList,
      requestId: ++this.nextRequestId_
    };
    return new Promise((resolve, reject) => {
      if (targetId === 'parent') {
        var target = window.parent;
      } else {
        var target = document.getElementById(targetId).contentWindow;
      }
      target.postMessage(message, window.location.origin);

      let listener = window.addEventListener('message',
          event => {
            if (event.data.requestId === message.requestId &&
                event.data.targetId === this.sourceId_ &&
                event.data.sourceId === message.targetId &&
                event.data.type === 'response') {
              window.removeEventListener('message', listener);
              clearTimeout(fail);
              if (event.data.responseType === 'success') {
                resolve(event.data.response);
              } else {
                reject(event.data.response);
              }
            }
          });

      let fail = setTimeout(() => {
        window.removeEventListener('message', listener);
        reject('No response to request for: ' + message);
      }, this.timeout_);
    });
  }

  /**
   * Handles incoming requests for function execution.
   *
   * @param {MessageEvent} event The incoming message, containing function
   *     information.
   */
  messageHandler(event) {
    let data = event.data;
    if (data.targetId === this.sourceId_ && data.type === 'request') {
      let message = {
        type: 'response',
        requestId: data.requestId,
        targetId: data.sourceId,
        sourceId: this.sourceId_
      };
      if (!this.context_ ||
          typeof this.context_[data.functionName] !== 'function') {
        message.responseType = 'error';
        message.response = 'Function not found';
      } else {
        try {
          let func = this.context_[data.functionName];
          message.response = func.apply(this.context_, data.argumentList);
          message.responseType = 'success';
        } catch (e) {
          message.response = e.message;
          message.responseType = 'error';
        }
      }
      if (message.targetId === 'parent') {
        var target = window.parent;
      } else {
        var target = document.getElementById(message.targetId).contentWindow;
      }
      target.postMessage(message, window.location.origin);
    }
  }

  /**
   * Sets the timeout value for calls to execute(), in milliseconds
   *
   * @param {number} millis The timeout in milliseconds.
   * @return {plemont.IframeRpc} The updated object.
   */
  setRpcTimeout(millis) {
    this.timeout_ = millis;
    return this;
  }
};
