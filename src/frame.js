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

            let stream = streams[i];
            stream[prop] = val;

        }

        return this;

    };
    
    run(func){

        F.ASSERT_IS_FUNCTION(func);

        this._eachStream('actionMethod', func);
        this._eachStream('processName', 'doRun');

        return this;

    };

    hold(){

        this._holding = true;
        this._eachStream('processName', 'doHold');

        return this;

    };

    transform(method){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);

        method = F.FUNCTOR(method);

        this._eachStream('processName', 'doTransform');
        this._eachStream('actionMethod', method);

        return this;

    };

    name(method){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);

        method = F.FUNCTOR(method);

        this._eachStream('processName', 'doName');
        this._eachStream('actionMethod', method);

        return this;

    };


    delay(funcOrNum){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);

        const func = F.FUNCTOR(funcOrNum);

        this._eachStream('actionMethod', func);
        this._eachStream('processName', 'doDelay');

        return this;

    };


    filter(func){

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_IS_FUNCTION(func);

        this._eachStream('actionMethod', func);
        this._eachStream('processName', 'doFilter');

        return this;
    };

    skipDupes(){

        return this.filter(F.SKIP_DUPES_FILTER);

    };

    group(func){

        this._holding = true;

        func = arguments.length === 1 ? F.FUNCTOR(func) : F.TO_SOURCE_FUNC;

        this._eachStream('processName', 'doGroup');
        this._eachStream('groupMethod', func);

        return this;

    };


    last(n){

        n = Number(n) || 0;

        this._eachStream('keepMethod', F.KEEP_LAST);
        this._eachStream('keepCount', n);

        if(!this._holding)
            this._eachStream('processName', 'doKeep');

        return this;

    };

    first(n){

        n = Number(n) || 0;
        this._eachStream('keepMethod', F.KEEP_FIRST);
        this._eachStream('keepCount', n);

        if(!this._holding)
            this._eachStream('processName', 'doKeep');

        return this;

    };


    all(){

        this._eachStream('keepMethod', F.KEEP_ALL);
        this._eachStream('keepCount', -1);

        if(!this._holding)
            this._eachStream('processName', 'doKeep');

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


