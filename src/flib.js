
import Catbus from './catbus.js';

function TO_SOURCE(msg, source) {
    return source;
}

function TO_MSG(msg, source) {
    return msg;
}

function FUNCTOR(val) {
    return (typeof val === 'function') ? val : function() { return val; };
}

const Func = {



    NOOP: function(){},

    ALWAYS_TRUE: function(){ return true; },

    ALWAYS_FALSE: function(){ return false;},

    ASSERT_NEED_ONE_ARGUMENT: function(args){
        if(args.length < 1)
            throw new Error('Method requires at least one argument.');
    },

    ASSERT_IS_FUNCTION: function(func){
        if(typeof func !== 'function')
            throw new Error('Argument [func] is not of type function.');
    },



    TO_SOURCE_FUNC: function(msg, source) {
        return source;
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

    getBuffer: function(n){

        const buffer = [];

        const f = function(msg, source){
            if(buffer.length < n)
                buffer.push(msg);
            return buffer;
        };

        f.auto = true;

        f.next = function(){
            return buffer[0];
        };

        f.reset = function(){
            if(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = (buffer.length === 0);
        };

        f.content = function(){
            return buffer;
        };

        return f;

    },


    getGroup: function(groupBy){

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
Func.To_MSG = TO_MSG;
Func.FUNCTOR = FUNCTOR;

export default Func;