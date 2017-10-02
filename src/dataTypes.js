
function isPrivate(name){
    return name[0] === '_'  || (isAction(name) && name[1] === '_');
}

function isAction(name){
    return name[0] === '$';
}

export { isAction, isPrivate};

