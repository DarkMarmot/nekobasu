
import Catbus from './catbus.js';

function ALWAYS_TRUE(){
    return true;
}

function ALWAYS_FALSE(){
    return false;
}


function TO_SOURCE(msg, source) {
    return source;
}

function TO_TOPIC(msg, source, topic) {
    return topic;
}

function TO_MSG(msg) {
    return msg;
}

function NOOP(){

}


function FUNCTOR(val) {
    return (typeof val === 'function') ? val : function() { return val; };
}

const Func = {


    ASSERT_NEED_ONE_ARGUMENT: function(args){
        if(args.length < 1)
            throw new Error('Method requires at least one argument.');
    },

    ASSERT_IS_FUNCTION: function(func){
        if(typeof func !== 'function')
            throw new Error('Argument [func] is not of type function.');
    },

    getAlwaysTrue: function(){
       return function(){ return true;}
    },

    getBatchTimer: function(){
        const pool = this;
        return function() {
            Catbus.enqueue(pool);
        }
    },

    getSyncTimer: function(){
        const pool = this;
        return function() {
            pool.release(pool);
        }
    },

    getDeferTimer: function(){
        const pool = this;
        return function() {
            setTimeout(pool.release, 0, pool);
        }
    },

    getThrottleTimer: function(fNum){

        const pool = this;
        fNum = FUNCTOR(fNum);
        let wasEmpty = false;
        let timeoutId = null;
        let msgDuringTimer = false;
        const auto = pool.keep.auto;

        function timedRelease(fromTimeout){

            if(pool.stream.dead)
                return;

            const nowEmpty = pool.keep.isEmpty;

            if(!fromTimeout){
                if(!timeoutId) {
                    pool.release(pool);
                    wasEmpty = false;
                    timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
                } else {
                    msgDuringTimer = true;
                }
                return;
            }

            if(nowEmpty){
                if(wasEmpty){
                    // throttle becomes inactive
                } else {
                    // try one more time period to maintain throttle
                    wasEmpty = true;
                    msgDuringTimer = false;
                    timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
                }
            } else {
                pool.release(pool);
                wasEmpty = false;
                timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
            }

        }

        return timedRelease;

    },

    getQueue: function(n){

        n = n || Infinity;

        const buffer = [];

        const f = function(msg, source){
            if(buffer.length < n)
                buffer.push(msg);
            return buffer;
        };

        f.isBuffer = ALWAYS_TRUE;

        f.next = function(){
            return buffer.shift();
        };

        f.isEmpty = function(){
            return buffer.length === 0;
        };

        f.content = function(){
            return buffer;
        };

        return f;

    },

    getScan: function(func, seed){

        const hasSeed = arguments.length === 2;
        let acc;
        let initMsg = true;

        const f = function(msg, source){

            if(initMsg){
                initMsg = false;
                if(hasSeed){
                    acc = func(seed, msg, source);
                } else {
                    acc = msg;
                }
            } else {
                acc = func(acc, msg, source);
            }

            return acc;

        };

        f.reset = NOOP;

        f.next = f.content = function(){
            return acc;
        };


        return f;
    },

    getGroup: function(groupBy){

        groupBy = groupBy || TO_SOURCE;
        const hash = {};

        const f = function(msg, source){

            const g = groupBy(msg, source);
            if(g) {
                hash[g] = msg;
            } else { // no source, copy message props into hash to merge nameless streams of key data
                for(const k in msg){
                    hash[k] = msg[k];
                }
            }

            return hash;

        };

        f.reset = function(){
            for(const k in hash){
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return hash;
        };

        return f;

    },

    getHash: function(groupBy){

        groupBy = groupBy || TO_SOURCE;
        const hash = {};

        const f = function(msg, source){

            const g = groupBy(msg, source);
            hash[g] = msg;
            return hash;

        };

        f.reset = function(){
            for(const k in hash){
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return hash;
        };

        return f;

    },


    getKeepLast: function(n){

        if(!n || n < 0) {

            let last;

            const f = function(msg, source){
                return last = msg;
            };

            f.reset = function(){
                f.isEmpty = true;
            };

            f.next = f.content = function(){
                return last;
            };

            return f;

        }

        const buffer = [];

        const f = function(msg, source){
            buffer.push(msg);
            if(buffer.length > n)
                buffer.shift();
            return buffer;
        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },



    getKeepFirst: function(n){

        if(!n || n < 0) {

            let firstMsg;
            let hasFirst = false;
            const f = function (msg, source) {
                return hasFirst ? firstMsg : firstMsg = msg;
            };

            f.reset = function(){
                firstMsg = false;
                f.isEmpty = true;
            };

            f.next = f.content = function(){
                return firstMsg;
            };

            return f;
        }

        const buffer = [];

        const f = function(msg, source){

            if(buffer.length < n)
                buffer.push(msg);
            return buffer;

        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },

    getKeepAll: function(){

        const buffer = [];

        const f = function(msg, source){
            buffer.push(msg);
            return buffer;
        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },

    getWhenCount: function(n) {

        let latched = false;

        const f = function(messages){
            latched = latched || messages.length >= n;
            return latched;
        };

        f.reset = function(){
            latched = false;
        };

        return f;

    },

    getWhenKeys: function(keys) {

        const keyHash = {};
        const len = keys.length;

        for(let i = 0; i < len; i++){
            const k = keys[i];
            keyHash[k] = true;
        }

        let latched = false;

        const f = function (messagesByKey) {

            if(latched)
                return true;

            for (let i = 0; i < len; i++) {
                const k = keys[i];
                if (!messagesByKey.hasOwnProperty(k))
                    return false;
            }

            return latched = true;

        };

        f.reset = function(){
            latched = false;
            for(const k in keyHash){
                delete keyHash[k];
            }
        };

        return f;

    },

    getHasKeys: function(keys, noLatch) {

        let latched = false;
        const len = keys.length;

        return function (msg) {

            if(latched || !len)
                return true;

            for(let i = 0; i < len; i++) {

                const k = keys[i];
                if(!msg.hasOwnProperty(k))
                    return false;
            }

            if(!noLatch)
                latched = true;

            return true;

        }

    },


    getSkipDupes: function() {

        let hadMsg = false;
        let lastMsg;

        return function (msg) {

            const diff = !hadMsg || msg !== lastMsg;
            lastMsg = msg;
            hadMsg = true;
            return diff;

        }

    },


    ASSERT_NOT_HOLDING: function(bus){
        if(bus.holding)
            throw new Error('Method cannot be invoked while holding messages in the frame.');
    },

    ASSERT_IS_HOLDING: function(bus){
        if(!bus.holding)
            throw new Error('Method cannot be invoked unless holding messages in the frame.');
    }

};

Func.TO_SOURCE = TO_SOURCE;
Func.TO_TOPIC = TO_TOPIC;
Func.To_MSG = TO_MSG;
Func.FUNCTOR = FUNCTOR;
Func.ALWAYS_TRUE = ALWAYS_TRUE;
Func.ALWAYS_FALSE = ALWAYS_FALSE;
Func.NOOP = NOOP;

export default Func;