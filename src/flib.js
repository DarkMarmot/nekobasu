
import Catbus from './catbus.js';


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

    getFilter: function(stream, condition){

        var f = function(msg, source){
            if(!condition(msg, source))
                return;
            stream.flowForward(msg, source);
        };

        return f;
    },

    TO_SOURCE_FUNC: function(msg, source) {
        return source;
    },

    BATCH_TIMER: function(){
        Catbus.enqueue(this);
    },

    DEFER_TIMER: function(){
        setTimeout(this.fireContent, 0);
    },

    KEEP_LAST: function(buffer, msg, n){

        if(n === 0){
            if(buffer.length === 0)
                buffer.push(msg);
            else
                buffer[0] = msg;
            return buffer;
        }

        buffer.push(msg);

        if(buffer.length > n)
            buffer.shift();

        return buffer;

    },

    KEEP_FIRST: function(buffer, msg, n){

        if(buffer.length < n || buffer.length === 0)
            buffer.push(msg);

        return buffer;

    },

    KEEP_ALL: function(buffer, msg){

        buffer.push(msg);
        return buffer;

    },

    getKeepLast: function(n){

        if(arguments.length === 0) {
            return function (msg, source) {
                return msg;
            };
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

        return f;

    },

    getKeepFirst: function(n){

        if(arguments.length === 0) {

            let firstMsg;
            let hasFirst = false;
            const f = function (msg, source) {
                return hasFirst ? firstMsg : firstMsg = msg;
            };

            f.reset = function(){
                firstMsg = false;
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

        const len = keys.length;
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

export default Func;