
function isPrivate(name){
    return name.slice(0,1) === '_';
}

function isAction(name){
    return name.slice(-1) === '$';
}

export { isAction, isPrivate };

