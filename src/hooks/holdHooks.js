
function ifUndefined(msg, source){
    return msg === undefined;
}

function ifNotUndefined(msg, source){
    return msg !== undefined;
}

function ifFalse(msg, source){
    return msg === false;
}

function ifNotFalse(msg, source){
    return msg !== false;
}

function ifFalsey(msg, source){
    return !msg;
}

function ifTrue(msg, source){
    return msg === true;
}

function ifNotTrue(msg, source){
    return msg !== true;
}

function ifTruthy(msg, source){
    return !!msg;
}

function ifNull(msg, source){
    return msg === null;
}

function ifNotNull(msg, source){
    return msg !== null;
}

function ifArray(msg, source){
    return msg === null;
}

function ifNotArray(msg, source){
    return msg === null;
}

function ifTypeObject(msg, source){
    return typeof msg === 'object';
}

function filterTypeObject(bus) {
    bus.filter(ifTypeObject, null);
}

function filterNull(bus) {
    bus.filter(ifNull, null);
}

function filterNotNull(bus) {
    bus.filter(ifNotNull, null);
}

function filterArray(bus) {
    bus.filter(ifArray, array);
}

function filterNotArray(bus) {
    bus.filter(ifNotArray, array);
}

function filterFalse(bus) {
    bus.filter(ifFalse, null);
}

function filterNotFalse(bus) {
    bus.filter(ifNotFalse, null);
}

function filterUndefined(bus) {
    bus.filter(ifUndefined, null);
}

function filterNotUndefined(bus) {
    bus.filter(ifNotUndefined, null);
}

function filterFalsey(bus) {
    bus.filter(ifFalsey, null);
}

function filterTrue(bus) {
    bus.filter(ifTrue, null);
}

function filterNotTrue(bus) {
    bus.filter(ifNotTrue, null);
}

function filterTruthy(bus) {
    bus.filter(ifTruthy, null);
}

function filterHooks(target){ // target is Catbus

    target.hook('IF_UNDEFINED', filterUndefined);
    target.hook('IF_NOT_UNDEFINED', filterNotUndefined);
    target.hook('IF_NULL', filterNull);
    target.hook('IF_NOT_NULL', filterNotNull);
    target.hook('IF_FALSE', filterFalse);
    target.hook('IF_NOT_FALSE', filterNotFalse);
    target.hook('IF_FALSEY', filterFalsey);
    target.hook('IF_TRUE', filterTrue);
    target.hook('IF_NOT_TRUE', filterNotTrue);
    target.hook('IF_TRUTHY', filterTruthy);
    target.hook('IF_ARRAY', filterArray);
    target.hook('IF_NOT_ARRAY', filterNotArray);
    target.hook('IF_TYPE_OBJECT', filterTypeObject);

}

export default filterHooks;


