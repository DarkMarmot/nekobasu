
function isFalse(msg, source){
    return msg === false;
}

function isFalsey(msg, source){
    return !msg;
}

function isTrue(msg, source){
    return msg === true;
}

function isTruthy(msg, source){
    return !!msg;
}

function isNull(msg, source){
    return msg === null;
}

function isArray(msg, source){
    return msg === null;
}

function filterFalse(bus) {
    bus.filter(isFalse, null);
}

function filterFalsey(bus) {
    bus.filter(isFalsey, null);
}

function filterTrue(bus) {
    bus.filter(isTrue, null);
}

function filterTruthy(bus) {
    bus.filter(isTruthy, null);
}

function filterHooks(target){ // target is Catbus

    target.hook('IS_FALSE', filterFalse);
    target.hook('IS_FALSEY', filterFalsey);
    target.hook('IS_TRUE', filterTrue);
    target.hook('IS_TRUTHY', filterTruthy);

}

export default filterHooks;


