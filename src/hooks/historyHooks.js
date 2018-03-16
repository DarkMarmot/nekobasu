



function priorValue(bus){

    function greaterThanOne(msg){
        return msg.length > 1;
    }

    function getFirst(msg){
        return msg[0];
    }

    bus
        .last(2)
        .filter(greaterThanOne).msg(getFirst);

}


function historyHooks(target){ // target is Catbus

    target.hook('PRIOR', priorValue);

}

export default historyHooks;


