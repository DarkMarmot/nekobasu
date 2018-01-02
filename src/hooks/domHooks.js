

function text(target, msg, source){
    target.innerText = msg;
}

function blur(target, msg, source){
    target.blur();
}

function focus(target, msg, source){
    target.focus();
}

function value(target, msg, source){
    target.value = msg;
}

function classes(target, msg, source){

    const toHash = function(acc, v){ acc[v] = true; return acc;};
    const current = target.className.split(' ').reduce(toHash, {});

    for(const k in msg){
        current[k] = msg[k];
    }

    const result = [];
    for(const k in current) {
        if(current[k])
            result.push(k);
    }

    target.className = result.join(' ');

}

function _attr(target, name, value) {
    if(value === undefined || value === null) {
        target.removeAttribute(name);
    } else {
        target.setAttribute(name, value);
    }
}


function attrs(target, msg, source) {
    for(const k in msg){
        _attr(target, k, msg[k]);
    }
}


function _prop(target, name, value) {
    target[name] = value;
}


function props(target, msg, source) {
    for(const k in msg){
        _prop(target, k, msg[k]);
    }
}

function _style(target, name, value) {
    target.style[name] = value;
}


function styles(target, msg, source) {
    for(const k in msg){
        _style(target, k, msg[k]);
    }
}


function getMsgSideEffect(sideEffectFunc){

    return function embeddedSideEffect(bus) {

        const target = bus.target(); // todo no target checks
        const f = function(msg, source){
            sideEffectFunc.call(null, target, msg, source);
            return msg;
        };

        bus.msg(f);
    }

}


function domHooks(target){ // target is Catbus

    target.hook('TEXT', getMsgSideEffect(text));
    target.hook('FOCUS', getMsgSideEffect(focus));
    target.hook('BLUR', getMsgSideEffect(blur));
    target.hook('VALUE', getMsgSideEffect(value));
    target.hook('CLASSES', getMsgSideEffect(classes));
    target.hook('ATTRS', getMsgSideEffect(attrs));
    target.hook('PROPS', getMsgSideEffect(props));
    target.hook('STYLES', getMsgSideEffect(styles));

}

export default domHooks;


