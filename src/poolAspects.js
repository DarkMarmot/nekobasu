
class PoolAspects {

    constructor() {

        this.until      = null;
        this.reduce     = null;
        this.when       = null;
        this.clear      = null;
        this.timer      = null;
        this.keep       = null;
    };



}

export default PoolAspects;

//
// this._keep = null; // pool storage
// this._until = null; // stream end lifecycle -- todo switch until to when in current setup
// this._timer = null; // release from pool timer
// this._clear = false; // condition to clear storage on release
// this._when = false; // invokes timer for release
