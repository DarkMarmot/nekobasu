
import Catbus from './catbus.js';

function TO_SOURCE(msg, source) {
    return source;
}

function TO_MSG(msg, source) {
    return msg;
}

const Func = {

    FUNCTOR: function(val) {
        return (typeof val === 'function') ? val : function() { return val; };
    },

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

    getBatchTimer: function(pool){
        return function() {
            Catbus.enqueue(pool);
        }
    },

    getSyncTimer: function(pool){
        return function() {
            pool.release(pool);
        }
    },

    getDeferTimer: function(pool){
        return function() {
            setTimeout(pool.release, 0, pool);
        }
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
        };

        f.content = function(){
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
                last = undefined;
            };

            f.content = function(){
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
        };

        f.content = function(){
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
            };

            f.content = function(){
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
        };

        f.content = function(){
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
        };

        f.content = function(){
            return buffer;
        };

        return f;

    },

    getUntilCount: function(n) {

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

    getUntilKeys: function(keys) {

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

export default Func;