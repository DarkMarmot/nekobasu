import F from './flib.js';


class Frame {

    constructor(bus, streams) {

        streams = streams || [];
        this._bus = bus;
        this._index = bus._frames.length;
        this._holding = false; //begins group, keep, schedule frames
        this._streams = streams;

        const len = streams.length;
        for(let i = 0; i < len; i++){
            streams[i].debugFrame = this;
        }

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return this._holding;
    };

    get streams() {
        return [].concat(this._streams);
    }

    run(func){

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = func;
            s.processMethod = s.doRun;
        }

        return this;

    };

    hold(){

        this._holding = true;

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.createPool();
            s.processMethod = s.doPool;
        }

        return this;

    };

    transform(fAny){

        fAny = F.FUNCTOR(fAny);

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = fAny;
            s.processMethod = s.doTransform;
        }

        return this;

    };

    name(fStr){

        fStr = F.FUNCTOR(fStr);

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = fStr;
            s.processMethod = s.doName;
        }

        return this;

    };


    delay(fNum){

        fNum = F.FUNCTOR(fNum);

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = fNum;
            s.processMethod = s.doDelay;
        }

        return this;

    };

    filter(func){

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = func;
            s.processMethod = s.doFilter;
        }

        return this;
    };

    skipDupes() {

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.actionMethod = F.getSkipDupes();
            s.processMethod = s.doFilter;
        }

        return this;

    };

    // factory should define content and reset methods have signature f(msg, source) return f.content()
    reduce(factory, ...args){

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){

            const s = streams[i];
            const pool = s.pool;
            pool.buildKeeper(factory, ...args);

        }

        return this;

    };

    timer(factory, ...args){

        this._holding = false; // holds end with timer

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){

            const s = streams[i];
            const pool = s.pool;
            pool.buildTimer(factory, ...args);

        }

        return this;

    };


    destroy(){

        const streams = this._streams;
        const len = streams.length;
        for(let i = 0; i < len; i++){
            streams[i].cleanupMethod();
        }
        this._streams = null;

    };
    
}

export default Frame;


