
import F from './flib.js';

class Pool {

    constructor(stream){

        this.stream = stream;

        this.keep = null;
        this.until = F.ALWAYS_TRUE;
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.clear = F.ALWAYS_FALSE;
        this.isPrimed = false;

    };

    tell(msg, source) {

        this.keep(msg, source);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.until(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    sync(){
        this.timer = this.release;
    };

    batch(){
        this.timer = F.BATCH_TIMER(this);
    };

    defer(){
        this.timer = F.DEFER_TIMER(this);
    };

    // from timer callback -- pool is instance releasing

    release(pool) {

        pool = pool || this;
        const msg = pool.keep.content();

        if(pool.clear()){
            pool.keep.reset();
            pool.until.reset();
        }

        pool.isPrimed = false;
        pool.stream.flowForward(msg, pool.stream.name);

    };


}



export default Pool;