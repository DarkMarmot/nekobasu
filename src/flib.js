
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

    SKIP_DUPES_FILTER: function(msg, source, last){
        return msg !== (last && last.msg);
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

    UNTIL_FULL: function(messages, n){

        return messages.length >= n;

    },

    UNTIL_KEYS: function(messagesByKey, keys){

        const len = keys.length;
        for(let i = 0; i < len; i++){
            const k = keys[i];
            if(!messagesByKey.hasOwnProperty(k))
                return false;
        }
        return true;

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