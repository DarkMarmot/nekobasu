



function log(bus, args){

        const caption = Array.isArray(args) && args.length ? args[0] : '';

        const f = function(msg, source){
            console.log('LOG: ', caption, ' -- ', msg, ' | ', source);
            return msg;
        };

        bus.msg(f);

}


function logHooks(target){ // target is Catbus

    target.hook('LOG', log);

}

export default logHooks;


