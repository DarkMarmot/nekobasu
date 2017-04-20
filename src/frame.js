import F from './flib.js';


class Frame {

    constructor(bus, streams) {

        this._bus = bus;
        this._index = bus._frames.length;
        this._holding = false; //begins group, keep, schedule frames
        this._streams = streams || [];
        this._eachStream('debugFrame', this);

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

    _eachStream(prop, val){

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){

            const stream = streams[i];
            stream[prop] = val;

        }

        return this;

    };

    _eachStreamCall(method, val){

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){

            const stream = streams[i];
            stream[method].call(stream, val);

        }

        return this;

    };
    
    run(func){

        this._eachStream('actionMethod', func);
        this._eachStreamCall('process', 'doRun');

        return this;

    };

    hold(){

        this._holding = true;
        this._eachStreamCall('process', 'doHold');

        return this;

    };

    transform(fAny){

        fAny = F.FUNCTOR(fAny);

        this._eachStreamCall('process', 'doTransform');
        this._eachStream('actionMethod', fAny);

        return this;

    };

    name(fStr){

        fStr = F.FUNCTOR(fStr);

        this._eachStreamCall('process', 'doName');
        this._eachStream('actionMethod', fStr);

        return this;

    };


    delay(fNum){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);

        fNum = F.FUNCTOR(fNum);

        this._eachStream('actionMethod', fNum);
        this._eachStreamCall('process', 'doDelay');

        return this;

    };


    filter(func){


        this._eachStream('actionMethod', func);
        this._eachStreamCall('process', 'doFilter');

        return this;
    };

    skipDupes(){

        return this.filter(F.SKIP_DUPES_FILTER);

    };

    group(func){

        this._holding = true;

        func = arguments.length === 1 ? F.FUNCTOR(func) : F.TO_SOURCE_FUNC;

        this._eachStreamCall('process', 'doGroup');
        this._eachStream('groupMethod', func);

        return this;

    };


    last(n){

        n = Number(n) || 0;

        this._eachStream('keepMethod', F.KEEP_LAST);
        this._eachStream('keepCount', n);

        if(!this._holding)
            this._eachStreamCall('process', 'doKeep');

        return this;

    };

    first(n){

        n = Number(n) || 0;
        this._eachStream('keepMethod', F.KEEP_FIRST);
        this._eachStream('keepCount', n);

        if(!this._holding)
            this._eachStreamCall('process', 'doKeep');

        return this;

    };


    all(){

        this._eachStream('keepMethod', F.KEEP_ALL);
        this._eachStream('keepCount', -1);

        if(!this._holding)
            this._eachStreamCall('process', 'doKeep');

        return this;

    };

    batch(){

        this._holding = false; // holds end with timer
        this._eachStream('timerMethod', F.BATCH_TIMER);

        return this;

    };

    ready(func){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_IS_FUNCTION(func);

        this._eachStream('readyMethod', func);
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


