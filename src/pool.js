
import F from './flib.js';

class Pool {

    constructor(stream){

        this.stream = stream;

        this.keep = null;
        this.when = F.ALWAYS_TRUE;
        this.until = F.ALWAYS_TRUE;
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.clear = F.ALWAYS_FALSE;
        this.isPrimed = false;
        this.source = stream.name;

    };

    handle(msg, source) {

        this.keep(msg, source);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.when(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    build(prop, factory, ...args){
        this[prop] = factory.call(this, ...args);
    };

    release(pool) {

        pool = pool || this;
        const hasContent = !pool.keep.isEmpty;
        const msg = hasContent && pool.keep.next();

        if(pool.clear()){
            pool.keep.reset();
            pool.when.reset();
        }

        pool.isPrimed = false;

        if(hasContent)
            pool.stream.emit(msg, pool.stream.name);

    };

}



export default Pool;